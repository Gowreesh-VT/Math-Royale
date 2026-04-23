import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI as string;

async function dropIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const collection = mongoose.connection.collection('round2questions');
    console.log('Dropping index contestId_1_problemIndex_1...');
    await collection.dropIndex('contestId_1_problemIndex_1');
    console.log('Index dropped successfully.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    if (error.codeName === 'IndexNotFound' || error.message.includes('index not found')) {
      console.log('Index not found, continuing...');
      process.exit(0);
    }
    console.error('Error dropping index:', error);
    process.exit(1);
  }
}

dropIndex();
