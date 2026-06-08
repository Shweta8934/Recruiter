import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UsersState {
  isLoading: boolean;
  error: string | null;
  users: any[];
  currentUser: any | null;
  auditLogs: any[];
}

const initialState: UsersState = {
  isLoading: false,
  error: null,
  users: [],
  currentUser: null,
  auditLogs: [],
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    fetchUsersRequest(state, _action: PayloadAction<{ organizationId?: string; params?: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchUsersSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.users = action.payload;
    },
    fetchUsersFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchUserByIdRequest(state, _action: PayloadAction<{ id: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchUserByIdSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.currentUser = action.payload;
    },
    fetchUserByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchUserAuditRequest(state, _action: PayloadAction<{ userId: string; limit?: number; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = false;
    },
    fetchUserAuditSuccess(state, action: PayloadAction<any[]>) {
      state.auditLogs = action.payload;
    },
    fetchUserAuditFailure(state, _action: PayloadAction<string>) {},

    updateUserRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: (data?: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateUserSuccess(state) {
      state.isLoading = false;
    },
    updateUserFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateUserPasswordRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateUserPasswordSuccess(state) {
      state.isLoading = false;
    },
    updateUserPasswordFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteUserRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteUserSuccess(state) {
      state.isLoading = false;
    },
    deleteUserFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const usersActions = usersSlice.actions;
export default usersSlice.reducer;
