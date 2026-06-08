import { call, put, takeLatest } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import { fetchJson } from '@/lib/apiClient'
import { API_ENDPOINTS, buildUrl } from '@/lib/apiConstants'
import { questionLibraryActions } from '../slices/questionLibrarySlice'

function* fetchLibrary(action: PayloadAction<any>) {
  try {
    const { organizationId, type, difficulty, status, resolve } = action.payload
    const url = buildUrl(API_ENDPOINTS.LIBRARY_QUESTIONS, { organizationId, type, difficulty, status })
    const data: any = yield call(fetchJson, url)
    yield put(questionLibraryActions.fetchLibrarySuccess(data.libraryQuestions || []))
    if (resolve) resolve(data.libraryQuestions || [])
  } catch (e: any) {
    yield put(questionLibraryActions.fetchLibraryFailure(e.message))
    if (action.payload.reject) action.payload.reject(e.message)
  }
}

function* fetchQuestion(action: PayloadAction<any>) {
  try {
    const { id, organizationId, resolve } = action.payload
    const data: any = yield call(fetchJson, `${API_ENDPOINTS.LIBRARY_QUESTION_BY_ID(id)}?organizationId=${organizationId}`)
    yield put(questionLibraryActions.fetchQuestionSuccess(data.libraryQuestion))
    if (resolve) resolve(data.libraryQuestion)
  } catch (e: any) {
    yield put(questionLibraryActions.fetchQuestionFailure(e.message))
    if (action.payload.reject) action.payload.reject(e.message)
  }
}

function* saveQuestion(action: PayloadAction<any>) {
  try {
    const { id, payload, resolve } = action.payload
    if (id) {
      yield call(fetchJson, `${API_ENDPOINTS.LIBRARY_QUESTION_BY_ID(id)}?organizationId=${payload.organizationId}`, { method: 'PUT', body: JSON.stringify(payload) })
    } else {
      yield call(fetchJson, `${API_ENDPOINTS.LIBRARY_QUESTIONS}?organizationId=${payload.organizationId}`, { method: 'POST', body: JSON.stringify(payload) })
    }
    yield put(questionLibraryActions.saveQuestionSuccess())
    if (resolve) resolve()
  } catch (e: any) {
    yield put(questionLibraryActions.saveQuestionFailure(e.message))
    if (action.payload.reject) action.payload.reject(e.message)
  }
}

function* deleteQuestion(action: PayloadAction<any>) {
  try {
    const { id, organizationId, resolve } = action.payload
    yield call(fetchJson, `${API_ENDPOINTS.LIBRARY_QUESTION_BY_ID(id)}?organizationId=${organizationId}`, { method: 'DELETE' })
    yield put(questionLibraryActions.deleteQuestionSuccess())
    if (resolve) resolve()
  } catch (e: any) {
    yield put(questionLibraryActions.deleteQuestionFailure(e.message))
    if (action.payload.reject) action.payload.reject(e.message)
  }
}

function* generateQuestions(action: PayloadAction<any>) {
  try {
    const data: any = yield call(fetchJson, API_ENDPOINTS.LIBRARY_QUESTIONS_GENERATE, { method: 'POST', body: JSON.stringify(action.payload.payload) })
    yield put(questionLibraryActions.generateQuestionsSuccess(data.questions || []))
    if (action.payload.resolve) action.payload.resolve(data.questions || [])
  } catch (e: any) {
    yield put(questionLibraryActions.generateQuestionsFailure(e.message))
    if (action.payload.reject) action.payload.reject(e.message)
  }
}

function* updateReviewStatus(action: PayloadAction<any>) {
  try {
    const { id, organizationId, status, reason, resolve } = action.payload
    yield call(fetchJson, `${API_ENDPOINTS.LIBRARY_QUESTION_BY_ID(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, status, reason }),
    })
    yield put(questionLibraryActions.updateReviewStatusSuccess())
    if (resolve) resolve()
  } catch (e: any) {
    yield put(questionLibraryActions.updateReviewStatusFailure(e.message))
    if (action.payload.reject) action.payload.reject(e.message)
  }
}

export function* watchQuestionLibrarySagas() {
  yield takeLatest(questionLibraryActions.fetchLibraryRequest.type, fetchLibrary)
  yield takeLatest(questionLibraryActions.fetchQuestionRequest.type, fetchQuestion)
  yield takeLatest(questionLibraryActions.saveQuestionRequest.type, saveQuestion)
  yield takeLatest(questionLibraryActions.deleteQuestionRequest.type, deleteQuestion)
  yield takeLatest(questionLibraryActions.generateQuestionsRequest.type, generateQuestions)
  yield takeLatest(questionLibraryActions.updateReviewStatusRequest.type, updateReviewStatus)
}
