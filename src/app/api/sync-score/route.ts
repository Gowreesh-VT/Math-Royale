// ===========================================
// SYNC SCORE API ROUTE - The Core Engine
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import { TeamScore, Question, Team, Round1Session } from '@/models';
import { fetchTeamSubmissions } from '@/services/codeforcesService';
import { calculateTeamScore } from '@/services/bingoCalculator';
import { checkRateLimit } from '@/lib/rateLimit';
import type { SyncResponse } from '@/types';
import { authOptions } from '../auth/[...nextauth]/route';


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.teamId) {
      return NextResponse.json<SyncResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const teamId = session.user.teamId;

    await connectDB();

    // Check if Round 1 is active
    const round1Session = await Round1Session.findOne();
    if (!round1Session || !round1Session.isActive) {
      return NextResponse.json<SyncResponse>(
        { success: false, error: 'Round 1 is not active' },
        { status: 403 }
      );
    }

    // Check if Round 1 has ended
    const now = new Date();
    if (round1Session.endTime && now > new Date(round1Session.endTime)) {
      // Auto-stop if enabled
      if (round1Session.autoStop) {
        round1Session.isActive = false;
        await round1Session.save();
      }
      return NextResponse.json<SyncResponse>(
        { success: false, error: 'Round 1 has ended' },
        { status: 403 }
      );
    }

// Rate limiting: 5 requests per minute per team
const identifier = teamId;
const rateLimit = await checkRateLimit(identifier, 5, 60000);

if (rateLimit.limited) {
  const resetIn = Math.ceil(
    (rateLimit.resetTime - Date.now()) / 1000
  );

  return NextResponse.json<SyncResponse>(
    {
      success: false,
      error: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.resetTime.toString(),
      },
    }
  );
}


    // Get team from database
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json<SyncResponse>(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    const cfHandle = team.codeforcesHandle;
    if (!cfHandle) {
      return NextResponse.json<SyncResponse>(
        { success: false, error: 'Codeforces handle not set for this team' },
        { status: 400 }
      );
    }

    const allQuestions = await Question.find({}).sort({ gridIndex: 1 });
    if (!allQuestions || allQuestions.length === 0) {
      return NextResponse.json<SyncResponse>(
        { success: false, error: 'No questions found' },
        { status: 404 }
      );
    }

    let teamScore = await TeamScore.findOne({ teamId });
    if (!teamScore) {
      return NextResponse.json<SyncResponse>(
        { success: false, error: 'Team not initialized. Please login.' },
        { status: 400 }
      );
    }
    
    const teamQuestions = teamScore.questionOrder.map((originalIndex: number, gridPosition: number) => {
      const question = allQuestions[originalIndex];
      return {
        ...question.toObject(),
        gridIndex: gridPosition,
      };
    });

    const submissionsResult = await fetchTeamSubmissions([cfHandle]);
    if (!submissionsResult.success) {
      return NextResponse.json<SyncResponse>(
        { success: false, error: submissionsResult.error },
        { status: 502 }
      );
    }

    const scoreResult = calculateTeamScore(
      submissionsResult.submissions!,
      teamQuestions
    );

    let lastSubmissionTime: Date | null = null;
    const scoreChanged = scoreResult.currentScore !== teamScore.currentScore;

    if (scoreChanged && scoreResult.solvedIndices.length > 0) {
      const solvedProblems = teamQuestions.filter((p: any) =>
        scoreResult.solvedIndices.includes(p.gridIndex)
      );

      const relevantSubmissions = submissionsResult.submissions!.filter(
        (sub: any) =>
          solvedProblems.some(
            (p: any) =>
              String(sub.problem.contestId) === String(p.contestId) &&
              sub.problem.index.toUpperCase() === p.problemIndex.toUpperCase()
          )
      );

      if (relevantSubmissions.length > 0) {
        const latestTimestamp = Math.max(
          ...relevantSubmissions.map((s: any) => s.creationTimeSeconds)
        );
        lastSubmissionTime = new Date(latestTimestamp * 1000);
      }
    } else if (!scoreChanged) {
      lastSubmissionTime = teamScore.lastSubmissionTime || null;
    }

    await TeamScore.findOneAndUpdate(
      { teamId },
      {
        solvedIndices: scoreResult.solvedIndices,
        currentScore: scoreResult.currentScore,
        bingoLines: scoreResult.bingoLines,
        lastSubmissionTime,
        $inc: { syncCount: 1 },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json<SyncResponse>({
      success: true,
      progress: {
        solvedIndices: scoreResult.solvedIndices,
        currentScore: scoreResult.currentScore,
        bingoLines: scoreResult.bingoLines,
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json<SyncResponse>(
      { success: false, error: 'Server error during sync' },
      { status: 500 }
    );
  }
}