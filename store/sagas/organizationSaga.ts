import { call, put, takeLatest } from 'redux-saga/effects';
import { organizationActions } from '../slices/organizationSlice';
import { PayloadAction } from '@reduxjs/toolkit';
import { fetchJson } from '@/lib/apiClient';



// Invites
function* handleLoadInvites(action: PayloadAction<any>) {
  try {
    const { organizationId, requesterUserId, resolve } = action.payload;
    const query = new URLSearchParams();
    if (organizationId) query.append('organizationId', organizationId);
    if (requesterUserId) query.append('requesterUserId', requesterUserId);
    
    const url = `/api/invites${query.toString() ? `?${query.toString()}` : ''}`;
    const data: any = yield call(fetchJson, url);
    yield put(organizationActions.loadInvitesSuccess(data.invites || []));
    if (resolve) resolve(data.invites || []);
  } catch (error: any) {
    yield put(organizationActions.loadInvitesFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleSendInvite(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    yield call(fetchJson, '/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    yield put(organizationActions.sendInviteSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.sendInviteFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleRevokeInvite(action: PayloadAction<any>) {
  try {
    const { inviteId, actorUserId, resolve } = action.payload;
    yield call(fetchJson, `/api/invites/${inviteId}${actorUserId ? `?actorUserId=${actorUserId}` : ''}`, {
      method: 'DELETE'
    });
    yield put(organizationActions.revokeInviteSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.revokeInviteFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateInvite(action: PayloadAction<any>) {
  try {
    const { inviteId, payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/invites/${inviteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(organizationActions.updateInviteSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.updateInviteFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}


// Roles
function* handleLoadRoles(action: PayloadAction<any>) {
  try {
    const { organizationId, page, limit, search, resolve } = action.payload;
    const query = new URLSearchParams();
    if (organizationId) query.append('organizationId', organizationId);
    if (page) query.append('page', page.toString());
    if (limit) query.append('limit', limit.toString());
    if (search) query.append('search', search);

    const url = `/api/roles${query.toString() ? `?${query.toString()}` : ''}`;
    const data: any = yield call(fetchJson, url);
    yield put(organizationActions.loadRolesSuccess(data.roles || []));
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.loadRolesFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleLoadRoleById(action: PayloadAction<any>) {
  try {
    const { roleId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/roles/${roleId}`);
    yield put(organizationActions.loadRoleByIdSuccess(data.role || null));
    if (resolve) resolve(data.role || null);
  } catch (error: any) {
    yield put(organizationActions.loadRoleByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateRole(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    yield call(fetchJson, '/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    yield put(organizationActions.createRoleSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.createRoleFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateRole(action: PayloadAction<any>) {
  try {
    const { roleId, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/roles/${roleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    yield put(organizationActions.updateRoleSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.updateRoleFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteRole(action: PayloadAction<any>) {
  try {
    const { roleId, actorUserId, resolve } = action.payload;
    yield call(fetchJson, `/api/roles/${roleId}${actorUserId ? `?actorUserId=${actorUserId}` : ''}`, {
      method: 'DELETE'
    });
    yield put(organizationActions.deleteRoleSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.deleteRoleFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

// Users
function* handleLoadUsers(action: PayloadAction<any>) {
  try {
    const { organizationId, requesterUserId, roleId, status, search, page, limit, resolve } = action.payload;
    const query = new URLSearchParams();
    if (organizationId) query.append('organizationId', organizationId);
    if (requesterUserId) query.append('requesterUserId', requesterUserId);
    if (roleId) query.append('roleId', roleId);
    if (status) query.append('status', status);
    if (search) query.append('search', search);
    if (page) query.append('page', page.toString());
    if (limit) query.append('limit', limit.toString());
    
    const url = `/api/users${query.toString() ? `?${query.toString()}` : ''}`;
    const data: any = yield call(fetchJson, url);
    yield put(organizationActions.loadUsersSuccess(data.users || []));
    if (resolve) resolve(data); // pass full data so callers can access totalCount
  } catch (error: any) {
    yield put(organizationActions.loadUsersFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleLoadOrganizations(action: PayloadAction<any>) {
  try {
    const { resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, '/api/organizations');
    yield put(organizationActions.loadOrganizationsSuccess(data.organizations || []));
    if (resolve) resolve(data.organizations || []);
  } catch (error: any) {
    yield put(organizationActions.loadOrganizationsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleLoadOrganizationById(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, `/api/organizations/${organizationId}`);
    yield put(organizationActions.loadOrganizationByIdSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.loadOrganizationByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateOrganization(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, '/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(organizationActions.createOrganizationSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.createOrganizationFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateOrganization(action: PayloadAction<any>) {
  try {
    const { organizationId, payload, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, `/api/organizations/${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(organizationActions.updateOrganizationSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.updateOrganizationFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteOrganization(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve, reject } = action.payload;
    yield call(fetchJson, `/api/organizations/${organizationId}`, {
      method: 'DELETE',
    });
    yield put(organizationActions.deleteOrganizationSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.deleteOrganizationFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteUser(action: PayloadAction<any>) {
  try {
    const { userId, resolve, reject } = action.payload;
    yield call(fetchJson, `/api/users/${userId}`, {
      method: 'DELETE',
    });
    yield put(organizationActions.deleteUserSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.deleteUserFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateUser(action: PayloadAction<any>) {
  try {
    const { userId, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(organizationActions.updateUserSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.updateUserFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleLoadActivities(action: PayloadAction<any>) {
  try {
    const { organizationId, limit, resolve } = action.payload;
    const query = new URLSearchParams();
    if (organizationId) query.append('organizationId', organizationId);
    if (limit) query.append('limit', limit.toString());
    
    const url = `/api/activities${query.toString() ? `?${query.toString()}` : ''}`;
    const data: any = yield call(fetchJson, url);
    yield put(organizationActions.loadActivitiesSuccess(data.activities || []));
    if (resolve) resolve(data.activities || []);
  } catch (error: any) {
    yield put(organizationActions.loadActivitiesFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleLoadInviteByToken(action: PayloadAction<any>) {
  try {
    const { token, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/invites/token/${token}`);
    yield put(organizationActions.loadInviteByTokenSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.loadInviteByTokenFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeclineInvite(action: PayloadAction<any>) {
  try {
    const { inviteId, resolve } = action.payload;
    yield call(fetchJson, `/api/invites/${inviteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    yield put(organizationActions.declineInviteSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.declineInviteFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

// Stages
function* handleFetchStages(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/organization/stages?organizationId=${organizationId}`);
    yield put(organizationActions.fetchStagesSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.fetchStagesFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateStage(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, '/api/organization/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(organizationActions.createStageSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.createStageFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateStage(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/organization/stages?organizationId=${payload.organizationId}&id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(organizationActions.updateStageSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.updateStageFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteStage(action: PayloadAction<any>) {
  try {
    const { id, organizationId, resolve } = action.payload;
    yield call(fetchJson, `/api/organization/stages?organizationId=${organizationId}&id=${id}`, {
      method: 'DELETE',
    });
    yield put(organizationActions.deleteStageSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(organizationActions.deleteStageFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

// Email Templates
function* handleFetchEmailTemplates(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/organization/email-templates?organizationId=${organizationId}`);
    yield put(organizationActions.fetchEmailTemplatesSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.fetchEmailTemplatesFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateEmailTemplate(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, '/api/organization/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(organizationActions.createEmailTemplateSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.createEmailTemplateFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateEmailTemplate(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/organization/email-templates?organizationId=${payload.organizationId}&id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(organizationActions.updateEmailTemplateSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.updateEmailTemplateFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

// File Upload
function* handleUploadFile(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, '/api/upload', {
      method: 'POST',
      body: payload, // FormData — no Content-Type header (browser sets it with boundary)
    });
    yield put(organizationActions.uploadFileSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(organizationActions.uploadFileFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchOrganizationSagas() {
  yield takeLatest(organizationActions.loadInvitesRequest.type, handleLoadInvites);
  yield takeLatest(organizationActions.sendInviteRequest.type, handleSendInvite);
  yield takeLatest(organizationActions.revokeInviteRequest.type, handleRevokeInvite);
  yield takeLatest(organizationActions.updateInviteRequest.type, handleUpdateInvite);
  
  yield takeLatest(organizationActions.loadRolesRequest.type, handleLoadRoles);
  yield takeLatest(organizationActions.loadRoleByIdRequest.type, handleLoadRoleById);
  yield takeLatest(organizationActions.createRoleRequest.type, handleCreateRole);
  yield takeLatest(organizationActions.updateRoleRequest.type, handleUpdateRole);
  yield takeLatest(organizationActions.deleteRoleRequest.type, handleDeleteRole);
  
  yield takeLatest(organizationActions.loadUsersRequest.type, handleLoadUsers);
  yield takeLatest(organizationActions.loadOrganizationsRequest.type, handleLoadOrganizations);
  yield takeLatest(organizationActions.loadOrganizationByIdRequest.type, handleLoadOrganizationById);
  yield takeLatest(organizationActions.createOrganizationRequest.type, handleCreateOrganization);
  yield takeLatest(organizationActions.updateOrganizationRequest.type, handleUpdateOrganization);
  yield takeLatest(organizationActions.deleteOrganizationRequest.type, handleDeleteOrganization);
  yield takeLatest(organizationActions.deleteUserRequest.type, handleDeleteUser);
  yield takeLatest(organizationActions.updateUserRequest.type, handleUpdateUser);
  yield takeLatest(organizationActions.loadActivitiesRequest.type, handleLoadActivities);
  yield takeLatest(organizationActions.loadInviteByTokenRequest.type, handleLoadInviteByToken);
  yield takeLatest(organizationActions.declineInviteRequest.type, handleDeclineInvite);

  // Stages
  yield takeLatest(organizationActions.fetchStagesRequest.type, handleFetchStages);
  yield takeLatest(organizationActions.createStageRequest.type, handleCreateStage);
  yield takeLatest(organizationActions.updateStageRequest.type, handleUpdateStage);
  yield takeLatest(organizationActions.deleteStageRequest.type, handleDeleteStage);
  // Email Templates
  yield takeLatest(organizationActions.fetchEmailTemplatesRequest.type, handleFetchEmailTemplates);
  yield takeLatest(organizationActions.createEmailTemplateRequest.type, handleCreateEmailTemplate);
  yield takeLatest(organizationActions.updateEmailTemplateRequest.type, handleUpdateEmailTemplate);
  // Upload
  yield takeLatest(organizationActions.uploadFileRequest.type, handleUploadFile);
}
