import React from 'react';
const steps = [
  ['01', 'Ingest & validate', 'File type, size and meeting metadata'],
  ['02', 'Transcribe', 'Speech-to-text with timestamped segments'],
  ['03', 'Analyze with AI', 'Summary, decisions, owners and deadlines'],
  ['04', 'Review evidence', 'Edit, approve or reject suggested tasks'],
  ['05', 'Create Jira issues', 'Approved tasks become traceable tickets'],
];
export default function ProcessingPipeline() {
  return (
    <>
      {steps.map(([n, title, desc]) => (
        <div className="pipeline-step" key={n}>
          <span>{n}</span>
          <div>
            <b>{title}</b>
            <small>{desc}</small>
          </div>
        </div>
      ))}
    </>
  );
}
