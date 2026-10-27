import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import actionRoutes from './routes/actionRoutes.js';
import jiraRoutes from './routes/jiraRoutes.js';
import { resumePendingMeetings } from './queues/meetingQueue.js';
import { auth } from './middleware/auth.js';
import { overview } from './controllers/analyticsController.js';
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim());
const isDevLocalhost = (origin) => process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin) || isDevLocalhost(origin)),
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'meeting-intelligence-api' }));
app.use('/api/meetings', meetingRoutes);
app.use('/api/action-items', actionRoutes);
app.use('/api/jira', jiraRoutes);
app.get('/api/analytics/overview', auth, overview);
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  res.status(status).json({ error: err.message || 'Unexpected server error' });
});
const port = process.env.PORT || 5000;
await connectDB();
await resumePendingMeetings();
app.listen(port, () => console.log(`API listening at http://localhost:${port}`));
