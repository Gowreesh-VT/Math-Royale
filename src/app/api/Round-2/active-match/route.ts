import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';

/**
 * GET /api/Round-2/active-match
 * 
 * Finds the active match for the authenticated team
 * Returns matchId to redirect user to their match page
 */
export async function GET() {
  try {
    await connectDB();

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.teamId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const teamId = session.user.teamId;

    // Check if team has Round 2 access
    if (!session.user.hasRound2Access) {
      return NextResponse.json({
        success: false,
        message: 'not_qualified',
        error: 'You have not qualified for Round 2',
      });
    }

    const match = await Match.findOne({
      $or: [
        { sideA_teamIds: teamId },
        { sideB_teamIds: teamId },
      ],
    }).sort({ roundNumber: -1 });

    if (!match) {
      return NextResponse.json({
        success: false,
        message: 'no_match',
        error: 'No match found. Tournament may not have started yet.',
      });
    }

    if (match.status === 'waiting') {

      return NextResponse.json({
        success: true,
        message: 'waiting',
        matchId: match._id.toString(),
        roundNumber: match.roundNumber,
        status: 'waiting',
      });
    }

    if (match.status === 'completed') {
      const nextRound = match.roundNumber + 1;


      const isInSideA = match.sideA_teamIds.some((id: any) => id.toString() === teamId);
      const teamSide = isInSideA ? 'A' : 'B';

      if (match.winningSide === teamSide && nextRound <= 3) {

        const nextMatch = await Match.findOne({
          roundNumber: nextRound,
          $or: [
            { sideA_teamIds: teamId },
            { sideB_teamIds: teamId },
          ],
        });

        if (nextMatch) {
          return NextResponse.json({
            success: true,
            matchId: nextMatch._id.toString(),
            roundNumber: nextMatch.roundNumber,
            status: nextMatch.status,
          });
        }
      }

      return NextResponse.json({
        success: false,
        message: 'completed',
        matchId: match._id.toString(),
        roundNumber: match.roundNumber,
        winningSide: match.winningSide,
        teamAdvanced: match.winningSide === teamSide,
      });
    }

    return NextResponse.json({
      success: true,
      matchId: match._id.toString(),
      roundNumber: match.roundNumber,
      status: match.status,
    });

  } catch (error: any) {
    console.error('Active match fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching match. Please try again.' },
      { status: 500 }
    );
  }
}
