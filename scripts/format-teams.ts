/**
 * Script to add "Team " prefix to all team names in CSV
 * 
 * Usage: npm run format-teams teams.csv teams-formatted.csv
 */

import fs from 'fs';
import { resolve } from 'path';

function formatTeamNames(inputFile: string, outputFile: string) {
  try {
    console.log(`Reading ${inputFile}...`);
    const content = fs.readFileSync(resolve(process.cwd(), inputFile), 'utf-8');
    
    const lines = content.trim().split('\n');
    const headers = lines[0];
    
    console.log(`Processing ${lines.length - 1} teams...`);
    
    const formattedLines = [headers];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const [teamName, ...rest] = line.split(',');
      
      // Check if already has "Team " prefix
      const formattedName = teamName.trim().startsWith('Team ') 
        ? teamName.trim() 
        : `Team ${teamName.trim()}`;
      
      formattedLines.push([formattedName, ...rest].join(','));
    }
    
    const outputContent = formattedLines.join('\n');
    fs.writeFileSync(resolve(process.cwd(), outputFile), outputContent, 'utf-8');
    
    console.log(`Formatted ${lines.length - 1} teams`);
    console.log(`Saved to ${outputFile}`);
    console.log('');
    console.log('Now run: npm run import-teams ' + outputFile);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const inputFile = process.argv[2];
const outputFile = process.argv[3] || 'teams-formatted.csv';

if (!inputFile) {
  console.error('Please provide input file');
  console.log('Usage: npm run format-teams <input.csv> [output.csv]');
  process.exit(1);
}

formatTeamNames(inputFile, outputFile);
