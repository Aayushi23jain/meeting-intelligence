import { createSlice } from '@reduxjs/toolkit';
const slice = createSlice({
  name: 'ui',
  initialState: { selectedActionId: null, notice: '' },
  reducers: {
    selectAction(s, a) {
      s.selectedActionId = a.payload;
    },
    setNotice(s, a) {
      s.notice = a.payload;
    },
  },
});
export const { selectAction, setNotice } = slice.actions;
export default slice.reducer;
