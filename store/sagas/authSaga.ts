import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { loginRequest, loginSuccess, loginFailure, authActions } from '../slices/authSlice';
import type { LoginCredentials, User } from '@/types/auth';
import { API_ENDPOINTS } from '@/lib/apiConstants';
import { storeUser, storeToken } from '@/lib/auth';
import { fetchJson } from '@/lib/apiClient';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getDashboardRoute } from '@/lib/rbac';

// Client-side failed login tracking (persists within the same browser session)
const loginAttemptMap = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getClientAttemptInfo(email: string) {
  const info = loginAttemptMap.get(email);
  if (!info) return { count: 0, lockedUntil: 0 };
  if (info.lockedUntil && Date.now() > info.lockedUntil) {
    loginAttemptMap.delete(email);
    return { count: 0, lockedUntil: 0 };
  }
  return info;
}

function recordClientFailedAttempt(email: string) {
  const info = getClientAttemptInfo(email);
  const newCount = info.count + 1;
  const lockedUntil = newCount >= MAX_ATTEMPTS ? Date.now() + LOCK_DURATION_MS : 0;
  loginAttemptMap.set(email, { count: newCount, lockedUntil });
  return { count: newCount, lockedUntil };
}

function resetClientAttempts(email: string) {
  loginAttemptMap.delete(email);
}

function* handleLogin(action: PayloadAction<LoginCredentials>) {
  const email = action.payload.email;

  // Check client-side lockout BEFORE calling Firebase
  const attemptInfo = getClientAttemptInfo(email);
  if (attemptInfo.lockedUntil && Date.now() < attemptInfo.lockedUntil) {
    const minutesLeft = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000);
    yield put(loginFailure(
      `Account temporarily locked. Too many failed attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}, or reset your password.`
    ));
    return;
  }

  try {
    const userCredential = yield call(signInWithEmailAndPassword, auth, action.payload.email, action.payload.password);
    const idToken = yield call([userCredential.user, 'getIdToken']);

    const response: Response = yield call(fetch, API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const data: { user?: User; token?: string; error?: string } = yield call([response, 'json']);

    if (!response.ok || !data.user || !data.token) {
      recordClientFailedAttempt(email);
      yield put(loginFailure(data.error || 'Invalid email or password'));
      return;
    }

    // Successful login — reset the failed counter
    resetClientAttempts(email);
    yield call(storeUser, data.user);
    yield call(storeToken, data.token);
    yield put(loginSuccess(data.user));
    yield put(authActions.appInitRequest({ user: data.user }));
  } catch (error: any) {
    let errorMessage = error.message || 'An error occurred during login';
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      let serverLocked = false;
      let serverLockedUntil = 0;
      let remaining = MAX_ATTEMPTS;

      try {
        const response: Response = yield call(fetch, '/api/auth/login/failed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (response.ok) {
          const resData: { locked: boolean; lockedUntil?: string; attempts: number; remaining?: number } = yield call([response, 'json']);
          if (resData.locked && resData.lockedUntil) {
            serverLocked = true;
            serverLockedUntil = new Date(resData.lockedUntil).getTime();
          }
          if (resData.remaining !== undefined) {
            remaining = resData.remaining;
          }
        }
      } catch (e) {
        console.error('Failed to notify backend of login failure', e);
      }

      if (serverLocked && serverLockedUntil) {
        loginAttemptMap.set(email, { count: MAX_ATTEMPTS, lockedUntil: serverLockedUntil });
        const minutesLeft = Math.ceil((serverLockedUntil - Date.now()) / 60000);
        errorMessage = `Account temporarily locked due to too many failed attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`;
      } else {
        const result = recordClientFailedAttempt(email);
        const activeRemaining = Math.min(remaining, MAX_ATTEMPTS - result.count);
        if (activeRemaining > 0) {
          errorMessage = `Invalid email or password. ${activeRemaining} attempt${activeRemaining > 1 ? 's' : ''} remaining before account is locked.`;
        } else {
          const minutesLeft = Math.ceil(LOCK_DURATION_MS / 60000);
          errorMessage = `Account temporarily locked due to too many failed attempts. Please try again in ${minutesLeft} minutes, or reset your password.`;
        }
      }
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Account temporarily locked. Please try again later or reset your password.';
    }
    yield put(loginFailure(errorMessage));
  }
}

