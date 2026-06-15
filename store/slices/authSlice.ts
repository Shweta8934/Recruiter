import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, LoginCredentials } from '@/types/auth';

interface AuthState {
  user: User | null;
  activeTenantId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  activeTenantId: null,
  isLoading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest(state, _action: PayloadAction<LoginCredentials>) {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<User>) {
      state.user = action.payload;
      // Default the active tenant to the user's primary organization
      state.activeTenantId = action.payload.organizationId || null;
      state.isLoading = false;
      state.error = null;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.activeTenantId = null;
    },
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      if (action.payload && !state.activeTenantId) {
        state.activeTenantId = action.payload.organizationId || null;
      }
      state.isLoading = false;
    },
    switchTenant(state, action: PayloadAction<string>) {
      state.activeTenantId = action.payload;
    },
    // Switches the active user context to a different tenant membership
    // Updates organizationId, roleSlug, etc. so permissions update immediately
    switchTenantUser(state, action: PayloadAction<{ organizationId: string; organizationSlug: string; roleSlug: string; roleId: string }>) {
      if (!state.user) return;
      const { organizationId, organizationSlug, roleSlug, roleId } = action.payload;
      state.activeTenantId = organizationId;
      state.user = {
        ...state.user,
        organizationId,
        organizationSlug,
        roleSlug,
        roleId,
      };
    },
    forgotPasswordRequest(state, _action: PayloadAction<{ email: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    forgotPasswordSuccess(state) {
      state.isLoading = false;
    },
    forgotPasswordFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    resetPasswordRequest(state, _action: PayloadAction<{ token: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    resetPasswordSuccess(state) {
      state.isLoading = false;
    },
    resetPasswordFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    acceptInviteRequest(state, _action: PayloadAction<{ token: string; payload: any; resolve?: (dashboardRoute?: string) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    acceptInviteSuccess(state) {
      state.isLoading = false;
    },
    acceptInviteFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    appInitRequest(state, _action: PayloadAction<{ user: User, resolve?: () => void }>) {
      // Background initialization
    },
    mfaSetupRequest(state, _action: PayloadAction<{ resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    mfaVerifyRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    mfaDisableRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    mfaSuccess(state) {
      state.isLoading = false;
    },
    mfaFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    logoutAllRequest(state, _action: PayloadAction<{ resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    checkSessionRequest(state, _action: PayloadAction<{ resolve?: () => void; reject?: (err: string) => void }>) {
      // background request
    },
    switchTenantApiRequest(state, _action: PayloadAction<{ targetOrganizationId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
  },
});

export const authActions = authSlice.actions;
export const { loginRequest, loginSuccess, loginFailure, logout, setUser, switchTenant, appInitRequest } = authSlice.actions;
export default authSlice.reducer;
