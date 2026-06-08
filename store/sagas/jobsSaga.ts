import { call, put, takeLatest, takeEvery } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { jobsActions } from '../slices/jobsSlice';
import { fetchJson } from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/apiConstants';



// Jobs
function* handleFetchJobById(action: PayloadAction<any>) {
  try {
    const { jobId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/jobs/${jobId}`, { cache: 'no-store' });
    yield put(jobsActions.fetchJobByIdSuccess(data.job));
    if (resolve) resolve(data.job);
  } catch (error: any) {
    yield put(jobsActions.fetchJobByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateJob(action: PayloadAction<any>) {
  try {
    const { jobId, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.updateJobSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(jobsActions.updateJobFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleApplyToJob(action: PayloadAction<any>) {
  try {
    const { jobId, payload, resolve } = action.payload;
    // Note: payload is FormData, so we don't use JSON.stringify and don't set Content-Type
    const res: Response = yield call(fetch, `/api/jobs/${jobId}/applications`, {
      method: 'POST',
      body: payload,
    });
    let data;
    try {
      data = yield call([res, 'json']);
    } catch (e) {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      data = {};
    }
    if (!res.ok) {
      const err: any = new Error(data?.error || `HTTP error ${res.status}`)
      err.payload = data
      throw err
    }
    
    yield put(jobsActions.applyToJobSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(jobsActions.applyToJobFailure(error.message));
    if (action.payload.reject) action.payload.reject(error?.payload || error.message);
  }
}

// Job Posts
function* handleFetchJobPosts(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/job-posts?organizationId=${organizationId}`, { cache: 'no-store' });
    yield put(jobsActions.fetchJobPostsSuccess(data.jobs || []));
    if (resolve) resolve(data.jobs || []);
  } catch (error: any) {
    yield put(jobsActions.fetchJobPostsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchJobPostById(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/job-posts/${id}`, { cache: 'no-store' });
    yield put(jobsActions.fetchJobPostByIdSuccess(data.jobPost));
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.fetchJobPostByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCreateJobPost(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, '/api/job-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.createJobPostSuccess(data.jobPost || payload));
    if (resolve) resolve();
  } catch (error: any) {
    yield put(jobsActions.createJobPostFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateJobPost(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/job-posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.updateJobPostSuccess(data.jobPost || { id, ...payload }));
    if (resolve) resolve();
  } catch (error: any) {
    yield put(jobsActions.updateJobPostFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDeleteJobPost(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    yield call(fetchJson, `/api/job-posts/${id}`, { method: 'DELETE' });
    yield put(jobsActions.deleteJobPostSuccess(id));
    if (resolve) resolve();
  } catch (error: any) {
    yield put(jobsActions.deleteJobPostFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateJobApplicationStatus(action: PayloadAction<any>) {
  try {
    const { jobId, appId, payload, resolve } = action.payload;
    yield call(fetchJson, API_ENDPOINTS.UPDATE_APPLICATION(jobId, appId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.updateJobApplicationStatusSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(jobsActions.updateJobApplicationStatusFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleParseResume(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    const res: Response = yield call(fetch, API_ENDPOINTS.PARSE_RESUME, {
      method: 'POST',
      body: payload,
    });
    const data: any = yield call([res, 'json']);
    if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
    
    yield put(jobsActions.parseResumeSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.parseResumeFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleScoreApplication(action: PayloadAction<any>) {
  try {
    const { jobId, appId, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, API_ENDPOINTS.SCORE_APPLICATION(jobId, appId), {
      method: 'POST',
    });
    yield put(jobsActions.scoreApplicationSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.scoreApplicationFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleBulkUpdateApplications(action: PayloadAction<any>) {
  try {
    const { jobId, payload, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, API_ENDPOINTS.BULK_UPDATE_APPLICATIONS(jobId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.bulkUpdateApplicationsSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.bulkUpdateApplicationsFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleInviteCandidate(action: PayloadAction<any>) {
  try {
    const { jobId, payload, resolve, reject } = action.payload;
    yield call(fetchJson, `/api/job-posts/${jobId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.inviteCandidateSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(jobsActions.inviteCandidateFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchJobApplications(action: PayloadAction<any>) {
  try {
    const { jobId, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, `/api/job-posts/${jobId}/applications`, { cache: 'no-store' });
    if (resolve) resolve(data.applications || []);
  } catch (error: any) {
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleSendCandidateEmail(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    yield call(fetchJson, '/api/candidates/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resolve) resolve();
  } catch (error: any) {
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleGenerateJd(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, API_ENDPOINTS.GENERATE_JD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.generateJdSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.generateJdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchPublicJobById(action: PayloadAction<any>) {
  try {
    const { jobId, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, API_ENDPOINTS.GET_PUBLIC_JOB(jobId), { cache: 'no-store' });
    yield put(jobsActions.fetchPublicJobByIdSuccess(data.job));
    if (resolve) resolve(data.job);
  } catch (error: any) {
    yield put(jobsActions.fetchPublicJobByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchAssignedCandidates(action: PayloadAction<any>) {
  try {
    const { resolve, reject } = action.payload || {};
    const data: any = yield call(fetchJson, API_ENDPOINTS.GET_ASSIGNED_CANDIDATES, { cache: 'no-store' });
    if (resolve) resolve(data);
  } catch (error: any) {
    if (action.payload?.reject) action.payload.reject(error.message);
  }
}

function* handleSuggestSkills(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, API_ENDPOINTS.SUGGEST_SKILLS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resolve) resolve(data);
  } catch (error: any) {
    if (action.payload?.reject) action.payload.reject(error.message);
  }
}

function* handleFetchInterviews(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, `/api/interviews?organizationId=${organizationId}`, { cache: 'no-store' });
    yield put(jobsActions.fetchInterviewsSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.fetchInterviewsFailure(error.message));
    if (action.payload?.reject) action.payload.reject(error.message);
  }
}

function* handleGenerateZoomLink(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, `/api/zoom/create-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    yield put(jobsActions.generateZoomLinkSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.generateZoomLinkFailure(error.message));
    if (action.payload?.reject) action.payload.reject(error.message);
  }
}

function* handleCancelInterview(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, `/api/interviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || { status: 'cancelled' })
    });
    yield put(jobsActions.cancelInterviewSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.cancelInterviewFailure(error.message));
    if (action.payload?.reject) action.payload.reject(error.message);
  }
}

function* handleRejectReschedule(action: PayloadAction<any>) {
  try {
    const { id, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, `/api/interviews/${id}/reject-reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    yield put(jobsActions.rejectRescheduleSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.rejectRescheduleFailure(error.message));
    if (action.payload?.reject) action.payload.reject(error.message);
  }
}

export function* watchJobsSagas() {
  yield takeLatest(jobsActions.fetchJobByIdRequest.type, handleFetchJobById);
  yield takeLatest(jobsActions.updateJobRequest.type, handleUpdateJob);
  yield takeLatest(jobsActions.applyToJobRequest.type, handleApplyToJob);
  yield takeLatest(jobsActions.fetchJobPostsRequest.type, handleFetchJobPosts);
  yield takeLatest(jobsActions.fetchJobPostByIdRequest.type, handleFetchJobPostById);
  yield takeLatest(jobsActions.createJobPostRequest.type, handleCreateJobPost);
  yield takeLatest(jobsActions.updateJobPostRequest.type, handleUpdateJobPost);
  yield takeLatest(jobsActions.deleteJobPostRequest.type, handleDeleteJobPost);
  yield takeLatest(jobsActions.updateJobApplicationStatusRequest.type, handleUpdateJobApplicationStatus);
  yield takeLatest(jobsActions.parseResumeRequest.type, handleParseResume);
  yield takeLatest(jobsActions.scoreApplicationRequest.type, handleScoreApplication);
  yield takeLatest(jobsActions.bulkUpdateApplicationsRequest.type, handleBulkUpdateApplications);
  yield takeLatest(jobsActions.inviteCandidateRequest.type, handleInviteCandidate);
  yield takeEvery(jobsActions.fetchJobApplicationsRequest.type, handleFetchJobApplications);
  yield takeLatest(jobsActions.sendCandidateEmailRequest.type, handleSendCandidateEmail);
  yield takeLatest(jobsActions.generateJdRequest.type, handleGenerateJd);
  yield takeLatest(jobsActions.fetchPublicJobByIdRequest.type, handleFetchPublicJobById);
  yield takeLatest(jobsActions.fetchAssignedCandidatesRequest.type, handleFetchAssignedCandidates);
  yield takeLatest(jobsActions.suggestSkillsRequest.type, handleSuggestSkills);
  
  yield takeLatest(jobsActions.fetchInterviewsRequest.type, handleFetchInterviews);
  yield takeLatest(jobsActions.generateZoomLinkRequest.type, handleGenerateZoomLink);
  yield takeLatest(jobsActions.cancelInterviewRequest.type, handleCancelInterview);
  yield takeLatest(jobsActions.rejectRescheduleRequest.type, handleRejectReschedule);

  // Interview CRUD (from components)
  yield takeLatest(jobsActions.createInterviewRequest.type, handleCreateInterviewFromComponent);
  yield takeLatest(jobsActions.updateInterviewRequest.type, handleUpdateInterviewFromComponent);
  yield takeEvery(jobsActions.fetchInterviewsByApplicationRequest.type, handleFetchInterviewsByApplication);
  yield takeLatest(jobsActions.submitInterviewFeedbackRequest.type, handleSubmitInterviewFeedback);
  yield takeLatest(jobsActions.fetchEvaluationTemplateByIdRequest.type, handleFetchEvaluationTemplateById);
}

// Interview CRUD helpers (used by InterviewSection, FeedbackModal, RescheduleModal, ScheduleModal)
function* handleCreateInterviewFromComponent(action: PayloadAction<any>) {
  try {
    const { payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, '/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.createInterviewSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.createInterviewFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUpdateInterviewFromComponent(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/interviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.updateInterviewSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.updateInterviewFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchInterviewsByApplication(action: PayloadAction<any>) {
  try {
    const { applicationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/interviews?applicationId=${applicationId}`);
    yield put(jobsActions.fetchInterviewsByApplicationSuccess());
    if (resolve) resolve(data.interviews || []);
  } catch (error: any) {
    yield put(jobsActions.fetchInterviewsByApplicationFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleSubmitInterviewFeedback(action: PayloadAction<any>) {
  try {
    const { interviewId, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/interviews/${interviewId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(jobsActions.submitInterviewFeedbackSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(jobsActions.submitInterviewFeedbackFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleFetchEvaluationTemplateById(action: PayloadAction<any>) {
  try {
    const { templateId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/evaluation-templates/${templateId}`);
    yield put(jobsActions.fetchEvaluationTemplateByIdSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(jobsActions.fetchEvaluationTemplateByIdFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}
