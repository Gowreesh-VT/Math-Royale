/**
 * SCRIPT: add-hr-questions.ts
 * Adds 'Maximum Sum' and 'Constructing a Tree' HackerRank questions to rounds A, B, C for all sides.
 * Updates both the Round2Question collection and existing Match documents.
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import Round2Question from '../src/models/Round2Question';
import Match from '../src/models/Match';

// Load config
const envPath = resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI as string;

const HR_QUESTIONS = [
  {
    name: 'Maximum Sum',
    challengeSlug: 'maximum-sum-10-1',
    url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1',
  },
  {
    name: 'Constructing a Tree',
    challengeSlug: 'constructing-a-tree',
    url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree',
  },
];

const ROUNDS = [
  { stage: 'A', number: 1 },
  { stage: 'B', number: 2 },
  { stage: 'C', number: 3 },
];

const SIDES: Array<'A' | 'B'> = ['A', 'B'];

async function addQuestions() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to:', mongoose.connection.name);

    for (const round of ROUNDS) {
      for (const side of SIDES) {
        console.log(`\nProcessing Round ${round.stage} (${round.number}), Side ${side}...`);

        const createdQuestionIds: mongoose.Types.ObjectId[] = [];

        for (const qData of HR_QUESTIONS) {
          // Check if it already exists for this round/side
          let q = await Round2Question.findOne({
            roundNumber: round.number,
            side: side,
            challengeSlug: qData.challengeSlug,
          });

          if (!q) {
            console.log(`- Creating question: ${qData.name}`);
            q = await Round2Question.create({
              roundNumber: round.number,
              side: side,
              challengeSlug: qData.challengeSlug,
              name: qData.name,
              url: qData.url,
            });
          } else {
            console.log(`- Already exists: ${qData.name}`);
          }
          createdQuestionIds.push(q._id as mongoose.Types.ObjectId);
        }

        // Update matches in this round stage
        const matches = await Match.find({ roundStage: round.stage });
        console.log(`- Found ${matches.length} matches for round stage ${round.stage}`);

        for (const match of matches) {
          const poolKey = side === 'A' ? 'questionPoolA' : 'questionPoolB';
          
          // Check if questions are already in the pool
          const existingPool = (match[poolKey] as mongoose.Types.ObjectId[]).map(id => id.toString());
          const toAdd = createdQuestionIds.filter(id => !existingPool.includes(id.toString()));

          if (toAdd.length > 0) {
            await Match.findByIdAndUpdate(match._id, {
              $addToSet: { [poolKey]: { $each: toAdd } }
            });
            console.log(`  - Match ${match.matchNumber}: Added ${toAdd.length} questions to ${poolKey}`);
          } else {
            console.log(`  - Match ${match.matchNumber}: Questions already in ${poolKey}`);
          }
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('HackerRank Questions Integration Completed!');
    console.log('═══════════════════════════════════════════════');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addQuestions();
