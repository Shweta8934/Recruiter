import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { sectionsActions } from '../slices/sectionsSlice';
import { fetchJson } from '@/lib/apiClient';



function* handleFetchSections(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/sections?organizationId=${organizationId}`, { cache: 'no-store' });
    yield put(sectionsActions.fetchSectionsSuccess(data.sections || []));
    if (resolve) resolve(data.sections || []);
  } catch (error: any) {
    yield put(sectionsActions.fetchSectionsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateSection(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    yield call(fetchJson, '/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(sectionsActions.createSectionSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(sectionsActions.createSectionFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateSection(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/sections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(sectionsActions.updateSectionSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(sectionsActions.updateSectionFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteSection(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    yield call(fetchJson, `/api/sections/${id}`, { method: 'DELETE' });
    yield put(sectionsActions.deleteSectionSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(sectionsActions.deleteSectionFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchSectionsSagas() {
  yield takeLatest(sectionsActions.fetchSectionsRequest.type, handleFetchSections);
  yield takeLatest(sectionsActions.createSectionRequest.type, handleCreateSection);
  yield takeLatest(sectionsActions.updateSectionRequest.type, handleUpdateSection);
  yield takeLatest(sectionsActions.deleteSectionRequest.type, handleDeleteSection);
}
