import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    age: { type: String, required: true },
    gender: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
