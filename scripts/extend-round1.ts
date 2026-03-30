/**
 * Script to extend Round 1 duration
 * 
 * Usage:
 *   npm run extend-round1 -- 30    # Add 30 more minutes
 *   npm run extend-round1 -- 60    # Add 1 more hour
 * 
 * Or directly with ts-node:
 *   npx ts-node scripts/extend-round1.ts 30
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import Round1Session from '../src/models/Round1Session';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cp_event';

async function extendRound1(additionalMinutes: number) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const session = await Round1Session.findOne();
    
    if (!session) {
      console.log('❌ No Round 1 session found.');
      await mongoose.disconnect();
      return;
    }

    if (!session.isActive) {
      console.log('⚠️  Round 1 is not currently active. Cannot extend.');
      console.log('   Use start-round1 script to start a new session.');
      await mongoose.disconnect();
      return;
    }

    const oldEndTime = session.endTime ? new Date(session.endTime) : null;
    if (!oldEndTime) {
      console.log('❌ Session end time is not set properly.');
      await mongoose.disconnect();
      return;
    }

    const newEndTime = new Date(oldEndTime.getTime() + additionalMinutes * 60 * 1000);
    const oldDuration = session.duration;
    const newDuration = oldDuration + additionalMinutes;

    session.endTime = newEndTime;
    session.duration = newDuration;
    await session.save();

    const now = new Date();
    const totalTimeLeft = Math.max(0, newEndTime.getTime() - now.getTime());
    const minutesLeft = Math.floor(totalTimeLeft / 60000);

    console.log('');
    console.log('⏰ Round 1 duration extended!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Original end time: ${oldEndTime.toLocaleString()}`);
    console.log(`🆕 New end time: ${newEndTime.toLocaleString()}`);
    console.log(`➕ Additional time: ${additionalMinutes} minutes`);
    console.log(`📊 Total duration: ${newDuration} minutes (${(newDuration / 60).toFixed(1)} hours)`);
    console.log(`⏱️  Time remaining: ${minutesLeft} minutes`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✨ Participants will see the updated timer automatically.');
    console.log('');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error extending Round 1:', error);
    process.exit(1);
  }
}

// Get additional minutes from command line arguments
const additionalMinutesArg = process.argv[2];

if (!additionalMinutesArg) {
  console.error('❌ Please provide the number of minutes to add.');
  console.error('   Usage: npm run extend-round1 -- <minutes>');
  console.error('   Example: npm run extend-round1 -- 30');
  process.exit(1);
}

const additionalMinutes = parseInt(additionalMinutesArg, 10);

if (isNaN(additionalMinutes) || additionalMinutes <= 0) {
  console.error('❌ Invalid duration. Please provide a positive number of minutes.');
  process.exit(1);
}

extendRound1(additionalMinutes);
