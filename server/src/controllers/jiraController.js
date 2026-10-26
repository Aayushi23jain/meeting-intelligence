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
    const projects = await jiraRequest('/rest/api/3/project/search?maxResults=1');
    const integration = await JiraIntegration.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          baseUrl: base,
          email: process.env.JIRA_EMAIL,
          defaultProjectKey: String(
            req.body.projectKey || process.env.JIRA_DEFAULT_PROJECT_KEY || '',
          ),
          connected: true,
        },
      },
      { upsert: true, new: true },
    );
    res.json({
      connected: true,
      baseUrl: base,
      projectsChecked: projects.values?.length || 0,
      defaultProjectKey: integration.defaultProjectKey,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
export async function projects(_req, res) {
  try {
    const data = await jiraRequest('/rest/api/3/project/search?maxResults=100');
    res.json({
      projects: (data.values || []).map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        projectTypeKey: p.projectTypeKey,
      })),
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
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
  const projectKey = String(
    req.body.projectKey || process.env.JIRA_DEFAULT_PROJECT_KEY || '',
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
    if (item.owner) {
      try {
        const matches = await jiraRequest(
          `/rest/api/3/user/search?query=${encodeURIComponent(item.owner)}&maxResults=10`,
        );
        const user =
          matches.find(
            (u) => String(u.displayName || '').toLowerCase() === item.owner.toLowerCase(),
          ) || matches[0];
        if (user?.accountId) payload.fields.assignee = { accountId: user.accountId };
      } catch {
        /* ticket can still be created with owner retained in description */
      }
    }
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
      assignee: item.owner,
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
export async function issueDetails(req, res) {
  try {
    const data = await jiraRequest(
      `/rest/api/3/issue/${encodeURIComponent(req.params.id)}?fields=status,assignee,priority,summary`,
    );
    res.json({
      issue: {
        id: data.id,
        key: data.key,
        summary: data.fields.summary,
        status: data.fields.status?.name || 'Unknown',
        assignee: data.fields.assignee?.displayName || '',
        priority: data.fields.priority?.name || '',
        url: `${jiraConfig().base}/browse/${data.key}`,
      },
    });
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
      issue.assignee = f.assignee?.displayName || '';
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
export async function webhook(req, res) {
  const secret = process.env.JIRA_WEBHOOK_SECRET;
  if (!secret)
    return res
      .status(503)
      .json({ error: 'Configure JIRA_WEBHOOK_SECRET before enabling webhook updates.' });
  if (req.headers['x-webhook-secret'] !== secret)
    return res.status(401).json({ error: 'Invalid webhook secret' });
  const key = req.body?.issue?.key;
  if (!key) return res.status(400).json({ error: 'Missing issue key' });
  const data = await JiraIssue.findOne({ issueKey: key });
  if (data) {
    const fields = req.body.issue.fields || {};
    data.status = fields.status?.name || data.status;
    data.assignee = fields.assignee?.displayName || data.assignee;
    data.lastSyncedAt = new Date();
    await data.save();
    await ActionItem.findByIdAndUpdate(data.actionItemId, {
      $set: {
        jiraStatus: data.status,
        jiraAssignee: data.assignee,
        lastJiraSyncAt: data.lastSyncedAt,
      },
    });
  }
  res.json({ ok: true });
}
