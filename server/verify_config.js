import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabaseHealth } from './lib/database.js';
import { getGroqHealth, generateHealthReply, isGroqConfigured } from './lib/groq.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verify() {
  console.log('--- Verification Started ---');

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGO_DB_URI;

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
    } catch (error) {
      console.error('Mongo connection bootstrap failed:', error instanceof Error ? error.message : error);
    }
  }

  const databaseHealth = await getDatabaseHealth();
  if (databaseHealth.connected) {
    console.log('Database: connected to MongoDB');
  } else {
    console.log(`Database: not ready (${databaseHealth.reason})`);
  }

  const groqHealth = await getGroqHealth();
  console.log(`Groq: ${groqHealth.configured ? 'configured' : 'missing key'} (model: ${groqHealth.model})`);

  if (isGroqConfigured()) {
    try {
      const response = await generateHealthReply({
        message: 'Say "Swasthya-Neeti is ready."',
        history: [],
        language: 'English',
      });
      console.log(`Groq test reply: ${response.content}`);
    } catch (error) {
      console.error('Groq test failed:', error instanceof Error ? error.message : error);
    }
  }

  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  console.log('--- Verification Finished ---');
}

verify();
