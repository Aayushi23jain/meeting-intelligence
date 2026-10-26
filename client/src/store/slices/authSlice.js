import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
export const login = createAsyncThunk(
  'auth/login',
  async (data) => (await api.post('/auth/login', data)).data,
);
export const register = createAsyncThunk(
  'auth/register',
  async (data) => (await api.post('/auth/register', data)).data,
);
export const loadSession = createAsyncThunk(
  'auth/session',
  async () => (await api.get('/auth/me')).data,
);
export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
});
const slice = createSlice({
  name: 'auth',
  initialState: { user: null, ready: false, loading: false, error: '' },
  reducers: {
    clearAuthError(s) {
      s.error = '';
    },
  },
  extraReducers: (b) => {
    for (const t of [login, register])
      b.addCase(t.pending, (s) => {
        s.loading = true;
        s.error = '';
      })
        .addCase(t.fulfilled, (s, a) => {
          s.loading = false;
          s.user = a.payload.user;
          s.ready = true;
        })
        .addCase(t.rejected, (s, a) => {
          s.loading = false;
          s.error = a.error.message;
        });
    b.addCase(loadSession.fulfilled, (s, a) => {
      s.user = a.payload.user;
      s.ready = true;
    }).addCase(loadSession.rejected, (s) => {
      s.user = null;
      s.ready = true;
    });
    b.addCase(logout.fulfilled, (s) => {
      s.user = null;
      s.ready = true;
    });
  },
});
export const { clearAuthError } = slice.actions;
export default slice.reducer;
