import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
export const fetchJiraStatus = createAsyncThunk(
  'jira/status',
  async () => (await api.get('/jira/status')).data,
);
export const connectJira = createAsyncThunk(
  'jira/connect',
  async (projectKey) => (await api.post('/jira/connect', { projectKey })).data,
);
export const createJiraIssue = createAsyncThunk(
  'jira/create',
  async ({ id, projectKey }) => (await api.post(`/jira/action-items/${id}`, { projectKey })).data,
);
export const syncJira = createAsyncThunk(
  'jira/sync',
  async () => (await api.post('/jira/sync')).data,
);
export const fetchJiraIssues = createAsyncThunk(
  'jira/issues',
  async () => (await api.get('/jira/issues')).data.issues,
);
const slice = createSlice({
  name: 'jira',
  initialState: {
    connected: false,
    baseUrl: '',
    defaultProjectKey: '',
    issues: [],
    status: 'idle',
    error: '',
    lastSync: null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchJiraStatus.fulfilled, (s, a) => Object.assign(s, a.payload));
    b.addCase(connectJira.fulfilled, (s, a) => Object.assign(s, a.payload));
    b.addCase(fetchJiraIssues.fulfilled, (s, a) => {
      s.issues = a.payload;
    });
    b.addCase(createJiraIssue.fulfilled, (s) => {
      s.status = 'succeeded';
    });
    b.addCase(syncJira.fulfilled, (s, a) => {
      s.lastSync = a.payload;
      s.status = 'succeeded';
    });
    for (const t of [connectJira, createJiraIssue, syncJira])
      b.addCase(t.pending, (s) => {
        s.status = 'loading';
        s.error = '';
      }).addCase(t.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.error.message;
      });
  },
});
export default slice.reducer;
