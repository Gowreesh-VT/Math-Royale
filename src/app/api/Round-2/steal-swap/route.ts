import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import PowerUpAttempt from '@/models/PowerUpAttempt';
import { STEAL_POWER_UP, executeQuestionSwap } from '@/services/powerUpService';

/**
 * POST /api/Round-2/steal-swap
 * Executes a one-time question swap after successful Steal power-up solve.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized - Please login' }, { status: 401 });
    }

    const { matchId, playerUnansweredIndex } = await req.json();

    if (!matchId || playerUnansweredIndex === undefined) {
      return NextResponse.json(
        { error: 'matchId and playerUnansweredIndex are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID format' }, { status: 400 });
    }

    if (!Number.isInteger(playerUnansweredIndex)) {
      return NextResponse.json({ error: 'playerUnansweredIndex must be an integer' }, { status: 400 });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.roundStage !== 'B') {
      return NextResponse.json({ error: 'Swap is only available in Semifinals' }, { status: 400 });
    }

    const teamId = session.user.teamId;
    const inMatch = [...match.sideA_teamIds, ...match.sideB_teamIds]
      .some((id) => id.toString() === teamId);

    if (!inMatch) {
      return NextResponse.json({ error: 'Forbidden - You are not part of this match' }, { status: 403 });
    }

    const solvedSteal = await PowerUpAttempt.exists({
      matchId: match._id,
      teamId: new mongoose.Types.ObjectId(teamId),
      powerUpKey: STEAL_POWER_UP.key,
      verdict: 'OK',
    });

    if (!solvedSteal) {
      return NextResponse.json({ error: 'Steal problem must be solved before swap' }, { status: 400 });
    }

    const alreadyUsedSwap = await PowerUpAttempt.exists({
      matchId: match._id,
      teamId: new mongoose.Types.ObjectId(teamId),
      powerUpKey: `${STEAL_POWER_UP.key}-swap`,
    });

    if (alreadyUsedSwap) {
      return NextResponse.json({ error: 'Swap already used for this match' }, { status: 400 });
    }

    const swapResult = await executeQuestionSwap(
      match._id,
      teamId,
      playerUnansweredIndex
    );

    if (!swapResult) {
      return NextResponse.json(
        { error: 'Swap failed. Ensure your selected question is unanswered and indices are valid.' },
        { status: 400 }
      );
    }

    await PowerUpAttempt.create({
      matchId: match._id,
      teamId: new mongoose.Types.ObjectId(teamId),
      side: match.sideA_teamIds.some((id) => id.toString() === teamId) ? 'A' : 'B',
      powerUpKey: `${STEAL_POWER_UP.key}-swap`,
      codeforcesHandle: session.user.codeforcesHandle || 'unknown',
      contestId: STEAL_POWER_UP.contestId,
      problemIndex: STEAL_POWER_UP.problemIndex,
      submissionId: Date.now(),
      verdict: 'SWAP_EXECUTED',
      pointsDelta: 0,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, swap: swapResult });
  } catch (error: any) {
    console.error('Steal swap error:', error);
    return NextResponse.json(
      { error: 'An error occurred while performing swap. Please try again.' },
      { status: 500 }
    );
  }
}
