import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function clean() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db;

  // Drop collections to clear legacy indexes (like roundNumber)
  console.log('Dropping collections...');
  try { await db?.collection('round2stages').drop(); } catch(e) {}
  try { await db?.collection('matches').drop(); } catch(e) {}
  try { await db?.collection('matchsubmissions').drop(); } catch(e) {}
  
  // Re-sync Indexes for models
  await require('../src/models/Round2Stage').default.init();
  await require('../src/models/Match').default.init();
  
  console.log('Collections dropped successfully and indexes rebuilt');
  process.exit(0);
}

clean();
