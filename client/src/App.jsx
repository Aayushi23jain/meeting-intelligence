import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Activity,
  AudioLines,
  LayoutDashboard,
  ListChecks,
  Ticket,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  CheckCircle2,
  FileText,
  ArrowUpRight,
  LoaderCircle,
  ChevronRight,
  UploadCloud,
} from 'lucide-react';
import { api } from './services/api';
import { loadSession, login, register, logout } from './store/slices/authSlice';
import { fetchMeetings, fetchMeeting, uploadMeeting } from './store/slices/meetingSlice';
import {
  fetchActions,
  updateAction,
  approveAction,
  rejectAction,
} from './store/slices/actionItemsSlice';
import {
  fetchJiraStatus,
  connectJira,
  createJiraIssue,
  syncJira,
  fetchJiraIssues,
} from './store/slices/jiraSlice';
import { selectAction } from './store/slices/uiSlice';
import { setTranscriptLines, selectTranscriptLine } from './store/slices/transcriptSlice';
import TranscriptLine from './components/Transcript/TranscriptLine';
import JiraStatusBadge from './components/Jira/JiraStatusBadge';
import ActionEvidence from './components/ActionItems/ActionEvidence';
function AuthPage() {
  const d = useDispatch(),
    nav = useNavigate(),
    a = useSelector((s) => s.auth);
  const [mode, setMode] = useState('login'),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  useEffect(() => {
    if (a.user) nav('/');
  }, [a.user]);
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <Brand />
        <span className="eyebrow">MEETING INTELLIGENCE WORKSPACE</span>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1>
        <p>Keep meeting decisions connected to real work.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            d(mode === 'login' ? login({ email, password }) : register({ name, email, password }));
          }}
        >
          {mode === 'register' && (
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            minLength="8"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {a.error && <p className="error-text">{a.error}</p>}
          <button className="primary wide" disabled={a.loading}>
            {a.loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}
        </button>
        <small>Local development workspace · Credentials are stored as a password hash.</small>
      </div>
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <AudioLines size={21} />
      </span>
      <div>
        <b>Meetwise AI</b>
        <small>MEETING INTELLIGENCE</small>
      </div>
    </div>
  );
}
function Shell({ children }) {
  const d = useDispatch(),
    a = useSelector((s) => s.auth),
    [mobile, setMobile] = useState(false),
    [menu, setMenu] = useState(false),
    menuRef = useRef(null);
  // Close the account menu on any click outside it.
  useEffect(() => {
    if (!menu) return;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'show' : ''}`}>
        <Brand />
        <p className="nav-label">WORKSPACE</p>
        <nav>
          <NavLink end to="/">
            <LayoutDashboard size={17} />
            Overview
          </NavLink>
          <NavLink to="/upload">
            <UploadCloud size={17} />
            Upload meeting
          </NavLink>
          <NavLink to="/actions">
            <ListChecks size={17} />
            Action review
          </NavLink>
          <NavLink to="/jira">
            <Ticket size={17} />
            Jira board
          </NavLink>
          <NavLink to="/analytics">
            <BarChart3 size={17} />
            Analytics
          </NavLink>
          <NavLink to="/settings">
            <SettingsIcon size={17} />
            Settings
          </NavLink>
        </nav>
        <div className="sidebar-bottom" ref={menuRef}>
          {menu && (
            <div className="user-menu">
              <small>{a.user?.email}</small>
              <button className="logout" onClick={() => d(logout())}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
          <button className="user-chip" onClick={() => setMenu(!menu)}>
            <span className="avatar">
              {(a.user?.name || a.user?.email || 'U').slice(0, 1).toUpperCase()}
            </span>
            <b>{a.user?.name || a.user?.email}</b>
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobile(!mobile)}>
            <Menu />
          </button>
          <div className="crumb">
            WORKSPACE <ChevronRight size={13} /> <span>MEETING INTELLIGENCE</span>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
function PageHead({ eyebrow, title, sub, action }) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}
function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <div className="stat-value">{value}</div>
      <small>{sub}</small>
    </div>
  );
}
function Dashboard() {
  const d = useDispatch(),
    m = useSelector((s) => s.meetings),
    j = useSelector((s) => s.jira),
    a = useSelector((s) => s.actionItems);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    d(fetchMeetings());
    d(fetchActions());
    d(fetchJiraStatus());
    d(fetchJiraIssues());
    fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/analytics/overview', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);
  const meetings = stats?.meetings || m.list;
  const ss = stats?.stats || {};
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE / OVERVIEW"
        title="Meeting intelligence"
        sub="Turn conversations into clear decisions and trackable work."
        action={
          <div className="actions-head-controls">
            <NavLink className="primary button-link" to="/upload">
              <UploadCloud size={16} /> Upload meeting
            </NavLink>
          </div>
        }
      />
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <Activity size={14} /> AI-POWERED WORKFLOW
          </span>
          <h2>
            From meeting notes
            <br />
            to work that gets done.
          </h2>
          <p>
            Capture the discussion, validate every suggested action, and send approved work to Jira
            with its source evidence.
          </p>
          <div className="flowline">
            <span>
              01 <b>Capture</b>
            </span>
            <i>→</i>
            <span>
              02 <b>Review</b>
            </span>
            <i>→</i>
            <span>
              03 <b>Track</b>
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-orbit">
            <AudioLines size={34} />
          </div>
          <div className="float-card">
            <CheckCircle2 size={16} />
            <span>
              <b>Evidence linked</b>
              <small>Timestamp + transcript line</small>
            </span>
          </div>
          <div className="float-card second">
            <Ticket size={16} />
            <span>
              <b>Jira connected</b>
              <small>{j.connected ? 'Ready to sync' : 'Connect in Settings'}</small>
            </span>
          </div>
        </div>
      </section>
      <div className="stats-grid">
        <Stat
          icon={FileText}
          label="Meetings"
          value={ss.meetings ?? meetings.length}
          sub="Captured in your workspace"
        />
        <Stat
          icon={ListChecks}
          label="Needs review"
          value={ss.pending ?? a.items.filter((x) => x.reviewState === 'pending').length}
          sub="AI-suggested action items"
        />
        <Stat
          icon={Ticket}
          label="Jira issues"
          value={ss.jira ?? j.issues.length}
          sub="Linked work items"
        />
        <Stat
          icon={CheckCircle2}
          label="Completed"
          value={ss.completed ?? 0}
          sub="Synced from Jira"
        />
      </div>
      <div className="section-row">
        <div>
          <h2>Recent meetings</h2>
          <p>Latest uploaded meetings and processing status.</p>
        </div>
        <NavLink className="subtle-link" to="/upload">
          Upload a meeting <ArrowUpRight size={15} />
        </NavLink>
      </div>
      <div className="table-card">
        {meetings.length ? (
          meetings.slice(0, 8).map((x) => (
            <NavLink className="meeting-row" to={`/meetings/${x._id}`} key={x._id}>
              <div className="file-icon">
                <FileText size={19} />
              </div>
              <div className="meeting-name">
                <b>{x.title}</b>
                <small>
                  {new Date(x.createdAt).toLocaleString()} · {x.sourceType || 'transcript'}
                </small>
              </div>
              <span className={`status-badge ${x.processingStatus}`}>{x.processingStatus}</span>
              <ChevronRight size={16} />
            </NavLink>
          ))
        ) : (
          <div className="empty-state">
            <FileText size={26} />
            <b>No meetings yet</b>
            <p>Upload a meeting recording to begin.</p>
            <NavLink className="primary button-link" to="/upload">
              Upload your first meeting
            </NavLink>
          </div>
        )}
      </div>
    </>
  );
}
function UploadPage() {
  const d = useDispatch(),
    nav = useNavigate(),
    m = useSelector((s) => s.meetings);
  const [title, setTitle] = useState(''),
    [file, setFile] = useState(null);
  const submit = (e) => {
    e.preventDefault();
    d(uploadMeeting({ title, file }))
      .unwrap()
      .then((x) => nav(`/meetings/${x._id}`))
      .catch(() => {});
  };
  return (
    <>
      <PageHead
        eyebrow="MEETING UPLOAD"
        title="Upload a meeting"
        sub="Upload a meeting recording. It is transcribed and analysed in the background."
      />
      <form className="panel" onSubmit={submit}>
        <label className="field-label">
          Meeting title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly project sync"
          />
        </label>
        <label className="dropzone">
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
          <UploadCloud size={30} />
          <b>{file ? file.name : 'Choose an audio or video file'}</b>
          <span>Audio/video supported · Max {import.meta.env.VITE_MAX_UPLOAD_MB || 25} MB</span>
        </label>
        <button className="primary wide" disabled={!file || m.status === 'loading'}>
          {m.status === 'loading' ? (
            <>
              <LoaderCircle className="spin" size={17} /> Uploading…
            </>
          ) : (
            'Upload & analyze'
          )}
        </button>
        {m.error && <p className="error-text">{m.error}</p>}
      </form>
    </>
  );
}
function MeetingPage() {
  const { id } = useParams(),
    d = useDispatch(),
    m = useSelector((s) => s.meetings),
    acts = useSelector((s) => s.actionItems),
    [data, setData] = useState(null),
    [selected, setSelected] = useState(null),
    [filter, setFilter] = useState('all');
  useEffect(() => {
    d(fetchMeeting(id))
      .unwrap()
      .then((x) => {
        setData(x);
        d(setTranscriptLines(x.meeting?.transcriptLines || []));
      })
      .catch(() => {});
    d(fetchActions({ meetingId: id }));
  }, [id]);
  useEffect(() => {
    if (m.current?._id === id) setData({ meeting: m.current, actionItems: m.actions });
  }, [m.current, m.actions, id]);
  const meeting = data?.meeting;
  useEffect(() => {
    if (!['queued', 'processing'].includes(meeting?.processingStatus)) return;
    const t = setInterval(() => {
      d(fetchMeeting(id));
      d(fetchActions({ meetingId: id }));
    }, 3000);
    return () => clearInterval(t);
  }, [meeting?.processingStatus, id]);
  const items = acts.items.filter((a) => String(a.meetingId?._id || a.meetingId) === id);
  return (
    <>
      <PageHead
        eyebrow="MEETING WORKSPACE"
        title={meeting?.title || 'Meeting details'}
        sub="Summary, decisions, transcript evidence and extracted follow-ups."
        action={
          <NavLink className="secondary button-link" to="/actions">
            Action review <ChevronRight size={15} />
          </NavLink>
        }
      />
      {!meeting ? (
        <div className="panel empty-state">
          <LoaderCircle className="spin" />
          <p>Loading meeting…</p>
        </div>
      ) : (
        <>
          <div className="meeting-overview">
            <div className="panel summary-panel">
              <span className="eyebrow">AI MEETING BRIEF</span>
              <h3>Summary</h3>
              <p>{meeting.summary || `Processing status: ${meeting.processingStatus}.`}</p>
              <div className="decision-list">
                <h4>Decisions</h4>
                {meeting.decisions?.length ? (
                  meeting.decisions.map((x, i) => (
                    <div className="decision-row" key={i}>
                      <CheckCircle2 size={16} />
                      <span>
                        {x.text || x}
                        <small>{x.timestamp || 'Timestamp not provided'}</small>
                      </span>
                    </div>
                  ))
                ) : (
                  <small>No decisions detected yet.</small>
                )}
              </div>
            </div>
            <div className="panel compact-stats">
              <div>
                <span>Processing</span>
                <b className={`status-badge ${meeting.processingStatus}`}>
                  {meeting.processingStatus}
                </b>
              </div>
              <div>
                <span>Transcript lines</span>
                <b>{meeting.transcriptLines?.length || 0}</b>
              </div>
              <div>
                <span>Action items</span>
                <b>{items.length}</b>
              </div>
              <div>
                <span>Source</span>
                <b>{meeting.sourceType}</b>
              </div>
              {meeting.processingError && <p className="error-text">{meeting.processingError}</p>}
            </div>
          </div>
          <div className="meeting-workspace-grid">
            <section className="panel transcript-panel">
              <div className="section-row">
                <div>
                  <h3>Transcript & evidence</h3>
                  <p>Choose an action item to jump to its source line.</p>
                </div>
                <span className="pill">{meeting.transcriptLines?.length || 0} lines</span>
              </div>
              <div className="transcript-list">
                {(meeting.transcriptLines || []).map((line) => (
                  <TranscriptLine
                    key={line.id}
                    line={line}
                    selected={selected === line.id}
                    onSelect={() => {
                      setSelected(line.id);
                      d(selectAction(line.id));
                      d(selectTranscriptLine({ id: line.id, timestamp: line.timestamp }));
                    }}
                  />
                ))}
              </div>
              {!meeting.transcriptLines?.length && (
                <p className="muted">Transcript is not available yet.</p>
              )}
            </section>
            <section className="panel timeline-panel">
              <div className="section-row">
                <div>
                  <h3>Action timeline</h3>
                  <p>Evidence-linked tasks from this meeting.</p>
                </div>
                <span className="pill">{items.length} items</span>
              </div>
              <div className="filter-tabs">
                {['all', 'pending', 'approved', 'rejected'].map((x) => (
                  <button
                    key={x}
                    className={filter === x ? 'active' : ''}
                    onClick={() => setFilter(x)}
                  >
                    {x}
                  </button>
                ))}
              </div>
              {items
                .filter((x) => filter === 'all' || x.reviewState === filter)
                .map((item, i) => (
                  <button
                    className={`timeline-item ${selected === item.sourceLineId ? 'selected' : ''}`}
                    key={item._id}
                    onClick={() => {
                      setSelected(item.sourceLineId);
                      d(selectTranscriptLine({ id: item.sourceLineId, timestamp: item.timestamp }));
                      document
                        .getElementById(`line-${item.sourceLineId}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <span className="timeline-dot" />
                    <div>
                      <small>
                        {item.timestamp || 'Timestamp not provided'} · {item.reviewState}
                      </small>
                      <b>{item.title}</b>
                      <p>
                        {item.owner || 'Owner unassigned'} · {item.deadline || 'No deadline'}
                      </p>
                    </div>
                    <span className={`priority ${String(item.priority).toLowerCase()}`}>
                      {item.priority}
                    </span>
                  </button>
                ))}
              {!items.length && (
                <div className="empty-state">
                  <ListChecks />
                  <p>Action items appear here after processing.</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
function ActionsPage() {
  const d = useDispatch(),
    s = useSelector((x) => x.actionItems),
    j = useSelector((x) => x.jira),
    [filter, setFilter] = useState('pending'),
    [drafts, setDrafts] = useState({}),
    [project, setProject] = useState(''),
    [creating, setCreating] = useState('');
  useEffect(() => {
    d(fetchActions());
    d(fetchJiraStatus());
  }, []);
  const change = (item, k, v) =>
    setDrafts((p) => ({ ...p, [item._id]: { ...(p[item._id] || item), [k]: v } }));
  const save = (item) =>
    d(updateAction({ id: item._id, patch: drafts[item._id] }))
      .unwrap()
      .then(() =>
        setDrafts((p) => {
          const n = { ...p };
          delete n[item._id];
          return n;
        }),
      );
  const items = s.items.filter((x) => filter === 'all' || x.reviewState === filter);
  return (
    <>
      <PageHead
        eyebrow="ACTION REVIEW"
        title="Review action items"
        sub="Verify the AI extraction, edit task fields and approve only work that belongs in Jira."
        action={
          <div className="actions-head-controls">
            <label className="project-select">
              Jira project key
              <input
                value={project}
                onChange={(e) => setProject(e.target.value.toUpperCase())}
                placeholder={j.defaultProjectKey || 'PROJ'}
              />
            </label>
            <button
              className="secondary"
              onClick={() =>
                Promise.all(
                  s.items
                    .filter((x) => x.reviewState === 'pending')
                    .map((x) => d(approveAction(x._id)).unwrap()),
                )
              }
            >
              Approve all pending
            </button>
          </div>
        }
      />
      {j.error && <p className="error-text">{j.error}</p>}
      <div className="filter-tabs page-filters">
        {['pending', 'approved', 'rejected', 'all'].map((x) => (
          <button key={x} className={filter === x ? 'active' : ''} onClick={() => setFilter(x)}>
            {x} <span>{s.items.filter((a) => x === 'all' || a.reviewState === x).length}</span>
          </button>
        ))}
      </div>
      <div className="action-list">
        {items.map((item, i) => {
          const v = drafts[item._id] || item;
          return (
            <article className="panel action-card" key={item._id}>
              <div className="action-number">{String(i + 1).padStart(2, '0')}</div>
              <div className="action-main">
                <div className="action-card-head">
                  <span className={`status-badge ${item.reviewState}`}>{item.reviewState}</span>
                  <span className={`priority ${String(v.priority).toLowerCase()}`}>
                    {v.priority}
                  </span>
                </div>
                <input
                  className="title-input"
                  value={v.title}
                  onChange={(e) => change(item, 'title', e.target.value)}
                />
                <textarea
                  rows="2"
                  value={v.description || ''}
                  onChange={(e) => change(item, 'description', e.target.value)}
                />
                <div className="action-fields">
                  <label>
                    Owner
                    <input
                      value={v.owner || ''}
                      placeholder="Unassigned"
                      onChange={(e) => change(item, 'owner', e.target.value)}
                    />
                  </label>
                  <label>
                    Deadline
                    <input
                      value={v.deadline || ''}
                      placeholder="YYYY-MM-DD or natural language"
                      onChange={(e) => change(item, 'deadline', e.target.value)}
                    />
                  </label>
                  <label>
                    Priority
                    <select
                      value={v.priority}
                      onChange={(e) => change(item, 'priority', e.target.value)}
                    >
                      {['Low', 'Medium', 'High', 'Highest'].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <ActionEvidence timestamp={item.timestamp} sourceText={item.sourceText} />
                {item.jiraIssueKey && (
                  <a className="jira-link" href={item.jiraUrl} target="_blank" rel="noreferrer">
                    <Ticket size={14} />
                    {item.jiraIssueKey} · {item.jiraStatus || 'Created'} <ArrowUpRight size={14} />
                  </a>
                )}
              </div>
              <div className="action-buttons">
                {drafts[item._id] && (
                  <button className="secondary" onClick={() => save(item)}>
                    Save edits
                  </button>
                )}
                {item.reviewState !== 'approved' && (
                  <button
                    className="primary"
                    onClick={() => {
                      const patch = drafts[item._id];
                      const promise = patch
                        ? d(updateAction({ id: item._id, patch })).unwrap()
                        : Promise.resolve();
                      promise.then(() => d(approveAction(item._id)));
                    }}
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                )}
                {item.reviewState !== 'rejected' && (
                  <button
                    className="secondary danger-button"
                    onClick={() => d(rejectAction(item._id))}
                  >
                    Reject
                  </button>
                )}
                {item.reviewState === 'approved' &&
                  (item.jiraIssueKey ? (
                    <button className="jira-button" disabled>
                      <CheckCircle2 size={15} /> Created
                    </button>
                  ) : (
                    <button
                      className="jira-button"
                      disabled={creating === item._id}
                      onClick={() => {
                        setCreating(item._id);
                        d(
                          createJiraIssue({
                            id: item._id,
                            projectKey: project || j.defaultProjectKey,
                          }),
                        ).finally(() => setCreating(''));
                      }}
                    >
                      {creating === item._id ? (
                        <>
                          <LoaderCircle className="spin" size={15} /> Creating…
                        </>
                      ) : (
                        <>
                          <Ticket size={15} /> Create Jira issue
                        </>
                      )}
                    </button>
                  ))}
              </div>
            </article>
          );
        })}
        {!items.length && (
          <div className="panel empty-state">
            <ListChecks size={28} />
            <b>No items in this queue</b>
            <p>Upload a meeting to extract evidence-linked action items.</p>
            <NavLink to="/upload" className="primary button-link">
              Upload meeting
            </NavLink>
          </div>
        )}
      </div>
    </>
  );
}
function JiraPage() {
  const d = useDispatch(),
    j = useSelector((s) => s.jira);
  // Pull the latest status/assignee from Jira on open; the list still shows if Jira is unreachable.
  useEffect(() => {
    d(syncJira()).finally(() => d(fetchJiraIssues()));
  }, []);
  return (
    <>
      <PageHead
        eyebrow="JIRA"
        title="Jira board"
        sub="Issues created from approved action items, with their latest Jira status and assignee."
        action={<span className="pill">{j.issues.length} issues</span>}
      />
      <div className="table-card">
        {j.issues.map((issue) => (
          <div className="jira-row" key={issue._id}>
            <div className="file-icon">
              <Ticket size={18} />
            </div>
            <div className="meeting-name">
              <b>
                {issue.issueKey} · {issue.actionItemId?.title || 'Action item'}
              </b>
              <small>
                {issue.assignee || 'Unassigned'} · Priority {issue.priority || 'Not set'}
              </small>
            </div>
            <JiraStatusBadge status={issue.status || 'Unknown'} />
            <a href={issue.url} target="_blank" rel="noreferrer" className="icon-btn">
              <ArrowUpRight size={17} />
            </a>
          </div>
        ))}
        {!j.issues.length && (
          <div className="empty-state">
            <Ticket size={28} />
            <b>No Jira issues linked yet</b>
            <p>Approve an action item, then create a Jira issue from Action Review.</p>
            <NavLink className="secondary button-link" to="/actions">
              Review action items
            </NavLink>
          </div>
        )}
      </div>
    </>
  );
}
function AnalyticsPage() {
  const [stats, setStats] = useState(null),
    [meetingId, setMeetingId] = useState('');
  const shown = (stats?.byMeeting || []).filter((m) => !meetingId || m._id === meetingId);
  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/analytics/overview', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE INSIGHTS"
        title="Meeting analytics"
        sub="Track task flow and high-level participation signals across processed meetings."
      />
      <div className="stats-grid">
        <Stat
          icon={FileText}
          label="Meetings processed"
          value={stats?.stats?.meetings ?? '—'}
          sub="Total meeting records"
        />
        <Stat
          icon={ListChecks}
          label="Action items pending"
          value={stats?.stats?.pending ?? '—'}
          sub="Awaiting human review"
        />
        <Stat
          icon={Ticket}
          label="Jira issues linked"
          value={stats?.stats?.jira ?? '—'}
          sub="Created from approved tasks"
        />
        <Stat
          icon={CheckCircle2}
          label="Tasks completed"
          value={stats?.stats?.completed ?? '—'}
          sub="Based on latest Jira sync"
        />
      </div>
      <div className="section-row analytics-panel">
        <div>
          <h2>Tasks by meeting</h2>
          <p>Every task extracted from a meeting and the Jira ticket created for it.</p>
        </div>
        {!!stats?.byMeeting?.length && (
          <label className="project-select meeting-filter">
            Meeting
            <select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
              <option value="">All meetings</option>
              {stats.byMeeting.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title} · {new Date(m.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {shown.map((m) => (
        <div className="table-card meeting-tasks" key={m._id}>
          <NavLink className="meeting-row" to={`/meetings/${m._id}`}>
            <div className="file-icon">
              <FileText size={19} />
            </div>
            <div className="meeting-name">
              <b>{m.title}</b>
              <small>{new Date(m.createdAt).toLocaleString()}</small>
            </div>
            <span className="pill">{m.tasks.length} tasks</span>
            <span className="pill">{m.tasks.filter((t) => t.jiraIssueKey).length} Jira tickets</span>
          </NavLink>
          {m.tasks.map((t) => (
            <div className="jira-row" key={t._id}>
              <div className="meeting-name">
                <b>{t.title}</b>
                <small>
                  {t.jiraIssueKey
                    ? `${t.jiraIssueKey} · ${t.jiraAssignee || 'Unassigned'}`
                    : `${t.owner || 'No owner'} · No Jira ticket`}
                </small>
              </div>
              {t.jiraIssueKey ? (
                <>
                  <JiraStatusBadge status={t.jiraStatus || 'To Do'} />
                  <a href={t.jiraUrl} target="_blank" rel="noreferrer" className="icon-btn">
                    <ArrowUpRight size={17} />
                  </a>
                </>
              ) : (
                <span className={`status-badge ${t.reviewState}`}>{t.reviewState}</span>
              )}
            </div>
          ))}
          {!m.tasks.length && (
            <div className="jira-row">
              <small className="muted">No tasks were found in this meeting.</small>
            </div>
          )}
        </div>
      ))}
      {stats && !stats.byMeeting?.length && (
        <div className="panel empty-state">
          <FileText size={26} />
          <b>No meetings yet</b>
          <p>Upload a meeting to see its tasks and Jira tickets here.</p>
        </div>
      )}
    </>
  );
}
function SettingsPage() {
  const d = useDispatch(),
    j = useSelector((s) => s.jira),
    [project, setProject] = useState('');
  useEffect(() => {
    d(fetchJiraStatus());
  }, []);
  return (
    <>
      <PageHead
        eyebrow="PREFERENCES"
        title="Settings & integrations"
        sub="Manage your workspace integrations and local development setup."
      />
      <div className="settings-grid">
        <div className="panel">
          <span className="eyebrow">INTEGRATION</span>
          <h3>Jira Cloud</h3>
          <p>Keep credentials in the API server, never in React or Vite environment variables.</p>
          <div className="setting-line">
            <span>Connection status</span>
            <b>{j.connected ? 'Connected' : 'Not connected'}</b>
          </div>
          <div className="setting-line">
            <span>Jira base URL</span>
            <b>{j.baseUrl || 'Not configured'}</b>
          </div>
          <label className="field-label">
            Default project key
            <input
              value={project}
              onChange={(e) => setProject(e.target.value.toUpperCase())}
              placeholder={j.defaultProjectKey || 'PROJ'}
            />
          </label>
          <button className="primary" onClick={() => d(connectJira(project))}>
            Validate & save project
          </button>
          {j.error && <p className="error-text">{j.error}</p>}
        </div>
      </div>
    </>
  );
}
function Protected() {
  const d = useDispatch(),
    a = useSelector((s) => s.auth);
  useEffect(() => {
    if (!a.ready) d(loadSession());
  }, [a.ready]);
  if (!a.ready)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" /> Checking session…
      </div>
    );
  if (!a.user) return <Navigate to="/auth" replace />;
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/meetings/:id" element={<MeetingPage />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/jira" element={<JiraPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<Protected />} />
    </Routes>
  );
}
