import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { usersActions } from '../slices/usersSlice';
import { fetchJson } from '@/lib/apiClient';



function* handleFetchUsers(action: PayloadAction<any>) {
  try {
    const { organizationId, params, resolve } = action.payload;
    let url = '/api/users';
    if (organizationId && params) {
      url = `/api/users?organizationId=${organizationId}&${params}`;
    } else if (organizationId) {
      url = `/api/users?organizationId=${organizationId}`;
    } else if (params) {
      url = `/api/users?${params}`;
    }
    const data: any = yield call(fetchJson, url, { cache: 'no-store' });
    yield put(usersActions.fetchUsersSuccess(data.users || []));
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(usersActions.fetchUsersFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchUserById(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/users/${id}`, { cache: 'no-store' });
    yield put(usersActions.fetchUserByIdSuccess(data.user));
    if (resolve) resolve(data.user);
  } catch (error: any) {
    yield put(usersActions.fetchUserByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchUserAudit(action: PayloadAction<any>) {
  try {
    const { userId, limit = 5, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/users/${userId}/audit?limit=${limit}`, { cache: 'no-store' });
    yield put(usersActions.fetchUserAuditSuccess(data.logs || []));
    if (resolve) resolve(data.logs || []);
  } catch (error: any) {
    yield put(usersActions.fetchUserAuditFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateUser(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(usersActions.updateUserSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(usersActions.updateUserFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateUserPassword(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/users/${id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(usersActions.updateUserPasswordSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(usersActions.updateUserPasswordFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteUser(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    yield call(fetchJson, `/api/users/${id}`, { method: 'DELETE' });
    yield put(usersActions.deleteUserSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(usersActions.deleteUserFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchUsersSagas() {
  yield takeLatest(usersActions.fetchUsersRequest.type, handleFetchUsers);
  yield takeLatest(usersActions.fetchUserByIdRequest.type, handleFetchUserById);
  yield takeLatest(usersActions.fetchUserAuditRequest.type, handleFetchUserAudit);
  yield takeLatest(usersActions.updateUserRequest.type, handleUpdateUser);
  yield takeLatest(usersActions.updateUserPasswordRequest.type, handleUpdateUserPassword);
  yield takeLatest(usersActions.deleteUserRequest.type, handleDeleteUser);
}
