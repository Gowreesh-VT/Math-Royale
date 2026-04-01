import dotenv from 'dotenv';
import { connectDB } from '@/lib/db';
import Round2Round from '@/models/Round2Stage';
import Match from '@/models/Match';
import Round2Question from '@/models/Round2Question';
import Team from '@/models/Team';
import { getWinningTeamIds, getLosingTeamIds } from '@/services/TugOfWarScores';
import { TOW_INITIAL_SCORE } from '@/lib/constants';

dotenv.config({ path: '.env.local' });

async function advanceRound(fromRound: 1 | 2) {
  try {
    await connectDB();
    
    console.log(`\n🔄 Advancing from Round ${fromRound}...\n`);

    const currentRound = await Round2Round.findOne({ roundNumber: fromRound });
    
    if (!currentRound) {
      console.error(`❌ Round ${fromRound} not found`);
      process.exit(1);
    }
    
    // Check if all matches in this round are completed
    const matches = await Match.find({ _id: { $in: currentRound.matchIds } });
    const allMatchesCompleted = matches.every(match => match.status === 'completed');
    
    if (!allMatchesCompleted) {
      const incompleteCount = matches.filter(m => m.status !== 'completed').length;
      console.error(`❌ Round ${fromRound} has ${incompleteCount} incomplete match(es)`);
      matches.forEach(match => {
        console.error(`   Match ${match._id}: status=${match.status}`);
      });
      process.exit(1);
    }
    
    // Auto-update round status to completed if needed
    if (currentRound.status !== 'completed') {
      console.log(`📝 All matches completed, updating Round ${fromRound} status to 'completed'...`);
      currentRound.status = 'completed';
      currentRound.endTime = new Date();
      await currentRound.save();
    }
    
    const nextRoundNumber = fromRound + 1;
    const existingNextRound = await Round2Round.findOne({ roundNumber: nextRoundNumber });
    
    if (existingNextRound) {
      console.error(`❌ Round ${nextRoundNumber} already exists`);
      process.exit(1);
    }
    
    console.log(`Found ${matches.length} match(es) in Round ${fromRound}`);
    
    for (const match of matches) {
      if (!match.winningSide) {
        console.error(`❌ Match has no winner. Resolve ties first.`);
        process.exit(1);
      }
      console.log(`  Match: Side ${match.winningSide} won`);
    }
  
    const winningTeamIds: any[] = [];
    const losingTeamIds: any[] = [];
    
    for (const match of matches) {
      winningTeamIds.push(...getWinningTeamIds(match));
      losingTeamIds.push(...getLosingTeamIds(match));
    }
    
    console.log(`\n📊 Winners: ${winningTeamIds.length} teams`);
    console.log(`📊 Losers: ${losingTeamIds.length} teams`);
    
    await Team.updateMany(
      { _id: { $in: losingTeamIds } },
      { hasRound2Access: false }
    );
    
    console.log(`✅ Eliminated ${losingTeamIds.length} teams\n`);

    const questionsA = await Round2Question.find({ roundNumber: nextRoundNumber, side: 'A' }).lean();
    const questionsB = await Round2Question.find({ roundNumber: nextRoundNumber, side: 'B' }).lean();
    
    if (questionsA.length < 4 || questionsB.length < 4) {
      console.error(`❌ Need at least 4 questions per side for Round ${nextRoundNumber}`);
      console.error(`   Found ${questionsA.length} for Side A, ${questionsB.length} for Side B`);
      console.error(`   Run: npm run seed-r2`);
      process.exit(1);
    }

    const questionIdsA = questionsA.slice(0, 4).map(q => q._id);
    const questionIdsB = questionsB.slice(0, 4).map(q => q._id);

    // Fetch winning teams and create a map for easy lookup
    const winningTeamsData = await Team.find({ _id: { $in: winningTeamIds } }).lean();
    const teamMap = new Map(winningTeamsData.map(t => [t._id.toString(), t]));
    
    let newMatch;
    let roundName = '';
    
    if (fromRound === 1) {

      roundName = 'Semifinals';
      if (winningTeamIds.length < 2) {
        console.error(`❌ Need at least 2 winning teams for Semifinals, found ${winningTeamIds.length}`);
        process.exit(1);
      }

      const shuffled = [...Array(winningTeamIds.length).keys()]
        .sort(() => Math.random() - 0.5);
      
      let sideA_indices, sideB_indices;
      if (winningTeamIds.length === 2) {
        sideA_indices = [shuffled[0]];
        sideB_indices = [shuffled[1]];
      } else {
        sideA_indices = shuffled.slice(0, 2);
        sideB_indices = shuffled.slice(2, 4);
      }
      
      const sideA_teamIds = sideA_indices.map(i => winningTeamIds[i]);
      const sideB_teamIds = sideB_indices.map(i => winningTeamIds[i]);
      
      // Get teams using the map to ensure correct order
      const sideA_teams = sideA_teamIds.map(id => teamMap.get(id.toString()));
      const sideB_teams = sideB_teamIds.map(id => teamMap.get(id.toString()));
      
      console.log(`Creating Semifinals (2v2) with random assignment:`);
      console.log(`  Side A: ${sideA_teams.map(t => t?.teamName).join(', ')}`);
      console.log(`  Side B: ${sideB_teams.map(t => t?.teamName).join(', ')}`);
      
      newMatch = await new Match({
        roundNumber: 2,
        sideA_teamIds,
        sideA_handles: sideA_teams.map(t => t?.codeforcesHandle).filter(Boolean),
        sideB_teamIds,
        sideB_handles: sideB_teams.map(t => t?.codeforcesHandle).filter(Boolean),
        scoreA: TOW_INITIAL_SCORE,
        scoreB: TOW_INITIAL_SCORE,
        status: 'waiting',
        questionPoolA: questionIdsA,
        questionPoolB: questionIdsB,
        duration: 2700,
      }).save();
    } else if (fromRound === 2) {

      roundName = 'Finals';
      if (winningTeamIds.length < 2) {
        console.error(`❌ Need 2 winning teams for Finals, found ${winningTeamIds.length}`);
        process.exit(1);
      }

      const randomIndex = Math.random() < 0.5 ? 0 : 1;
      const sideA_index = randomIndex;
      const sideB_index = 1 - randomIndex;
      
      const sideA_teamId = winningTeamIds[sideA_index];
      const sideB_teamId = winningTeamIds[sideB_index];
      
      const sideA_team = teamMap.get(sideA_teamId.toString());
      const sideB_team = teamMap.get(sideB_teamId.toString());
      
      console.log(`Creating Finals (1v1) with random assignment:`);
      console.log(`  Side A: ${sideA_team?.teamName}`);
      console.log(`  Side B: ${sideB_team?.teamName}`);
      
      newMatch = await new Match({
        roundNumber: 3,
        sideA_teamIds: [sideA_teamId],
        sideA_handles: [sideA_team?.codeforcesHandle].filter(Boolean),
        sideB_teamIds: [sideB_teamId],
        sideB_handles: [sideB_team?.codeforcesHandle].filter(Boolean),
        scoreA: TOW_INITIAL_SCORE,
        scoreB: TOW_INITIAL_SCORE,
        status: 'waiting',
        questionPoolA: questionIdsA,
        questionPoolB: questionIdsB,
        duration: 2700,
      }).save();
    }
    
    const newRound = await Round2Round.create({
      roundNumber: nextRoundNumber,
      roundName,
      matchIds: [newMatch!._id],
      status: 'pending',
      duration: 2700,
    });
    
    console.log(`\n✅ Successfully created ${roundName}!`);
    console.log(`   Round ${nextRoundNumber} status: ${newRound.status}`);
    console.log(`   Match ID: ${newMatch!._id}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Start the round: POST /api/tournament-r2/start-round { roundNumber: ${nextRoundNumber} }`);
    console.log(`  2. Teams begin solving questions`);
    console.log(`  3. Auto-sync every 30 seconds updates scores\n`);
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

const fromRound = parseInt(process.argv[2]);

if (![1, 2].includes(fromRound)) {
  console.error('\n❌ Invalid usage');
  console.error('\nUsage:');
  console.error('  npm run advance-round 1   # Quarterfinals → Semifinals');
  console.error('  npm run advance-round 2   # Semifinals → Finals\n');
  process.exit(1);
}

advanceRound(fromRound as 1 | 2);
