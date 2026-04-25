/**
 * Auth helper — re-exported from server/lib for serverless use.
 */
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from './models.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, originalKey] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(
    Buffer.from(originalKey, 'hex'),
    Buffer.from(derivedKey, 'hex'),
  );
}

function serializeUser(user) {
  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    age: user.age,
    gender: user.gender,
  };
}

export async function createUserAccount({ username, email, password, age, gender }) {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection is not ready');
  }
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  }).lean();
  if (existingUser) {
    throw new Error('Username or email already exists. Please sign in.');
  }
  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    age: String(age).trim(),
    gender: String(gender).trim(),
    passwordHash: createPasswordHash(password),
  });
  return serializeUser(user);
}

export async function authenticateUser({ username, password }) {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection is not ready');
  }
  const normalizedUsername = normalizeUsername(username);
  const user = await User.findOne({ username: normalizedUsername });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid username or password.');
  }
  return serializeUser(user);
}
