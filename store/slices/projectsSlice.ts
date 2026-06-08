import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  members?: Array<{ userId: string }>;
};

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  projects: [],
  isLoading: false,
  error: null,
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    fetchProjectsRequest(state, _action: PayloadAction<{ organizationId: string; requesterUserId?: string; resolve?: (data: Project[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchProjectsSuccess(state, action: PayloadAction<Project[]>) {
      state.projects = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchProjectsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    createProjectRequest(state, _action: PayloadAction<{ organizationId: string; name: string; description: string; createdBy?: string }>) {
      state.isLoading = true;
      state.error = null;
    },
    createProjectSuccess(state, action: PayloadAction<Project>) {
      // Optimistically append, though typically saga refetches
      state.projects.push(action.payload);
      state.isLoading = false;
      state.error = null;
    },
    createProjectFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    deleteProjectRequest(state, _action: PayloadAction<string>) { // payload is projectId
      state.isLoading = true;
    },
    deleteProjectSuccess(state, action: PayloadAction<string>) {
      state.projects = state.projects.filter(p => p.id !== action.payload);
      state.isLoading = false;
    },
    deleteProjectFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchProjectByIdRequest(state, _action: PayloadAction<{ projectId: string; resolve?: (data: Project) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchProjectByIdSuccess(state) {
      state.isLoading = false;
      state.error = null;
    },
    fetchProjectByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateProjectRequest(state, _action: PayloadAction<{ projectId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateProjectSuccess(state, action: PayloadAction<Project>) {
      state.projects = state.projects.map(p => p.id === action.payload.id ? action.payload : p);
      state.isLoading = false;
      state.error = null;
    },
    updateProjectFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    addProjectMemberRequest(state, _action: PayloadAction<{ projectId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    addProjectMemberSuccess(state) {
      state.isLoading = false;
    },
    addProjectMemberFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    removeProjectMemberRequest(state, _action: PayloadAction<{ projectId: string; userId: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    removeProjectMemberSuccess(state) {
      state.isLoading = false;
    },
    removeProjectMemberFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    }
  },
});

export const { 
  fetchProjectsRequest, fetchProjectsSuccess, fetchProjectsFailure,
  createProjectRequest, createProjectSuccess, createProjectFailure,
  deleteProjectRequest, deleteProjectSuccess, deleteProjectFailure,
  fetchProjectByIdRequest, fetchProjectByIdSuccess, fetchProjectByIdFailure,
  updateProjectRequest, updateProjectSuccess, updateProjectFailure,
  addProjectMemberRequest, addProjectMemberSuccess, addProjectMemberFailure,
  removeProjectMemberRequest, removeProjectMemberSuccess, removeProjectMemberFailure
} = projectsSlice.actions;

export default projectsSlice.reducer;
