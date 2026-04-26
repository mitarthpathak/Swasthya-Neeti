import { connectToDatabase } from '../_shared/db.js';
import { createUserAccount, authenticateUser } from '../_shared/auth.js';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.url?.split('?')[0]?.replace(/^\/api\/auth\//, '') || '';

  try {
    await connectToDatabase();
  } catch (dbErr) {
    console.error('[auth] DB connection error:', dbErr);
    return res.status(503).json({ success: false, error: 'Database connection failed: ' + (dbErr.message || String(dbErr)) });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, error: 'Database connection is not ready' });
  }

  if (req.method === 'POST' && path === 'signup') {
    const { username = '', email = '', password = '', confirmPassword = '', age = '', gender = '' } = req.body || {};
    const u = String(username).trim(), e = String(email).trim(), p = String(password), cp = String(confirmPassword), a = String(age).trim(), g = String(gender).trim();

    if (!u || !e || !p || !cp || !a || !g) return res.status(400).json({ success: false, error: 'Please fill in all fields.' });
    if (!/\S+@\S+\.\S+/.test(e)) return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    if (p.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    if (p !== cp) return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    if (Number.isNaN(Number(a)) || Number(a) < 1 || Number(a) > 120) return res.status(400).json({ success: false, error: 'Please enter a valid age.' });
    if (!['Male','Female','Other','Prefer not to say'].includes(g)) return res.status(400).json({ success: false, error: 'Please select a valid gender.' });

    try {
      const user = await createUserAccount({ username: u, email: e, password: p, age: a, gender: g });
      return res.json({ success: true, user });
    } catch (error) {
      return res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create account' });
    }
  }

  if (req.method === 'POST' && path === 'signin') {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || !password) return res.status(400).json({ success: false, error: 'Username and password are required.' });

    try {
      const user = await authenticateUser({ username, password });
      return res.json({ success: true, user });
    } catch (error) {
      return res.status(401).json({ success: false, error: error instanceof Error ? error.message : 'Failed to sign in' });
    }
  }

  return res.status(404).json({ success: false, error: 'Not found' });
}
