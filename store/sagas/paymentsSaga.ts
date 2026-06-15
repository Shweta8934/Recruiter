import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { paymentsActions } from '../slices/paymentsSlice';
import { fetchJson } from '@/lib/apiClient';



function* handleFetchPayments(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/payments?organizationId=${organizationId}`, { cache: 'no-store' });
    yield put(paymentsActions.fetchPaymentsSuccess(data.payments || []));
    if (resolve) resolve(data.payments || []);
  } catch (error: any) {
    yield put(paymentsActions.fetchPaymentsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreatePayment(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    yield call(fetchJson, '/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(paymentsActions.createPaymentSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(paymentsActions.createPaymentFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeletePayment(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    yield call(fetchJson, `/api/payments/${id}`, { method: 'DELETE' });
    yield put(paymentsActions.deletePaymentSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(paymentsActions.deletePaymentFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchPaymentsSagas() {
  yield takeLatest(paymentsActions.fetchPaymentsRequest.type, handleFetchPayments);
  yield takeLatest(paymentsActions.createPaymentRequest.type, handleCreatePayment);
  yield takeLatest(paymentsActions.deletePaymentRequest.type, handleDeletePayment);
}
