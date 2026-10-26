import { createSlice } from '@reduxjs/toolkit';
const slice = createSlice({
  name: 'transcript',
  initialState: { lines: [], currentLineId: null, currentTimestamp: '' },
  reducers: {
    setTranscriptLines(s, a) {
      s.lines = a.payload || [];
      s.currentLineId = null;
      s.currentTimestamp = '';
    },
    selectTranscriptLine(s, a) {
      s.currentLineId = a.payload?.id || null;
      s.currentTimestamp = a.payload?.timestamp || '';
    },
  },
});
export const { setTranscriptLines, selectTranscriptLine } = slice.actions;
export default slice.reducer;
