import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
export const fetchMeetings = createAsyncThunk(
  'meetings/list',
  async () => (await api.get('/meetings')).data.meetings,
);
export const uploadMeeting = createAsyncThunk('meetings/upload', async ({ title, file }) => {
  const form = new FormData();
  form.append('title', title || file.name);
  form.append('file', file);
  return (await api.post('/meetings/upload', form)).data.meeting;
});
export const fetchMeeting = createAsyncThunk(
  'meetings/detail',
  async (id) => (await api.get(`/meetings/${id}`)).data,
);
const slice = createSlice({
  name: 'meetings',
  initialState: { list: [], current: null, actions: [], status: 'idle', error: '' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMeetings.fulfilled, (s, a) => {
      s.list = a.payload;
    });
    b.addCase(uploadMeeting.pending, (s) => {
      s.status = 'loading';
      s.error = '';
    })
      .addCase(uploadMeeting.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.list = [a.payload, ...s.list.filter((m) => m._id !== a.payload._id)];
      })
      .addCase(uploadMeeting.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.error.message;
      });
    b.addCase(fetchMeeting.fulfilled, (s, a) => {
      s.current = a.payload.meeting;
      s.actions = a.payload.actionItems;
      s.status = 'succeeded';
    });
  },
});
export default slice.reducer;
