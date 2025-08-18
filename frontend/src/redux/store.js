import { configureStore } from '@reduxjs/toolkit';
import notificationReducer from './notificationSlice';

export const store = configureStore({
  reducer: {
    notification: notificationReducer,
  },
});