import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { evaluationsActions } from '../slices/evaluationsSlice';
import { fetchJson } from '@/lib/apiClient';



function* handleFetchEvaluations(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/evaluations?organizationId=${organizationId}`, { cache: 'no-store' });
    yield put(evaluationsActions.fetchEvaluationsSuccess(data.templates || []));
    if (resolve) resolve(data.templates || []);
  } catch (error: any) {
    yield put(evaluationsActions.fetchEvaluationsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchEvaluationById(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/evaluations/${id}`, { cache: 'no-store' });
    yield put(evaluationsActions.fetchEvaluationByIdSuccess(data.template));
    if (resolve) resolve(data.template);
  } catch (error: any) {
    yield put(evaluationsActions.fetchEvaluationByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateEvaluation(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    yield call(fetchJson, '/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(evaluationsActions.createEvaluationSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(evaluationsActions.createEvaluationFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateEvaluation(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/evaluations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(evaluationsActions.updateEvaluationSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(evaluationsActions.updateEvaluationFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteEvaluation(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    yield call(fetchJson, `/api/evaluations/${id}`, { method: 'DELETE' });
    yield put(evaluationsActions.deleteEvaluationSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(evaluationsActions.deleteEvaluationFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchEvaluationsSagas() {
  yield takeLatest(evaluationsActions.fetchEvaluationsRequest.type, handleFetchEvaluations);
  yield takeLatest(evaluationsActions.fetchEvaluationByIdRequest.type, handleFetchEvaluationById);
  yield takeLatest(evaluationsActions.createEvaluationRequest.type, handleCreateEvaluation);
  yield takeLatest(evaluationsActions.updateEvaluationRequest.type, handleUpdateEvaluation);
  yield takeLatest(evaluationsActions.deleteEvaluationRequest.type, handleDeleteEvaluation);
}
