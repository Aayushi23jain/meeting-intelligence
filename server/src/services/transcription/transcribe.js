import fs from 'node:fs';
import OpenAI, { toFile } from 'openai';
export async function transcribeMedia(filePath, filename) {
  if (!process.env.OPENAI_API_KEY)
    throw new Error(
      'Audio/video transcription requires OPENAI_API_KEY. You can instead upload a prepared transcript.',
    );
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const result = await client.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
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
// Live capture: one short browser-recorded chunk; offset shifts segment times onto the meeting clock.
export async function transcribeChunk(buffer, filename, offset = 0) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Live transcription requires OPENAI_API_KEY.');
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const result = await client.audio.transcriptions.create({
    file: await toFile(buffer, filename || 'chunk.webm'),
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });
  // Whisper invents filler ("Thank you.") on silent audio; drop segments it flags as likely non-speech.
  const segments = (result.segments || [])
    .filter((s) => (s.no_speech_prob ?? 0) < 0.6)
    .map((s, i) => ({
      id: `live_${Math.round(offset * 1000)}_${i + 1}`,
      speaker: 'Unknown',
      text: s.text?.trim() || '',
      timestamp: formatTime(offset + s.start),
      startSeconds: offset + s.start,
    }))
    .filter((x) => x.text);
  return { text: segments.map((s) => s.text).join(' '), segments };
}
function formatTime(n = 0) {
  const s = Math.floor(n);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
