/**
 * Script to copy all collections from test database to HeatCode database
 * 
 * Usage: npm run copy-db
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function copyDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db!;
    
    // Get all collections from 'test' database
    const client = mongoose.connection.getClient();
    const testDb = client.db('test');
    const collections = await testDb.listCollections().toArray();
    
    console.log(`📚 Found ${collections.length} collections in 'test' database`);
    console.log('');

    // Create HeatCode database
    const heatCodeDb = client.db('HeatCode');
    
    let totalDocsCopied = 0;

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`📋 Copying collection: ${collectionName}`);
      
      // Get all documents from test collection
      const testCollection = testDb.collection(collectionName);
      const documents = await testCollection.find({}).toArray();
      
      // Insert into HeatCode database
      const heatCodeCollection = heatCodeDb.collection(collectionName);
      
      // Drop existing collection in HeatCode if it exists
      try {
        await heatCodeCollection.drop();
        console.log(`   🗑️  Dropped existing collection in HeatCode`);
      } catch (err) {
        // Collection doesn't exist, that's fine
      }

      if (documents.length === 0) {
        // Create empty collection
        await heatCodeDb.createCollection(collectionName);
        console.log(`   ✅ Created empty collection`);
      } else {
        // Insert all documents
        await heatCodeCollection.insertMany(documents);
        console.log(`   ✅ Copied ${documents.length} documents`);
        totalDocsCopied += documents.length;
      }

      // Copy indexes
      const indexes = await testCollection.indexes();
      if (indexes.length > 1) { // More than just _id index
        for (const index of indexes) {
          if (index.name !== '_id_') { // Skip default _id index
            try {
              const keys = index.key;
              const options: any = { name: index.name };
              if (index.unique) options.unique = true;
              if (index.sparse) options.sparse = true;
              await heatCodeCollection.createIndex(keys, options);
              console.log(`   📑 Copied index: ${index.name}`);
            } catch (err) {
              // Index might already exist
            }
          }
        }
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 COPY SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📚 Collections copied: ${collections.length}`);
    console.log(`📄 Total documents copied: ${totalDocsCopied}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ Successfully copied test → HeatCode');
    console.log('');
    console.log('Both databases now exist:');
    console.log('  • test (original)');
    console.log('  • HeatCode (copy)');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error copying database:', error);
    process.exit(1);
  }
}

copyDatabase();
