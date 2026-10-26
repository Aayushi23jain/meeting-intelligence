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
    name: { type: String, required: true },
    utterances: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    sentiment: { type: String, default: 'Not assessed' },
  },
  { timestamps: true },
);
export default mongoose.model('Speaker', schema);
