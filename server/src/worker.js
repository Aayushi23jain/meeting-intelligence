import 'dotenv/config';
import { Worker } from 'bullmq';
import { connectDB } from './config/db.js';
import { makeRedis } from './config/redis.js';
import { processMeeting } from './jobs/processMeeting.js';
await connectDB();
const connection = makeRedis();
if (!connection) throw new Error('REDIS_URL is required to run the background worker');
const worker = new Worker('meeting-processing', (job) => processMeeting(job.data.meetingId), {
  connection,
  concurrency: 2,
});
worker.on('completed', (j) => console.log('Meeting processed', j.data.meetingId));
worker.on('failed', (j, e) => console.error('Meeting job failed', j?.data?.meetingId, e.message));
