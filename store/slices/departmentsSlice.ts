import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DepartmentsState {
  isLoading: boolean;
  error: string | null;
  departments: any[];
  currentDepartment: any | null;
}

const initialState: DepartmentsState = {
  isLoading: false,
  error: null,
  departments: [],
  currentDepartment: null,
};

const departmentsSlice = createSlice({
  name: 'departments',
  initialState,
  reducers: {
    fetchDepartmentsRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchDepartmentsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.departments = action.payload;
    },
    fetchDepartmentsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchDepartmentByIdRequest(state, _action: PayloadAction<{ id: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchDepartmentByIdSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.currentDepartment = action.payload;
    },
    fetchDepartmentByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createDepartmentRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createDepartmentSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      if (action.payload) {
        state.departments.unshift(action.payload);
      }
    },
    createDepartmentFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateDepartmentRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateDepartmentSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      if (action.payload) {
        const idx = state.departments.findIndex((item: any) => item.id === action.payload.id);
        if (idx !== -1) {
          state.departments[idx] = action.payload;
        }
      }
    },
    updateDepartmentFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteDepartmentRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteDepartmentSuccess(state, action: PayloadAction<string>) {
      state.isLoading = false;
      if (action.payload) {
        state.departments = state.departments.filter((item: any) => item.id !== action.payload);
      }
    },
    deleteDepartmentFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const departmentsActions = departmentsSlice.actions;
export default departmentsSlice.reducer;
