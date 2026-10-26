# Autonomous Meeting Intelligence & Action Tracker

A React + Redux Toolkit and Node/Express application that turns transcripts or meeting recordings into summaries, decisions and evidence-linked action items, then creates Jira Cloud issues after human approval.

> **Architecture note:** this edition follows the PUC/project document's core architecture: React + Redux Toolkit → Express API → Redis/BullMQ jobs → transcription/LLM → MongoDB → Jira REST API → Jira sync → dashboard. External services need credentials and local services must be running. No third-party API key is bundled.

## Implemented modules

- **Authentication & workspace:** register/login, bcrypt password hashing, JWT in HTTP-only cookie, authenticated APIs, per-user data filters.
- **Meeting ingestion:** transcript form or audio/video upload, file type and size validation, upload metadata persisted to MongoDB.
- **Processing jobs:** BullMQ/Redis queue with retry/backoff and a separate worker. Transcripts can be analyzed synchronously if Redis is not configured; queued media processing requires Redis and the worker.
- **Transcription:** OpenAI audio transcription endpoint with timestamped segments for supported audio files. Video files are accepted, but transcription provider compatibility depends on media/container/size; convert unsupported video audio tracks to a supported audio file if the provider rejects it.
- **AI analysis:** strict structured JSON schema for summary, decisions, action items, owners, deadlines, priority, timestamps, source-line IDs, confidence, speaker counts and approximate meeting-level sentiment/engagement. Without `OPENAI_API_KEY`, a conservative heuristic fallback is used for transcript-only input.
- **Evidence-linked workspace:** transcript lines, timestamps, decision summary, action timeline, review state and source evidence.
- **Action review:** edit, approve, reject and filter action items before ticket creation.
- **Jira:** server-side API token, connection validation, project lookup, create approved issue, preserve issue key/URL and sync status/assignee/priority on demand. A webhook endpoint is also available.
- **Dashboard & analytics:** recent meetings, processing states, review queue counts, Jira issue counts, speaker participation counts and task completion counts.
- **Reliability/security foundations:** upload limits, backend-only secrets, Helmet, rate limiting on auth, retry/backoff for jobs, processing failure state and per-user resource queries.

## Architecture

```text
React + React Router + Redux Toolkit
  ├─ authSlice: session and workspace user
  ├─ meetingSlice: meeting list, current meeting, processing status
  ├─ transcriptSlice: transcript lines/current evidence selection
  ├─ actionItemsSlice: review/edit/approve/reject state
  ├─ jiraSlice: projects, connection, issues, sync state
  └─ uiSlice: selected evidence/action and notices
          │ Axios + HTTP-only cookie
          ▼
Node.js + Express API ── MongoDB/Mongoose
          │
          ├─ meeting upload → Redis/BullMQ → worker
          │                         ├─ speech-to-text
          │                         └─ LLM structured extraction
          ├─ action review APIs
          ├─ Jira REST API → issue key/status mapping
          └─ Jira sync API / webhook → MongoDB → dashboard
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/API.md`](docs/API.md) for module mapping and endpoints.

## Prerequisites

- Node.js 20+ and npm
- MongoDB running locally or a MongoDB URI
- Redis running locally for background jobs and audio/video processing
- OpenAI API key for LLM extraction and audio transcription (optional for transcript-only heuristic demo)
- Jira Cloud site, account email and Jira API token for Jira integration

## Run locally (Windows PowerShell)

### 1. Configure the backend

```powershell
cd server
npm install
Copy-Item .env.example .env
```

Edit `server/.env`:

```dotenv
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/meeting_intelligence
JWT_SECRET=replace-with-a-long-random-secret
REDIS_URL=redis://127.0.0.1:6379
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-atlassian-email
JIRA_API_TOKEN=your-jira-api-token
JIRA_DEFAULT_PROJECT_KEY=YOURPROJECT
JIRA_WEBHOOK_SECRET=optional-long-random-secret
```

Start MongoDB and Redis before processing queued jobs. Then start the API in terminal 1:

```powershell
npm run dev
```

Start the background worker in terminal 2:

```powershell
cd server
npm run worker
```

If you do not set `REDIS_URL`, transcript-only analysis runs directly in the API process, but background retries and media jobs are unavailable. Do not set a Redis URL unless Redis is actually running.

### 2. Start the frontend

In terminal 3, from the project root:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. Register a local account, upload/paste a transcript, review the evidence-linked tasks, approve an item, and create a Jira issue.

Optional frontend API override: copy `client/.env.example` to `client/.env` and set `VITE_API_URL=http://localhost:5000/api`.

## Jira setup

1. Create a Jira Cloud API token from Atlassian account security settings.
2. Set `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` in **server/.env only**.
3. Restart the API, sign in, open **Jira board**, and validate the connection. Available projects should load from Jira.
4. Approve an action item in **Action review**, choose a project key and click **Create Jira issue**.
5. Use **Sync statuses** to fetch current status, assignee and priority. For push-based updates, configure a Jira webhook to `POST /api/jira/webhook`; if `JIRA_WEBHOOK_SECRET` is set, send the same value in `x-webhook-secret`.

Jira permissions, required custom fields, issue type names and available priority values vary by project. Jira API errors are returned in the UI; adjust the mapping in `server/src/controllers/jiraController.js` if your Jira configuration requires different fields.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `POST /api/meetings/upload`, `POST /api/meetings/analyze`, `GET /api/meetings`, `GET /api/meetings/:id`
- `GET /api/meetings/:id/transcript`, `GET /api/meetings/:id/action-items`, `POST /api/meetings/:id/retry`
- `GET /api/action-items`, `PATCH /api/action-items/:id`, `POST /api/action-items/:id/approve`, `POST /api/action-items/:id/reject`
- `GET /api/jira/status`, `POST /api/jira/connect`, `GET /api/jira/projects`, `POST /api/jira/action-items/:id`, `GET /api/jira/issues`, `GET /api/jira/issues/:id`, `POST /api/jira/sync`, `POST /api/jira/webhook`
- `GET /api/analytics/overview`, `GET /api/health`

## Current boundaries

- Jira API-token authentication is used for a single configured Jira integration, not a full Atlassian OAuth consent flow.
- Status synchronization works on demand and through the included webhook endpoint; webhook delivery must be configured in Jira.
- Media transcription requires a working OpenAI API key and provider-supported media. Transcription is not run offline.
- Sentiment and engagement are approximate model-generated indicators, not validated psychological assessments.
- This is a development scaffold, not a production deployment. Before public deployment add HTTPS, CSRF protections appropriate to the chosen cookie strategy, workspace roles/invitations, secure file storage/retention policies, tests, monitoring, and a managed secret store.
