import OpenAI, { toFile } from 'openai';
import { getFileBuffer } from '../storage/gridfs.js';
import { formatTime } from '../../utils/transcript.js';
export async function transcribeMedia(storageKey, filename) {
  if (!process.env.OPENAI_API_KEY)
    throw new Error(
      'Audio/video transcription requires OPENAI_API_KEY.',
    );
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  // The file name's extension tells the API which audio format it is receiving.
  const result = await client.audio.transcriptions.create({
    file: await toFile(await getFileBuffer(storageKey), filename || 'recording'),
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });
  const segments = (result.segments || [])
    .map((s, i) => ({
      id: `line_${i + 1}`,
      speaker: 'Unknown',
      text: s.text?.trim() || '',
      timestamp: formatTime(s.start),
      startSeconds: s.start,
    }))
    .filter((x) => x.text);
  return { text: result.text || segments.map((s) => s.text).join('\n'), segments };
}
