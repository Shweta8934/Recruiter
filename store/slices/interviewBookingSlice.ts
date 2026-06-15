import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface InterviewBookingState {
  isLoading: boolean;
  error: string | null;
  application: any | null;
}

const initialState: InterviewBookingState = {
  isLoading: false,
  error: null,
  application: null,
};

const interviewBookingSlice = createSlice({
  name: 'interviewBooking',
  initialState,
  reducers: {
    fetchBookingRequest(state, _action: PayloadAction<{ id: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchBookingSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.application = action.payload;
    },
    fetchBookingFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    confirmBookingRequest(state, _action: PayloadAction<{ id: string; selectedDate: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    confirmBookingSuccess(state) {
      state.isLoading = false;
    },
    confirmBookingFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    submitRescheduleRequest(state, _action: PayloadAction<{ id: string; reason: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    submitRescheduleSuccess(state) {
      state.isLoading = false;
    },
    submitRescheduleFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const interviewBookingActions = interviewBookingSlice.actions;
export default interviewBookingSlice.reducer;
