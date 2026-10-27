import Meeting from '../models/Meeting.js';
import ActionItem from '../models/ActionItem.js';
import JiraIssue from '../models/JiraIssue.js';
export async function overview(req, res) {
  const uid = req.user.id;
  const [meetings, actions, jira] = await Promise.all([
    Meeting.find({ userId: uid }).sort({ createdAt: -1 }).select('title createdAt processingStatus sourceType'),
    ActionItem.find({ userId: uid }).sort({ createdAt: 1 }),
    JiraIssue.find({ userId: uid }),
  ]);
  // Each meeting with the tasks extracted from it and, where one was created, their Jira ticket.
  const byMeeting = meetings.map((m) => ({
    _id: m._id,
    title: m.title,
    createdAt: m.createdAt,
    processingStatus: m.processingStatus,
    tasks: actions
      .filter((a) => String(a.meetingId) === String(m._id))
      .map((a) => ({
        _id: a._id,
        title: a.title,
        owner: a.owner,
        reviewState: a.reviewState,
        jiraIssueKey: a.jiraIssueKey,
        jiraStatus: a.jiraStatus,
        jiraAssignee: a.jiraAssignee,
        jiraUrl: a.jiraUrl,
      })),
  }));
  res.json({
    stats: {
      meetings: meetings.length,
      pending: actions.filter((a) => a.reviewState === 'pending').length,
      approved: actions.filter((a) => a.reviewState === 'approved').length,
      jira: jira.length,
      completed: jira.filter((i) => /done|closed|resolved/i.test(i.status || '')).length,
    },
    meetings: meetings.slice(0, 10),
    actions,
    byMeeting,
  });
}
