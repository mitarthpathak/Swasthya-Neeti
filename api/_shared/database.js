/**
 * Database health check helper for serverless functions.
 */
import mongoose from 'mongoose';
import { isDatabaseConfigured } from './db.js';

export { isDatabaseConfigured };

export async function getDatabaseHealth() {
  if (!isDatabaseConfigured()) {
    return { connected: false, reason: 'MONGO_URI is not set' };
  }
  try {
    if (mongoose.connection.readyState !== 1) {
      return { connected: false, reason: 'MongoDB connection is not ready' };
    }
    await mongoose.connection.db.admin().command({ ping: 1 });
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      reason: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}
