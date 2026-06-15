import { call, put, takeLatest, takeEvery } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { questionPapersActions } from '../slices/questionPapersSlice';
import { API_ENDPOINTS, buildUrl } from '@/lib/apiConstants';
import { fetchJson } from '@/lib/apiClient';



// Generates Paper
function* handleFetchPapers(action: PayloadAction<any>) {
  try {
    const { organizationId, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/question-papers?organizationId=${organizationId}`);
    yield put(questionPapersActions.fetchPapersSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(questionPapersActions.fetchPapersFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleGeneratePaper(action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const data: any = yield call(fetchJson, API_ENDPOINTS.GENERATE_PAPER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload.payload),
    });
    yield put(questionPapersActions.generatePaperSuccess(data.id));
    if (action.payload.resolve) action.payload.resolve(data);
  } catch (error: any) {
    yield put(questionPapersActions.generatePaperFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

// Save/Update Paper
function* handleSavePaper(action: PayloadAction<{ payload: any; isEdit: boolean; paperId?: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const endpoint = action.payload.isEdit ? `/api/question-papers/${action.payload.paperId}` : '/api/question-papers';
    const data: any = yield call(fetchJson, endpoint, {
      method: action.payload.isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload.payload),
    });
    yield put(questionPapersActions.savePaperSuccess());
    if (action.payload.resolve) action.payload.resolve(data);
  } catch (error: any) {
    yield put(questionPapersActions.savePaperFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

// Toggle Public
function* handleTogglePublic(action: PayloadAction<{ paperId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const res: Response = yield call(fetch, API_ENDPOINTS.TOGGLE_PUBLIC(action.payload.paperId), { method: 'POST' });
    if (!res.ok) throw new Error('Failed to update');
    const data: any = yield call([res, 'json']);
    yield put(questionPapersActions.togglePublicSuccess());
    if (action.payload.resolve) action.payload.resolve(data);
  } catch (error: any) {
    yield put(questionPapersActions.togglePublicFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

// Get Departments
function* handleDeleteQuestionPaper(action: PayloadAction<any>) {
  try {
    const { id, resolve } = action.payload;
    yield call(fetchJson, `/api/question-papers/${id}`, { method: 'DELETE' });
    yield put(questionPapersActions.deleteQuestionPaperSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(questionPapersActions.deleteQuestionPaperFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleGetDepartments(action: PayloadAction<string>) {
  try {
    const url = buildUrl(API_ENDPOINTS.GET_DEPARTMENTS, { organizationId: action.payload });
    const data: any = yield call(fetchJson, url);
    yield put(questionPapersActions.getDepartmentsSuccess(data.departments || []));
  } catch (error: any) {
    // silently fail for form fetching if needed, or put error
  }
}

// Suggest Skills
function* handleSuggestSkills(action: PayloadAction<any>) {
  try {
    const data: any = yield call(fetchJson, API_ENDPOINTS.SUGGEST_SKILLS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload),
    });
    yield put(questionPapersActions.suggestSkillsSuccess(data.skills || []));
  } catch (error: any) {
    // silently fail
  }
}

// Search Skills
function* handleSearchSkills(action: PayloadAction<{ organizationId: string; q: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const url = buildUrl(API_ENDPOINTS.SEARCH_SKILLS, { organizationId: action.payload.organizationId, q: action.payload.q });
    const data: any = yield call(fetchJson, url);
    yield put(questionPapersActions.searchSkillsSuccess(data.skills || []));
    if (action.payload.resolve) action.payload.resolve(data.skills || []);
  } catch (error: any) {
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

// Upload Image
function* handleUploadImage(action: PayloadAction<{ file: File; resolve?: (url: string) => void; reject?: (err: string) => void }>) {
  try {
    const formData = new FormData();
    formData.append('file', action.payload.file);
    
    const data: any = yield call(fetchJson, API_ENDPOINTS.UPLOAD, {
      method: 'POST',
      body: formData,
    });
    yield put(questionPapersActions.uploadImageSuccess(data.url));
    if (action.payload.resolve) {
      action.payload.resolve(data.url);
    }
  } catch (error: any) {
    yield put(questionPapersActions.uploadImageFailure(error.message));
    if (action.payload.reject) {
      action.payload.reject(error.message);
    }
  }
}

// Attempts
function* handleCreateAttempt(action: PayloadAction<{ paperId: string; payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const data: any = yield call(fetchJson, API_ENDPOINTS.CREATE_ATTEMPT(action.payload.paperId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload.payload),
    });
    yield put(questionPapersActions.createAttemptSuccess(data.attempt));
    if (action.payload.resolve) action.payload.resolve(data);
  } catch (error: any) {
    yield put(questionPapersActions.createAttemptFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleStartAttempt(action: PayloadAction<{ paperId: string; attemptId: string; payload?: any; resolve?: () => void; reject?: (err: string) => void }>) {
  try {
    yield call(fetchJson, API_ENDPOINTS.START_ATTEMPT(action.payload.paperId, action.payload.attemptId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload.payload || {}),
    });
    yield put(questionPapersActions.startAttemptSuccess());
    if (action.payload.resolve) action.payload.resolve();
  } catch (error: any) {
    yield put(questionPapersActions.startAttemptFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleSubmitAttempt(action: PayloadAction<{ paperId: string; attemptId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
  try {
    yield call(fetchJson, API_ENDPOINTS.SUBMIT_ATTEMPT(action.payload.paperId, action.payload.attemptId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload.payload),
    });
    yield put(questionPapersActions.submitAttemptSuccess());
    if (action.payload.resolve) action.payload.resolve();
  } catch (error: any) {
    yield put(questionPapersActions.submitAttemptFailure(error.message));
    const message = String(error?.message || 'Failed to submit test')
    if (message.toLowerCase().includes('already submitted') || message.toLowerCase().includes('already completed')) {
      if (action.payload.resolve) action.payload.resolve();
      return;
    }
    if (action.payload.reject) action.payload.reject(message);
  }
}

function* handleReportViolation(action: PayloadAction<{ paperId: string; attemptId: string; payload: any }>) {
  try {
    yield call(fetch, API_ENDPOINTS.REPORT_VIOLATION(action.payload.paperId, action.payload.attemptId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload.payload),
    });
  } catch (error) {
    // Ignore violation report failures silently
  }
}

function* handleVerifyFace(action: PayloadAction<{ paperId: string; attemptId: string; image: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const { paperId, attemptId, image, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/question-papers/${paperId}/attempts/${attemptId}/verify-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    yield put(questionPapersActions.verifyFaceSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(questionPapersActions.verifyFaceFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleEvaluateAttempt(action: PayloadAction<{ paperId: string; attemptId: string; resolve?: () => void; reject?: (err: string) => void }>) {
  try {
    const data: any = yield call(fetchJson, API_ENDPOINTS.EVALUATE_ATTEMPT(action.payload.paperId, action.payload.attemptId), {
      method: 'POST'
    });
    yield put(questionPapersActions.evaluateAttemptSuccess(data));
    if (action.payload.resolve) action.payload.resolve();
  } catch (error: any) {
    yield put(questionPapersActions.evaluateAttemptFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleInviteCandidate(action: PayloadAction<{ paperId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
  try {
    yield call(fetchJson, API_ENDPOINTS.INVITE_CANDIDATE(action.payload.paperId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload.payload),
    });
    yield put(questionPapersActions.inviteCandidateSuccess());
    if (action.payload.resolve) action.payload.resolve();
  } catch (error: any) {
    yield put(questionPapersActions.inviteCandidateFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleExecuteCode(action: PayloadAction<{ code: string; language: string; testCases?: any[]; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
  try {
    const data: any = yield call(fetchJson, '/api/execute-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: action.payload.code, language: action.payload.language, testCases: action.payload.testCases }),
    });
    yield put(questionPapersActions.executeCodeSuccess(data));
    if (action.payload.resolve) action.payload.resolve(data);
  } catch (error: any) {
    yield put(questionPapersActions.executeCodeFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleDownloadFile(action: PayloadAction<string>) {
  try {
    const response: Response = yield call(fetch, action.payload);
    const blob: Blob = yield call([response, 'blob']);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    yield put(questionPapersActions.downloadFileSuccess());
  } catch (error: any) {
    yield put(questionPapersActions.downloadFileFailure(error.message));
  }
}

function* handleFetchText(action: PayloadAction<{ url: string; resolve?: (data: string) => void; reject?: (err: string) => void }>) {
  try {
    const res = yield call(fetch, action.payload.url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch text');
    const text = yield call([res, 'text']);
    if (action.payload.resolve) action.payload.resolve(text);
  } catch (error: any) {
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleCloneTemplate(action: PayloadAction<any>) {
  try {
    const { templateId, payload, resolve } = action.payload;
    const data: any = yield call(fetchJson, `/api/test-templates/${templateId}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(questionPapersActions.cloneTemplateSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(questionPapersActions.cloneTemplateFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleUploadExcel(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/ai-recruitment-platform';
    const res = yield call(fetch, `${basePath}/api/test-templates/excel/upload`, {
      method: 'POST',
      body: payload
    });
    if (res.ok) {
      const data = yield call([res, 'json']);
      yield put(questionPapersActions.uploadExcelSuccess());
      if (resolve) resolve(data);
    } else {
      if (res.headers.get('Content-Disposition')?.includes('attachment')) {
        const blob = yield call([res, 'blob']);
        yield put(questionPapersActions.uploadExcelFailure('Validation failed'));
        if (reject) reject(blob);
      } else {
        const data = yield call([res, 'json']);
        yield put(questionPapersActions.uploadExcelFailure(data.error || 'Failed to upload'));
        if (reject) reject(data.error || 'Failed to upload');
      }
    }
  } catch (error: any) {
    yield put(questionPapersActions.uploadExcelFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

export function* watchQuestionPapersSagas() {
  yield takeLatest(questionPapersActions.fetchPapersRequest.type, handleFetchPapers);
  yield takeLatest(questionPapersActions.generatePaperRequest.type, handleGeneratePaper);
  yield takeLatest(questionPapersActions.savePaperRequest.type, handleSavePaper);
  yield takeLatest(questionPapersActions.togglePublicRequest.type, handleTogglePublic);
  yield takeLatest(questionPapersActions.deleteQuestionPaperRequest.type, handleDeleteQuestionPaper);
  yield takeLatest(questionPapersActions.getDepartmentsRequest.type, handleGetDepartments);
  yield takeLatest(questionPapersActions.suggestSkillsRequest.type, handleSuggestSkills);
  yield takeLatest(questionPapersActions.searchSkillsRequest.type, handleSearchSkills);
  yield takeEvery(questionPapersActions.uploadImageRequest.type, handleUploadImage);
  yield takeLatest(questionPapersActions.createAttemptRequest.type, handleCreateAttempt);
  yield takeLatest(questionPapersActions.startAttemptRequest.type, handleStartAttempt);
  yield takeLatest(questionPapersActions.submitAttemptRequest.type, handleSubmitAttempt);
  yield takeEvery(questionPapersActions.reportViolationRequest.type, handleReportViolation);
  yield takeLatest(questionPapersActions.evaluateAttemptRequest.type, handleEvaluateAttempt);
  yield takeLatest(questionPapersActions.verifyFaceRequest.type, handleVerifyFace);
  yield takeLatest(questionPapersActions.inviteCandidateRequest.type, handleInviteCandidate);
  yield takeLatest(questionPapersActions.executeCodeRequest.type, handleExecuteCode);
  yield takeLatest(questionPapersActions.downloadFileRequest.type, handleDownloadFile);
  yield takeLatest(questionPapersActions.fetchTextRequest.type, handleFetchText);
  yield takeLatest(questionPapersActions.cloneTemplateRequest.type, handleCloneTemplate);
  yield takeLatest(questionPapersActions.uploadExcelRequest.type, handleUploadExcel);
  yield takeEvery(questionPapersActions.checkAttemptStatusRequest.type, handleCheckAttemptStatus);
  yield takeEvery(questionPapersActions.autosaveAttemptRequest.type, handleAutosaveAttempt);
}

function* handleCheckAttemptStatus(action: PayloadAction<any>) {
  try {
    const { paperId, attemptId, cache, resolve } = action.payload;
    const url = `/api/question-papers/${paperId}/attempts/${attemptId}/status`;
    const data: any = yield call(fetchJson, cache === 'no-store' ? url : url, cache === 'no-store' ? { cache: 'no-store' } : undefined);
    if (resolve) resolve(data);
  } catch {
    // Background poll — silently fail
    if (action.payload.reject) action.payload.reject();
  }
}

function* handleAutosaveAttempt(action: PayloadAction<any>) {
  try {
    const { paperId, attemptId, payload } = action.payload;
    yield call(fetchJson, `/api/question-papers/${paperId}/attempts/${attemptId}/autosave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Fire-and-forget — silently fail
  }
}
