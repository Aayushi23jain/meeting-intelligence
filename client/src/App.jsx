import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Activity,
  AudioLines,
  LayoutDashboard,
  UploadCloud,
  ListChecks,
  Ticket,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  RefreshCw,
  Plus,
  Clock3,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowUpRight,
  Link2,
  PlayCircle,
  Search,
  LoaderCircle,
  UserRound,
  CalendarDays,
  ChevronRight,
  Radio,
  Mic,
  Monitor,
  Square,
} from 'lucide-react';
import { useLiveCapture, liveSupported } from './hooks/useLiveCapture';
import { api } from './services/api';
import { loadSession, login, register, logout } from './store/slices/authSlice';
import {
  fetchMeetings,
  fetchMeeting,
  uploadMeeting,
  analyzeTranscript,
} from './store/slices/meetingSlice';
import {
  fetchActions,
  updateAction,
  approveAction,
  rejectAction,
} from './store/slices/actionItemsSlice';
import {
  fetchJiraStatus,
  connectJira,
  fetchProjects,
  createJiraIssue,
  syncJira,
  fetchJiraIssues,
} from './store/slices/jiraSlice';
import { selectAction } from './store/slices/uiSlice';
import { setTranscriptLines, selectTranscriptLine } from './store/slices/transcriptSlice';
import TranscriptLine from './components/Transcript/TranscriptLine';
import ProcessingPipeline from './components/MeetingUpload/ProcessingPipeline';
import SpeakerBars from './components/Analytics/SpeakerBars';
import JiraStatusBadge from './components/Jira/JiraStatusBadge';
import ActionEvidence from './components/ActionItems/ActionEvidence';
const sample =
  '[00:00:12] Aayushi: We need to finish the dashboard frontend by Friday.\n[00:00:35] Rahul: I will handle the login API integration by Thursday.\n[00:01:05] Team: We decided to add email notifications in the next sprint.\n[00:01:22] Priya: I will prepare the test cases by October 20.';
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
    [mobile, setMobile] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'show' : ''}`}>
        <Brand />
        <div className="workspace-pill">
          <span className="online-dot" /> Personal workspace
        </div>
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
          <NavLink to="/live">
            <Radio size={17} />
            Live meeting
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
        <div className="sidebar-bottom">
          <div className="user-chip">
            <span className="avatar">
              {(a.user?.name || a.user?.email || 'U').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <b>{a.user?.name || a.user?.email}</b>
              <small>{a.user?.email}</small>
            </div>
          </div>
          <button className="logout" onClick={() => d(logout())}>
            <LogOut size={16} /> Sign out
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
          <div className="top-actions">
            <span className="status-dot" /> System ready{' '}
            <span className="avatar small-avatar">
              {(a.user?.name || a.user?.email || 'U').slice(0, 1).toUpperCase()}
            </span>
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
            <NavLink className="secondary button-link" to="/live">
              <Radio size={16} /> Go live
            </NavLink>
            <NavLink className="primary button-link" to="/upload">
              <Plus size={16} /> New meeting
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
          <p>Latest meeting uploads and processing status.</p>
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
            <p>Upload a transcript or meeting recording to begin.</p>
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
    m = useSelector((s) => s.meetings);
  const [title, setTitle] = useState('Weekly project sync'),
    [transcript, setTranscript] = useState(''),
    [file, setFile] = useState(null),
    [kind, setKind] = useState('transcript');
  const submit = (e) => {
    e.preventDefault();
    if (kind === 'transcript')
      d(analyzeTranscript({ title, transcript }))
        .unwrap()
        .then((x) => (location.href = `/meetings/${x.meeting._id}`))
        .catch(() => {});
    else
      d(uploadMeeting({ title, file }))
        .unwrap()
        .then((x) => (location.href = `/meetings/${x._id}`))
        .catch(() => {});
  };
  return (
    <>
      <PageHead
        eyebrow="MEETING INGESTION"
        title="Capture a meeting"
        sub="Upload a recording or paste a transcript. Long-running jobs are processed in the background."
      />
      <div className="upload-layout">
        <form className="panel upload-panel" onSubmit={submit}>
          <label className="field-label">
            Meeting title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product planning — October"
              required
            />
          </label>
          <div className="mode-tabs">
            <button
              type="button"
              className={kind === 'transcript' ? 'selected' : ''}
              onClick={() => setKind('transcript')}
            >
              <FileText size={16} /> Transcript
            </button>
            <button
              type="button"
              className={kind === 'media' ? 'selected' : ''}
              onClick={() => setKind('media')}
            >
              <AudioLines size={16} /> Audio / video
            </button>
          </div>
          {kind === 'transcript' ? (
            <>
              <label className="field-label">
                Transcript
                <textarea
                  rows="12"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={
                    '[00:00:12] Aayushi: We need to finish the dashboard by Friday.\n[00:00:35] Rahul: I will handle API integration.'
                  }
                  required
                />
              </label>
              <div className="form-foot">
                <button type="button" className="secondary" onClick={() => setTranscript(sample)}>
                  Load sample transcript
                </button>
                <span>Speaker names and timestamps improve evidence linking.</span>
              </div>
            </>
          ) : (
            <>
              <label className="dropzone">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
                <UploadCloud size={30} />
                <b>{file ? file.name : 'Choose an audio or video file'}</b>
                <span>
                  Audio/video supported · Max {import.meta.env.VITE_MAX_UPLOAD_MB || 100} MB
                </span>
                <small>
                  Transcription requires OPENAI_API_KEY; background processing requires Redis.
                </small>
              </label>
            </>
          )}
          <button className="primary wide" disabled={m.status === 'loading'}>
            {m.status === 'loading' ? (
              <>
                <LoaderCircle className="spin" size={17} /> Submitting…
              </>
            ) : (
              <>
                <SparklesIcon /> Process meeting
              </>
            )}
          </button>
          {m.error && <p className="error-text">{m.error}</p>}
        </form>
        <aside className="panel process-panel">
          <span className="eyebrow">WHAT HAPPENS NEXT</span>
          <h3>Processing pipeline</h3>
          <ProcessingPipeline />
          <div className="hint-box">
            AI output is a draft. Confirm owners, deadlines and source evidence before creating Jira
            tickets.
          </div>
        </aside>
      </div>
    </>
  );
}
function SparklesIcon() {
  return <Activity size={17} />;
}
const clock = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
function LivePage() {
  const nav = useNavigate(),
    live = useLiveCapture(),
    box = useRef(null);
  const [title, setTitle] = useState('Live meeting'),
    [tab, setTab] = useState(true),
    [mic, setMic] = useState(true);
  useEffect(() => {
    if (live.state === 'done') nav(`/meetings/${live.meetingId}`);
  }, [live.state]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [live.lines.length]);
  const busy = ['starting', 'live', 'finishing'].includes(live.state);
  return (
    <>
      <PageHead
        eyebrow="LIVE CAPTURE"
        title="Live meeting"
        sub="Capture a meeting while it happens. The transcript fills in every 30 seconds and the full analysis runs when you stop."
        action={
          live.state === 'live' && (
            <span className="live-indicator">
              <span className="live-dot" /> Recording · {clock(live.elapsed)}
            </span>
          )
        }
      />
      <div className="upload-layout">
        <div className="panel upload-panel">
          <label className="field-label">
            Meeting title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              placeholder="e.g. Daily standup"
            />
          </label>
          <div className="live-sources">
            <label className={`live-source ${tab ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={tab}
                disabled={busy}
                onChange={(e) => setTab(e.target.checked)}
              />
              <Monitor size={16} />
              <span>
                <b>Meeting tab audio</b>
                <small>Google Meet, Zoom web or Teams web in another tab</small>
              </span>
            </label>
            <label className={`live-source ${mic ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={mic}
                disabled={busy}
                onChange={(e) => setMic(e.target.checked)}
              />
              <Mic size={16} />
              <span>
                <b>My microphone</b>
                <small>Your own voice, or an in-person meeting</small>
              </span>
            </label>
          </div>
          {!liveSupported() ? (
            <p className="error-text">
              This browser cannot record audio. Use the latest Chrome or Edge.
            </p>
          ) : live.state === 'live' ? (
            <button className="primary wide danger-fill" onClick={live.stop}>
              <Square size={15} /> Stop & analyze
            </button>
          ) : (
            <button
              className="primary wide"
              disabled={busy || !title.trim()}
              onClick={() => live.start({ title, tab, mic })}
            >
              {live.state === 'starting' ? (
                <>
                  <LoaderCircle className="spin" size={17} /> Starting…
                </>
              ) : live.state === 'finishing' ? (
                <>
                  <LoaderCircle className="spin" size={17} /> Transcribing last chunk…
                </>
              ) : (
                <>
                  <Radio size={17} /> Start live capture
                </>
              )}
            </button>
          )}
          {live.error && <p className="error-text">{live.error}</p>}
          <div className="section-row live-head">
            <div>
              <h3>Live transcript</h3>
              <p>
                {live.pending
                  ? `Transcribing ${live.pending} chunk${live.pending > 1 ? 's' : ''}…`
                  : live.state === 'live'
                    ? 'Listening…'
                    : 'Lines appear here during capture.'}
              </p>
            </div>
            <span className="pill">{live.lines.length} lines</span>
          </div>
          <div className="live-transcript" ref={box}>
            {live.lines.map((l) => (
              <div className="live-line" key={l.id}>
                <time>{l.timestamp}</time>
                <p>{l.text}</p>
              </div>
            ))}
            {!live.lines.length && (
              <p className="muted">
                {live.state === 'live'
                  ? 'The first lines arrive about 30 seconds after you start.'
                  : 'Nothing captured yet.'}
              </p>
            )}
          </div>
        </div>
        <aside className="panel process-panel">
          <span className="eyebrow">HOW IT WORKS</span>
          <h3>Capture a live meeting</h3>
          {[
            ['Open the meeting', 'Join Google Meet, Zoom or Teams in another Chrome or Edge tab.'],
            [
              'Start capture',
              'Pick the meeting tab and switch on “Share tab audio”. Keep the microphone on so your own voice is included.',
            ],
            [
              'Watch the transcript',
              'Audio is sent in 30-second chunks and transcribed while the meeting runs.',
            ],
            [
              'Stop & analyze',
              'You get the summary, decisions and action items, ready to review and send to Jira.',
            ],
          ].map(([a, b], i) => (
            <div className="requirement" key={a}>
              <span className="live-step">{i + 1}</span>
              <div>
                <b>{a}</b>
                <small>{b}</small>
              </div>
            </div>
          ))}
          <div className="hint-box">
            Tell participants the meeting is being recorded and transcribed before you start. Keep
            this tab open until you stop. Closing it ends the capture.
          </div>
        </aside>
      </div>
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
  const finishLive = () =>
    api
      .post(`/meetings/${id}/live/finish`)
      .then(() => d(fetchMeeting(id)))
      .catch(() => {});
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
              {meeting.processingStatus === 'live' && (
                <button className="primary" onClick={finishLive}>
                  Finish & analyze
                </button>
              )}
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
    [project, setProject] = useState('');
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
                  <span className="confidence">
                    {Math.round((item.confidence || 0) * 100)}% confidence
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
                {item.reviewState === 'approved' && !item.jiraIssueKey && (
                  <button
                    className="jira-button"
                    onClick={() =>
                      d(
                        createJiraIssue({
                          id: item._id,
                          projectKey: project || j.defaultProjectKey,
                        }),
                      )
                    }
                  >
                    <Ticket size={15} /> Create Jira issue
                  </button>
                )}
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
    j = useSelector((s) => s.jira),
    [project, setProject] = useState('');
  useEffect(() => {
    d(fetchJiraStatus());
    d(fetchJiraIssues());
    d(fetchProjects());
  }, []);
  return (
    <>
      <PageHead
        eyebrow="JIRA INTEGRATION"
        title="Jira board"
        sub="Connect a Jira Cloud workspace and synchronize issue status and assignee."
        action={
          <button className="secondary" onClick={() => d(syncJira())}>
            <RefreshCw size={15} /> Sync statuses
          </button>
        }
      />
      <div className="panel jira-connect">
        <div className="jira-mark">
          <Ticket size={24} />
        </div>
        <div className="jira-connect-copy">
          <h3>{j.connected ? 'Jira workspace connected' : 'Connect Jira Cloud'}</h3>
          <p>
            {j.connected
              ? j.baseUrl
              : 'Credentials remain on the backend. Configure Jira API credentials in server/.env, then validate the connection here.'}
          </p>
          {j.error && <p className="error-text">{j.error}</p>}
        </div>
        <div className="jira-connect-controls">
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Select project</option>
            {j.projects.map((p) => (
              <option key={p.id} value={p.key}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
          <button
            className="primary"
            disabled={j.status === 'loading'}
            onClick={() => d(connectJira(project || j.defaultProjectKey))}
          >
            {j.status === 'loading' ? 'Connecting…' : 'Validate connection'}
          </button>
        </div>
      </div>
      <div className="section-row">
        <div>
          <h2>Linked issues</h2>
          <p>Local issue mappings and most recently synchronized Jira fields.</p>
        </div>
        <span className="pill">{j.issues.length} issues</span>
      </div>
      {j.lastSync && (
        <p className="sync-note">
          Last sync result: {j.lastSync.synced} synced. Failed:{' '}
          {j.lastSync.results?.filter((x) => x.status === 'failed').length || 0}.
        </p>
      )}
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
  const [stats, setStats] = useState(null);
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
      <div className="panel analytics-panel">
        <span className="eyebrow">SPEAKER PARTICIPATION</span>
        <h3>Word count by speaker</h3>
        <SpeakerBars speakers={stats?.speakers || []} />
        {!stats?.speakers?.length && (
          <p className="muted">
            Speaker metrics appear after meetings are processed. Sentiment and engagement are
            approximate AI signals, not performance assessments.
          </p>
        )}
      </div>
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
        <div className="panel">
          <span className="eyebrow">AI & PROCESSING</span>
          <h3>Runtime requirements</h3>
          {[
            ['MongoDB', 'Required for users, meetings and issue mappings'],
            ['Redis + BullMQ', 'Required for queued media processing and retries'],
            ['OpenAI API key', 'Required for LLM analysis and audio transcription'],
            ['Jira API token', 'Required for project lookup, issue creation and sync'],
          ].map(([a, b]) => (
            <div className="requirement" key={a}>
              <CheckCircle2 size={16} />
              <div>
                <b>{a}</b>
                <small>{b}</small>
              </div>
            </div>
          ))}
          <div className="hint-box">
            Use server/.env for secrets. Never commit it or share API tokens in screenshots.
          </div>
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
        <Route path="/live" element={<LivePage />} />
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
