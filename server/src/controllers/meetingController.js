import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Meeting from '../models/Meeting.js';
import ActionItem from '../models/ActionItem.js';
import { parseTranscript } from '../utils/transcript.js';
import { enqueueMeeting } from '../queues/meetingQueue.js';
import { processMeeting } from '../jobs/processMeeting.js';
import { transcribeChunk } from '../services/transcription/transcribe.js';
export async function startLive(req, res) {
  const meeting = await Meeting.create({
    userId: req.user.id,
    title: String(req.body?.title || 'Live meeting').slice(0, 180),
    sourceType: 'live',
    processingStatus: 'live',
  });
  res.status(201).json({ meeting });
}
export async function liveChunk(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing audio chunk.' });
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      userId: req.user.id,
      processingStatus: 'live',
    }).select('_id');
    if (!meeting)
      return res.status(404).json({ error: 'Live meeting not found or already finished.' });
    const offset = Math.max(0, Number(req.body?.offsetSeconds) || 0);
    const { segments } = await transcribeChunk(req.file.buffer, req.file.originalname, offset);
    if (segments.length)
      await Meeting.updateOne(
        { _id: meeting._id },
        { $push: { transcriptLines: { $each: segments } } },
      );
    res.json({ lines: segments });
  } catch (e) {
    res.status(502).json({ error: e.message || 'Chunk transcription failed' });
  }
}
export async function finishLive(req, res) {
  try {
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      userId: req.user.id,
      processingStatus: 'live',
    });
    if (!meeting)
      return res.status(404).json({ error: 'Live meeting not found or already finished.' });
    const lines = meeting.transcriptLines
      .map((l) => l.toObject())
      .sort((a, b) => (a.startSeconds || 0) - (b.startSeconds || 0));
    if (!lines.length) {
      meeting.processingStatus = 'failed';
      meeting.processingError = 'No speech was captured during the live session.';
      await meeting.save();
      return res.json({ meeting });
    }
    meeting.transcriptLines = lines;
    meeting.transcript = lines.map((l) => `[${l.timestamp}] ${l.speaker}: ${l.text}`).join('\n');
    meeting.processingStatus = 'queued';
    await meeting.save();
    const queued = await enqueueMeeting(meeting._id);
    if (!queued) processMeeting(meeting._id).catch(() => {});
    res.status(202).json({ meeting });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
export async function upload(req, res) {
  const { title, transcript } = req.body;
  const file = req.file;
  if (!file && !String(transcript || '').trim())
    return res.status(400).json({ error: 'Upload audio/video or provide a transcript.' });
  const type = file ? (file.mimetype.startsWith('video/') ? 'video' : 'audio') : 'transcript';
  const meeting = await Meeting.create({
    userId: req.user.id,
    title: String(title || file?.originalname || 'Meeting').slice(0, 180),
    sourceType: type,
    originalName: file?.originalname,
    filePath: file?.path,
    mimeType: file?.mimetype,
    fileSize: file?.size,
    transcript: String(transcript || ''),
    processingStatus: 'uploaded',
  });
  if (type === 'transcript' && !process.env.REDIS_URL) {
    try {
      await processMeeting(meeting._id);
    } catch {}
  } else {
    const queued = await enqueueMeeting(meeting._id);
    if (!queued) {
      if (type === 'transcript') {
        processMeeting(meeting._id).catch(() => {});
      } else {
        meeting.processingStatus = 'failed';
        meeting.processingError =
          'Redis is required for media/background processing. Start Redis and the worker.';
        await meeting.save();
      }
    } else {
      meeting.processingStatus = 'queued';
      await meeting.save();
    }
  }
  res.status(202).json({ meeting });
}
export async function analyzeTranscript(req, res) {
  const transcript = String(req.body?.transcript || '').trim();
  if (transcript.length < 10)
    return res.status(400).json({ error: 'Enter at least 10 characters of transcript.' });
  const meeting = await Meeting.create({
    userId: req.user.id,
    title: String(req.body.title || 'Meeting transcript'),
    sourceType: 'transcript',
    transcript,
    processingStatus: 'processing',
  });
  try {
    await processMeeting(meeting._id);
    const full = await Meeting.findOne({ _id: meeting._id, userId: req.user.id });
    res
      .status(201)
      .json({ meeting: full, actionItems: await ActionItem.find({ meetingId: meeting._id }) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
export async function listMeetings(req, res) {
  const meetings = await Meeting.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('-filePath');
  res.json({ meetings });
}
export async function getMeeting(req, res) {
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user.id }).select(
    '-filePath',
  );
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  const actionItems = await ActionItem.find({ meetingId: meeting._id, userId: req.user.id }).sort({
    createdAt: 1,
  });
  res.json({ meeting, actionItems });
}
export async function getTranscript(req, res) {
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user.id }).select(
    'transcript transcriptLines',
  );
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  res.json({ transcript: meeting.transcript, lines: meeting.transcriptLines });
}
export async function getMeetingActions(req, res) {
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user.id }).select('_id');
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  res.json({ actionItems: await ActionItem.find({ meetingId: meeting._id, userId: req.user.id }) });
}
export async function retryMeeting(req, res) {
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user.id });
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  meeting.processingStatus = 'queued';
  meeting.processingError = '';
  await meeting.save();
  const queued = await enqueueMeeting(meeting._id);
  if (!queued) {
    if (['transcript', 'live'].includes(meeting.sourceType)) {
      processMeeting(meeting._id).catch(() => {});
    } else return res.status(503).json({ error: 'Redis is required for retrying media jobs.' });
  }
  res.status(202).json({ meeting });
}
