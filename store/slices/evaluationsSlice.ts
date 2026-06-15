import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EvaluationsState {
  isLoading: boolean;
  error: string | null;
  templates: any[];
  currentTemplate: any | null;
}

const initialState: EvaluationsState = {
  isLoading: false,
  error: null,
  templates: [],
  currentTemplate: null,
};

const evaluationsSlice = createSlice({
  name: 'evaluations',
  initialState,
  reducers: {
    fetchEvaluationsRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchEvaluationsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.templates = action.payload;
    },
    fetchEvaluationsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchEvaluationByIdRequest(state, _action: PayloadAction<{ id: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchEvaluationByIdSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.currentTemplate = action.payload;
    },
    fetchEvaluationByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createEvaluationRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createEvaluationSuccess(state) {
      state.isLoading = false;
    },
    createEvaluationFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateEvaluationRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateEvaluationSuccess(state) {
      state.isLoading = false;
    },
    updateEvaluationFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteEvaluationRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteEvaluationSuccess(state) {
      state.isLoading = false;
    },
    deleteEvaluationFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const evaluationsActions = evaluationsSlice.actions;
export default evaluationsSlice.reducer;
