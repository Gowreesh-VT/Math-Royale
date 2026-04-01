import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Team from '../src/models/Team';

dotenv.config({ path: '.env.local' });

async function grantAllAccess() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const result = await Team.updateMany({}, { hasRound2Access: true });
  console.log(`Granted Round 2 access to ${result.modifiedCount} teams!`);
  process.exit(0);
}

grantAllAccess();
