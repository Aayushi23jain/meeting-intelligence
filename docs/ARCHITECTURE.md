# Architecture mapping to the PUC document

| PUC module | Implementation |
|---|---|
| Authentication & workspace | `server/src/controllers/authController.js`, `server/src/middleware/auth.js`, `server/src/models/User.js`; client auth state in `client/src/store/slices/authSlice.js` |
| Meetings | `server/src/routes/meetingRoutes.js`, `server/src/controllers/meetingController.js`, `server/src/models/Meeting.js` |
| File storage (Cloudflare R2, S3 API) | `server/src/services/storage/s3.js` (S3 get/put) |
| Zoom connector | `server/src/services/zoom/client.js`, `server/src/controllers/zoomController.js`, `server/src/routes/zoomRoutes.js` |
| Transcript processing | `server/src/utils/transcript.js`, `server/src/services/transcription/transcribe.js` |
| Background jobs | `server/src/queues/meetingQueue.js` (in-process queue), `server/src/jobs/processMeeting.js` |
| AI analyzer | `server/src/services/ai/analyzeMeeting.js` |
| Action review | `server/src/controllers/actionController.js`, `server/src/models/ActionItem.js`, `client/src/store/slices/actionItemsSlice.js` |
| Jira integration | `server/src/services/jira/client.js`, `server/src/controllers/jiraController.js`, `server/src/models/JiraIntegration.js`, `server/src/models/JiraIssue.js` |
| Timeline & evidence | Meeting details route in `client/src/App.jsx`, `Meeting.transcriptLines`, `ActionItem.sourceLineId/sourceText/timestamp` |
| Analytics | `server/src/controllers/analyticsController.js`, Analytics page in `client/src/App.jsx` |
| Redux state | `client/src/store/store.js` and `client/src/store/slices/` |

## Processing lifecycle

1. Authenticated client imports a Zoom cloud recording from the Zoom recordings page.
2. The API creates a MongoDB `Meeting` record for it (once per user and recording).
3. The meeting is added to the in-process queue, which marks it `processing`. Queued or running meetings are resumed when the API restarts.
4. For Zoom meetings, Zoom's VTT transcript is used when available; otherwise the audio is copied to R2. Media is read from R2 and transcribed if required, then transcript lines are normalized with speaker/timestamp evidence.
5. The analyzer returns strict JSON containing summary, decisions, action items, speaker metrics and analytics.
6. Meeting and action-item records are persisted. Action items begin in `pending` review state.
7. A user edits/approves/rejects items. Only approved items can be created in Jira.
8. Jira issue key, ID, URL and mapped status/assignee/priority are stored in MongoDB.
9. Manual sync updates the issue mapping and action item, then the dashboard reads the current state.

## AI output contract

`summary`, `decisions[]`, `actionItems[]`, `speakers[]`, and `analytics`. Each action item carries `title`, `description`, `owner`, `deadline`, `priority`, `timestamp`, `startSeconds`, `sourceLineId`, and `sourceText`. Missing facts should remain blank/null rather than being guessed.
