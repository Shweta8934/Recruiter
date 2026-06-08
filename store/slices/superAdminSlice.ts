import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SuperAdminState {
  isLoading: boolean;
  error: string | null;
  dashboardData: {
    organizations: any[];
    users: any[];
    payments: any[];
    subsByOrg: Record<string, any>;
  } | null;
  templates: any[];
}

const initialState: SuperAdminState = {
  isLoading: false,
  error: null,
  dashboardData: null,
  templates: [],
};

const superAdminSlice = createSlice({
  name: 'superAdmin',
  initialState,
  reducers: {
    fetchDashboardDataRequest(state, _action: PayloadAction<{ resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchDashboardDataSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.dashboardData = action.payload;
    },
    fetchDashboardDataFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchTemplatesRequest(state, _action: PayloadAction<{ resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchTemplatesSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.templates = action.payload;
    },
    fetchTemplatesFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createTemplateRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createTemplateSuccess(state) {
      state.isLoading = false;
    },
    createTemplateFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const superAdminActions = superAdminSlice.actions;
export default superAdminSlice.reducer;
