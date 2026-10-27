import OpenAI from 'openai';
// Speech-to-text gives no speaker names, so the LLM infers them from introductions and the flow of the conversation. It is a best guess: unsure lines stay Unknown, and
// only names actually said in the meeting are accepted.
export async function identifySpeakers(lines) {
  if (!process.env.OPENAI_API_KEY || !lines.length) return lines;
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const schema = {
    type: 'object',
    properties: {
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: { type: 'string' }, speaker: { type: 'string' } },
          required: ['id', 'speaker'],
          additionalProperties: false,
        },
      },
    },
    required: ['lines'],
    additionalProperties: false,
  };
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'speaker_labels', strict: true, schema },
      },
      messages: [
        {
          role: 'system',
          content:
            'Each line is one turn of a meeting transcript with no speaker names. Work out who said each line, using self-introductions ("This is Aayushi", "Rahul here"), people being addressed by name and answering, and the back-and-forth of the conversation. A person is never the speaker of a line that addresses them by name or talks about them in the third person. Use only first names that appear in the transcript. If you are not reasonably sure, use "Unknown". Return every line id exactly once.',
        },
        {
          role: 'user',
          content: JSON.stringify(lines.map((l) => ({ id: l.id, text: l.text }))),
        },
      ],
    });
    const labels = new Map(
      JSON.parse(response.choices[0].message.content).lines.map((l) => [l.id, l.speaker]),
    );
    const said = lines.map((l) => l.text.toLowerCase()).join(' ');
    return lines.map((l) => {
      const name = String(labels.get(l.id) || '').trim();
      const known = name && name !== 'Unknown' && said.includes(name.toLowerCase());
      return { ...l, speaker: known ? name : 'Unknown' };
    });
  } catch (e) {
    console.error('Speaker identification failed', e.message);
    return lines;
  }
}
