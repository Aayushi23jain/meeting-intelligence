# Autonomous Meeting Intelligence & Action Tracker

A React + Redux Toolkit and Node/Express application that turns transcripts or meeting recordings into summaries, decisions and evidence-linked action items, then creates Jira Cloud issues after human approval.

> **Architecture note:** this edition follows the PUC/project document's core architecture: React + Redux Toolkit → Express API (Zoom connector, Cloudflare R2 storage, in-process jobs) → transcription/LLM → MongoDB → Jira REST API → Jira sync → dashboard. External services need credentials and local services must be running. No third-party API key is bundled.

## Implemented modules

- **Authentication & workspace:** register/login, bcrypt password hashing, JWT in HTTP-only cookie, authenticated APIs, per-user data filters.
- **Zoom connector:** a Zoom Server-to-Server OAuth app lists cloud recordings and imports them. Zoom's own transcript (with speaker names) is used when present; otherwise the audio is copied to R2 and transcribed. Recording audio lives in a Cloudflare R2 bucket (any S3-compatible store works, including AWS S3).
- **Processing jobs:** an in-process queue in the API runs one meeting at a time. Jobs still queued or running when the API stops are resumed on the next start. No Redis or separate worker is needed.
- **Transcription:** OpenAI audio transcription endpoint with timestamped segments for supported audio files. Video files are accepted, but transcription provider compatibility depends on media/container/size; convert unsupported video audio tracks to a supported audio file if the provider rejects it.
- **AI analysis:** strict structured JSON schema for summary, decisions, action items, owners, deadlines, priority, timestamps, source-line IDs, speaker counts and approximate meeting-level sentiment/engagement. Without `OPENAI_API_KEY`, a conservative heuristic fallback is used for transcript-only input.
- **Evidence-linked workspace:** transcript lines, timestamps, decision summary, action timeline, review state and source evidence.
- **Action review:** edit, approve, reject and filter action items before ticket creation.
- **Jira:** server-side API token, connection validation, project lookup, create approved issue, preserve issue key/URL and sync status/assignee/priority on demand.
- **Dashboard & analytics:** recent meetings, processing states, review queue counts, Jira issue counts, speaker participation counts and task completion counts.
- **Reliability/security foundations:** backend-only secrets, Helmet, rate limiting on auth, resumable jobs, processing failure state with manual retry and per-user resource queries.

## Architecture

```text
React + React Router + Redux Toolkit
  ├─ authSlice: session and workspace user
  ├─ meetingSlice: meeting list, current meeting, processing status
  ├─ transcriptSlice: transcript lines/current evidence selection
  ├─ actionItemsSlice: review/edit/approve/reject state
  ├─ jiraSlice: connection, issues, sync state
  └─ uiSlice: selected evidence/action
          │ Axios + HTTP-only cookie
          ▼
Node.js + Express API ── MongoDB/Mongoose
          │
          ├─ Zoom import → Cloudflare R2 → in-process job queue
          │                                    ├─ speech-to-text (or Zoom transcript)
          │                                    └─ LLM structured extraction
          ├─ action review APIs
          ├─ Jira REST API → issue key/status mapping
          └─ Jira sync API → MongoDB → dashboard
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/API.md`](docs/API.md) for module mapping and endpoints.

## Prerequisites

- Node.js 20+ and npm
- MongoDB running locally or a MongoDB URI
- A Cloudflare R2 bucket and an R2 API token with Object Read & Write on it (for Zoom recordings). The free tier covers 10 GB of storage per month.
- Optional: a Zoom Server-to-Server OAuth app for the Zoom connector
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
AWS_REGION=auto
AWS_ACCESS_KEY_ID=your-r2-access-key-id
AWS_SECRET_ACCESS_KEY=your-r2-secret-access-key
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://<cloudflare-account-id>.r2.cloudflarestorage.com
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
ZOOM_USER_ID=me
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-atlassian-email
JIRA_API_TOKEN=your-jira-api-token
JIRA_DEFAULT_PROJECT_KEY=YOURPROJECT
```

Start MongoDB, then start the API in terminal 1. Background processing runs inside the API process:

```powershell
npm run dev
```

Meetings are imported from Zoom, so the `ZOOM_*` settings are required. R2 is needed when a recording has no Zoom transcript and its audio must be transcribed.

### 2. Start the frontend

In terminal 2, from the project root:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. Register a local account, import a Zoom recording, review the evidence-linked tasks, approve an item, and create a Jira issue.

Optional frontend API override: copy `client/.env.example` to `client/.env` and set `VITE_API_URL=http://localhost:5000/api`.

