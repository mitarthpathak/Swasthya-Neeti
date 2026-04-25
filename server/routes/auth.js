import express from 'express';
import mongoose from 'mongoose';
import { createUserAccount, authenticateUser } from '../lib/auth.js';
import { isDatabaseConfigured } from '../lib/database.js';

const router = express.Router();

function ensureDatabaseReady(res) {
  if (!isDatabaseConfigured()) {
    res.status(500).json({
      success: false,
      error: 'Database is not configured on the server',
    });
    return false;
  }

  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      error: 'Database connection is not ready',
    });
    return false;
  }

  return true;
}

router.post('/auth/signup', async (req, res) => {
  if (!ensureDatabaseReady(res)) {
    return;
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';
  const age = typeof req.body?.age === 'string' ? req.body.age.trim() : String(req.body?.age || '').trim();
  const gender = typeof req.body?.gender === 'string' ? req.body.gender.trim() : '';

  if (!username || !email || !password || !confirmPassword || !age || !gender) {
    return res.status(400).json({
      success: false,
      error: 'Please fill in all fields.',
    });
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters.',
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'Passwords do not match.',
    });
  }

  if (Number.isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid age.',
    });
  }

  if (!['Male', 'Female', 'Other', 'Prefer not to say'].includes(gender)) {
    return res.status(400).json({
      success: false,
      error: 'Please select a valid gender.',
    });
  }

  try {
    const user = await createUserAccount({
      username,
      email,
      password,
      age,
      gender,
    });

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account',
    });
  }
});

router.post('/auth/signin', async (req, res) => {
  if (!ensureDatabaseReady(res)) {
    return;
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required.',
    });
  }

  try {
    const user = await authenticateUser({ username, password });
    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign in',
    });
  }
});

export default router;
