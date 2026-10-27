import { createSlice } from '@reduxjs/toolkit';
const slice = createSlice({
  name: 'ui',
  initialState: { selectedActionId: null },
  reducers: {
    selectAction(s, a) {
      s.selectedActionId = a.payload;
    },
  },
});
export const { selectAction } = slice.actions;
export default slice.reducer;
