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

import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import Round2Stage from '../src/models/Round2Stage';
import Match from '../src/models/Match';
import MatchSubmission from '../src/models/MatchSubmission';
import Round2Question from '../src/models/Round2Question';
import PowerUpAttempt from '../src/models/PowerUpAttempt';
import Team from '../src/models/Team';
import { TOW_INITIAL_SCORE } from '../src/lib/constants';

dotenv.config({ path: '.env.local' });

type RoundStage = 'A' | 'B' | 'C';

async function advanceRoundMulti(fromRound: 'A' | 'B') {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found');
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

    console.log(`\nAdvancing from Round ${fromRound} → Round ${nextRound}`);
    console.log(`Elimination threshold: ${eliminationPercent}%\n`);

    const currentRound = await Round2Stage.findOne({ roundStage: fromRound });
    if (!currentRound) {
      console.error(`Round ${fromRound} not found`);
      process.exit(1);
    }
    
    if (currentRound.status !== 'completed') {
       const matches = await Match.find({ _id: { $in: currentRound.matchIds } });
       const allCompleted = matches.every(m => m.status === 'completed');
       
       if (!allCompleted) {
         console.error(`Round ${fromRound} has incomplete matches. Finish them first.`);
         process.exit(1);
       }
       console.log(`Auto-completing Round ${fromRound} since all matches finished...`);
       currentRound.status = 'completed';
       await currentRound.save();
    }
    
    const matches = await Match.find({ _id: { $in: currentRound.matchIds } });
    if (matches.length === 0) {
      console.error(`No matches found for Round ${fromRound}`);
      process.exit(1);
    }
    
    // 1. Identify all teams that participated in the current stage
    const participatingTeamIds = new Set<string>();
    for (const match of matches) {
      for (const tid of [...match.sideA_teamIds, ...match.sideB_teamIds]) {
        participatingTeamIds.add(tid.toString());
      }
    }

    if (participatingTeamIds.size === 0) {
      console.error('No teams found participating in this round.');
      process.exit(1);
    }

    // 2. Fetch ALL Matches across ALL stages to calculate CUMULATIVE score
    const allMatches = await Match.find({ 
      roundStage: { $in: fromRound === 'A' ? ['A'] : ['A', 'B'] } 
    }).lean();
    const matchIds = allMatches.map(m => m._id);

    // 3. Calculate Cumulative Scores and find the Last Valid Submission Time (for tie-breaking)
    const teamScores = new Map<string, number>();
    const teamLastSuccess = new Map<string, number>();

    // Initial scores for all participants
    for (const tid of participatingTeamIds) {
      teamScores.set(tid, 0);
      teamLastSuccess.set(tid, Date.now()); // Default to now
    }

    const submissions = await MatchSubmission.find({ 
      matchId: { $in: matchIds },
      verdict: 'OK'
    }).lean();

    const powerUpAttempts = await PowerUpAttempt.find({
      matchId: { $in: matchIds },
      pointsDelta: { $gt: 0 } // Only positive contributors for "last finish" time
    }).lean();

    // Standard scoring
    for (const sub of submissions) {
      const tid = sub.teamId.toString();
      if (participatingTeamIds.has(tid)) {
        teamScores.set(tid, (teamScores.get(tid) || 0) + sub.points);
        const t = sub.timestamp.getTime();
        if (!teamLastSuccess.has(tid) || t > teamLastSuccess.get(tid)!) {
           teamLastSuccess.set(tid, t);
        }
      }
    }

    // Power-up scoring (including penalties)
    const allPowerUpAttempts = await PowerUpAttempt.find({
        matchId: { $in: matchIds }
    }).lean();
    
    for (const pu of allPowerUpAttempts) {
        const tid = pu.teamId.toString();
        if (participatingTeamIds.has(tid)) {
          teamScores.set(tid, (teamScores.get(tid) || 0) + pu.pointsDelta);
          if (pu.pointsDelta > 0) {
            const t = pu.timestamp.getTime();
            if (!teamLastSuccess.has(tid) || t > teamLastSuccess.get(tid)!) {
              teamLastSuccess.set(tid, t);
            }
          }
        }
    }

    // 4. Ranking Logic with Time-Based Tie-Breaking
    const sortedTeams = Array.from(teamScores.entries()).sort((a, b) => {
      // Score (Descending)
      if (b[1] !== a[1]) return b[1] - a[1];
      // Time (Ascending - earlier is better)
      const timeA = teamLastSuccess.get(a[0]) || Date.now();
      const timeB = teamLastSuccess.get(b[0]) || Date.now();
      return timeA - timeB;
    });

    const totalInRound = sortedTeams.length;
    
    // 5. Percentage-Based Thresholds (60% for A, 40% for B)
    const percent = fromRound === 'A' ? 60 : 40;
    const advanceCount = Math.ceil((totalInRound * percent) / 100);
    const eliminateCount = totalInRound - advanceCount;
    
    const advancingTeamIds = sortedTeams.slice(0, advanceCount).map(t => new mongoose.Types.ObjectId(t[0]));
    const eliminatedTeamIds = sortedTeams.slice(advanceCount).map(t => new mongoose.Types.ObjectId(t[0]));
    
    console.log(`\n🏆 ${advanceCount} Teams Advancing (Top ${percent}% of ${totalInRound})`);
    console.log(`☠️  ${eliminateCount} Teams Eliminated`);
    
    if (eliminatedTeamIds.length > 0) {
      await Team.updateMany(
        { _id: { $in: eliminatedTeamIds } },
        { hasRound2Access: false }
      );
    }
    
    const nextRoundNumber = nextRound === 'B' ? 2 : 3;
    const questionsA_all = await Round2Question.find({ roundNumber: nextRoundNumber, side: 'A' }).lean();
    const questionsB_all = await Round2Question.find({ roundNumber: nextRoundNumber, side: 'B' }).lean();
    
    if (questionsA_all.length < 3 || questionsB_all.length < 3) {
      console.error(`Need at least 3 questions per side for Next Round (Phase ${nextRoundNumber}).`);
      process.exit(1);
    }
    
    const nextRoundObj = await Round2Stage.findOne({ roundStage: nextRound });
    if (!nextRoundObj) {
      console.error(`Round ${nextRound} Stage not found in database.`);
      process.exit(1);
    }
    
    if (nextRoundObj.status !== 'pending') {
      console.error(`Round ${nextRound} is already ${nextRoundObj.status}.`);
      process.exit(1);
    }
    
    const advancingTeamsData = await Team.find({ _id: { $in: advancingTeamIds } }).lean();
    const shuffledTeams = advancingTeamsData.sort(() => Math.random() - 0.5);
    
    const newMatchIds: mongoose.Types.ObjectId[] = [];
    let matchNumber = 1;
    
    console.log(`\nCreating Round ${nextRound} Matches...`);
    
    const startTime = new Date();
    const endTime = new Date(Date.now() + nextRoundObj.duration * 1000);

    for (let i = 0; i < shuffledTeams.length; i += 2) {
      const matchTeams = shuffledTeams.slice(i, Math.min(i + 2, shuffledTeams.length));
      
      if (matchTeams.length < 2) {
        console.log(`Odd team found: ${matchTeams[0].teamName} - skipping (needs opponent)`);
        continue;
      }
      
      const sideA_teams = [matchTeams[0]];
      const sideB_teams = [matchTeams[1]];
      
      const questionIdsA = questionsA_all.slice(0, 3).map(q => q._id);
      const questionIdsB = questionsB_all.slice(0, 3).map(q => q._id);
      
      const match = await new Match({
        roundStage: nextRound,
        matchNumber,
        sideA_teamIds: sideA_teams.map(t => t._id),
        sideA_handles: sideA_teams.map(t => t.codeforcesHandle).filter(Boolean),
        sideB_teamIds: sideB_teams.map(t => t._id),
        sideB_handles: sideB_teams.map(t => t.codeforcesHandle).filter(Boolean),
        scoreA: TOW_INITIAL_SCORE,
        scoreB: TOW_INITIAL_SCORE,
        status: 'active',
        questionPoolA: questionIdsA,
        questionPoolB: questionIdsB,
        duration: nextRoundObj.duration,
        startTime,
        endTime
      }).save();
      
      newMatchIds.push(match._id as mongoose.Types.ObjectId);
      
      console.log(`Match ${matchNumber} created (${sideA_teams.length}v${sideB_teams.length})`);
      matchNumber++;
    }
    
    nextRoundObj.matchIds = newMatchIds;
    nextRoundObj.totalTeams = advancingTeamsData.length;
    nextRoundObj.status = 'active';
    nextRoundObj.startTime = startTime;
    nextRoundObj.endTime = endTime;
    await nextRoundObj.save();
    
    console.log(`\nRound ${nextRound} is now ACTIVE! Teams can start solving.`);
    
    process.exit(0);

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

const fromRound = process.argv[2] as 'A' | 'B';

if (!['A', 'B'].includes(fromRound)) {
  console.error('\nInvalid usage');
  console.error('\nUsage:');
  console.error('  npm run advance-round-multi A   # Round A → Round B (eliminate 40%)');
  console.error('  npm run advance-round-multi B   # Round B → Round C (eliminate 60%)\n');
  process.exit(1);
}

advanceRoundMulti(fromRound);