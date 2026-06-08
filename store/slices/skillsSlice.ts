import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Skill = {
  id: string;
  name: string;
  prettyName: string;
  isActive: boolean;
  organizationId?: string;
};

interface SkillsState {
  skills: Skill[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SkillsState = {
  skills: [],
  isLoading: false,
  error: null,
};

const skillsSlice = createSlice({
  name: 'skills',
  initialState,
  reducers: {
    fetchSkillsRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: Skill[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchSkillsSuccess(state, action: PayloadAction<Skill[]>) {
      state.skills = action.payload;
      state.isLoading = false;
    },
    fetchSkillsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createSkillRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createSkillSuccess(state) {
      state.isLoading = false;
    },
    createSkillFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateSkillRequest(state, _action: PayloadAction<{ skillId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateSkillSuccess(state) {
      state.isLoading = false;
    },
    updateSkillFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchSkillByIdRequest(state, _action: PayloadAction<{ skillId: string; resolve?: (data: Skill) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    fetchSkillByIdSuccess(state) {
      state.isLoading = false;
    },
    fetchSkillByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteSkillRequest(state, _action: PayloadAction<{ skillId: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteSkillSuccess(state, action: PayloadAction<string>) {
      state.skills = state.skills.filter(s => s.id !== action.payload);
      state.isLoading = false;
    },
    deleteSkillFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const skillsActions = skillsSlice.actions;
export default skillsSlice.reducer;
