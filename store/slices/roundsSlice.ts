import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RoundsState {
  isLoading: boolean;
  error: string | null;
  rounds: any[];
  currentRound: any | null;
}

const initialState: RoundsState = {
  isLoading: false,
  error: null,
  rounds: [],
  currentRound: null,
};

const roundsSlice = createSlice({
  name: 'rounds',
  initialState,
  reducers: {
    fetchRoundsRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchRoundsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.rounds = action.payload;
    },
    fetchRoundsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchRoundByIdRequest(state, _action: PayloadAction<{ id: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchRoundByIdSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.currentRound = action.payload;
    },
    fetchRoundByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createRoundRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createRoundSuccess(state) {
      state.isLoading = false;
    },
    createRoundFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateRoundRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateRoundSuccess(state) {
      state.isLoading = false;
    },
    updateRoundFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteRoundRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteRoundSuccess(state) {
      state.isLoading = false;
    },
    deleteRoundFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const roundsActions = roundsSlice.actions;
export default roundsSlice.reducer;
