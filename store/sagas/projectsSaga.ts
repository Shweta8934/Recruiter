import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { 
  fetchProjectsRequest, fetchProjectsSuccess, fetchProjectsFailure,
  createProjectRequest, createProjectSuccess, createProjectFailure,
  deleteProjectRequest, deleteProjectSuccess, deleteProjectFailure,
  fetchProjectByIdRequest, fetchProjectByIdSuccess, fetchProjectByIdFailure,
  updateProjectRequest, updateProjectSuccess, updateProjectFailure,
  addProjectMemberRequest, addProjectMemberSuccess, addProjectMemberFailure,
  removeProjectMemberRequest, removeProjectMemberSuccess, removeProjectMemberFailure
} from '../slices/projectsSlice';
import { API_ENDPOINTS, buildUrl } from '@/lib/apiConstants';
import { fetchJson } from '@/lib/apiClient';
import { Project } from '../slices/projectsSlice';

function* handleFetchProjects(action: PayloadAction<{ organizationId: string; requesterUserId?: string; resolve?: (data: Project[]) => void; reject?: (err: string) => void }>) {
  try {
    const { organizationId, requesterUserId, resolve } = action.payload;
    let url = buildUrl(API_ENDPOINTS.GET_PROJECTS, { organizationId });
    if (requesterUserId) url += `&requesterUserId=${requesterUserId}`;
    const data: any = yield call(fetchJson, url, { cache: 'no-store' });
    yield put(fetchProjectsSuccess(data.projects || []));
    if (resolve) resolve(data.projects || []);
  } catch (error: any) {
    yield put(fetchProjectsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateProject(action: PayloadAction<{ organizationId: string; name: string; description: string; createdBy?: string }>) {
  try {
    const data: any = yield call(fetchJson, API_ENDPOINTS.GET_PROJECTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload),
    });
    yield put(fetchProjectsRequest({ organizationId: action.payload.organizationId }));
    yield put(createProjectSuccess(data.project));
  } catch (error: any) {
    yield put(createProjectFailure(error.message));
  }
}

function* handleDeleteProject(action: PayloadAction<string>) {
  try {
    yield call(fetchJson, `${API_ENDPOINTS.GET_PROJECTS}/${action.payload}`, { method: 'DELETE' });
    yield put(deleteProjectSuccess(action.payload));
  } catch (error: any) {
    yield put(deleteProjectFailure(error.message));
  }
}

function* handleFetchProjectById(action: PayloadAction<any>) {
  try {
    const { projectId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `${API_ENDPOINTS.GET_PROJECTS}/${projectId}`, { cache: 'no-store' });
    yield put(fetchProjectByIdSuccess());
    if (resolve) resolve(data.project);
  } catch (error: any) {
    yield put(fetchProjectByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleAddProjectMember(action: PayloadAction<any>) {
  try {
    const { projectId, payload, resolve } = action.payload;
    yield call(fetchJson, `${API_ENDPOINTS.GET_PROJECTS}/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(addProjectMemberSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(addProjectMemberFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleRemoveProjectMember(action: PayloadAction<any>) {
  try {
    const { projectId, userId, resolve } = action.payload;
    yield call(fetchJson, `${API_ENDPOINTS.GET_PROJECTS}/${projectId}/members?userId=${userId}`, { method: 'DELETE' });
    yield put(removeProjectMemberSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(removeProjectMemberFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateProject(action: PayloadAction<any>) {
  try {
    const { projectId, payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, `${API_ENDPOINTS.GET_PROJECTS}/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(updateProjectSuccess(data.project));
    if (resolve) resolve();
  } catch (error: any) {
    yield put(updateProjectFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchProjectsSagas() {
  yield takeLatest(fetchProjectsRequest.type, handleFetchProjects);
  yield takeLatest(createProjectRequest.type, handleCreateProject);
  yield takeLatest(deleteProjectRequest.type, handleDeleteProject);
  yield takeLatest(fetchProjectByIdRequest.type, handleFetchProjectById);
  yield takeLatest(updateProjectRequest.type, handleUpdateProject);
  yield takeLatest(addProjectMemberRequest.type, handleAddProjectMember);
  yield takeLatest(removeProjectMemberRequest.type, handleRemoveProjectMember);
}
