import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { roundsActions } from '../slices/roundsSlice';
import { fetchJson } from '@/lib/apiClient';



function* handleFetchRounds(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/rounds?organizationId=${organizationId}`, { cache: 'no-store' });
    yield put(roundsActions.fetchRoundsSuccess(data.rounds || []));
    if (resolve) resolve(data.rounds || []);
  } catch (error: any) {
    yield put(roundsActions.fetchRoundsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchRoundById(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/rounds/${id}`, { cache: 'no-store' });
    yield put(roundsActions.fetchRoundByIdSuccess(data.round));
    if (resolve) resolve(data.round);
  } catch (error: any) {
    yield put(roundsActions.fetchRoundByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateRound(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    yield call(fetchJson, '/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(roundsActions.createRoundSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(roundsActions.createRoundFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateRound(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/rounds/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(roundsActions.updateRoundSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(roundsActions.updateRoundFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteRound(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    yield call(fetchJson, `/api/rounds/${id}`, { method: 'DELETE' });
    yield put(roundsActions.deleteRoundSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(roundsActions.deleteRoundFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchRoundsSagas() {
  yield takeLatest(roundsActions.fetchRoundsRequest.type, handleFetchRounds);
  yield takeLatest(roundsActions.fetchRoundByIdRequest.type, handleFetchRoundById);
  yield takeLatest(roundsActions.createRoundRequest.type, handleCreateRound);
  yield takeLatest(roundsActions.updateRoundRequest.type, handleUpdateRound);
  yield takeLatest(roundsActions.deleteRoundRequest.type, handleDeleteRound);
}