function* handleForgotPassword(action: PayloadAction<any>) {
  try {
    const { email, resolve } = action.payload;
    // Native Firebase Password Reset
    yield call(sendPasswordResetEmail, auth, email);
    yield put(authActions.forgotPasswordSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(authActions.forgotPasswordFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleResetPassword(action: PayloadAction<any>) {
  try {
    const { token, payload, resolve } = action.payload;
    yield call(fetchJson, `/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...payload }),
    });
    yield put(authActions.resetPasswordSuccess());
    if (resolve) resolve();
  } catch (error: any) {
    yield put(authActions.resetPasswordFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleAcceptInvite(action: PayloadAction<any>) {
  try {
    const { token, payload, resolve } = action.payload;
    const { name, password } = payload;

    // 1. Accept the invite and create the account server-side
    yield call(fetchJson, `/api/invites/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, password }),
    });

    // 2. Sign in to Firebase client-side with the credentials they just set
    //    We need to fetch the invite email first from the token payload stored in the saga action
    //    The accept API validated the token, so we know it's good. Sign in directly.
    let email: string | undefined = payload.email;

    // If email wasn't passed in payload, fetch it from the token endpoint
    if (!email) {
      try {
        const tokenData: any = yield call(fetchJson, `/api/invites/token?token=${token}`);
        email = tokenData?.invite?.email;
      } catch {
        // If we can't get the email, fall back to the manual-login flow
        yield put(authActions.acceptInviteSuccess());
        if (resolve) resolve();
        return;
      }
    }

    if (!email) {
      yield put(authActions.acceptInviteSuccess());
      if (resolve) resolve();
      return;
    }

    // 3. Firebase client-side sign-in
    const userCredential: any = yield call(signInWithEmailAndPassword, auth, email, password);
    const idToken: string = yield call([userCredential.user, 'getIdToken']);

    // 4. Exchange Firebase token for a server session
    const response: Response = yield call(fetch, API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const data: { user?: User; token?: string; error?: string } = yield call([response, 'json']);

    if (!response.ok || !data.user || !data.token) {
      // Auth failed - tell user to log in manually
      yield put(authActions.acceptInviteSuccess());
      if (resolve) resolve();
      return;
    }

    // 5. Store session and bootstrap the app
    yield call(storeUser, data.user);
    yield call(storeToken, data.token);
    yield put(loginSuccess(data.user));
    yield put(authActions.appInitRequest({ user: data.user }));

    // 6. Build org-scoped dashboard URL (same logic as login page)
    const dashboardRoute = getDashboardRoute(data.user);
    const activeMembership =
      data.user.memberships?.find((m: any) => m.organizationId === data.user.organizationId) ||
      data.user.memberships?.[0];
    const finalRoute =
      activeMembership?.organizationSlug && !dashboardRoute.startsWith('/super-admin')
        ? `/organization/${activeMembership.organizationSlug}${dashboardRoute}`
        : dashboardRoute;
    if (resolve) resolve(finalRoute);
  } catch (error: any) {
    yield put(authActions.acceptInviteFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleMfaSetup(action: PayloadAction<any>) {
  try {
    const { resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, API_ENDPOINTS.MFA_SETUP, { method: 'POST' });
    yield put(authActions.mfaSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(authActions.mfaFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleMfaVerify(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, API_ENDPOINTS.MFA_VERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(authActions.mfaSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(authActions.mfaFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleMfaDisable(action: PayloadAction<any>) {
  try {
    const { payload, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, API_ENDPOINTS.MFA_DISABLE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    yield put(authActions.mfaSuccess());
    if (resolve) resolve(data);
  } catch (error: any) {
    yield put(authActions.mfaFailure(error.message));
    if (action.payload.reject) action.payload.reject(error.message);
  }
}

function* handleLogoutAll(action: PayloadAction<any>) {
  try {
    const { resolve, reject } = action.payload || {};
    const data: any = yield call(fetchJson, API_ENDPOINTS.LOGOUT_ALL, { method: 'POST' });
    if (resolve) resolve(data);
  } catch (error: any) {
    if (action.payload?.reject) action.payload.reject(error.message);
  }
}

function* handleCheckSession(action: PayloadAction<any>) {
  try {
    const { resolve, reject } = action.payload || {};
    const data: any = yield call(fetchJson, API_ENDPOINTS.CHECK_SESSION);
    if (resolve) resolve(data);
  } catch (error: any) {
    if (action.payload?.reject) action.payload.reject(error.message);
  }
}

function* handleSwitchTenant(action: PayloadAction<any>) {
  try {
    const { targetOrganizationId, resolve, reject } = action.payload;
    const data: any = yield call(fetchJson, API_ENDPOINTS.SWITCH_TENANT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetOrganizationId }),
    });
    if (resolve) resolve(data);
  } catch (error: any) {
    if (action.payload?.reject) action.payload.reject(error.message);
  }
}

export function* watchAuthSagas() {
  yield takeLatest(loginRequest.type, handleLogin);
  yield takeLatest(authActions.forgotPasswordRequest.type, handleForgotPassword);
  yield takeLatest(authActions.resetPasswordRequest.type, handleResetPassword);
  yield takeLatest(authActions.acceptInviteRequest.type, handleAcceptInvite);
  yield takeLatest(authActions.mfaSetupRequest.type, handleMfaSetup);
  yield takeLatest(authActions.mfaVerifyRequest.type, handleMfaVerify);
  yield takeLatest(authActions.mfaDisableRequest.type, handleMfaDisable);
  yield takeLatest(authActions.logoutAllRequest.type, handleLogoutAll);
  yield takeLatest(authActions.checkSessionRequest.type, handleCheckSession);
  yield takeLatest(authActions.switchTenantApiRequest.type, handleSwitchTenant);
}
