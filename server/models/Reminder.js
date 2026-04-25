import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  label: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);

export default Reminder;
