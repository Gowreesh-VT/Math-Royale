/**
 * Script to manually add teams
 * 
 * Edit the teams array below and run: npm run add-teams
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import Team from '../src/models/Team';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cp_event';

// ============================================
// EDIT YOUR TEAMS HERE
// ============================================
const teams = [
  { teamName: 'Team Jry jose', email: 'gowreesh287@gmail.com' },
  { teamName: 'Team Jy jose', email: 'gowreesh007@gmail.com' },
  { teamName: 'Teamfry jose', email: 'vt.gowreesh@gmail.com' },
  { teamName: 'Team Jeffr', email: 'gowreesh@gmail.com' },
  { teamName: 'Teeffry jose', email: 'gowreesh.vt2025@vitstudent.ac.in' },
  { teamName: 'Team Jeffr se', email: 'gowreesh3563562@gmail.com' },

];
// ============================================

async function addTeams() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB');
    console.log('');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < teams.length; i++) {
      const teamData = teams[i];
      
      try {
        // Validate required fields
        if (!teamData.teamName || !teamData.email) {
          console.log(`[${i + 1}/${teams.length}] Skipping - Missing required fields:`, teamData);
          skipCount++;
          continue;
        }

        // Check if team already exists
        const existing = await Team.findOne({
          $or: [
            { email: teamData.email },
            { teamName: teamData.teamName }
          ]
        });

        if (existing) {
          console.log(`[${i + 1}/${teams.length}] Skipping - Already exists: ${teamData.teamName} (${teamData.email})`);
          skipCount++;
          continue;
        }

        // Create new team
        await Team.create({
          teamName: teamData.teamName,
          email: teamData.email,
          codeforcesHandle: null,
          hasRound2Access: false,
        });

        console.log(`[${i + 1}/${teams.length}] Added: ${teamData.teamName} (${teamData.email})`);
        successCount++;
      } catch (error: any) {
        console.error(`[${i + 1}/${teams.length}] Error adding ${teamData.teamName}:`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Successfully added: ${successCount}`);
    console.log(`Skipped (duplicates): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total processed: ${teams.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error adding teams:', error);
    process.exit(1);
  }
}

addTeams();
