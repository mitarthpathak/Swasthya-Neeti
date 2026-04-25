import mongoose from 'mongoose';

const GraphSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  graph: { type: Object, required: true },
  metadata: { type: Object },
  userEmail: { type: String, index: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Graph', GraphSchema);
