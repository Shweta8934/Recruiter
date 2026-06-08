import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { skillsActions } from '../slices/skillsSlice';
import { fetchJson } from '@/lib/apiClient';



function* handleFetchSkills(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/skills?organizationId=${organizationId}`);
    yield put(skillsActions.fetchSkillsSuccess(data.skills || []));
    if (resolve) resolve(data.skills || []);
  } catch (error: any) {
    yield put(skillsActions.fetchSkillsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchSkillById(action: PayloadAction<any>) {
  try {
    const { skillId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/skills/${skillId}`);
    yield put(skillsActions.fetchSkillByIdSuccess());
    if (resolve) resolve(data.skill);
  } catch (error: any) {
    yield put(skillsActions.fetchSkillByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateSkill(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    yield call(fetchJson, '/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(skillsActions.createSkillSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(skillsActions.createSkillFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateSkill(action: PayloadAction<any>) {
  try {
    const { skillId, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/skills/${skillId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(skillsActions.updateSkillSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(skillsActions.updateSkillFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteSkill(action: PayloadAction<any>) {
  try {
    const { skillId, resolve } = action.payload;
    yield call(fetchJson, `/api/skills/${skillId}`, { method: 'DELETE' });
    yield put(skillsActions.deleteSkillSuccess(skillId));
    if (resolve) resolve();
  } catch (error: any) {
    yield put(skillsActions.deleteSkillFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchSkillsSagas() {
  yield takeLatest(skillsActions.fetchSkillsRequest.type, handleFetchSkills);
  yield takeLatest(skillsActions.fetchSkillByIdRequest.type, handleFetchSkillById);
  yield takeLatest(skillsActions.createSkillRequest.type, handleCreateSkill);
  yield takeLatest(skillsActions.updateSkillRequest.type, handleUpdateSkill);
  yield takeLatest(skillsActions.deleteSkillRequest.type, handleDeleteSkill);
}
