/**
 * Starts a tournament round and activates all matches
 * 
 * Usage:
 *   npm run start-round 1    # Start Quarterfinals
 *   npm run start-round 2    # Start Semifinals
 *   npm run start-round 3    # Start Finals
 * 
 * What it does:
 * - Validates round exists and is in 'pending' status
 * - Checks previous round is completed (if not Round 1)
 * - Sets round status to 'active' with startTime
 * - Activates all matches in the round
 * - Displays match details and expiration time
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Round2Stage from '../src/models/Round2Stage';
import Match from '../src/models/Match';
import Team from '../src/models/Team';

dotenv.config({ path: '.env.local' });

async function startRound() {
  try {

    const roundNumber = parseInt(process.argv[2]);
    
    if (!roundNumber || ![1, 2, 3].includes(roundNumber)) {
      console.error('❌ Invalid round number');
      console.error('Usage: npm run start-round <1|2|3>');
      console.error('  1 = Quarterfinals');
      console.error('  2 = Semifinals');
      console.error('  3 = Finals');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const round = await Round2Stage.findOne({ roundNumber });
    
    if (!round) {
      console.error(`❌ Round ${roundNumber} not found`);
      console.error('   Initialize tournament first: npm run initialize-tournament');
      process.exit(1);
    }

    console.log(`📋 Found Round: ${round.roundName}`);
    console.log(`   Status: ${round.status}`);
    console.log('');

    if (round.status === 'active') {
      console.error(`❌ Round ${roundNumber} is already active`);
      console.error(`   Started at: ${round.startTime}`);
      process.exit(1);
    }

    if (round.status === 'completed') {
      console.error(`❌ Round ${roundNumber} is already completed`);
      console.error(`   Ended at: ${round.endTime}`);
      process.exit(1);
    }

    if (roundNumber > 1) {
      const prevRound = await Round2Stage.findOne({ roundNumber: roundNumber - 1 });
      if (!prevRound || prevRound.status !== 'completed') {
        console.error(`❌ Round ${roundNumber - 1} must be completed first`);
        if (prevRound) {
          console.error(`   Current status: ${prevRound.status}`);
        }
        process.exit(1);
      }
      console.log(`✅ Previous round (${prevRound.roundName}) is completed\n`);
    }

    const startTime = new Date();
    const durationMs = round.duration * 1000; // Convert seconds to milliseconds
    const expirationTime = new Date(startTime.getTime() + durationMs);

    console.log('⏰ Starting round...');
    console.log(`   Start time: ${startTime.toISOString()}`);
    console.log(`   Duration: ${round.duration / 60} minutes (${round.duration} seconds)`);
    console.log(`   Will expire at: ${expirationTime.toISOString()}`);
    console.log('');

    round.status = 'active';
    round.startTime = startTime;
    await round.save();
    console.log('✅ Round status updated to active\n');

    const updateResult = await Match.updateMany(
      { _id: { $in: round.matchIds } },
      {
        status: 'active',
        startTime: startTime,
      }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} match(es) to active\n`);

    const matches = await Match.find({ _id: { $in: round.matchIds } }).lean();
    
    for (const match of matches) {
      console.log(`🏆 Match Details (ID: ${match._id}):`);
      
      const sideATeams = await Team.find({ _id: { $in: match.sideA_teamIds } }).lean();
      console.log('   Side A:');
      sideATeams.forEach((team, idx) => {
        console.log(`     ${idx + 1}. ${team.teamName} (${team.codeforcesHandle})`);
      });
      console.log(`     Score: ${match.scoreA}`);
      console.log(`     Question Pool: ${match.questionPoolA.length} questions`);
      
      const sideBTeams = await Team.find({ _id: { $in: match.sideB_teamIds } }).lean();
      console.log('   Side B:');
      sideBTeams.forEach((team, idx) => {
        console.log(`     ${idx + 1}. ${team.teamName} (${team.codeforcesHandle})`);
      });
      console.log(`     Score: ${match.scoreB}`);
      console.log(`     Question Pool: ${match.questionPoolB.length} questions`);
      console.log('');
    }

    console.log('🎉 Round started successfully!\n');
    console.log('Next steps:');
    console.log('  1. Teams can now submit solutions');
    console.log('  2. Sync submissions periodically: POST /api/Round-2/sync { roundNumber }');
    console.log('  3. Monitor will auto-end at expiration or when a side reaches 75 points');
    console.log('  4. After completion, advance to next round: npm run advance-round', roundNumber);
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error starting round:', error.message);
    console.error(error);
    process.exit(1);
  }
}

startRound();
