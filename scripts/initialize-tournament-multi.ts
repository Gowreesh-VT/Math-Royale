/**
 * Initialize Multi-Round Tournament (A, B, C)
 * 
 * Creates Round A with 1v1 matches from all qualifying teams
 * Round B and C created as empty (pending) - will be populated after each round
 * 
 * Prerequisites:
 * - Set hasRound2Access = true for participating teams in MongoDB
 * - Run seed-round2 script to seed questions
 * 
 * Usage:
 *   npm run initialize-tournament-multi
 * 
 * What it does:
 * - Fetches all teams with hasRound2Access = true
 * - Groups them into 1v1 matches for Round A
 * - Creates Round2Stage records for A, B, C (B and C empty/pending)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Team from '../src/models/Team';
import Round2Stage from '../src/models/Round2Stage';
import Match from '../src/models/Match';
import Round2Question from '../src/models/Round2Question';
import { TOW_INITIAL_SCORE } from '../src/lib/constants';

dotenv.config({ path: '.env.local' });

async function initializeTournamentMulti() {
  try {
    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    console.log('📋 Fetching all teams with hasRound2Access = true...');
    const allTeams = await Team.find({ hasRound2Access: true }).lean();
    
    if (allTeams.length < 2) {
      console.error(`Need at least 2 teams, found ${allTeams.length}`);
      process.exit(1);
    }
    
    console.log(`Found ${allTeams.length} teams for Round A\n`);
    allTeams.forEach((team, idx) => {
      console.log(`   ${idx + 1}. ${team.teamName} (${team.codeforcesHandle})`);
    });
    console.log('');

    console.log('Checking if tournament already exists...');
    const existingRoundA = await Round2Stage.findOne({ roundStage: 'A' });
    if (existingRoundA) {
      console.error('Tournament already initialized.');
      console.error('   Delete Round A, B, C from database first.');
      process.exit(1);
    }
    console.log('No existing tournament found\n');

    // Fetch questions for Round A
    console.log('Fetching questions for Round A...');
    const questionsA_all = await Round2Question.find({ 
      roundNumber: 1, 
      side: 'A' 
    }).lean();
    const questionsB_all = await Round2Question.find({ 
      roundNumber: 1, 
      side: 'B' 
    }).lean();
    
    if (questionsA_all.length < 4 || questionsB_all.length < 4) {
      console.error(`Need at least 4 questions per side.`);
      console.error(`   Found ${questionsA_all.length} for Side A, ${questionsB_all.length} for Side B.`);
      console.error('   Run: npm run seed-round2');
      process.exit(1);
    }
    
    console.log(`Found ${questionsA_all.length} questions for Side A`);
    console.log(`Found ${questionsB_all.length} questions for Side B\n`);

    // Create matches for Round A
    const numMatches = Math.floor(allTeams.length / 2);
    const remainingTeams = allTeams.length % 2;
    
    console.log(`Creating Round A matches...`);
    console.log(`   ${numMatches} full match(es) with 2 teams each`);
    if (remainingTeams > 0) {
      console.log(`   1 match with ${remainingTeams} team(s)\n`);
    }

    // Shuffle teams randomly
    const shuffled = [...Array(allTeams.length).keys()]
      .sort(() => Math.random() - 0.5);

    const matchIds: any[] = [];
    let matchNumber = 1;

    // Create matches in groups of 2 (1v1)
    for (let i = 0; i < shuffled.length; i += 2) {
      const teamIndices = shuffled.slice(i, Math.min(i + 2, shuffled.length));
      const matchTeams = teamIndices.map(idx => allTeams[idx]);

      if (matchTeams.length < 2) {
        console.log(`⚠️  Odd team found: ${matchTeams[0].teamName} - skipping (needs an opponent for 1v1)`);
        continue;
      }

      const halfPoint = Math.floor(matchTeams.length / 2);
      const sideA_teams = matchTeams.slice(0, halfPoint);
      const sideB_teams = matchTeams.slice(halfPoint);

      // Use first 4 questions for each side
      const questionIdsA = questionsA_all.slice(0, 4).map(q => q._id);
      const questionIdsB = questionsB_all.slice(0, 4).map(q => q._id);

      const match = await new Match({
        roundStage: 'A',
        matchNumber,
        sideA_teamIds: sideA_teams.map(t => t._id),
        sideA_handles: sideA_teams.map(t => t.codeforcesHandle).filter(Boolean),
        sideB_teamIds: sideB_teams.map(t => t._id),
        sideB_handles: sideB_teams.map(t => t.codeforcesHandle).filter(Boolean),
        scoreA: TOW_INITIAL_SCORE,
        scoreB: TOW_INITIAL_SCORE,
        status: 'waiting',
        questionPoolA: questionIdsA,
        questionPoolB: questionIdsB,
        duration: 1800, // 30 mins + 10 buffer
      }).save();

      console.log(`Match ${matchNumber} created (${sideA_teams.length}v${sideB_teams.length})`);
      console.log(`   Side A: ${sideA_teams.map(t => t.teamName).join(', ')}`);
      console.log(`   Side B: ${sideB_teams.map(t => t.teamName).join(', ')}\n`);
      
      matchIds.push(match._id);
      matchNumber++;
    }

    // Create Round2Stage records for A, B, C
    console.log('Creating Round2Stage records for all rounds...\n');
    
    const roundA = await Round2Stage.create({
      roundStage: 'A',
      roundName: 'Round A (Easy)',
      matchIds,
      totalTeams: allTeams.length,
      status: 'pending',
      duration: 1800,
    });

    const roundB = await Round2Stage.create({
      roundStage: 'B',
      roundName: 'Round B (Medium)',
      matchIds: [],
      totalTeams: 0,
      status: 'pending',
      duration: 1800,
    });

    const roundC = await Round2Stage.create({
      roundStage: 'C',
      roundName: 'Round C (Hard)',
      matchIds: [],
      totalTeams: 0,
      status: 'pending',
      duration: 2400,
    });

    console.log(`Round A: ${matchIds.length} match(es) created`);
    console.log(`Round B: Created (empty, will populate after Round A)`);
    console.log(`Round C: Created (empty, will populate after Round B)\n`);

    console.log('🎉 Tournament initialized successfully!\n');
    console.log('Next steps:');
    console.log('  1. Start Round A:  npm run start-round-multi A');
    console.log('  2. Teams compete for 40 minutes');
    console.log('  3. After all matches complete:');
    console.log('     npm run advance-round-multi A');
    console.log('  4. Round B auto-activates with remaining teams (40% eliminated)');
    console.log('  5. Repeat: npm run advance-round-multi B for Round C\n');

    process.exit(0);
  } catch (error: any) {
    console.error('Error initializing tournament:', error.message);
    console.error(error);
    process.exit(1);
  }
}

initializeTournamentMulti();