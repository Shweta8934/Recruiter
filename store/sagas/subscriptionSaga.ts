import { call, put, takeLatest, all } from 'redux-saga/effects';
import { subscriptionActions } from '../slices/subscriptionSlice';
import { PayloadAction } from '@reduxjs/toolkit';
import { fetchJson } from '@/lib/apiClient';


// Utility for throwing errors on non-ok fetch responses

function* handleLoadSubscriptionData(action: PayloadAction<{ organizationId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const [subData, payData]: [any, any] = yield all([
      call(fetchJson, `/api/subscriptions/current?organizationId=${action.payload.organizationId}`),
      call(fetchJson, `/api/payments?organizationId=${action.payload.organizationId}`)
    ]);

    yield put(subscriptionActions.loadSubscriptionDataSuccess({
      subscription: subData,
      payments: payData.payments || []
    }));

    if (action.payload.resolve) action.payload.resolve({ subData, payData });
  } catch (error: any) {
    yield put(subscriptionActions.loadSubscriptionDataFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleLoadOrganizations(action: PayloadAction<{ resolve?: (orgs: any[]) => void; reject?: (err: string) => void }>) {
  try {
    const data: any = yield call(fetchJson, '/api/organizations');
    yield put(subscriptionActions.loadOrganizationsSuccess(data.organizations || []));
    if (action.payload.resolve) action.payload.resolve(data.organizations || []);
  } catch (error: any) {
    yield put(subscriptionActions.loadOrganizationsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleLoadUsers(action: PayloadAction<{ resolve?: (users: any[]) => void; reject?: (err: string) => void }>) {
  try {
    const data: any = yield call(fetchJson, '/api/users');
    yield put(subscriptionActions.loadUsersSuccess(data.users || []));
    if (action.payload.resolve) action.payload.resolve(data.users || []);
  } catch (error: any) {
    yield put(subscriptionActions.loadUsersFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateCheckoutSession(action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const data: any = yield call(fetchJson, '/api/razorpay/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload.payload)
    });

    yield put(subscriptionActions.createCheckoutSessionSuccess());
    if (action.payload.resolve) action.payload.resolve(data);
  } catch (error: any) {
    yield put(subscriptionActions.createCheckoutSessionFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleSimulateWebhook(action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const data: any = yield call(fetchJson, '/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=mock_timestamp,v1=mock_sig',
      },
      body: JSON.stringify(action.payload.payload)
    });

    yield put(subscriptionActions.simulateWebhookSuccess());
    if (action.payload.resolve) action.payload.resolve(data);
  } catch (error: any) {
    yield put(subscriptionActions.simulateWebhookFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleVerifyRazorpayPayment(action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const data: any = yield call(fetchJson, '/api/razorpay/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload.payload)
    });

    yield put(subscriptionActions.verifyRazorpayPaymentSuccess());
    if (action.payload.resolve) action.payload.resolve(data);
  } catch (error: any) {
    yield put(subscriptionActions.verifyRazorpayPaymentFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchSubscriptionSagas() {
  yield takeLatest(subscriptionActions.loadSubscriptionDataRequest.type, handleLoadSubscriptionData);
  yield takeLatest(subscriptionActions.loadOrganizationsRequest.type, handleLoadOrganizations);
  yield takeLatest(subscriptionActions.loadUsersRequest.type, handleLoadUsers);
  yield takeLatest(subscriptionActions.createCheckoutSessionRequest.type, handleCreateCheckoutSession);
  yield takeLatest(subscriptionActions.verifyRazorpayPaymentRequest.type, handleVerifyRazorpayPayment);
  yield takeLatest(subscriptionActions.simulateWebhookRequest.type, handleSimulateWebhook);
}
