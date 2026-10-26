import Meeting from '../models/Meeting.js';
import ActionItem from '../models/ActionItem.js';
import JiraIssue from '../models/JiraIssue.js';
import Speaker from '../models/Speaker.js';
export async function overview(req, res) {
  const uid = req.user.id;
  const [meetings, actions, jira, speakerRows] = await Promise.all([
    Meeting.find({ userId: uid }).sort({ createdAt: -1 }).limit(10).select('-filePath'),
    ActionItem.find({ userId: uid }),
    JiraIssue.find({ userId: uid }),
    Speaker.find({ userId: uid }),
  ]);
  const speakers = {};
  for (const s of speakerRows) {
    const x = speakers[s.name] || { name: s.name, utterances: 0, wordCount: 0 };
    x.utterances += s.utterances || 0;
    x.wordCount += s.wordCount || 0;
    speakers[s.name] = x;
  }
  res.json({
    stats: {
      meetings: await Meeting.countDocuments({ userId: uid }),
      pending: actions.filter((a) => a.reviewState === 'pending').length,
      approved: actions.filter((a) => a.reviewState === 'approved').length,
      jira: jira.length,
      completed: jira.filter((i) => /done|closed|resolved/i.test(i.status || '')).length,
    },
    meetings,
    actions,
    speakers: Object.values(speakers).sort((a, b) => b.wordCount - a.wordCount),
  });
}
