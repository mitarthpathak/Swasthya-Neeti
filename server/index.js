import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadRouter from './routes/upload.js';
import graphsRouter from './routes/graphs.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import transcribeRouter from './routes/transcribe.js';
import remindersRouter from './routes/reminders.js';
import { initializeDatabase, isDatabaseConfigured } from './lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3001);

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGO_URL ||
  process.env.MONGODB_URI ||
  process.env.MONGO_DB_URI;

if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(async () => {
      console.log('MongoDB connected successfully');
      if (isDatabaseConfigured()) {
        await initializeDatabase();
        console.log('Mongo chat storage ready');
      }
    })
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.warn('WARNING: Mongo URL not found in env. Persistence disabled.');
}

app.use(cors());
app.use(express.json());

app.use('/api', authRouter);
app.use('/api', chatRouter);
app.use('/api', transcribeRouter);
app.use('/api', uploadRouter);
app.use('/api', graphsRouter);
app.use('/api', remindersRouter);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
