# Architecture mapping to the PUC document

| PUC module | Implementation |
|---|---|
| Authentication & workspace | `server/src/controllers/authController.js`, `server/src/middleware/auth.js`, `server/src/models/User.js`; client auth state in `client/src/store/slices/authSlice.js` |
| Meeting ingestion | `server/src/routes/meetingRoutes.js`, `server/src/controllers/meetingController.js`, `server/src/models/Meeting.js` |
| Speaker analytics collection | `server/src/models/Speaker.js`; speaker stats are saved per meeting and aggregated in analytics |
| Transcript processing | `server/src/utils/transcript.js`, `server/src/services/transcription/transcribe.js` |
| Background jobs | `server/src/queues/meetingQueue.js`, `server/src/jobs/processMeeting.js`, `server/src/worker.js` |
| AI analyzer | `server/src/services/ai/analyzeMeeting.js` |
| Action review | `server/src/controllers/actionController.js`, `server/src/models/ActionItem.js`, `client/src/store/slices/actionItemsSlice.js` |
| Jira integration | `server/src/services/jira/client.js`, `server/src/controllers/jiraController.js`, `server/src/models/JiraIntegration.js`, `server/src/models/JiraIssue.js` |
| Timeline & evidence | Meeting details route in `client/src/App.jsx`, `Meeting.transcriptLines`, `ActionItem.sourceLineId/sourceText/timestamp` |
| Analytics | `server/src/controllers/analyticsController.js`, Analytics page in `client/src/App.jsx` |
| Redux state | `client/src/store/store.js` and `client/src/store/slices/` |

## Processing lifecycle

1. Authenticated client uploads a transcript or media file.
2. The API validates the upload and creates a MongoDB `Meeting` record.
3. A BullMQ job is enqueued; the worker marks the meeting `processing`.
4. Media is transcribed if required, then transcript lines are normalized with speaker/timestamp evidence.
5. The analyzer returns strict JSON containing summary, decisions, action items, speaker metrics and analytics.
6. Meeting and action-item records are persisted. Action items begin in `pending` review state.
7. A user edits/approves/rejects items. Only approved items can be created in Jira.
8. Jira issue key, ID, URL and mapped status/assignee/priority are stored in MongoDB.
9. Manual sync or configured webhook updates the issue mapping and action item, then the dashboard reads the current state.

## AI output contract

`summary`, `decisions[]`, `actionItems[]`, `speakers[]`, and `analytics`. Each action item carries `title`, `description`, `owner`, `deadline`, `priority`, `timestamp`, `startSeconds`, `sourceLineId`, `sourceText`, and `confidence`. Missing facts should remain blank/null rather than being guessed.
