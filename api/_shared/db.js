/**
 * Shared MongoDB connection for Vercel serverless functions.
 * Caches the connection across warm invocations to avoid reconnecting on every request.
 */
import mongoose from 'mongoose';

let cached = global.__mongooseCache;

if (!cached) {
  cached = global.__mongooseCache = { conn: null, promise: null };
}

function getMongoUri() {
  return (
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGO_DB_URI ||
    ''
  );
}

export function isDatabaseConfigured() {
  return Boolean(getMongoUri());
}

export async function connectToDatabase() {
  const uri = getMongoUri();
  if (!uri) {
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
      })
      .then((m) => {
        cached.conn = m;
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
}
