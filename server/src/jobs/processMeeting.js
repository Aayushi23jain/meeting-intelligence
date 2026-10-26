import fs from 'node:fs/promises';
import Meeting from '../models/Meeting.js';
import ActionItem from '../models/ActionItem.js';
import Speaker from '../models/Speaker.js';
import { parseTranscript } from '../utils/transcript.js';
import { transcribeMedia } from '../services/transcription/transcribe.js';
import { analyzeMeeting } from '../services/ai/analyzeMeeting.js';
export async function processMeeting(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw new Error('Meeting not found');
  meeting.processingStatus = 'processing';
  meeting.processingError = '';
  await meeting.save();
  try {
    let transcript = meeting.transcript || '',
      lines = [];
    if (meeting.sourceType !== 'transcript' && meeting.filePath) {
      const result = await transcribeMedia(meeting.filePath, meeting.originalName);
      transcript = result.text;
      lines = result.segments.length ? result.segments : parseTranscript(transcript);
    } else if (meeting.sourceType === 'live' && meeting.transcriptLines?.length)
      lines = meeting.transcriptLines.map((l) => l.toObject());
    else lines = parseTranscript(transcript);
    if (!lines.length && transcript) lines.push(...parseTranscript(transcript));
    const result = await analyzeMeeting(transcript, lines);
    meeting.transcript = transcript;
    meeting.transcriptLines = lines;
    meeting.summary = result.summary;
    meeting.decisions = result.decisions || [];
    meeting.speakers = result.speakers || [];
    meeting.analytics = result.analytics || {};
    meeting.processingStatus = 'completed';
    meeting.processedAt = new Date();
    await meeting.save();
    await ActionItem.deleteMany({ meetingId: meeting._id });
    await Speaker.deleteMany({ meetingId: meeting._id });
    if (result.speakers?.length)
      await Speaker.insertMany(
        result.speakers.map((sp) => ({ ...sp, meetingId: meeting._id, userId: meeting.userId })),
      );
    if (result.actionItems?.length)
      await ActionItem.insertMany(
        result.actionItems.map((a) => ({
          ...a,
          meetingId: meeting._id,
          userId: meeting.userId,
          reviewState: 'pending',
        })),
      );
    return {
      meetingId: String(meeting._id),
      count: result.actionItems?.length || 0,
      mode: result.mode,
    };
  } catch (e) {
    meeting.processingStatus = 'failed';
    meeting.processingError = e.message || 'Processing failed';
    await meeting.save();
    throw e;
  }
}
