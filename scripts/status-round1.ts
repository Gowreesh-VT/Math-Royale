/**
 * Script to check Round 1 status
 * 
 * Usage:
 *   npm run status-round1
 * 
 * Or directly with ts-node:
 *   npx ts-node scripts/status-round1.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import Round1Session from '../src/models/Round1Session';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cp_event';

async function checkRound1Status() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const session = await Round1Session.findOne();
    
    if (!session) {
      console.log('📊 Round 1 Status: NOT CONFIGURED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('No Round 1 session exists yet.');
      console.log('Run "npm run start-round1" to initialize and start Round 1.');
      console.log('');
      await mongoose.disconnect();
      return;
    }

    const now = new Date();
    
    // Check if session should be auto-stopped
    if (session.isActive && session.endTime && session.autoStop) {
      const endTime = new Date(session.endTime);
      if (now.getTime() >= endTime.getTime()) {
        session.isActive = false;
        await session.save();
        console.log('⚙️  Auto-stopped expired session\n');
      }
    }
    
    console.log(`📊 Round 1 Status: ${session.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (session.isActive && session.startTime && session.endTime) {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      const timeElapsed = now.getTime() - startTime.getTime();
      const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
      
      const elapsedMinutes = Math.floor(timeElapsed / 60000);
      const remainingMinutes = Math.floor(timeRemaining / 60000);
      const remainingHours = Math.floor(remainingMinutes / 60);
      const remainingMins = remainingMinutes % 60;
      
      console.log(`📅 Started: ${startTime.toLocaleString()}`);
      console.log(`🏁 Ends: ${endTime.toLocaleString()}`);
      console.log(`⏱️  Total Duration: ${session.duration} minutes (${(session.duration / 60).toFixed(1)} hours)`);
      console.log(`⏰ Elapsed: ${elapsedMinutes} minutes`);
      console.log(`⏳ Remaining: ${remainingHours}h ${remainingMins}m`);
      console.log(`🔄 Auto-stop: ${session.autoStop ? 'Enabled' : 'Disabled'}`);
      
      if (timeRemaining === 0) {
        console.log('');
        console.log('⚠️  TIME HAS EXPIRED!');
        if (session.autoStop) {
          console.log('   Round will auto-stop on next status check.');
        } else {
          console.log('   Run "npm run stop-round1" to manually stop.');
        }
      }
    } else {
      console.log(`Last session ended: ${session.endTime?.toLocaleString() || 'N/A'}`);
      console.log(`Duration: ${session.duration} minutes`);
      console.log('');
      console.log('To start a new session, run:');
      console.log('  npm run start-round1        # 1 hour (default)');
      console.log('  npm run start-round1 -- 120 # 2 hours');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error checking Round 1 status:', error);
    process.exit(1);
  }
}

checkRound1Status();
