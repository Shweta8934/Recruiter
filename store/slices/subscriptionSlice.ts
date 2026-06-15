import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SubscriptionState {
  isLoading: boolean;
  error: string | null;
  currentSubscription: any | null;
  payments: any[];
  organizations: any[];
  users: any[];
}

const initialState: SubscriptionState = {
  isLoading: false,
  error: null,
  currentSubscription: null,
  payments: [],
  organizations: [],
  users: [],
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    // Current Subscription & Payments
    loadSubscriptionDataRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadSubscriptionDataSuccess(state, action: PayloadAction<{ subscription: any; payments: any[] }>) {
      state.isLoading = false;
      state.currentSubscription = action.payload.subscription;
      state.payments = action.payload.payments;
    },
    loadSubscriptionDataFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Organizations
    loadOrganizationsRequest(state, _action: PayloadAction<{ resolve?: (orgs: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadOrganizationsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.organizations = action.payload;
    },
    loadOrganizationsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Users
    loadUsersRequest(state, _action: PayloadAction<{ resolve?: (users: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadUsersSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.users = action.payload;
    },
    loadUsersFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Checkout
    createCheckoutSessionRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createCheckoutSessionSuccess(state) {
      state.isLoading = false;
    },
    createCheckoutSessionFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    
    // Razorpay Verification
    verifyRazorpayPaymentRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    verifyRazorpayPaymentSuccess(state) {
      state.isLoading = false;
    },
    verifyRazorpayPaymentFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    
    // Webhook Mocking
    simulateWebhookRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    simulateWebhookSuccess(state) {
      state.isLoading = false;
    },
    simulateWebhookFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const subscriptionActions = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
