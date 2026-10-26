import { Queue } from 'bullmq';
import { makeRedis } from '../config/redis.js';
const connection = makeRedis();
export const meetingQueue = connection
  ? new Queue('meeting-processing', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  : null;
export async function enqueueMeeting(meetingId) {
  if (!meetingQueue) return false;
  await meetingQueue.add('process-meeting', { meetingId: String(meetingId) });
  return true;
}
