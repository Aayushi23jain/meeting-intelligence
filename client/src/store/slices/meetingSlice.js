import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
export const fetchMeetings = createAsyncThunk(
  'meetings/list',
  async () => (await api.get('/meetings')).data.meetings,
);
export const uploadMeeting = createAsyncThunk(
  'meetings/upload',
  async ({ title, file, transcript }) => {
    const form = new FormData();
    form.append('title', title || file?.name || 'Meeting');
    if (file) form.append('file', file);
    if (transcript) form.append('transcript', transcript);
    return (
      await api.post('/meetings/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data.meeting;
  },
);
export const analyzeTranscript = createAsyncThunk(
  'meetings/analyze',
  async ({ title, transcript }) =>
    (await api.post('/meetings/analyze', { title, transcript })).data,
);
export const fetchMeeting = createAsyncThunk(
  'meetings/detail',
  async (id) => (await api.get(`/meetings/${id}`)).data,
);
const slice = createSlice({
  name: 'meetings',
  initialState: { list: [], current: null, actions: [], status: 'idle', error: '' },
  reducers: {
    setCurrent(s, a) {
      s.current = a.payload;
    },
    clearMeetingError(s) {
      s.error = '';
    },
  },
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
        s.current = a.payload;
        s.list = [a.payload, ...s.list.filter((m) => m._id !== a.payload._id)];
      })
      .addCase(uploadMeeting.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.error.message;
      });
    b.addCase(analyzeTranscript.pending, (s) => {
      s.status = 'loading';
      s.error = '';
    })
      .addCase(analyzeTranscript.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.current = a.payload.meeting;
        s.actions = a.payload.actionItems;
        s.list = [a.payload.meeting, ...s.list.filter((m) => m._id !== a.payload.meeting._id)];
      })
      .addCase(analyzeTranscript.rejected, (s, a) => {
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
export const { setCurrent, clearMeetingError } = slice.actions;
export default slice.reducer;
