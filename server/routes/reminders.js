import express from 'express';
import Reminder from '../models/Reminder.js';

const router = express.Router();

router.get('/reminders', async (req, res) => {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ success: false, error: 'userEmail is required' });
  }

  try {
    const reminders = await Reminder.find({ userEmail }).sort({ createdAt: -1 });
    res.json({ success: true, reminders });
  } catch (error) {
    console.error('Fetch reminders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reminders' });
  }
});

router.post('/reminders', async (req, res) => {
  const { userEmail, label, description } = req.body;

  if (!userEmail || !label) {
    return res.status(400).json({ success: false, error: 'userEmail and label are required' });
  }

  try {
    const reminder = await Reminder.create({ userEmail, label, description });
    res.json({ success: true, reminder });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to create reminder' });
  }
});

router.delete('/reminders/:id', async (req, res) => {
  const { id } = req.params;
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ success: false, error: 'userEmail is required' });
  }

  try {
    const result = await Reminder.findOneAndDelete({ _id: id, userEmail });
    if (!result) {
      return res.status(404).json({ success: false, error: 'Reminder not found or unauthorized' });
    }
    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete reminder' });
  }
});

export default router;
