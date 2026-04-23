// ===========================================
// ROUND 2 TOURNAMENT QUESTIONS SEED SCRIPT
// Run with: npx tsx scripts/seed-tournament-questions.ts
// ===========================================

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import Round2Question from '../src/models/Round2Question';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI as string;


const ROUND_1_QUESTIONS = {
  // Quarterfinals
  sideA: [
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
  ],
  sideB: [
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
  ],
};

const ROUND_2_QUESTIONS = {
  // Semifinals
  sideA: [
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
  ],
  sideB: [
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
  ],
};

const ROUND_3_QUESTIONS = {
  // Finals
  sideA: [
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
  ],
  sideB: [
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
    { challengeSlug: 'maximum-sum-10-1', name: 'Maximum Sum (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/maximum-sum-10-1' },
    { challengeSlug: 'constructing-a-tree', name: 'Constructing a Tree (Backup)', url: 'https://www.hackerrank.com/contests/hack-the-interview-vi-asia-pacific/challenges/constructing-a-tree' },
  ],
};

async function seedRound2Questions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    console.log('Clearing existing tournament questions...');
    await Round2Question.deleteMany({});
    console.log('   ✓ Cleared\n');

    async function seedRoundQuestions(roundNumber: number, roundName: string, questions: { sideA: any[], sideB: any[] }) {
      console.log(`Seeding Round ${roundNumber} (${roundName}) questions...`);
      
      for (const q of questions.sideA) {
        await Round2Question.create({
          roundNumber,
          side: 'A',
          challengeSlug: q.challengeSlug,
          name: q.name,
          url: q.url,
        });
      }
      console.log(`   ✓ Side A: ${questions.sideA.length} questions`);
      
      for (const q of questions.sideB) {
        await Round2Question.create({
          roundNumber,
          side: 'B',
          challengeSlug: q.challengeSlug,
          name: q.name,
          url: q.url,
        });
      }
      console.log(`   ✓ Side B: ${questions.sideB.length} questions\n`);
    }

    await seedRoundQuestions(1, 'Quarterfinals', ROUND_1_QUESTIONS);
    await seedRoundQuestions(2, 'Semifinals', ROUND_2_QUESTIONS);
    await seedRoundQuestions(3, 'Finals', ROUND_3_QUESTIONS);
    
    console.log('═══════════════════════════════════════════════');
    console.log('Tournament Questions Seeded Successfully!');
    console.log('═══════════════════════════════════════════════');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedRound2Questions();
