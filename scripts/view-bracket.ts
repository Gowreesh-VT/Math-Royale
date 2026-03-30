/**
 * View Tournament Bracket Script
 * 
 * Usage:
 *   npx tsx scripts/view-bracket.ts
 * 
 * What it does:
 * - Displays complete tournament bracket state
 * - Shows all rounds (Quarterfinals, Semifinals, Finals)
 * - Shows team names, scores, status, winners
 * - Highlights current active round
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Round2Stage from '../src/models/Round2Stage';
import Match from '../src/models/Match';
import Team from '../src/models/Team';

dotenv.config({ path: '.env.local' });

async function viewBracket() {
  try {

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not found');
      process.exit(1);
    }

    await mongoose.connect(uri);
    
    console.log('\n🏆 ROUND 2 TOURNAMENT BRACKET');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const rounds = await Round2Stage.find({})
      .sort({ roundNumber: 1 })
      .lean();
    
    if (rounds.length === 0) {
      console.log('❌ Tournament not initialized yet');
      console.log('   Run: npm run initialize-tournament\n');
      process.exit(0);
    }
    
    let currentRound = 0;
    
    for (const round of rounds) {
      if (round.status === 'active') {
        currentRound = round.roundNumber;
        break;
      } else if (round.status === 'completed') {
        currentRound = round.roundNumber;
      }
    }
    
    if (currentRound === 0) {
      const pendingRound = rounds.find(r => r.status === 'pending');
      currentRound = pendingRound?.roundNumber || 1;
    }
    
    const roundNames: Record<number, string> = {
      1: 'Quarterfinals',
      2: 'Semifinals',
      3: 'Finals',
    };
    
    console.log(`📍 Current Round: ${roundNames[currentRound]} (${rounds.find(r => r.roundNumber === currentRound)?.status?.toUpperCase() || 'UNKNOWN'})\n`);
    
    for (const round of rounds) {
      const roundName = roundNames[round.roundNumber] || `Round ${round.roundNumber}`;
      const isCurrent = round.roundNumber === currentRound;
      
      console.log(`${isCurrent ? '▶️ ' : '  '} ${roundName.toUpperCase()} ${getTeamFormat(round.roundNumber)}`);
      console.log(`   Status: ${getStatusEmoji(round.status)} ${round.status.toUpperCase()}`);
      
      if (round.startTime) {
        console.log(`   Started: ${new Date(round.startTime).toLocaleString()}`);
      }
      if (round.endTime) {
        console.log(`   Ended: ${new Date(round.endTime).toLocaleString()}`);
      }
      
      const matches = await Match.find({ _id: { $in: round.matchIds } }).lean();
      
      if (matches.length === 0) {
        console.log('   No matches created yet\n');
        continue;
      }
      
      for (const match of matches) {
        console.log('   ┌─────────────────────────────────────────────────────────────');
        
        const sideATeams = await Team.find({ _id: { $in: match.sideA_teamIds } }).lean();
        const sideANames = sideATeams.map((t: any) => t.teamName).join(', ');
        const sideAWinner = match.winningSide === 'A' ? ' ✅ WINNER' : '';
        console.log(`   │ Side A: ${sideANames}`);
        console.log(`   │ Score:  ${match.scoreA}${sideAWinner}`);
        console.log('   │');

        const sideBTeams = await Team.find({ _id: { $in: match.sideB_teamIds } }).lean();
        const sideBNames = sideBTeams.map((t: any) => t.teamName).join(', ');
        const sideBWinner = match.winningSide === 'B' ? ' ✅ WINNER' : '';
        console.log(`   │ Side B: ${sideBNames}`);
        console.log(`   │ Score:  ${match.scoreB}${sideBWinner}`);
        console.log('   │');

        console.log(`   │ Match Status: ${match.status.toUpperCase()}`);
        
        if (match.status === 'active' && match.startTime) {
          const now = new Date();
          const start = new Date(match.startTime);
          const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
          const timeRemaining = Math.max(0, match.duration - elapsed);
          const minutes = Math.floor(timeRemaining / 60);
          const seconds = timeRemaining % 60;
          console.log(`   │ Time Remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
        
        console.log('   └─────────────────────────────────────────────────────────────');
      }
      
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Bracket view complete\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error viewing bracket:', error);
    process.exit(1);
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending': return '⏸️';
    case 'active': return '🔴';
    case 'completed': return '✅';
    default: return '❓';
  }
}

function getTeamFormat(roundNumber: number): string {
  switch (roundNumber) {
    case 1: return '(4v4)';
    case 2: return '(2v2)';
    case 3: return '(1v1)';
    default: return '';
  }
}

viewBracket();
