export function jiraConfig() {
  if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN)
    throw new Error('Configure JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN in server/.env first.');
  return {
    base: process.env.JIRA_BASE_URL.replace(/\/$/, ''),
    auth:
      'Basic ' +
      Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64'),
  };
}
export async function jiraRequest(path, options = {}) {
  const { base, auth } = jiraConfig();
  const r = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: auth,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`Jira API ${r.status}: ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : {};
}
