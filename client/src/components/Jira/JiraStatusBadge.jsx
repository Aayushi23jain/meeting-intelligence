import React from 'react';
export default function JiraStatusBadge({ status = 'Unknown' }) {
  const normalized = String(status)
    .toLowerCase()
    .replace(/[^a-z]+/g, '-');
  return <span className={`status-badge ${normalized}`}>{status}</span>;
}
