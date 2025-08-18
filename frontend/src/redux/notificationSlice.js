import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  message: '',
  type: 'info', // 'info', 'success', 'warning', 'error'
  open: false,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotification: (state, action) => {
      state.message = action.payload.message;
      state.type = action.payload.type || 'info';
      state.open = true;
    },
    clearNotification: (state) => {
      state.message = '';
      state.type = 'info';
      state.open = false;
    },
  },
});

export const { setNotification, clearNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
