import React from 'react';
export default function SpeakerBars({ speakers = [] }) {
  const max = Math.max(1, ...speakers.map((x) => x.wordCount || 0));
  return (
    <>
      {speakers.map((s) => (
        <div className="speaker-bar" key={s.name}>
          <div>
            <b>{s.name}</b>
            <small>{s.utterances} utterances</small>
          </div>
          <div className="bar-track">
            <span
              style={{ width: `${Math.min(100, Math.max(4, ((s.wordCount || 0) / max) * 100))}%` }}
            />
          </div>
          <b>{s.wordCount}</b>
        </div>
      ))}
    </>
  );
}
