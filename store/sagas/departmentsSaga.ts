import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { departmentsActions } from '../slices/departmentsSlice';
import { fetchJson } from '@/lib/apiClient';



function* handleFetchDepartments(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/departments?organizationId=${organizationId}`, { cache: 'no-store' });
    yield put(departmentsActions.fetchDepartmentsSuccess(data.departments || []));
    if (resolve) resolve(data.departments || []);
  } catch (error: any) {
    yield put(departmentsActions.fetchDepartmentsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchDepartmentById(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/departments/${id}`, { cache: 'no-store' });
    yield put(departmentsActions.fetchDepartmentByIdSuccess(data.department));
    if (resolve) resolve(data.department);
  } catch (error: any) {
    yield put(departmentsActions.fetchDepartmentByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateDepartment(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, '/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(departmentsActions.createDepartmentSuccess(data.department || payload));
    if (resolve) resolve();
  } catch (error: any) {
    yield put(departmentsActions.createDepartmentFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateDepartment(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/departments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(departmentsActions.updateDepartmentSuccess(data.department || { id, ...payload }));
    if (resolve) resolve();
  } catch (error: any) {
    yield put(departmentsActions.updateDepartmentFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteDepartment(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    yield call(fetchJson, `/api/departments/${id}`, { method: 'DELETE' });
    yield put(departmentsActions.deleteDepartmentSuccess(id));
    if (resolve) resolve();
  } catch (error: any) {
    yield put(departmentsActions.deleteDepartmentFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchDepartmentsSagas() {
  yield takeLatest(departmentsActions.fetchDepartmentsRequest.type, handleFetchDepartments);
  yield takeLatest(departmentsActions.fetchDepartmentByIdRequest.type, handleFetchDepartmentById);
  yield takeLatest(departmentsActions.createDepartmentRequest.type, handleCreateDepartment);
  yield takeLatest(departmentsActions.updateDepartmentRequest.type, handleUpdateDepartment);
  yield takeLatest(departmentsActions.deleteDepartmentRequest.type, handleDeleteDepartment);
}
