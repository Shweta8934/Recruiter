import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface LibraryQuestion {
  id: string
  text: string
  questionType: 'MCQ' | 'SA' | 'CODE' | string
  skills: string[]
  difficulty: number
  language?: string | null
  testCases?: any
  options?: string[] | null
  answer: string
  createdAt: string
}

interface QuestionLibraryState {
  items: LibraryQuestion[]
  current: LibraryQuestion | null
  generated: any[]
  isLoading: boolean
  error: string | null
}

const initialState: QuestionLibraryState = {
  items: [],
  current: null,
  generated: [],
  isLoading: false,
  error: null,
}

const slice = createSlice({
  name: 'questionLibrary',
  initialState,
  reducers: {
    fetchLibraryRequest(state, _action: PayloadAction<any>) { state.isLoading = true; state.error = null },
    fetchLibrarySuccess(state, action: PayloadAction<LibraryQuestion[]>) { state.items = action.payload; state.isLoading = false },
    fetchLibraryFailure(state, action: PayloadAction<string>) { state.isLoading = false; state.error = action.payload },

    fetchQuestionRequest(state, _action: PayloadAction<any>) { state.isLoading = true; state.error = null },
    fetchQuestionSuccess(state, action: PayloadAction<LibraryQuestion>) { state.current = action.payload; state.isLoading = false },
    fetchQuestionFailure(state, action: PayloadAction<string>) { state.isLoading = false; state.error = action.payload },

    saveQuestionRequest(state, _action: PayloadAction<any>) { state.isLoading = true; state.error = null },
    saveQuestionSuccess(state) { state.isLoading = false },
    saveQuestionFailure(state, action: PayloadAction<string>) { state.isLoading = false; state.error = action.payload },

    deleteQuestionRequest(state, _action: PayloadAction<any>) { state.isLoading = true; state.error = null },
    deleteQuestionSuccess(state) { state.isLoading = false },
    deleteQuestionFailure(state, action: PayloadAction<string>) { state.isLoading = false; state.error = action.payload },

    generateQuestionsRequest(state, _action: PayloadAction<any>) { state.isLoading = true; state.error = null; state.generated = [] },
    generateQuestionsSuccess(state, action: PayloadAction<any[]>) { state.generated = action.payload; state.isLoading = false },
    generateQuestionsFailure(state, action: PayloadAction<string>) { state.isLoading = false; state.error = action.payload },

    updateReviewStatusRequest(state, _action: PayloadAction<any>) { state.isLoading = true; state.error = null },
    updateReviewStatusSuccess(state) { state.isLoading = false },
    updateReviewStatusFailure(state, action: PayloadAction<string>) { state.isLoading = false; state.error = action.payload },
  },
})

export const questionLibraryActions = slice.actions
export default slice.reducer
