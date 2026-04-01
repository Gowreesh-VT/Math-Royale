import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import Team from '../src/models/Team';
import Match from '../src/models/Match';
import MatchSubmission from '../src/models/MatchSubmission';

dotenv.config({ path: '.env.local' });

async function viewLeaderboard(stage?: 'A' | 'B' | 'C') {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);

    console.log(`\nFetching Leaderboard${stage ? ` for Round ${stage}` : ' (All Rounds)'}...`);

    let matchIds: mongoose.Types.ObjectId[] = [];
    if (stage) {
      const matches = await Match.find({ roundStage: stage });
      matchIds = matches.map((m) => m._id as mongoose.Types.ObjectId);
      if (matches.length === 0) {
        console.log(`No matches found for Round ${stage}.`);
      }
    }

    const teamScores = new Map<string, number>();
    
    const submissionQuery = matchIds.length > 0 ? { matchId: { $in: matchIds }, verdict: 'OK' } : { verdict: 'OK' };
    const submissions = await MatchSubmission.find(submissionQuery);

    for (const sub of submissions) {
      const current = teamScores.get(sub.teamId.toString()) || 0;
      teamScores.set(sub.teamId.toString(), current + sub.points);
    }

    const teams = await Team.find({}).lean();
    
    const activeTeams = teams.filter((t) => t.hasRound2Access || teamScores.has(t._id.toString()));

    const leaderboard = activeTeams.map((team) => {
      const points = teamScores.get(team._id.toString()) || 0;
      return {
        teamName: team.teamName || 'Unnamed Team',
        email: team.email,
        handle: team.codeforcesHandle || 'N/A',
        points,
      };
    });

    leaderboard.sort((a, b) => b.points - a.points);

    console.log('\n========================================================================');
    console.log('MATH-ROYALE LEADERBOARD');
    console.log('========================================================================');
    console.log(
      'Rank'.padEnd(6) + 
      'Team Name'.padEnd(25) + 
      'CF Handle'.padEnd(20) + 
      'Points'.padStart(8)
    );
    console.log('-'.repeat(65));

    leaderboard.forEach((entry, index) => {
      const rank = `#${index + 1}`.padEnd(6);
      let name = entry.teamName;
      if (name.length > 23) name = name.substring(0, 20) + '...';
      name = name.padEnd(25);
      
      let handle = entry.handle;
      if (handle.length > 18) handle = handle.substring(0, 15) + '...';
      handle = handle.padEnd(20);

      const points = String(entry.points || 0).padStart(8);

      console.log(`${rank}${name}${handle}${points}`);
    });

    console.log('========================================================================\n');

    process.exit(0);
  } catch (error: any) {
    console.error('Error generating leaderboard:', error.message);
    process.exit(1);
  }
}

const stageArg = process.argv[2] as 'A' | 'B' | 'C' | undefined;
if (stageArg && !['A', 'B', 'C'].includes(stageArg)) {
  console.error('\nInvalid stage argument. Use A, B, or C, or leave blank for total overall scores.');
  process.exit(1);
}

viewLeaderboard(stageArg);
