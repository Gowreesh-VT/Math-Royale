/**
 * Start a Round (A, B, or C)
 * 
 * Usage:
 *   npm run start-round-multi A    # Start Round A
 *   npm run start-round-multi B    # Start Round B
 *   npm run start-round-multi C    # Start Round C
 * 
 * What it does:
 * - Validates round exists and has matches
 * - Sets all matches in round to 'active' status
 * - Sets startTime and endTime for all matches
 * - Teams can now access their matches
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Round2Stage from '../src/models/Round2Stage';
import Match from '../src/models/Match';

dotenv.config({ path: '.env.local' });

type RoundStage = 'A' | 'B' | 'C';

async function startRoundMulti(roundStage: RoundStage) {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    
    console.log(`\nStarting Round ${roundStage}...\n`);

    const round = await Round2Stage.findOne({ roundStage });
    
    if (!round) {
      console.error(`Round ${roundStage} not found`);
      process.exit(1);
    }

    if (round.status === 'active') {
      console.error(`Round ${roundStage} is already active`);
      process.exit(1);
    }

    if (round.status === 'completed') {
      console.error(`Round ${roundStage} is already completed`);
      process.exit(1);
    }

    if (round.matchIds.length === 0) {
      console.error(`Round ${roundStage} has no matches`);
      process.exit(1);
    }

    // Activate all matches in this round
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + round.duration * 1000);

    await Match.updateMany(
      { _id: { $in: round.matchIds } },
      {
        status: 'active',
        startTime,
        endTime,
      }
    );

    // Update round status
    round.status = 'active';
    round.startTime = startTime;
    round.endTime = endTime;
    await round.save();

    const matches = await Match.find({ _id: { $in: round.matchIds } });

    console.log(`   Round ${roundStage} ACTIVATED!`);
    console.log(`   Round Name: ${round.roundName}`);
    console.log(`   Total matches: ${matches.length}`);
    console.log(`   Teams: ${round.totalTeams}`);
    console.log(`   Duration: ${round.duration} seconds (${Math.round(round.duration / 60)} minutes)`);
    console.log(`   Start time: ${startTime.toLocaleString()}`);
    console.log(`   End time: ${endTime.toLocaleString()}`);
    console.log(`\n Teams can now access Round ${roundStage} matches at /round2\n`);

    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error: any) {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

const roundStage = process.argv[2] as RoundStage;

if (!['A', 'B', 'C'].includes(roundStage)) {
  console.error('\nInvalid usage');
  console.error('\nUsage:');
  console.error('  npm run start-round-multi A   # Start Round A (Easy)');
  console.error('  npm run start-round-multi B   # Start Round B (Medium)');
  console.error('  npm run start-round-multi C   # Start Round C (Hard)\n');
  process.exit(1);
}

startRoundMulti(roundStage);