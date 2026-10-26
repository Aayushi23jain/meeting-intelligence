import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'User' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    workspaceId: { type: String, required: true },
  },
  { timestamps: true },
);
export default mongoose.model('User', schema);
