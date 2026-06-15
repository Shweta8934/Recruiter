import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { superAdminActions } from '../slices/superAdminSlice';
import { fetchJson } from '@/lib/apiClient';



function* handleFetchDashboardData(action: PayloadAction<any>) {
  try {
    const { resolve } = action.payload;
    const [orgData, userData, payData]: any[] = yield call(Promise.all.bind(Promise), [
      fetchJson('/api/organizations', { cache: 'no-store' }),
      fetchJson('/api/users', { cache: 'no-store' }),
      fetchJson('/api/payments', { cache: 'no-store' }),
    ]);

    const subsEntries: any[] = yield call(Promise.all.bind(Promise),
      (orgData.organizations || []).map(async (o: any) => {
        try {
          const res = await fetchJson(`/api/subscriptions/current?organizationId=${o.id}`, { cache: 'no-store' });
          return [o.id, res.subscription] as const;
        } catch {
          return [o.id, null] as const;
        }
      })
    );
    
    const dashboardData = {
      organizations: orgData.organizations || [],
      users: userData.users || [],
      payments: payData.payments || [],
      subsByOrg: Object.fromEntries(subsEntries),
    };

    yield put(superAdminActions.fetchDashboardDataSuccess(dashboardData));
    if (resolve) resolve(dashboardData);
  } catch (error: any) {
    yield put(superAdminActions.fetchDashboardDataFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchTemplates(action: PayloadAction<any>) {
  try {
    const { resolve } = action.payload;
    const data: any = yield call(fetchJson, '/api/test-templates/library', { cache: 'no-store' });
    yield put(superAdminActions.fetchTemplatesSuccess(data.templates || []));
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(superAdminActions.fetchTemplatesFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateTemplate(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, '/api/test-templates/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(superAdminActions.createTemplateSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(superAdminActions.createTemplateFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchSuperAdminSagas() {
  yield takeLatest(superAdminActions.fetchDashboardDataRequest.type, handleFetchDashboardData);
  yield takeLatest(superAdminActions.fetchTemplatesRequest.type, handleFetchTemplates);
  yield takeLatest(superAdminActions.createTemplateRequest.type, handleCreateTemplate);
}
