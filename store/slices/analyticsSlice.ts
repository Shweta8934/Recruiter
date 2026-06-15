import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AnalyticsState {
  isLoading: boolean
  error: string | null
  core: any | null
}

const initialState: AnalyticsState = {
  isLoading: false,
  error: null,
  core: null,
}

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    loadCoreAnalyticsRequest(
      state,
      _action: PayloadAction<{
        organizationId: string
        from?: string
        to?: string
        jobId?: string
        departmentId?: string
        resolve?: (data: any) => void
        reject?: (err: string) => void
      }>
    ) {
      state.isLoading = true
      state.error = null
    },
    loadCoreAnalyticsSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false
      state.core = action.payload
    },
    loadCoreAnalyticsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false
      state.error = action.payload
    },
  },
})

export const analyticsActions = analyticsSlice.actions
export default analyticsSlice.reducer
