import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';
import Match from '../src/models/Match';
import Team from '../src/models/Team';
import Round2Question from '../src/models/Round2Question';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI as string;

async function updateActiveMatches() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.\n');

    const activeMatches = await Match.find({ status: 'active' });
    console.log(`Found ${activeMatches.length} active matches to update.\n`);

    for (const match of activeMatches) {
      console.log(`Updating Match: ${match._id} (Round ${match.roundStage})`);
      
      // 1. Set platform to HR
      match.platform = 'HR';

      // 2. Refresh Handles from Team model
      const sideATeams = await Team.find({ _id: { $in: match.sideA_teamIds } });
      const sideBTeams = await Team.find({ _id: { $in: match.sideB_teamIds } });

      match.sideA_handles = sideATeams.map(t => t.hackerRankHandle || t.codeforcesHandle).filter(Boolean) as string[];
      match.sideB_handles = sideBTeams.map(t => t.hackerRankHandle || t.codeforcesHandle).filter(Boolean) as string[];

      // 3. Refresh Question Pool
      // Map roundStage A/B/C to roundNumber 1/2/3
      const roundNum = match.roundStage === 'A' ? 1 : match.roundStage === 'B' ? 2 : 3;
      
      const questionsA = await Round2Question.find({ roundNumber: roundNum, side: 'A' });
      const questionsB = await Round2Question.find({ roundNumber: roundNum, side: 'B' });

      match.questionPoolA = questionsA.map(q => q._id as any);
      match.questionPoolB = questionsB.map(q => q._id as any);

      await match.save();
      console.log(`   ✓ Match ${match._id} updated successfully.`);
      console.log(`     Side A Handles: ${match.sideA_handles.join(', ')}`);
      console.log(`     Side B Handles: ${match.sideB_handles.join(', ')}\n`);
    }

    console.log('All active matches updated.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateActiveMatches();
