import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import { processMatchSubmissions } from '@/services/TugOfWarScores';
import { fetchUserSubmissions } from '@/services/codeforcesService';
import { checkRateLimit } from '@/lib/rateLimit';
import mongoose from 'mongoose';

/**
 * POST /api/Round-2/sync
 * Sync Codeforces submissions and update match scores
 * AUTO-POLLING: Frontend polls this endpoint every 30 seconds during active matches
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.teamId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const teamId = session.user.teamId;

    const body = await req.json();
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId is required' },
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

    const match = await Match.findById(matchId);

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    const allTeamIds = [...match.sideA_teamIds, ...match.sideB_teamIds].map(id => id.toString());
    if (!allTeamIds.includes(teamId)) {
      return NextResponse.json(
        { error: 'Forbidden - You are not part of this match' },
        { status: 403 }
      );
    }


    // Rate limiting: 10 requests per minute per team
    const rateLimitKey = `tournament-sync:${teamId}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 10, 60000); // Fixed: 60000ms, not 60

    if (rateLimit.limited) {
      const resetIn = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${resetIn} seconds.` },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          }
        }
      );
    }

    if (match.status !== 'active') {
      return NextResponse.json(
        { error: `Match is not active (status: ${match.status})` },
        { status: 400 }
      );
    }

    const allHandles = [...match.sideA_handles, ...match.sideB_handles].filter(Boolean);

    const fetchPromises = allHandles.map(async (handle) => {
      try {
        const result = await fetchUserSubmissions(handle, true);
        return {
          handle,
          success: result.success,
          submissions: result.submissions || [],
          error: result.error,
        };
      } catch (error: any) {
        return {
          handle,
          success: false,
          submissions: [],
          error: error.message || 'Unknown error',
        };
      }
    });

    const results = await Promise.all(fetchPromises);

    const allSubmissions: any[] = [];
    const errors: string[] = [];

    for (const result of results) {
      if (result.success && result.submissions.length > 0) {
        allSubmissions.push(...result.submissions);
      } else if (result.error) {
        errors.push(`${result.handle}: ${result.error}`);
      }
    }

    const syncResult = await processMatchSubmissions(matchId, allSubmissions);

    return NextResponse.json({
      success: true,
      match: {
        matchId: match._id,
        scoreA: syncResult.scoreA,
        scoreB: syncResult.scoreB,
        newSubmissions: syncResult.newSubmissions,
        winningSide: syncResult.winningSide,
        isTimeout: syncResult.isTimeout,
        timeRemaining: syncResult.timeRemaining,
        status: syncResult.matchStatus,
      },
      warnings: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Sync error:', error); // Log detailed error server-side only
    return NextResponse.json(
      { error: 'An error occurred while syncing submissions. Please try again.' }, // Generic message
      { status: 500 }
    );
  }
}
