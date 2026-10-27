import crypto from 'node:crypto';
export function parseTranscript(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((raw, i) => {
      const line = raw.trim();
      if (!line) return null;
      const m = line.match(/^(?:\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*)?([^:]{1,60}):\s*(.*)$/);
      const timestamp = m?.[1] || '';
      const body = m ? m[3] || line : line;
      let secs = null;
      if (timestamp) {
        const p = timestamp.split(':').map(Number);
        secs = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
      }
      return {
        id: `line_${i + 1}_${crypto.randomBytes(3).toString('hex')}`,
        speaker: m ? m[2].trim() : 'Unknown',
        text: body,
        timestamp,
        startSeconds: secs,
      };
    })
    .filter(Boolean);
}
export function formatTime(n = 0) {
  const s = Math.floor(n);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
