import ActionItem from '../models/ActionItem.js';
export async function listActions(req, res) {
  const q = { userId: req.user.id };
  if (req.query.state) q.reviewState = req.query.state;
  if (req.query.meetingId) q.meetingId = req.query.meetingId;
  res.json({
    actionItems: await ActionItem.find(q)
      .populate('meetingId', 'title createdAt')
      .sort({ createdAt: -1 })
      .limit(500),
  });
}
export async function updateAction(req, res) {
  const allowed = ['title', 'description', 'owner', 'deadline', 'priority', 'reviewState'];
  const patch = {};
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
  if (patch.priority && !['Low', 'Medium', 'High', 'Highest'].includes(patch.priority))
    return res.status(400).json({ error: 'Invalid priority' });
  if (patch.reviewState && !['pending', 'approved', 'rejected'].includes(patch.reviewState))
    return res.status(400).json({ error: 'Invalid review state' });
  const item = await ActionItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { $set: patch },
    { new: true, runValidators: true },
  );
  if (!item) return res.status(404).json({ error: 'Action item not found' });
  res.json({ actionItem: item });
}
export async function approveAction(req, res) {
  const item = await ActionItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { $set: { reviewState: 'approved' } },
    { new: true },
  );
  if (!item) return res.status(404).json({ error: 'Action item not found' });
  res.json({ actionItem: item });
}
export async function rejectAction(req, res) {
  const item = await ActionItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { $set: { reviewState: 'rejected' } },
    { new: true },
  );
  if (!item) return res.status(404).json({ error: 'Action item not found' });
  res.json({ actionItem: item });
}
