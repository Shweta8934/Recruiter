import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { interviewBookingActions } from '../slices/interviewBookingSlice';
import { fetchJson } from '@/lib/apiClient';



function* handleFetchBooking(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/interview-booking/${id}`);
    yield put(interviewBookingActions.fetchBookingSuccess(data.application));
    if (resolve) resolve(data.application);
  } catch (error: any) {
    yield put(interviewBookingActions.fetchBookingFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleConfirmBooking(action: PayloadAction<any>) {
  try {
    const { id, selectedDate, resolve } = action.payload;
    yield call(fetchJson, `/api/interview-booking/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedDate }),
    });
    yield put(interviewBookingActions.confirmBookingSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(interviewBookingActions.confirmBookingFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleSubmitReschedule(action: PayloadAction<any>) {
  try {
    const { id, reason, resolve } = action.payload;
    yield call(fetchJson, `/api/interview-booking/${id}/reschedule-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    yield put(interviewBookingActions.submitRescheduleSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(interviewBookingActions.submitRescheduleFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchInterviewBookingSagas() {
  yield takeLatest(interviewBookingActions.fetchBookingRequest.type, handleFetchBooking);
  yield takeLatest(interviewBookingActions.confirmBookingRequest.type, handleConfirmBooking);
  yield takeLatest(interviewBookingActions.submitRescheduleRequest.type, handleSubmitReschedule);
}
