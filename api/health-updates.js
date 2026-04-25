import { fetchHealthUpdates } from './_shared/healthUpdates.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const updates = await fetchHealthUpdates();
    return res.json({ success: true, ...updates });
  } catch (error) {
    console.error('Health updates error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health updates',
    });
  }
}
