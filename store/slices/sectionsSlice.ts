import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SectionsState {
  isLoading: boolean;
  error: string | null;
  sections: any[];
}

const initialState: SectionsState = {
  isLoading: false,
  error: null,
  sections: [],
};

const sectionsSlice = createSlice({
  name: 'sections',
  initialState,
  reducers: {
    fetchSectionsRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchSectionsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.sections = action.payload;
    },
    fetchSectionsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createSectionRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createSectionSuccess(state) {
      state.isLoading = false;
    },
    createSectionFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateSectionRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateSectionSuccess(state) {
      state.isLoading = false;
    },
    updateSectionFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteSectionRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteSectionSuccess(state) {
      state.isLoading = false;
    },
    deleteSectionFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const sectionsActions = sectionsSlice.actions;
export default sectionsSlice.reducer;
