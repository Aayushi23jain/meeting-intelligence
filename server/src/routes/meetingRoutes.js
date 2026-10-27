import { Router } from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import { gridfsStorage } from '../services/storage/gridfs.js';
import * as c from '../controllers/meetingController.js';
const r = Router();
// Groq's free tier transcribes files up to 25 MB.
const max = Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024;
const upload = multer({
  storage: gridfsStorage(),
  limits: { fileSize: max },
  fileFilter: (_req, file, cb) => {
    const ok = /^(audio|video)\//.test(file.mimetype);
    cb(ok ? null : new Error('Only audio/video files are accepted.'), ok);
  },
});
r.use(auth);
r.post('/upload', upload.single('file'), c.upload);
r.get('/', c.listMeetings);
r.get('/:id', c.getMeeting);
r.post('/:id/retry', c.retryMeeting);
export default r;
