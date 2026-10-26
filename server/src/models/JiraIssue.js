import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    actionItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActionItem',
      required: true,
      unique: true,
    },
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issueId: String,
    issueKey: String,
    url: String,
    status: String,
    assignee: String,
    priority: String,
    lastSyncedAt: Date,
  },
  { timestamps: true },
);
export default mongoose.model('JiraIssue', schema);
