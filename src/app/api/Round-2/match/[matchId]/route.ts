import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import MatchSubmission from '@/models/MatchSubmission';
import { getTimeRemaining } from '@/services/TugOfWarScores';
import mongoose from 'mongoose';

/**
 * GET /api/Round-2/match/[matchId]
 * Get real-time match details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.teamId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const { matchId } = await params;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Validate ObjectId format to prevent NoSQL injection
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return NextResponse.json(
        { error: 'Invalid match ID format' },
        { status: 400 }
      );
    }

    const match = await Match.findById(matchId)
      .populate('sideA_teamIds', 'teamName codeforcesHandle')
      .populate('sideB_teamIds', 'teamName codeforcesHandle')
      .populate('questionPoolA', 'contestId problemIndex name url')
      .populate('questionPoolB', 'contestId problemIndex name url');

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    const teamId = session.user.teamId;
    const isInSideA = match.sideA_teamIds.some((t: any) => t._id.toString() === teamId);
    const isInSideB = match.sideB_teamIds.some((t: any) => t._id.toString() === teamId);

    if (!isInSideA && !isInSideB) {
      return NextResponse.json(
        { error: 'Forbidden - You are not part of this match' },
        { status: 403 }
      );
    }

    const teamSide = isInSideA ? 'A' : 'B';

    const submissions = await MatchSubmission.find({
      matchId: match._id,
      verdict: 'OK',
    }).lean();

    const solvedByA = new Set(
      submissions
        .filter(s => s.side === 'A')
        .map(s => s.questionId.toString())
    );

    const solvedByB = new Set(
      submissions
        .filter(s => s.side === 'B')
        .map(s => s.questionId.toString())
    );

    const timeRemaining = getTimeRemaining(match);

    const roundNames: Record<number, string> = {
      1: 'Quarterfinals',
      2: 'Semifinals',
      3: 'Finals',
    };

    return NextResponse.json({
      success: true,
      match: {
        matchId: match._id,
        roundNumber: match.roundNumber,
        roundName: roundNames[match.roundNumber] || 'Unknown',
        teamSide,

        sideA: {
          teams: (match.sideA_teamIds as any[]).map(t => ({
            id: t._id,
            name: t.teamName,
            handle: t.codeforcesHandle,
          })),
          handles: match.sideA_handles,
          score: match.scoreA,

          questions: (match.status !== 'waiting' && (teamSide === 'A' || match.status === 'completed'))
            ? (match.questionPoolA as any[]).map(q => ({
              id: q._id,
              contestId: q.contestId,
              problemIndex: q.problemIndex,
              name: q.name,
              url: q.url,
              solved: solvedByA.has(q._id.toString()),
            }))
            : [],
        },

        sideB: {
          teams: (match.sideB_teamIds as any[]).map(t => ({
            id: t._id,
            name: t.teamName,
            handle: t.codeforcesHandle,
          })),
          handles: match.sideB_handles,
          score: match.scoreB,

          questions: (match.status !== 'waiting' && (teamSide === 'B' || match.status === 'completed'))
            ? (match.questionPoolB as any[]).map(q => ({
              id: q._id,
              contestId: q.contestId,
              problemIndex: q.problemIndex,
              name: q.name,
              url: q.url,
              solved: solvedByB.has(q._id.toString()),
            }))
            : [],
        },

        status: match.status,
        winningSide: match.winningSide || null,
        timeRemaining,
        duration: match.duration,
        startTime: match.startTime,
        endTime: match.endTime,
      },
    });

  } catch (error: any) {
    console.error('Match fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching match details. Please try again.' },
      { status: 500 }
    );
  }
}