## Cloudflare R2 setup

1. Sign in at dash.cloudflare.com and open **R2 Object Storage**. Enabling R2 the first time asks for a payment method; usage under the free tier is not charged.
2. **Create bucket**, give it a name (e.g. `meeting-intel-recordings`) and keep it private (no public access).
3. Back on the R2 overview, open **Manage API tokens → Create API token**. Choose **Object Read & Write**, limit it to your bucket, and create it.
4. Copy the **Access Key ID** and **Secret Access Key** into `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`; the secret is shown only once.
5. Copy the **S3 API endpoint** (`https://<account-id>.r2.cloudflarestorage.com`, shown on the token page or the bucket's settings) into `S3_ENDPOINT`, and the bucket name into `S3_BUCKET`. Keep `AWS_REGION=auto`.

The `AWS_*` variable names are the ones the S3 SDK reads; R2 speaks the S3 API, so they hold your R2 keys. To use AWS S3 instead, leave `S3_ENDPOINT` empty and set a real AWS region and IAM keys.

## Zoom setup

1. In the Zoom App Marketplace, choose **Develop → Build App → Server-to-Server OAuth**.
2. Add the cloud recording read scopes (`cloud_recording:read:list_user_recordings:admin` and `cloud_recording:read:recording:admin`, or `recording:read:admin` on older apps) and activate the app.
3. Copy the account ID, client ID and client secret into `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET` in **server/.env only**. `ZOOM_USER_ID` picks whose recordings are listed (`me`, a Zoom user ID, or an email address).
4. In Zoom settings, turn on cloud recording and **Create audio transcript** so imports come with speaker names.
5. Restart the API, open **Zoom recordings**, and click **Import & analyze** on a recording.

The Zoom credentials are account-wide: any signed-in app user can list and import the configured Zoom user's recordings.

## Jira setup

1. Create a Jira Cloud API token from Atlassian account security settings.
2. Set `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` in **server/.env only**.
3. Restart the API, sign in, open **Settings**, and validate the connection with your project key.
4. Approve an action item in **Action review**, choose a project key and click **Create Jira issue**.
5. Use **Sync statuses** to fetch current status, assignee and priority.

Jira permissions, required custom fields, issue type names and available priority values vary by project. Jira API errors are returned in the UI; adjust the mapping in `server/src/controllers/jiraController.js` if your Jira configuration requires different fields.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/meetings`, `GET /api/meetings/:id`, `POST /api/meetings/:id/retry`
- `GET /api/zoom/status`, `GET /api/zoom/recordings`, `POST /api/zoom/recordings/import`
- `GET /api/action-items`, `PATCH /api/action-items/:id`, `POST /api/action-items/:id/approve`, `POST /api/action-items/:id/reject`
- `GET /api/jira/status`, `POST /api/jira/connect`, `POST /api/jira/action-items/:id`, `GET /api/jira/issues`, `POST /api/jira/sync`
- `GET /api/analytics/overview`, `GET /api/health`

## Current boundaries

- Jira API-token authentication is used for a single configured Jira integration, not a full Atlassian OAuth consent flow.
- Status synchronization is on demand (**Sync statuses**); there is no push-based webhook.
- Media transcription requires a working OpenAI API key and provider-supported media (the OpenAI transcription API accepts files up to 25 MB, so long Zoom meetings without a Zoom transcript may be rejected). Transcription is not run offline.
- Jobs run in the API process one at a time. Running several API instances would need a shared queue to avoid processing the same meeting twice.
- Sentiment and engagement are approximate model-generated indicators, not validated psychological assessments.
- This is a development scaffold, not a production deployment. Before public deployment add HTTPS, CSRF protections appropriate to the chosen cookie strategy, workspace roles/invitations, secure file storage/retention policies, tests, monitoring, and a managed secret store.
