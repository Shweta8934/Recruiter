import { call, put, takeLatest } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import { fetchJson } from '@/lib/apiClient'
import { analyticsActions } from '../slices/analyticsSlice'

function* handleLoadCoreAnalytics(
  action: PayloadAction<{
    organizationId: string
    from?: string
    to?: string
    jobId?: string
    departmentId?: string
    resolve?: (data: any) => void
    reject?: (err: string) => void
  }>
) {
  try {
    const { organizationId, from, to, jobId, departmentId, resolve } = action.payload
    const query = new URLSearchParams({ organizationId })
    if (from) query.append('from', from)
    if (to) query.append('to', to)
    if (jobId) query.append('jobId', jobId)
    if (departmentId) query.append('departmentId', departmentId)
    const data: any = yield call(fetchJson, `/api/analytics/core?${query.toString()}`, { cache: 'no-store' })
    yield put(analyticsActions.loadCoreAnalyticsSuccess(data))
    if (resolve) resolve(data)
  } catch (error: any) {
    yield put(analyticsActions.loadCoreAnalyticsFailure(error.message))
    if (action.payload.reject) action.payload.reject(error.message)
  }
}

export function* watchAnalyticsSagas() {
  yield takeLatest(analyticsActions.loadCoreAnalyticsRequest.type, handleLoadCoreAnalytics)
}
