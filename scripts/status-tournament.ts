/**
 * Check Tournament Status
 * 
 * Usage:
 *   npm run status-tournament
 * 
 * What it does:
 * - Shows current round and status
 * - Lists all teams still active
 * - Displays match scores and completion status
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Round2Stage from '../src/models/Round2Stage';
import Match from '../src/models/Match';
import Team from '../src/models/Team';

dotenv.config({ path: '.env.local' });

async function getStatusTournament() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    
    console.log('\n🏆 TOURNAMENT STATUS\n');
    console.log('━'.repeat(80));

    const rounds = await Round2Stage.find({}).sort({ roundStage: 1 }).lean();
    
    if (rounds.length === 0) {
      console.log('Tournament not initialized');
      process.exit(1);
    }

    for (const round of rounds) {
      const statusIcon = {
        pending: '⏳',
        active: '🔴',
        completed: '✅',
      }[round.status] || '❓';

      console.log(`\n${statusIcon} ${round.roundName}`);
      console.log('─'.repeat(80));
      console.log(`   Status: ${round.status.toUpperCase()}`);
      console.log(`   Teams: ${round.totalTeams}`);
      console.log(`   Matches: ${round.matchIds.length}`);
      console.log(`   Duration: ${Math.round(round.duration / 60)} minutes`);

      if (round.startTime) {
        console.log(`   Started: ${new Date(round.startTime).toLocaleString()}`);
      }
      if (round.endTime) {
        console.log(`   Ended: ${new Date(round.endTime).toLocaleString()}`);
      }

      if (round.matchIds.length === 0) {
        console.log(`   (No matches yet)`);
        continue;
      }

      const matches = await Match.find({ _id: { $in: round.matchIds } }).lean();

      let completed = 0;
      let active = 0;
      let waiting = 0;

      for (const match of matches) {
        if (match.status === 'completed') completed++;
        if (match.status === 'active') active++;
        if (match.status === 'waiting') waiting++;

        const teamsA = await Team.find({ _id: { $in: match.sideA_teamIds } }).lean();
        const teamsB = await Team.find({ _id: { $in: match.sideB_teamIds } }).lean();
        const namesA = teamsA.map((t: any) => t.teamName).join(', ') || 'None';
        const namesB = teamsB.map((t: any) => t.teamName).join(', ') || 'None';

        console.log(`\n   Match ${match.matchNumber}:`);
        console.log(`      Side A [${namesA}]: ${match.scoreA} points`);
        console.log(`      Side B [${namesB}]: ${match.scoreB} points`);
        console.log(`      Status: ${match.status}${match.winningSide ? ` - Side ${match.winningSide} WON` : ''}`);
      }

      console.log(`\n   Summary: ${completed} completed | ${active} active | ${waiting} waiting`);
    }

    console.log('\n' + '━'.repeat(80));
    console.log('\n');

    // Show remaining teams
    const activeTeams = await Team.find({ hasRound2Access: true }).lean();
    console.log(`👥 Teams Still Active: ${activeTeams.length}`);
    activeTeams.forEach((team, idx) => {
      console.log(`   ${idx + 1}. ${team.teamName} (${team.codeforcesHandle})`);
    });

    console.log('\n');
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error: any) {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

getStatusTournament();