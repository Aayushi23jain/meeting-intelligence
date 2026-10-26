import React from 'react';
export default function TranscriptLine({ line, selected, onSelect }) {
  return (
    <button
      id={`line-${line.id}`}
      className={`transcript-line ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <time>{line.timestamp || '—:—'}</time>
      <div>
        <b>{line.speaker}</b>
        <p>{line.text}</p>
      </div>
    </button>
  );
}
