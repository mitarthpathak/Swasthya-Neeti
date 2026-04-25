import { connectToDatabase } from './_shared/db.js';
import { Graph } from './_shared/models.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await connectToDatabase();

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userEmail = url.searchParams.get('userEmail') || '';
    const query = userEmail ? { userEmail } : {};
    const graphs = await Graph.find(query).sort({ createdAt: -1 }).limit(20);
    return res.json({ success: true, graphs });
  } catch (err) {
    console.error('Error fetching graphs:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
