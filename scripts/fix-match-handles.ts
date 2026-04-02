import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import Match from '../src/models/Match';
import Team from '../src/models/Team';

dotenv.config({ path: '.env.local' });

async function fixMatchHandles() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in .env.local');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all matches that aren't completed yet
    const matches = await Match.find({ status: { $ne: 'completed' } });
    console.log(`🔍 Found ${matches.length} matches to check...\n`);

    for (const match of matches) {
      console.log(`Match ${match.matchNumber} (${match.roundStage}):`);
      
      // Fetch all teams for Side A
      const teamsA = await Team.find({ _id: { $in: match.sideA_teamIds } });
      const handlesA = teamsA.map(t => t.codeforcesHandle).filter(Boolean) as string[];
      
      // Fetch all teams for Side B
      const teamsB = await Team.find({ _id: { $in: match.sideB_teamIds } });
      const handlesB = teamsB.map(t => t.codeforcesHandle).filter(Boolean) as string[];

      // Check if update is needed
      const needsUpdate = 
        JSON.stringify(match.sideA_handles.sort()) !== JSON.stringify(handlesA.sort()) ||
        JSON.stringify(match.sideB_handles.sort()) !== JSON.stringify(handlesB.sort());

      if (needsUpdate) {
        console.log(`   ⚠️  Updating handles:`);
        console.log(`      Side A: [${match.sideA_handles}] → [${handlesA}]`);
        console.log(`      Side B: [${match.sideB_handles}] → [${handlesB}]`);
        
        match.sideA_handles = handlesA;
        match.sideB_handles = handlesB;
        await match.save();
        console.log(`   ✅ Match updated successfully.\n`);
      } else {
        console.log(`   ✅ Handles are already correct.\n`);
      }
    }

    console.log('🎉 Fix complete!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixMatchHandles();
