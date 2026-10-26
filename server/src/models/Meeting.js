import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'Untitled meeting' },
    sourceType: {
      type: String,
      enum: ['transcript', 'audio', 'video', 'live'],
      default: 'transcript',
    },
    originalName: String,
    filePath: String,
    mimeType: String,
    fileSize: Number,
    transcript: { type: String, default: '' },
    transcriptLines: [
      { id: String, speaker: String, text: String, timestamp: String, startSeconds: Number },
    ],
    summary: { type: String, default: '' },
    decisions: [{ text: String, timestamp: String, confidence: Number }],
    speakers: [{ name: String, utterances: Number, wordCount: Number, sentiment: String }],
    processingStatus: {
      type: String,
      enum: ['live', 'uploaded', 'queued', 'processing', 'completed', 'failed'],
      default: 'uploaded',
    },
    processingError: String,
    analytics: { sentiment: String, engagement: Number },
    processedAt: Date,
  },
  { timestamps: true },
);
export default mongoose.model('Meeting', schema);
