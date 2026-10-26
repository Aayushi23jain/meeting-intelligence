# API reference

All endpoints except `/api/health`, `/api/auth/register`, `/api/auth/login`, and `/api/jira/webhook` require the HTTP-only session cookie. JSON errors use `{ "error": "..." }`.

## Auth
- `POST /api/auth/register` — `{name,email,password}`
- `POST /api/auth/login` — `{email,password}`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## Meetings
- `POST /api/meetings/upload` — multipart form: `title`, optional `transcript`, optional `file` (audio/video)
- `POST /api/meetings/analyze` — JSON `{title,transcript}` for transcript-first analysis
- `GET /api/meetings`
- `GET /api/meetings/:id`
- `GET /api/meetings/:id/transcript`
- `GET /api/meetings/:id/action-items`
- `POST /api/meetings/:id/retry`

## Action items
- `GET /api/action-items?state=pending&meetingId=<id>`
- `PATCH /api/action-items/:id` — editable `title`, `description`, `owner`, `deadline`, `priority`, `reviewState`
- `POST /api/action-items/:id/approve`
- `POST /api/action-items/:id/reject`

## Jira
- `GET /api/jira/status`
- `POST /api/jira/connect` — `{projectKey}`; validates configured server credentials and saves default project
- `GET /api/jira/projects`
- `POST /api/jira/action-items/:id` — `{projectKey}`; approved items only
- `GET /api/jira/issues`
- `GET /api/jira/issues/:id`
- `POST /api/jira/sync`
- `POST /api/jira/webhook` — optional `x-webhook-secret` header and Jira webhook payload containing `issue.key`
- `GET /api/analytics/overview`
