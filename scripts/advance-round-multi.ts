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
    
    const teamScores = new Map<string, number>();
    for (const match of matches) {
      for (const teamId of [...match.sideA_teamIds, ...match.sideB_teamIds]) {
        teamScores.set(teamId.toString(), 0);
      }
    }
    
    const submissions = await MatchSubmission.find({ 
      matchId: { $in: currentRound.matchIds },
      verdict: 'OK'
    });
    
    for (const sub of submissions) {
      const current = teamScores.get(sub.teamId.toString()) || 0;
      teamScores.set(sub.teamId.toString(), current + sub.points);
    }
    
    const sortedTeams = Array.from(teamScores.entries()).sort((a, b) => b[1] - a[1]);
    const totalTeams = sortedTeams.length;
    
    if (totalTeams === 0) {
      console.error('No teams found participating in this round.');
      process.exit(1);
    }
    
    const targetAdvanceCount = fromRound === 'A' ? 12 : 6;
    const advanceCount = Math.min(totalTeams, targetAdvanceCount);
    const eliminateCount = totalTeams - advanceCount;
    
    const advancingTeamIds = sortedTeams.slice(0, advanceCount).map(t => new mongoose.Types.ObjectId(t[0]));
    const eliminatedTeamIds = sortedTeams.slice(advanceCount).map(t => new mongoose.Types.ObjectId(t[0]));
    
    console.log(`🏆 ${advanceCount} Teams Advancing`);
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