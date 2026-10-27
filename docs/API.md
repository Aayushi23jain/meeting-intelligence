# API reference

All endpoints except `/api/health`, `/api/auth/register`, and `/api/auth/login` require the HTTP-only session cookie. JSON errors use `{ "error": "..." }`.

## Auth
- `POST /api/auth/register` — `{name,email,password}`
- `POST /api/auth/login` — `{email,password}`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## Meetings
- `GET /api/meetings`
- `GET /api/meetings/:id`
- `POST /api/meetings/:id/retry`

## Zoom
- `GET /api/zoom/status` — `{configured, userId}`
- `GET /api/zoom/recordings?from=YYYY-MM-DD&to=YYYY-MM-DD` — cloud recordings (default: last 30 days), each with `hasTranscript`, `hasAudio` and the imported `meetingId` if any
- `POST /api/zoom/recordings/import` — `{uuid}`; creates and queues a meeting, or returns the existing one if already imported

## Action items
- `GET /api/action-items?state=pending&meetingId=<id>`
- `PATCH /api/action-items/:id` — editable `title`, `description`, `owner`, `deadline`, `priority`, `reviewState`
- `POST /api/action-items/:id/approve`
- `POST /api/action-items/:id/reject`

## Jira
- `GET /api/jira/status`
- `POST /api/jira/connect` — `{projectKey}`; validates configured server credentials and saves default project
- `POST /api/jira/action-items/:id` — `{projectKey}`; approved items only
- `GET /api/jira/issues`
- `POST /api/jira/sync`
- `GET /api/analytics/overview`
