import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { createJiraIssue } from './jiraSlice';
export const fetchActions = createAsyncThunk(
  'actions/list',
  async (params = {}) => (await api.get('/action-items', { params })).data.actionItems,
);
export const updateAction = createAsyncThunk(
  'actions/update',
  async ({ id, patch }) => (await api.patch(`/action-items/${id}`, patch)).data.actionItem,
);
export const approveAction = createAsyncThunk(
  'actions/approve',
  async (id) => (await api.post(`/action-items/${id}/approve`)).data.actionItem,
);
export const rejectAction = createAsyncThunk(
  'actions/reject',
  async (id) => (await api.post(`/action-items/${id}/reject`)).data.actionItem,
);
const slice = createSlice({
  name: 'actions',
  initialState: { items: [], status: 'idle', error: '' },
  reducers: {},
  extraReducers: (b) => {
    // The created issue comes back with its action item, now carrying the Jira key and link.
    b.addCase(createJiraIssue.fulfilled, (s, a) => {
      const i = s.items.findIndex((x) => x._id === a.payload.actionItem._id);
      if (i >= 0) s.items[i] = a.payload.actionItem;
    });
    b.addCase(fetchActions.fulfilled, (s, a) => {
      s.items = a.payload;
    });
    for (const t of [updateAction, approveAction, rejectAction])
      b.addCase(t.fulfilled, (s, a) => {
        const i = s.items.findIndex((x) => x._id === a.payload._id);
        if (i >= 0) s.items[i] = a.payload;
        else s.items.unshift(a.payload);
      });
  },
});
export default slice.reducer;
