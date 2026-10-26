import OpenAI from 'openai';
const taskPattern =
  /\b(will|need to|needs to|should|must|prepare|finish|complete|create|fix|implement|send|review|test|integrate|deliver|follow up|action item)\b/i;
function fallback(lines) {
  const decisions = lines
    .filter((l) => /\b(decided|decision|agreed|approved|we will go with)\b/i.test(l.text))
    .map((l) => ({ text: l.text, timestamp: l.timestamp || '', confidence: 0.55 }));
  const actionItems = lines
    .filter((l) => taskPattern.test(l.text))
    .slice(0, 30)
    .map((l, i) => ({
      title: l.text.replace(/^.{0,60}?:\s*/, '').slice(0, 120) || l.text.slice(0, 120),
      description: l.text,
      owner: l.speaker === 'Unknown' ? '' : l.speaker,
      deadline:
        (l.text.match(
          /\b(?:by|before)\s+(?:\w+\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|tomorrow|next week|\w+ \d{1,2})\b/i,
        ) || [])[0] || '',
      priority: /urgent|critical|asap|blocker/i.test(l.text) ? 'High' : 'Medium',
      timestamp: l.timestamp || '',
      startSeconds: l.startSeconds,
      sourceLineId: l.id,
      sourceText: l.text,
      confidence: 0.52,
    }));
  return {
    summary: `Processed ${lines.length} transcript lines. ${decisions.length} possible decisions and ${actionItems.length} possible action items were detected. Review the evidence before creating tickets.`,
    decisions,
    actionItems,
    speakers: speakerStats(lines),
    analytics: { sentiment: 'Not assessed (fallback mode)', engagement: 0 },
    mode: 'fallback',
  };
}
function speakerStats(lines) {
  const map = new Map();
  for (const l of lines) {
    const s = l.speaker || 'Unknown',
      v = map.get(s) || { name: s, utterances: 0, wordCount: 0 };
    v.utterances++;
    v.wordCount += (l.text.match(/\S+/g) || []).length;
    map.set(s, v);
  }
  return [...map.values()];
}
export async function analyzeMeeting(transcript, lines) {
  if (!process.env.OPENAI_API_KEY) return fallback(lines);
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const schema = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      decisions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            timestamp: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['text', 'timestamp', 'confidence'],
          additionalProperties: false,
        },
      },
      actionItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            owner: { type: 'string' },
            deadline: { type: 'string' },
            priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Highest'] },
            timestamp: { type: 'string' },
            startSeconds: { type: ['number', 'null'] },
            sourceLineId: { type: 'string' },
            sourceText: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: [
            'title',
            'description',
            'owner',
            'deadline',
            'priority',
            'timestamp',
            'startSeconds',
            'sourceLineId',
            'sourceText',
            'confidence',
          ],
          additionalProperties: false,
        },
      },
      speakers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            utterances: { type: 'number' },
            wordCount: { type: 'number' },
            sentiment: { type: 'string' },
          },
          required: ['name', 'utterances', 'wordCount', 'sentiment'],
          additionalProperties: false,
        },
      },
      analytics: {
        type: 'object',
        properties: { sentiment: { type: 'string' }, engagement: { type: 'number' } },
        required: ['sentiment', 'engagement'],
        additionalProperties: false,
      },
    },
    required: ['summary', 'decisions', 'actionItems', 'speakers', 'analytics'],
    additionalProperties: false,
  };
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.15,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'meeting_analysis', strict: true, schema },
    },
    messages: [
      {
        role: 'system',
        content:
          'Analyze a meeting transcript. Extract only supported decisions and concrete follow-up tasks. Never invent a person, deadline, timestamp, or quote. sourceText must exactly match a transcript line and sourceLineId must be a matching line id. Use null startSeconds if unknown. Provide conservative confidence from 0 to 1. Sentiment/engagement are rough meeting-level signals, not facts about a person.',
      },
      { role: 'user', content: JSON.stringify({ transcript, lines }) },
    ],
  });
  const data = JSON.parse(response.choices[0].message.content);
  const verified = (data.actionItems || [])
    .map((a) => {
      const line =
        lines.find((l) => l.id === a.sourceLineId) ||
        lines.find((l) => l.text.trim() === String(a.sourceText || '').trim());
      if (!line) return null;
      return {
        ...a,
        sourceLineId: line.id,
        sourceText: line.text,
        timestamp: line.timestamp || '',
        startSeconds: line.startSeconds ?? null,
      };
    })
    .filter(Boolean);
  return { ...data, actionItems: verified, mode: 'ai' };
}
