/**
 * Initialize Tournament Script
 * 
 * Prerequisites:
 * - Manually set hasRound2Access = true for 4 teams (test mode) or 8 teams
 * - Run seed-round2 script to seed questions
 * 
 * Usage:
 *   npm run initialize-tournament
 * 
 * What it does:
 * - Fetches teams with hasRound2Access = true
 * - Supports 4 teams (2v2 test mode) or 8 teams (4v4 standard mode)
 * - Randomly shuffles teams into Side A and Side B
 * - Creates Round 1 match with question pools
 * - Creates Round2Stage record
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Team from '../src/models/Team';
import Round2Stage from '../src/models/Round2Stage';
import Match from '../src/models/Match';
import Round2Question from '../src/models/Round2Question';
import { TOW_INITIAL_SCORE } from '../src/lib/constants';

dotenv.config({ path: '.env.local' });

async function initializeTournament() {
  try {

    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('📋 Fetching teams with hasRound2Access = true...');
    const teams = await Team.find({ hasRound2Access: true }).lean();

    const isTestMode = teams.length === 4;
    const isStandardMode = teams.length === 8;

    if (!isTestMode && !isStandardMode) {
      console.error(`❌ Expected 4 (test) or 8 (standard) teams with hasRound2Access=true, found ${teams.length}`);
      console.error('   Set hasRound2Access = true for exactly 4 or 8 teams in MongoDB first.');
      process.exit(1);
    }

    console.log(`✅ Found ${teams.length} teams (${isTestMode ? 'TEST MODE 2v2' : 'STANDARD MODE 4v4'}):`);
    teams.forEach((team, idx) => {
      console.log(`   ${idx + 1}. ${team.teamName} (${team.codeforcesHandle})`);
    });
    console.log('');

    console.log('🔍 Checking if tournament already exists...');
    const existingRound = await Round2Stage.findOne({ roundNumber: 1 });
    if (existingRound) {
      console.error('❌ Tournament already initialized.');
      console.error('   Run DELETE /api/Round-2/initialize or manually delete from DB first.');
      process.exit(1);
    }
    console.log('✅ No existing tournament found\n');

    console.log('📚 Fetching questions for Quarterfinals...');
    const questionsA = await Round2Question.find({ roundNumber: 1, side: 'A' })
      .limit(4)
      .lean();
    const questionsB = await Round2Question.find({ roundNumber: 1, side: 'B' })
      .limit(4)
      .lean();
    
    if (questionsA.length < 4 || questionsB.length < 4) {
      console.error(`❌ Need 4 questions per side for Quarterfinals.`);
      console.error(`   Found ${questionsA.length} for Side A, ${questionsB.length} for Side B.`);
      console.error('   Run: npm run seed-round2');
      process.exit(1);
    }
    
    console.log(`✅ Found ${questionsA.length} questions for Side A`);
    console.log(`✅ Found ${questionsB.length} questions for Side B\n`);

    const questionIdsA = questionsA.map(q => q._id);
    const questionIdsB = questionsB.map(q => q._id);
    
    console.log('🎲 Randomly shuffling teams...');
    const shuffled = [...Array(teams.length).keys()].sort(() => Math.random() - 0.5);
    
    const halfPoint = Math.floor(teams.length / 2);
    const sideA_indices = shuffled.slice(0, halfPoint);
    const sideB_indices = shuffled.slice(halfPoint);
    
    const sideA_teams = sideA_indices.map(i => teams[i]);
    const sideB_teams = sideB_indices.map(i => teams[i]);
    
    console.log('✅ Team assignment:');
    console.log('   Side A:');
    sideA_teams.forEach((team, idx) => {
      console.log(`     ${idx + 1}. ${team.teamName} (${team.codeforcesHandle})`);
    });
    console.log('   Side B:');
    sideB_teams.forEach((team, idx) => {
      console.log(`     ${idx + 1}. ${team.teamName} (${team.codeforcesHandle})`);
    });
    console.log('');

    console.log(`🏆 Creating Round 1 match (${isTestMode ? '2v2' : '4v4'})...`);
    const match = await new Match({
      roundNumber: 1,
      sideA_teamIds: sideA_teams.map(t => t._id),
      sideA_handles: sideA_teams.map(t => t.codeforcesHandle).filter(Boolean),
      sideB_teamIds: sideB_teams.map(t => t._id),
      sideB_handles: sideB_teams.map(t => t.codeforcesHandle).filter(Boolean),
      scoreA: TOW_INITIAL_SCORE,
      scoreB: TOW_INITIAL_SCORE,
      status: 'waiting',
      questionPoolA: questionIdsA,
      questionPoolB: questionIdsB,
      duration: 1200,
    }).save();
    console.log(`✅ Match created with ID: ${match._id}\n`);

    console.log('📝 Creating Round2Stage record...');
    const round = await Round2Stage.create({
      roundNumber: 1,
      roundName: 'Quarterfinals',
      matchIds: [match._id],
      status: 'pending',
      duration: 1200,
    });
    console.log(`✅ Round2Stage created: ${round.roundName} (status: ${round.status})\n`);

    console.log('🎉 Tournament initialized successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start the round: POST /api/Round-2/start-round { roundNumber: 1 }');
    console.log('  2. Teams submit solutions during the match');
    console.log('  3. Sync submissions: POST /api/Round-2/sync { roundNumber: 1 }');
    console.log('  4. Advance to next round: npm run advance-round 1');
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error initializing tournament:', error.message);
    console.error(error);
    process.exit(1);
  }
}

initializeTournament();
