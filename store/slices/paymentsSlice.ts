import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PaymentsState {
  isLoading: boolean;
  error: string | null;
  payments: any[];
}

const initialState: PaymentsState = {
  isLoading: false,
  error: null,
  payments: [],
};

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    fetchPaymentsRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchPaymentsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.payments = action.payload;
    },
    fetchPaymentsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createPaymentRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createPaymentSuccess(state) {
      state.isLoading = false;
    },
    createPaymentFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deletePaymentRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deletePaymentSuccess(state) {
      state.isLoading = false;
    },
    deletePaymentFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const paymentsActions = paymentsSlice.actions;
export default paymentsSlice.reducer;
