import { connectToDatabase } from './_shared/db.js';
import { getDatabaseHealth } from './_shared/database.js';
import { getGroqHealth } from './_shared/groq.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();
  } catch (dbErr) {
    console.error('[health] DB connection error:', dbErr);
  }
  const [database, ai] = await Promise.all([getDatabaseHealth(), getGroqHealth()]);
  return res.json({ success: true, status: { api: 'ok', database, ai } });
}
