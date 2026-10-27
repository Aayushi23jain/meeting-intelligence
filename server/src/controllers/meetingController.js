import Meeting from '../models/Meeting.js';
import ActionItem from '../models/ActionItem.js';
import { enqueueMeeting } from '../queues/meetingQueue.js';
export async function upload(req, res) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Choose an audio or video file to upload.' });
  const meeting = await Meeting.create({
    userId: req.user.id,
    title: String(req.body.title || file.originalname || 'Meeting').slice(0, 180),
    sourceType: file.mimetype.startsWith('video/') ? 'video' : 'audio',
    originalName: file.originalname,
    storageKey: file.key,
    mimeType: file.mimetype,
    fileSize: file.size,
    processingStatus: 'queued',
  });
  enqueueMeeting(meeting._id);
  res.status(202).json({ meeting });
}
export async function listMeetings(req, res) {
  const meetings = await Meeting.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('-storageKey');
  res.json({ meetings });
}
export async function getMeeting(req, res) {
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user.id }).select('-storageKey');
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  const actionItems = await ActionItem.find({ meetingId: meeting._id, userId: req.user.id }).sort({
    createdAt: 1,
  });
  res.json({ meeting, actionItems });
}
export async function retryMeeting(req, res) {
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user.id });
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  meeting.processingStatus = 'queued';
  meeting.processingError = '';
  await meeting.save();
  enqueueMeeting(meeting._id);
  res.status(202).json({ meeting });
}
