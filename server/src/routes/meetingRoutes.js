import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { auth } from '../middleware/auth.js';
import * as c from '../controllers/meetingController.js';
const r = Router();
const dir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(dir, { recursive: true });
const max = Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024;
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) =>
    cb(
      null,
      `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`,
    ),
});
const upload = multer({
  storage,
  limits: { fileSize: max },
  fileFilter: (_req, file, cb) => {
    const ok = /^(audio|video)\//.test(file.mimetype);
    cb(ok ? null : new Error('Only audio/video files are accepted.'), ok);
  },
});
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(audio|video)\//.test(file.mimetype);
    cb(ok ? null : new Error('Only audio chunks are accepted.'), ok);
  },
});
r.use(auth);
r.post('/upload', upload.single('file'), c.upload);
r.post('/live', c.startLive);
r.post('/:id/live/chunk', chunkUpload.single('chunk'), c.liveChunk);
r.post('/:id/live/finish', c.finishLive);
r.post('/analyze', c.analyzeTranscript);
r.get('/', c.listMeetings);
r.get('/:id', c.getMeeting);
r.get('/:id/transcript', c.getTranscript);
r.get('/:id/action-items', c.getMeetingActions);
r.post('/:id/retry', c.retryMeeting);
export default r;
