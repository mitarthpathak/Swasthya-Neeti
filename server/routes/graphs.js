import express from 'express';
import GraphModel from '../models/Graph.js';

const router = express.Router();

router.get('/graphs', async (req, res) => {
  try {
    const { userEmail } = req.query;
    const query = userEmail ? { userEmail } : {};
    const graphs = await GraphModel.find(query).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, graphs });
  } catch (err) {
    console.error('Error fetching graphs:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
