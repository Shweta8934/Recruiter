import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import projectsReducer from './slices/projectsSlice';
import questionPapersReducer from './slices/questionPapersSlice';
import subscriptionReducer from './slices/subscriptionSlice';
import organizationReducer from './slices/organizationSlice';
import skillsReducer from './slices/skillsSlice';
import jobsReducer from './slices/jobsSlice';
import roundsReducer from './slices/roundsSlice';
import evaluationsReducer from './slices/evaluationsSlice';
import departmentsReducer from './slices/departmentsSlice';
import sectionsReducer from './slices/sectionsSlice';
import interviewBookingReducer from './slices/interviewBookingSlice';
import usersReducer from './slices/usersSlice';
import paymentsReducer from './slices/paymentsSlice';
import superAdminReducer from './slices/superAdminSlice';
import questionLibraryReducer from './slices/questionLibrarySlice';
import analyticsReducer from './slices/analyticsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  projects: projectsReducer,
  questionPapers: questionPapersReducer,
  subscription: subscriptionReducer,
  organization: organizationReducer,
  skills: skillsReducer,
  jobs: jobsReducer,
  rounds: roundsReducer,
  evaluations: evaluationsReducer,
  departments: departmentsReducer,
  sections: sectionsReducer,
  interviewBooking: interviewBookingReducer,
  users: usersReducer,
  payments: paymentsReducer,
  superAdmin: superAdminReducer,
  questionLibrary: questionLibraryReducer,
  analytics: analyticsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
