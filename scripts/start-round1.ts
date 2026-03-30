/**
 * Script to start Round 1
 * 
 * Usage:
 *   npm run start-round1           # Default 1 hour (60 minutes)
 *   npm run start-round1 -- 120    # 2 hours (120 minutes)
 *   npm run start-round1 -- 90     # 1.5 hours (90 minutes)
 * 
 * Or directly with ts-node:
 *   npx ts-node scripts/start-round1.ts 120
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import Round1Session from '../src/models/Round1Session';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cp_event';

async function startRound1(durationMinutes: number = 60) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find existing session or create new one
    let session = await Round1Session.findOne();
    
    if (!session) {
      console.log('📝 Creating new Round 1 session...');
      session = new Round1Session();
    } else {
      console.log('📝 Found existing Round 1 session');
    }

    // Check if already active
    if (session.isActive) {
      console.log('⚠️  Round 1 is already active!');
      console.log(`   Started at: ${session.startTime}`);
      console.log(`   Ends at: ${session.endTime}`);
      console.log(`   Duration: ${session.duration} minutes`);
      
      const now = new Date();
      const endTime = new Date(session.endTime!);
      const timeLeft = Math.max(0, endTime.getTime() - now.getTime());
      const minutesLeft = Math.floor(timeLeft / 60000);
      console.log(`   Time remaining: ${minutesLeft} minutes`);
      
      await mongoose.disconnect();
      return;
    }

    // Set up new session
    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

    session.isActive = true;
    session.startTime = now;
    session.endTime = endTime;
    session.duration = durationMinutes;
    session.autoStop = true;

    await session.save();

    console.log('');
    console.log('🎉 Round 1 has been started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Start Time: ${now.toLocaleString()}`);
    console.log(`⏰ End Time: ${endTime.toLocaleString()}`);
    console.log(`⏱️  Duration: ${durationMinutes} minutes (${durationMinutes / 60} hours)`);
    console.log(`🔄 Auto-stop: ${session.autoStop ? 'Enabled' : 'Disabled'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✨ Participants can now access the grid!');
    console.log('');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error starting Round 1:', error);
    process.exit(1);
  }
}

// Get duration from command line arguments
const durationArg = process.argv[2];
const duration = durationArg ? parseInt(durationArg, 10) : 60;

if (isNaN(duration) || duration <= 0) {
  console.error('❌ Invalid duration. Please provide a positive number of minutes.');
  process.exit(1);
}

startRound1(duration);
