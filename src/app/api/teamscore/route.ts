// ===========================================
// TEAM SCORE API ROUTE - Get/Update team scores
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import { TeamScore } from '@/models';
import { authOptions } from '../auth/[...nextauth]/route';

// GET - Fetch
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.teamId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const teamId = session.user.teamId;

    const teamScore = await TeamScore.findOne({ teamId });

    if (!teamScore) {
      return NextResponse.json({
        success: true,
        score: {
          solvedIndices: [],
          currentScore: 0,
          bingoLines: [],
          syncCount: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      score: {
        solvedIndices: teamScore.solvedIndices,
        currentScore: teamScore.currentScore,
        bingoLines: teamScore.bingoLines,
        syncCount: teamScore.syncCount,
        lastSubmissionTime: teamScore.lastSubmissionTime,
      },
    });
  } catch (error) {
    console.error('Team score GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error fetching team score' },
      { status: 500 }
    );
  }
}

// ===========================================
// POST ENDPOINT REMOVED FOR SECURITY
// ===========================================
// The POST endpoint has been intentionally removed to prevent score manipulation.
// Scores can ONLY be updated via /api/sync-score which validates submissions
// against the Codeforces API to ensure integrity.
// 
// If you need to reset or modify scores, use the scripts or
// direct database access with proper authorization.