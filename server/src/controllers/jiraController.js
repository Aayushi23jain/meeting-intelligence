import JiraIntegration from '../models/JiraIntegration.js';
import JiraIssue from '../models/JiraIssue.js';
import ActionItem from '../models/ActionItem.js';
import { jiraRequest, jiraConfig } from '../services/jira/client.js';
export async function status(req, res) {
  const integration = await JiraIntegration.findOne({ userId: req.user.id });
  res.json({
    connected: !!integration?.connected,
    baseUrl: integration?.baseUrl || process.env.JIRA_BASE_URL || '',
    defaultProjectKey: integration?.defaultProjectKey || process.env.JIRA_DEFAULT_PROJECT_KEY || '',
  });
}
export async function connect(req, res) {
  try {
    const { base } = jiraConfig();
    const projectKey = String(req.body.projectKey || process.env.JIRA_DEFAULT_PROJECT_KEY || '')
      .trim()
      .toUpperCase();
    if (!projectKey) return res.status(400).json({ error: 'Enter a Jira project key.' });
    // Fails for a key that does not exist or that the configured Jira account cannot see.
    let project;
    try {
      project = await jiraRequest(`/rest/api/3/project/${encodeURIComponent(projectKey)}`);
    } catch {
      return res
        .status(400)
        .json({ error: `Jira project ${projectKey} was not found or is not accessible.` });
    }
    const integration = await JiraIntegration.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          baseUrl: base,
          email: process.env.JIRA_EMAIL,
          defaultProjectKey: project.key,
          connected: true,
        },
      },
      { upsert: true, new: true },
    );
    res.json({
      connected: true,
      baseUrl: base,
      projectName: project.name,
      defaultProjectKey: integration.defaultProjectKey,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
// Only someone with a Jira account who can take work in the project is assigned, and only on an
// unambiguous name match: full display name, or a first name shared by exactly one user.
async function findAssignee(owner, projectKey) {
  const name = String(owner || '').trim().toLowerCase();
  if (!name) return null;
  try {
    const users = await jiraRequest(
      `/rest/api/3/user/assignable/search?project=${encodeURIComponent(projectKey)}&query=${encodeURIComponent(name)}&maxResults=50`,
    );
    const people = users.filter((u) => u.active && u.accountType === 'atlassian');
    const full = people.filter((u) => String(u.displayName || '').toLowerCase() === name);
    if (full.length === 1) return full[0];
    const first = people.filter(
      (u) => String(u.displayName || '').toLowerCase().split(/\s+/)[0] === name,
    );
    return first.length === 1 ? first[0] : null;
  } catch {
    return null;
  }
}
export async function createIssue(req, res) {
  const item = await ActionItem.findOne({ _id: req.params.id, userId: req.user.id });
  if (!item) return res.status(404).json({ error: 'Action item not found' });
  if (item.reviewState !== 'approved')
    return res
      .status(400)
      .json({ error: 'Approve the action item before creating a Jira ticket.' });
  if (item.jiraIssueKey)
    return res.status(409).json({ error: `Already linked to ${item.jiraIssueKey}` });
  const saved = await JiraIntegration.findOne({ userId: req.user.id }).select('defaultProjectKey');
  const projectKey = String(
    req.body.projectKey || saved?.defaultProjectKey || process.env.JIRA_DEFAULT_PROJECT_KEY || '',
  ).trim();
  if (!projectKey) return res.status(400).json({ error: 'Choose a Jira project key.' });
  try {
    const meeting = await (await import('../models/Meeting.js')).default.findById(item.meetingId);
    const paragraphs = [
      item.description,
      `Owner: ${item.owner || 'Not specified'}`,
      `Deadline: ${item.deadline || 'Not specified'}`,
      `Priority: ${item.priority}`,
      `Meeting: ${meeting?.title || ''}`,
      `Transcript timestamp: ${item.timestamp || 'Not provided'}`,
      `Evidence: ${item.sourceText || ''}`,
    ]
      .filter(Boolean)
      .map((text) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: String(text).slice(0, 3000) }],
      }));
    const payload = {
      fields: {
        project: { key: projectKey },
        summary: item.title.slice(0, 250),
        issuetype: { name: 'Task' },
        priority: { name: item.priority === 'Highest' ? 'Highest' : item.priority },
        description: { type: 'doc', version: 1, content: paragraphs },
      },
    };
    const assignee = await findAssignee(item.owner, projectKey);
    if (assignee) payload.fields.assignee = { accountId: assignee.accountId };
    if (item.deadline && /^\d{4}-\d{2}-\d{2}$/.test(item.deadline))
      payload.fields.duedate = item.deadline;
    const created = await jiraRequest('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const base = jiraConfig().base;
    const issue = {
      actionItemId: item._id,
      meetingId: item.meetingId,
      userId: req.user.id,
      issueId: created.id,
      issueKey: created.key,
      url: `${base}/browse/${created.key}`,
      status: 'To Do',
      assignee: assignee?.displayName || 'Unassigned',
      priority: item.priority,
      lastSyncedAt: new Date(),
    };
    await JiraIssue.create(issue);
    item.jiraIssueKey = created.key;
    item.jiraIssueId = created.id;
    item.jiraUrl = issue.url;
    item.jiraStatus = issue.status;
    item.jiraAssignee = issue.assignee;
    await item.save();
    res.status(201).json({ issue, actionItem: item });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
export async function sync(req, res) {
  const issues = await JiraIssue.find({ userId: req.user.id });
  const results = [];
  for (const issue of issues) {
    try {
      const data = await jiraRequest(
        `/rest/api/3/issue/${encodeURIComponent(issue.issueKey)}?fields=status,assignee,priority`,
      );
      const f = data.fields;
      issue.status = f.status?.name || issue.status;
      issue.assignee = f.assignee?.displayName || 'Unassigned';
      issue.priority = f.priority?.name || issue.priority;
      issue.lastSyncedAt = new Date();
      await issue.save();
      await ActionItem.findByIdAndUpdate(issue.actionItemId, {
        $set: {
          jiraStatus: issue.status,
          jiraAssignee: issue.assignee,
          lastJiraSyncAt: issue.lastSyncedAt,
        },
      });
      results.push({ key: issue.issueKey, status: 'synced' });
    } catch (e) {
      results.push({ key: issue.issueKey, status: 'failed', error: e.message });
    }
  }
  await JiraIntegration.findOneAndUpdate(
    { userId: req.user.id },
    { $set: { lastSyncAt: new Date() } },
  );
  res.json({ synced: results.filter((x) => x.status === 'synced').length, results });
}
export async function listIssues(req, res) {
  res.json({
    issues: await JiraIssue.find({ userId: req.user.id })
      .populate('actionItemId', 'title owner priority')
      .sort({ updatedAt: -1 }),
  });
}
