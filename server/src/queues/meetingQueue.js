import Meeting from '../models/Meeting.js';
import { processMeeting } from '../jobs/processMeeting.js';
// In-process queue: meetings run one at a time so long transcriptions don't pile up on the OpenAI API.
let chain = Promise.resolve();
export function enqueueMeeting(meetingId) {
  chain = chain
    .then(() => processMeeting(meetingId))
    .then(
      () => console.log('Meeting processed', String(meetingId)),
      (e) => console.error('Meeting job failed', String(meetingId), e.message),
    );
  return chain;
}
// Jobs live in memory, so anything left queued or mid-run by a restart is picked up again on boot.
export async function resumePendingMeetings() {
  const pending = await Meeting.find({ processingStatus: { $in: ['queued', 'processing'] } })
    .sort({ createdAt: 1 })
    .select('_id');
  pending.forEach((m) => enqueueMeeting(m._id));
  if (pending.length) console.log(`Resuming ${pending.length} pending meeting job(s)`);
}
