import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    baseUrl: String,
    email: String,
    defaultProjectKey: String,
    connected: { type: Boolean, default: false },
    lastSyncAt: Date,
  },
  { timestamps: true },
);
export default mongoose.model('JiraIntegration', schema);
