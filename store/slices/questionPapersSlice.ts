import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface QuestionPapersState {
  isLoading: boolean;
  error: string | null;
  generatedPaperId: string | null;
  
  departments: any[];
  suggestedSkills: string[];
  searchedSkills: any[];

  uploadUrl: string | null;
  isUploading: boolean;

  codeExecutionResult: any | null;
  isExecutingCode: boolean;

  currentAttempt: any | null;
  evaluationResult: any | null;
}

const initialState: QuestionPapersState = {
  isLoading: false,
  error: null,
  generatedPaperId: null,
  departments: [],
  suggestedSkills: [],
  searchedSkills: [],
  uploadUrl: null,
  isUploading: false,
  codeExecutionResult: null,
  isExecutingCode: false,
  currentAttempt: null,
  evaluationResult: null,
};

const questionPapersSlice = createSlice({
  name: 'questionPapers',
  initialState,
  reducers: {
    // Fetch Papers
    fetchPapersRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchPapersSuccess(state) {
      state.isLoading = false;
    },
    fetchPapersFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Generate Paper
    generatePaperRequest(state, _action: PayloadAction<any>) {
      state.isLoading = true;
      state.error = null;
      state.generatedPaperId = null;
    },
    generatePaperSuccess(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.generatedPaperId = action.payload;
    },
    generatePaperFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Save/Update Paper
    savePaperRequest(state, _action: PayloadAction<{ payload: any; isEdit: boolean; paperId?: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    savePaperSuccess(state) {
      state.isLoading = false;
    },
    savePaperFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Toggle Public
    togglePublicRequest(state, _action: PayloadAction<{ paperId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    togglePublicSuccess(state) {
      state.isLoading = false;
    },
    togglePublicFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Delete/Deactivate Paper
    deleteQuestionPaperRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteQuestionPaperSuccess(state) {
      state.isLoading = false;
    },
    deleteQuestionPaperFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Get Departments
    getDepartmentsRequest(state, _action: PayloadAction<string>) {
      state.isLoading = true;
    },
    getDepartmentsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.departments = action.payload;
    },

    // Suggest Skills
    suggestSkillsRequest(state, _action: PayloadAction<any>) {
      state.isLoading = true;
    },
    suggestSkillsSuccess(state, action: PayloadAction<string[]>) {
      state.isLoading = false;
      state.suggestedSkills = action.payload;
    },

    // Search Skills
    searchSkillsRequest(state, _action: PayloadAction<{ organizationId: string; q: string }>) {
      state.isLoading = true;
    },
    searchSkillsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.searchedSkills = action.payload;
    },

    // Image Upload
    uploadImageRequest(state, _action: PayloadAction<{ file: File; resolve?: (url: string) => void; reject?: (err: string) => void }>) {
      state.isUploading = true;
      state.uploadUrl = null;
    },
    uploadImageSuccess(state, action: PayloadAction<string>) {
      state.isUploading = false;
      state.uploadUrl = action.payload;
    },
    uploadImageFailure(state, action: PayloadAction<string>) {
      state.isUploading = false;
      state.error = action.payload;
    },

    // Attempts
    createAttemptRequest(state, _action: PayloadAction<{ paperId: string; payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createAttemptSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.currentAttempt = action.payload;
    },
    createAttemptFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    startAttemptRequest(state, _action: PayloadAction<{ paperId: string; attemptId: string; payload?: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    startAttemptSuccess(state) {
      state.isLoading = false;
    },
    startAttemptFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    submitAttemptRequest(state, _action: PayloadAction<{ paperId: string; attemptId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    submitAttemptSuccess(state) {
      state.isLoading = false;
    },
    submitAttemptFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Violations
    reportViolationRequest(state, _action: PayloadAction<{ paperId: string; attemptId: string; payload: any }>) {
      // Background request, don't trigger loading spinners
    },

    // Verify Face (AI Proctoring)
    verifyFaceRequest(state, _action: PayloadAction<{ paperId: string; attemptId: string; image: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    verifyFaceSuccess(state) {
      state.isLoading = false;
    },
    verifyFaceFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Evaluate
    evaluateAttemptRequest(state, _action: PayloadAction<{ paperId: string; attemptId: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.evaluationResult = null;
    },
    evaluateAttemptSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.evaluationResult = action.payload;
    },
    evaluateAttemptFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Invite
    inviteCandidateRequest(state, _action: PayloadAction<{ paperId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    inviteCandidateSuccess(state) {
      state.isLoading = false;
    },
    inviteCandidateFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Execute Code
    executeCodeRequest(state, _action: PayloadAction<{ code: string; language: string; testCases?: any[]; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isExecutingCode = true;
      state.codeExecutionResult = null;
    },
    executeCodeSuccess(state, action: PayloadAction<any>) {
      state.isExecutingCode = false;
      state.codeExecutionResult = action.payload;
    },
    executeCodeFailure(state, action: PayloadAction<string>) {
      state.isExecutingCode = false;
      state.error = action.payload;
    },
    
    // File download
    downloadFileRequest(state, _action: PayloadAction<string>) {
      state.isLoading = true;
    },
    downloadFileSuccess(state) {
      state.isLoading = false;
    },
    downloadFileFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Fetch Text Data
    fetchTextRequest(state, _action: PayloadAction<{ url: string; resolve?: (data: string) => void; reject?: (err: string) => void }>) {
      // Background request, no global loading state to prevent UI flicker
    },

    cloneTemplateRequest(state, _action: PayloadAction<{ templateId: string; payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    cloneTemplateSuccess(state) {
      state.isLoading = false;
    },
    cloneTemplateFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    uploadExcelRequest(state, _action: PayloadAction<{ payload: FormData; resolve?: (data: any) => void; reject?: (err: any) => void }>) {
      state.isUploading = true;
    },
    uploadExcelSuccess(state) {
      state.isUploading = false;
    },
    uploadExcelFailure(state, action: PayloadAction<string>) {
      state.isUploading = false;
      state.error = action.payload;
    },

    resetQuestionPapersState(state) {
      state.isLoading = false;
      state.error = null;
      state.generatedPaperId = null;
      state.uploadUrl = null;
      state.codeExecutionResult = null;
    },

    // Check attempt status (background, no loading spinner)
    checkAttemptStatusRequest(_state, _action: PayloadAction<{ paperId: string; attemptId: string; cache?: string; resolve?: (data: any) => void; reject?: () => void }>) {
      // Background poll — no global loading state
    },

    // Autosave attempt (background, fire-and-forget)
    autosaveAttemptRequest(_state, _action: PayloadAction<{ paperId: string; attemptId: string; payload: any }>) {
      // Fire-and-forget; no global loading state
    },
  },

});

export const questionPapersActions = questionPapersSlice.actions;
export default questionPapersSlice.reducer;
