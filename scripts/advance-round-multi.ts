/**
 * Advance to Next Round (A→B, B→C)
 * 
 * Usage:
 *   npm run advance-round-multi A    # Round A → Round B
 *   npm run advance-round-multi B    # Round B → Round C
 * 
 * What it does:
 * - Validates all matches in current round are completed
 * - Eliminates losing teams based on thresholds
 * - Creates new matches for next round
 * - AUTO-ACTIVATES next round (teams can compete immediately)
 * 
 * Elimination Rules:
 * - Round A→B: Eliminate bottom 40%, advance 60%
 * - Round B→C: Eliminate bottom 60% of remaining, advance top 40%
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Round2Stage from '../src/models/Round2Stage';
import Match from '../src/models/Match';
import Round2Question from '../src/models/Round2Question';
import Team from '../src/models/Team';
import { getWinningTeamIds, getLosingTeamIds } from '../src/services/TugOfWarScores';
import { TOW_INITIAL_SCORE } from '../src/lib/constants';

dotenv.config({ path: '.env.local' });

type RoundStage = 'A' | 'B' | 'C';

async function advanceRoundMulti(fromRound: 'A' | 'B') {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);

    let nextRound: RoundStage;
    let eliminationPercent: number;

    if (fromRound === 'A') {
      nextRound = 'B';
      eliminationPercent = 40;
    } else if (fromRound === 'B') {
      nextRound = 'C';
      eliminationPercent = 60;
    } else {
      throw new Error('Invalid round');
    }

    console.log(`\n📊 Advancing from Round ${fromRound} → Round ${nextRound}`);
    console.log(`🔥 Elimination threshold: ${eliminationPercent}%\n`);

    // TODO: Add logic here

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const fromRound = process.argv[2] as 'A' | 'B';

if (!['A', 'B'].includes(fromRound)) {
  console.error('\n❌ Invalid usage');
  console.error('\nUsage:');
  console.error('  npm run advance-round-multi A   # Round A → Round B (eliminate 40%)');
  console.error('  npm run advance-round-multi B   # Round B → Round C (eliminate 60%)\n');
  process.exit(1);
}

advanceRoundMulti(fromRound);