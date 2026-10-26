import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
// Each chunk is a separate MediaRecorder run so every upload is a complete, decodable audio file.
const CHUNK_MS = 30000;
function pickMime() {
  return (
    ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) =>
      window.MediaRecorder?.isTypeSupported?.(t),
    ) || ''
  );
}
export const liveSupported = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
export function useLiveCapture() {
  const [state, setState] = useState('idle'),
    [lines, setLines] = useState([]),
    [error, setError] = useState(''),
    [elapsed, setElapsed] = useState(0),
    [pending, setPending] = useState(0),
    [meetingId, setMeetingId] = useState(null);
  const r = useRef({});
  const release = () => {
    const x = r.current;
    clearInterval(x.timer);
    clearTimeout(x.cut);
    x.streams?.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    x.ctx?.close().catch(() => {});
  };
  useEffect(
    () => () => {
      r.current.active = false;
      release();
    },
    [],
  );
  const send = (blob, offset) => {
    const x = r.current;
    if (blob.size < 2000) return;
    const form = new FormData();
    form.append('offsetSeconds', String(offset));
    form.append('chunk', blob, `chunk.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
    setPending((n) => n + 1);
    x.queue = x.queue.then(() =>
      api
        .post(`/meetings/${x.id}/live/chunk`, form)
        .then((res) => setLines((l) => [...l, ...res.data.lines]))
        .catch((e) => setError(e.message))
        .finally(() => setPending((n) => n - 1)),
    );
  };
  const record = (stream, mime) => {
    const x = r.current;
    const offset = (Date.now() - x.t0) / 1000;
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined),
      parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      send(new Blob(parts, { type: rec.mimeType || mime }), offset);
      if (x.active) record(stream, mime);
      else x.done?.();
    };
    x.rec = rec;
    rec.start();
    x.cut = setTimeout(() => rec.state !== 'inactive' && rec.stop(), CHUNK_MS);
  };
  const stop = async () => {
    const x = r.current;
    if (!x.active) return;
    x.active = false;
    setState('finishing');
    clearTimeout(x.cut);
    await new Promise((done) => {
      x.done = done;
      if (x.rec && x.rec.state !== 'inactive') x.rec.stop();
      else done();
    });
    await x.queue;
    release();
    try {
      await api.post(`/meetings/${x.id}/live/finish`);
      setState('done');
    } catch (e) {
      setError(e.message);
      setState('error');
    }
  };
  const start = async ({ title, tab, mic }) => {
    setError('');
    setLines([]);
    setElapsed(0);
    setPending(0);
    setState('starting');
    const x = (r.current = { queue: Promise.resolve(), streams: [] });
    try {
      if (!tab && !mic) throw new Error('Choose at least one audio source.');
      const sources = [];
      if (tab) {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        x.streams.push(s);
        if (!s.getAudioTracks().length)
          throw new Error(
            'No audio was shared. Pick the meeting tab and turn on "Share tab audio".',
          );
        s.getTracks().forEach((t) => t.addEventListener('ended', () => stop()));
        sources.push(s);
      }
      if (mic) {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        x.streams.push(s);
        sources.push(s);
      }
      let stream = new MediaStream(sources[0].getAudioTracks());
      if (sources.length > 1) {
        x.ctx = new AudioContext();
        const dest = x.ctx.createMediaStreamDestination();
        sources.forEach((s) =>
          x.ctx.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(dest),
        );
        stream = dest.stream;
      }
      const { data } = await api.post('/meetings/live', { title });
      x.id = data.meeting._id;
      setMeetingId(x.id);
      x.active = true;
      x.t0 = Date.now();
      x.timer = setInterval(() => setElapsed(Math.floor((Date.now() - x.t0) / 1000)), 1000);
      record(stream, pickMime());
      setState('live');
    } catch (e) {
      release();
      setState('error');
      setError(
        e.name === 'NotAllowedError'
          ? 'Permission was denied for screen or microphone capture.'
          : e.message || 'Could not start capture.',
      );
    }
  };
  return { state, lines, error, elapsed, pending, meetingId, start, stop };
}
