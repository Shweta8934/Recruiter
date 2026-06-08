import { all, put, takeLatest, select, call } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { authActions } from '../slices/authSlice';
import { jobsActions } from '../slices/jobsSlice';
import { usersActions } from '../slices/usersSlice';
import { departmentsActions } from '../slices/departmentsSlice';
import { skillsActions } from '../slices/skillsSlice';
import { organizationActions } from '../slices/organizationSlice';
import { questionPapersActions } from '../slices/questionPapersSlice';
import { superAdminActions } from '../slices/superAdminSlice';
import type { User } from '@/types/auth';

function* handleAppInit(action: PayloadAction<{ user: User; resolve?: () => void }>) {
  try {
    const { user, resolve } = action.payload;
    const organizationId = user.organizationId;
    const roleSlug = user.roleSlug || '';
    
    // Always load active organization details
    if (organizationId) {
      yield put(organizationActions.loadOrganizationsRequest({}));
    }

    // Role-based data fetching
    const fetchTasks: any[] = [];

    if (roleSlug === 'super-admin') {
      // Super Admin needs everything at a global level
      fetchTasks.push(put(superAdminActions.fetchDashboardDataRequest({})));
      fetchTasks.push(put(superAdminActions.fetchTemplatesRequest({})));
      fetchTasks.push(put(usersActions.fetchUsersRequest({})));
      fetchTasks.push(put(organizationActions.loadOrganizationsRequest({})));
    } else if (['org-admin', 'hr', 'recruiter', 'senior-recruiter', 'developer', 'billing', 'member'].includes(roleSlug)) {
      // Org-level roles: fetch data scoped to this tenant
      if (organizationId) {
        fetchTasks.push(put(jobsActions.fetchJobPostsRequest({ organizationId })));
        fetchTasks.push(put(usersActions.fetchUsersRequest({ organizationId })));
        fetchTasks.push(put(departmentsActions.fetchDepartmentsRequest({ organizationId })));
        fetchTasks.push(put(skillsActions.fetchSkillsRequest({ organizationId })));
        fetchTasks.push(put(questionPapersActions.fetchPapersRequest({ organizationId })));
      }
    }

    // Dispatch all requests in parallel
    if (fetchTasks.length > 0) {
      yield all(fetchTasks);
    }

    if (resolve) resolve();
  } catch (error) {
    console.error('Bootstrap error:', error);
  }
}

export function* watchBootstrapSagas() {
  yield takeLatest(authActions.appInitRequest.type, handleAppInit);
}
