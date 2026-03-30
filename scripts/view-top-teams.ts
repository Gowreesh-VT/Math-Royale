/**
 * View Top 32 Teams Script (Score >= 0)
 * 
 * Usage:
 *   npx tsx scripts/view-top-teams.ts
 * 
 * What it does:
 * - Fetches teams with score >= 0
 * - Displays top 32 teams eligible for Round 2
 * - Shows current Round 2 access status
 * - Helps identify which teams should advance to Round 2
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { connectDB } from '@/lib/db';
import Team from '@/models/Team';
import TeamScore from '@/models/TeamScore';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function viewTopTeams() {
  try {
    await connectDB();
    
    console.log('\n🏆 TOP 32 TEAMS (Score > 0) - ROUND 1 LEADERBOARD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const teamScores = await TeamScore.find({ currentScore: { $gt: 0 } }).lean();
    
    if (teamScores.length === 0) {
      console.log('❌ No teams found with score ≥ 0');
      console.log('   Teams need to solve more problems and sync their submissions\n');
      process.exit(0);
    }
    

    const teams = await Team.find({}).lean();
    const teamMap = new Map(teams.map(t => [t._id.toString(), t]));
    
    const leaderboard = teamScores
      .map((score) => {
        const team = teamMap.get(score.teamId);
        if (!team) return null;
        
        return {
          teamId: team._id.toString(),
          teamName: team.teamName,
          score: score.currentScore,
          lastSubmissionTime: score.lastSubmissionTime,
          hasRound2Access: team.hasRound2Access || false,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      
      const timeA = a.lastSubmissionTime ? new Date(a.lastSubmissionTime).getTime() : Infinity;
      const timeB = b.lastSubmissionTime ? new Date(b.lastSubmissionTime).getTime() : Infinity;
      return timeA - timeB;
    });
    
    const top32 = leaderboard.slice(0, 32);
    
    console.log('Rank  Team Name                     Score  Round 2 Access  Last Submission');
    console.log('────  ──────────────────────────  ─────  ──────────────  ───────────────');
    
    top32.forEach((team, index) => {
      const rank = (index + 1).toString().padStart(4);
      const name = team.teamName.padEnd(28);
      const score = team.score.toString().padStart(5);
      const access = team.hasRound2Access ? '✅ Yes' : '❌ No ';
      const lastSub = team.lastSubmissionTime 
        ? new Date(team.lastSubmissionTime).toLocaleString()
        : 'N/A';
      
      console.log(`${rank}  ${name}  ${score}  ${access}          ${lastSub}`);
    });
    
    console.log('');
    
    const teamsWithAccess = top32.filter(t => t.hasRound2Access).length;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary:');
    console.log(`   Teams with score ≥ 0: ${leaderboard.length}`);
    console.log(`   Top 32 teams with Round 2 access: ${teamsWithAccess}/32`);
    
    if (teamsWithAccess === 32) {
      console.log('\n✅ All top 32 teams have Round 2 access!');
      console.log('   Ready to run: npm run initialize-tournament\n');
    } else if (teamsWithAccess === 0) {
      console.log('\n⚠️  No teams have Round 2 access yet');
      console.log('   You need to grant access to exactly 32 teams in MongoDB:');
      console.log('   db.teams.updateMany(');
      console.log('     { _id: { $in: [ObjectId("..."), ObjectId("..."), ...] } },');
      console.log('     { $set: { hasRound2Access: true } }');
      console.log('   )\n');
      
      console.log('Team IDs for top 32:');
      top32.forEach(team => {
        console.log(`   ObjectId("${team.teamId}") // ${team.teamName}`);
      });
      console.log('');
    } else {
      console.log(`\n⚠️  Only ${teamsWithAccess} teams have Round 2 access`);
      console.log('   Need exactly 8 teams for tournament initialization\n');
      
      const missingAccess = top32.filter(t => !t.hasRound2Access);
      if (missingAccess.length > 0) {
        console.log('Teams missing access:');
        missingAccess.forEach(team => {
          console.log(`   - ${team.teamName} (ID: ${team.teamId})`);
        });
        console.log('');
      }
    }

    if (leaderboard.length > 8) {
      console.log('\n📋 Remaining teams (not qualifying):');
      const remaining = leaderboard.slice(8, Math.min(15, leaderboard.length));
      
      remaining.forEach((team, index) => {
        const rank = (index + 9).toString().padStart(4);
        const name = team.teamName.padEnd(28);
        const score = team.score.toString().padStart(5);
        console.log(`${rank}  ${name}  ${score}`);
      });
      
      if (leaderboard.length > 15) {
        console.log(`   ... and ${leaderboard.length - 15} more teams`);
      }
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error viewing top teams:', error);
    process.exit(1);
  }
}

viewTopTeams();
