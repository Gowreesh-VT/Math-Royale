/**
 * Script to stop Round 1 manually
 * 
 * Usage:
 *   npm run stop-round1
 * 
 * Or directly with ts-node:
 *   npx ts-node scripts/stop-round1.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import Round1Session from '../src/models/Round1Session';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cp_event';

async function stopRound1() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const session = await Round1Session.findOne();
    
    if (!session) {
      console.log('⚠️  No Round 1 session found.');
      await mongoose.disconnect();
      return;
    }

    if (!session.isActive) {
      console.log('⚠️  Round 1 is not currently active.');
      console.log(`   Last session ended at: ${session.endTime || 'N/A'}`);
      await mongoose.disconnect();
      return;
    }

    const now = new Date();
    const startTime = session.startTime ? new Date(session.startTime) : null;
    const elapsedMinutes = startTime 
      ? Math.floor((now.getTime() - startTime.getTime()) / 60000)
      : 0;

    session.isActive = false;
    session.endTime = now; // Update end time to current time
    await session.save();

    console.log('');
    console.log('🛑 Round 1 has been stopped!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Started at: ${startTime?.toLocaleString() || 'N/A'}`);
    console.log(`🏁 Stopped at: ${now.toLocaleString()}`);
    console.log(`⏱️  Duration: ${elapsedMinutes} minutes`);
    console.log(`📝 Planned duration: ${session.duration} minutes`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🔒 Grid access has been closed.');
    console.log('');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error stopping Round 1:', error);
    process.exit(1);
  }
}

stopRound1();
