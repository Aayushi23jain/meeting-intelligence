import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import meetings from './slices/meetingSlice';
import actionItems from './slices/actionItemsSlice';
import jira from './slices/jiraSlice';
import ui from './slices/uiSlice';
import transcript from './slices/transcriptSlice';
export const store = configureStore({
  reducer: { auth, meetings, actionItems, jira, ui, transcript },
});
