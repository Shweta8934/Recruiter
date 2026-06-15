import { all, fork } from 'redux-saga/effects';

import { watchAuthSagas } from './sagas/authSaga';
import { watchBootstrapSagas } from './sagas/bootstrapSaga';
import { watchProjectsSagas } from './sagas/projectsSaga';
import { watchQuestionPapersSagas } from './sagas/questionPapersSaga';
import { watchSubscriptionSagas } from './sagas/subscriptionSaga';
import { watchOrganizationSagas } from './sagas/organizationSaga';
import { watchSkillsSagas } from './sagas/skillsSaga';
import { watchJobsSagas } from './sagas/jobsSaga';
import { watchRoundsSagas } from './sagas/roundsSaga';
import { watchEvaluationsSagas } from './sagas/evaluationsSaga';
import { watchDepartmentsSagas } from './sagas/departmentsSaga';
import { watchSectionsSagas } from './sagas/sectionsSaga';
import { watchInterviewBookingSagas } from './sagas/interviewBookingSaga';
import { watchUsersSagas } from './sagas/usersSaga';
import { watchPaymentsSagas } from './sagas/paymentsSaga';
import { watchSuperAdminSagas } from './sagas/superAdminSaga';
import { watchQuestionLibrarySagas } from './sagas/questionLibrarySaga';
import { watchAnalyticsSagas } from './sagas/analyticsSaga';

export default function* rootSaga() {
  yield all([
    fork(watchAuthSagas),
    fork(watchBootstrapSagas),
    fork(watchProjectsSagas),
    fork(watchQuestionPapersSagas),
    fork(watchSubscriptionSagas),
    fork(watchOrganizationSagas),
    fork(watchSkillsSagas),
    fork(watchJobsSagas),
    fork(watchRoundsSagas),
    fork(watchEvaluationsSagas),
    fork(watchDepartmentsSagas),
    fork(watchSectionsSagas),
    fork(watchInterviewBookingSagas),
    fork(watchUsersSagas),
    fork(watchPaymentsSagas),
    fork(watchSuperAdminSagas),
    fork(watchQuestionLibrarySagas),
    fork(watchAnalyticsSagas),
  ]);
}
