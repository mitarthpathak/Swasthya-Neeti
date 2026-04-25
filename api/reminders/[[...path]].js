import { connectToDatabase } from './_shared/db.js';
import { Reminder } from './_shared/models.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await connectToDatabase();
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Check for DELETE with path param: /api/reminders/[id]
  const pathMatch = url.pathname.match(/\/api\/reminders\/(.+)/);

  if (req.method === 'GET') {
    const userEmail = url.searchParams.get('userEmail') || '';
    if (!userEmail) return res.status(400).json({ success: false, error: 'userEmail is required' });
    try {
      const reminders = await Reminder.find({ userEmail }).sort({ createdAt: -1 });
      return res.json({ success: true, reminders });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Failed to fetch reminders' });
    }
  }

  if (req.method === 'POST') {
    const { userEmail, label, description } = req.body || {};
    if (!userEmail || !label) return res.status(400).json({ success: false, error: 'userEmail and label are required' });
    try {
      const reminder = await Reminder.create({ userEmail, label, description });
      return res.json({ success: true, reminder });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Failed to create reminder' });
    }
  }

  if (req.method === 'DELETE' && pathMatch) {
    const id = pathMatch[1];
    const userEmail = url.searchParams.get('userEmail') || '';
    if (!userEmail) return res.status(400).json({ success: false, error: 'userEmail is required' });
    try {
      const result = await Reminder.findOneAndDelete({ _id: id, userEmail });
      if (!result) return res.status(404).json({ success: false, error: 'Reminder not found or unauthorized' });
      return res.json({ success: true, message: 'Reminder deleted successfully' });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Failed to delete reminder' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
