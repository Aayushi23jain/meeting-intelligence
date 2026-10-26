import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    owner: String,
    deadline: String,
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Highest'], default: 'Medium' },
    timestamp: String,
    startSeconds: Number,
    sourceLineId: String,
    sourceText: String,
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    reviewState: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    jiraIssueKey: String,
    jiraIssueId: String,
    jiraUrl: String,
    jiraStatus: String,
    jiraAssignee: String,
    lastJiraSyncAt: Date,
  },
  { timestamps: true },
);
export default mongoose.model('ActionItem', schema);
