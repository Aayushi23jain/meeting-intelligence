import React from 'react';
import { Clock3 } from 'lucide-react';
export default function ActionEvidence({ timestamp, sourceText }) {
  if (!sourceText) return null;
  return (
    <details className="evidence">
      <summary>
        <Clock3 size={14} /> Source evidence · {timestamp || 'timestamp not provided'}
      </summary>
      <blockquote>{sourceText}</blockquote>
    </details>
  );
}
