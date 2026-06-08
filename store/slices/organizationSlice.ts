import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OrganizationState {
  isLoading: boolean;
  error: string | null;
  invites: any[];
  roles: any[];
  users: any[];
  organizations: any[];
  currentRole: any | null;
  activities: any[];
}

const initialState: OrganizationState = {
  isLoading: false,
  error: null,
  invites: [],
  roles: [],
  users: [],
  organizations: [],
  currentRole: null,
  activities: [],
};

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    // Invites
    loadInvitesRequest(state, _action: PayloadAction<{ organizationId?: string; requesterUserId?: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadInvitesSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.invites = action.payload;
    },
    loadInvitesFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    sendInviteRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    sendInviteSuccess(state) {
      state.isLoading = false;
    },
    sendInviteFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    revokeInviteRequest(state, _action: PayloadAction<{ inviteId: string; actorUserId?: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    revokeInviteSuccess(state) {
      state.isLoading = false;
    },
    revokeInviteFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateInviteRequest(state, _action: PayloadAction<{ inviteId: string; payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateInviteSuccess(state) {
      state.isLoading = false;
    },
    updateInviteFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    loadInviteByTokenRequest(state, _action: PayloadAction<{ token: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadInviteByTokenSuccess(state) {
      state.isLoading = false;
    },
    loadInviteByTokenFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    declineInviteRequest(state, _action: PayloadAction<{ inviteId: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    declineInviteSuccess(state) {
      state.isLoading = false;
    },
    declineInviteFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Roles
    loadRolesRequest(state, _action: PayloadAction<{ organizationId?: string; page?: number; limit?: number; search?: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadRolesSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.roles = action.payload;
    },
    loadRolesFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    loadRoleByIdRequest(state, _action: PayloadAction<{ roleId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadRoleByIdSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.currentRole = action.payload;
    },
    loadRoleByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createRoleRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createRoleSuccess(state) {
      state.isLoading = false;
    },
    createRoleFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateRoleRequest(state, _action: PayloadAction<{ roleId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateRoleSuccess(state) {
      state.isLoading = false;
    },
    updateRoleFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteRoleRequest(state, _action: PayloadAction<{ roleId: string; actorUserId?: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteRoleSuccess(state) {
      state.isLoading = false;
    },
    deleteRoleFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Users
    loadUsersRequest(state, _action: PayloadAction<{ organizationId?: string; requesterUserId?: string; roleId?: string; search?: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadUsersSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.users = action.payload;
    },
    loadUsersFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    
    // Generic organization loader
    loadOrganizationsRequest(state, _action: PayloadAction<{ resolve?: (orgs: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadOrganizationsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.organizations = action.payload;
    },
    loadOrganizationsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    loadOrganizationByIdRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadOrganizationByIdSuccess(state) {
      state.isLoading = false;
    },
    loadOrganizationByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createOrganizationRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createOrganizationSuccess(state) {
      state.isLoading = false;
    },
    createOrganizationFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateOrganizationRequest(state, _action: PayloadAction<{ organizationId: string; payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateOrganizationSuccess(state) {
      state.isLoading = false;
    },
    updateOrganizationFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteOrganizationRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteOrganizationSuccess(state) {
      state.isLoading = false;
    },
    deleteOrganizationFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteUserRequest(state, _action: PayloadAction<{ userId: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteUserSuccess(state) {
      state.isLoading = false;
    },
    deleteUserFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateUserRequest(state, _action: PayloadAction<{ userId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateUserSuccess(state) {
      state.isLoading = false;
    },
    updateUserFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Activities
    loadActivitiesRequest(state, _action: PayloadAction<{ organizationId?: string; limit?: number; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    loadActivitiesSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.activities = action.payload;
    },
    loadActivitiesFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Stages
    fetchStagesRequest(state, _action: PayloadAction<{ organizationId?: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    fetchStagesSuccess(state) {
      state.isLoading = false;
    },
    fetchStagesFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    createStageRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createStageSuccess(state) {
      state.isLoading = false;
    },
    createStageFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateStageRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateStageSuccess(state) {
      state.isLoading = false;
    },
    updateStageFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    deleteStageRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteStageSuccess(state) {
      state.isLoading = false;
    },
    deleteStageFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Email Templates
    fetchEmailTemplatesRequest(state, _action: PayloadAction<{ organizationId?: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    fetchEmailTemplatesSuccess(state) {
      state.isLoading = false;
    },
    fetchEmailTemplatesFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    createEmailTemplateRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createEmailTemplateSuccess(state) {
      state.isLoading = false;
    },
    createEmailTemplateFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateEmailTemplateRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateEmailTemplateSuccess(state) {
      state.isLoading = false;
    },
    updateEmailTemplateFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Upload
    uploadFileRequest(state, _action: PayloadAction<{ payload: FormData; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    uploadFileSuccess(state) {
      state.isLoading = false;
    },
    uploadFileFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const organizationActions = organizationSlice.actions;
export default organizationSlice.reducer;
