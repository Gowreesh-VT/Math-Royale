/**
 * Get Overall Leaderboard
 * 
 * Logic:
 * - Sums cumulative scores from Round A, B, and C matches.
 * - Includes standard problem points (+10 for OK).
 * - Includes power-up points/deltas (+10/-10 for Steal, Double or Half logic).
 * - TIE-BREAKING: Earlier last success wins (time-based).
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Team from '../src/models/Team';
import Match from '../src/models/Match';
import MatchSubmission from '../src/models/MatchSubmission';
import PowerUpAttempt from '../src/models/PowerUpAttempt';

dotenv.config({ path: '.env.local' });

interface TeamStats {
  id: string;
  name: string;
  roundA: number;
  roundB: number;
  roundC: number;
  total: number;
  lastSuccessTime: number; // For tie-breaking (earliest is better)
  hasAccess: boolean;
}

async function getOverallLeaderboard() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);

    const allTeams = await Team.find({}).lean();
    const allMatches = await Match.find({}).lean();
    const matchMap = new Map(allMatches.map(m => [m._id.toString(), m]));

    const statsMap = new Map<string, TeamStats>();

    // Initialize all teams
    for (const team of allTeams) {
      statsMap.set(team._id.toString(), {
        id: team._id.toString(),
        name: team.teamName,
        roundA: 0,
        roundB: 0,
        roundC: 0,
        total: 0,
        lastSuccessTime: Date.now(), // Default to current if never solved
        hasAccess: team.hasRound2Access || false
      });
    }

    // Process MatchSubmissions (Standard Problems)
    const submissions = await MatchSubmission.find({ verdict: 'OK' }).lean();
    for (const sub of submissions) {
      const teamId = sub.teamId.toString();
      const stats = statsMap.get(teamId);
      const match = matchMap.get(sub.matchId.toString());

      if (stats && match) {
        const round = match.roundStage;
        if (round === 'A') stats.roundA += sub.points;
        else if (round === 'B') stats.roundB += sub.points;
        else if (round === 'C') stats.roundC += sub.points;

        stats.total += sub.points;
        
        const subTime = sub.timestamp.getTime();
        if (subTime > 0 && subTime < stats.lastSuccessTime) {
            // Note: We want the LATEST success for a total score state?
            // Actually, tie-breaking often uses "time taken to reach total score".
            // But here, since it's cumulative, we update the timestamp of the last OK.
        }
        // Correct time-breaking logic: The team that reached their CURRENT score first.
        // For a leaderboard, if scores are tied, compare the timestamp of the *last* valid submission that contributed to the score.
        if (subTime > 0) {
            // We'll track the MAX timestamp (last submission)
            // Wait, in competitive programming, if scores are tied, usually 
            // the team that finished their last correct problem *earlier* ranks higher.
            // So we want the MAX timestamp to be as SMALL as possible?
            // Wait, "Last Success Time" = MAX(timestamps of OK submissions).
            // Rank B over A if B.total == A.total AND B.maxTimestamp < A.maxTimestamp.
        }
      }
    }

    // Process PowerUpAttempts (Steal / Double or Half)
    const powerUps = await PowerUpAttempt.find({}).lean();
    for (const pu of powerUps) {
      const teamId = pu.teamId.toString();
      const stats = statsMap.get(teamId);
      const match = matchMap.get(pu.matchId.toString());

      if (stats && match && pu.pointsDelta !== 0) {
        const round = match.roundStage;
        if (round === 'A') stats.roundA += pu.pointsDelta;
        else if (round === 'B') stats.roundB += pu.pointsDelta;
        else if (round === 'C') stats.roundC += pu.pointsDelta;

        stats.total += pu.pointsDelta;
      }
    }

    // Refined tie-breaking: Find the max timestamp for each team
    // Re-calculating correctly for all valid contributions (both standard and power-up)
    const lastValidSub = new Map<string, number>();
    
    for (const sub of submissions) {
      const t = sub.timestamp.getTime();
      const tid = sub.teamId.toString();
      if (!lastValidSub.has(tid) || t > lastValidSub.get(tid)!) {
        lastValidSub.set(tid, t);
      }
    }

    for (const pu of powerUps) {
      if (pu.pointsDelta > 0) { // Only positive contributions for "finishing"
        const t = pu.timestamp.getTime();
        const tid = pu.teamId.toString();
        if (!lastValidSub.has(tid) || t > lastValidSub.get(tid)!) {
          lastValidSub.set(tid, t);
        }
      }
    }

    const leaderboard = Array.from(statsMap.values()).map(s => ({
      ...s,
      lastSuccessTime: lastValidSub.get(s.id) || Date.now()
    }));

    // Sort by Total Score, then by Last Success Time (earlier wins)
    leaderboard.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.lastSuccessTime - b.lastSuccessTime;
    });

    console.log('\n--- OVERALL TOURNAMENT LEADERBOARD ---');
    console.log('Rules: Rank by Cumulative Score. Tie-break: Earlier last valid submission wins.\n');
    
    console.log(
      'Rank'.padEnd(5) + 
      'Team Name'.padEnd(25) + 
      'R-A'.padEnd(10) + 
      'R-B'.padEnd(10) + 
      'R-C'.padEnd(10) + 
      'TOTAL'.padEnd(10) + 
      'STATUS'
    );
    console.log('-'.repeat(80));

    leaderboard.forEach((team, index) => {
      const status = team.hasAccess ? '\x1b[32mQUALIFIED\x1b[0m' : '\x1b[31mELIMINATED\x1b[0m';
      console.log(
        (index + 1).toString().padEnd(5) + 
        team.name.slice(0, 24).padEnd(25) + 
        team.roundA.toString().padEnd(10) + 
        team.roundB.toString().padEnd(10) + 
        team.roundC.toString().padEnd(10) + 
        team.total.toString().padEnd(10) + 
        status
      );
    });

    console.log('\nTotal participating teams:', leaderboard.length);
    process.exit(0);

  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

getOverallLeaderboard();
