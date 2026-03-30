// ===========================================
// DATABASE SEEDING SCRIPT
// Run with: npm run seed
// ===========================================

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { Question } from '../src/models';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI as string;

const round1Questions = [
  { gridIndex: 0, contestId: '1929', problemIndex: 'B', name: 'Sasha and the Drawing', points: 10, url: 'https://codeforces.com/problemset/problem/1929/B' },
  { gridIndex: 1, contestId: '1405', problemIndex: 'B', name: 'Array Cancellation', points: 10, url: 'https://codeforces.com/problemset/problem/1405/B' },
  { gridIndex: 2, contestId: '1744', problemIndex: 'D', name: 'Divisibility by 2^n', points: 10, url: 'https://codeforces.com/problemset/problem/1744/D' },
  { gridIndex: 3, contestId: '1714', problemIndex: 'E', name: 'Add Modulo 10', points: 10, url: 'https://codeforces.com/contest/1714/problem/E' },
  { gridIndex: 4, contestId: '1703', problemIndex: 'G', name: 'Good Key, Bad Key', points: 10, url: 'https://codeforces.com/contest/1703/problem/G' },
  { gridIndex: 5, contestId: '1490', problemIndex: 'B', name: 'Balanced Remainders', points: 10, url: 'https://codeforces.com/problemset/problem/1490/B' },
  { gridIndex: 6, contestId: '327', problemIndex: 'A', name: 'Flipping Game', points: 10, url: 'https://codeforces.com/problemset/problem/327/A' },
  { gridIndex: 7, contestId: '1854', problemIndex: 'A1', name: 'Dual', points: 10, url: 'https://codeforces.com/contest/1854/problem/A1' },
  { gridIndex: 8, contestId: '2094', problemIndex: 'F', name: 'Trulimero Trulicina', points: 10, url: 'https://codeforces.com/contest/2094/problem/F' },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await Question.deleteMany({});
    console.log('Cleared existing questions');

    const questions = await Question.insertMany(round1Questions);
    console.log(`Inserted ${questions.length} questions`);

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
