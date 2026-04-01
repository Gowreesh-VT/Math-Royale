import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import fs from 'fs';
import Team from '../src/models/Team';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

interface TeamData {
  teamName: string;
  email: string;
  codeforcesHandle?: string;
}

function parseCSV(content: string): TeamData[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const team: any = {};
    
    headers.forEach((header, index) => {
      if (values[index]) {
        team[header] = values[index];
      }
    });
    
    return team;
  });
}

function parseJSON(content: string): TeamData[] {
  return JSON.parse(content);
}

async function importTeams(filePath: string) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Read file
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileExt = filePath.split('.').pop()?.toLowerCase();

    let teams: TeamData[];
    
    if (fileExt === 'csv') {
      console.log('Parsing CSV file...');
      teams = parseCSV(fileContent);
    } else if (fileExt === 'json') {
      console.log('📄 Parsing JSON file...');
      teams = parseJSON(fileContent);
    } else {
      console.error('Unsupported file format. Use .csv or .json');
      process.exit(1);
    }

    console.log(`📊 Found ${teams.length} teams to import`);
    console.log('');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < teams.length; i++) {
      const teamData = teams[i];
      
      try {
        // Validate required fields
        if (!teamData.teamName || !teamData.email) {
          console.log(`⚠️  [${i + 1}/${teams.length}] Skipping - Missing required fields:`, teamData);
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
          console.log(`⏭️  [${i + 1}/${teams.length}] Skipping - Already exists: ${teamData.teamName} (${teamData.email})`);
          skipCount++;
          continue;
        }

        // Create new team
        await Team.create({
          teamName: teamData.teamName,
          email: teamData.email,
          codeforcesHandle: teamData.codeforcesHandle || null,
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
    console.log('📊 IMPORT SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Successfully added: ${successCount}`);
    console.log(`⏭️  Skipped (duplicates): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`📝 Total processed: ${teams.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error importing teams:', error);
    process.exit(1);
  }
}

const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path');
  console.log('Usage: npm run import-teams <file.csv|file.json>');
  process.exit(1);
}

importTeams(resolve(process.cwd(), filePath));
