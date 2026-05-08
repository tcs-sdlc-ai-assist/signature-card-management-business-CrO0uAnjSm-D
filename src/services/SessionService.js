import { STORAGE_KEYS, SESSION_CONFIG } from '@/utils/constants';
import {
  getFromLocalStorage,
  setToLocalStorage,
  removeFromLocalStorage,
  generateId,
} from '@/utils/helpers';

/**
 * @typedef {Object} Session
 * @property {string} sessionId - Unique session identifier
 * @property {string} userId - The authenticated user's ID
 * @property {string} username - The authenticated user's username
 * @property {string} expiresAt - ISO 8601 expiration timestamp
 * @property {string} lastActivity - ISO 8601 timestamp of last user activity
 * @property {string} currentStep - Current workflow step
 * @property {boolean} isVerified - Whether identity verification (OTP) is complete
 * @property {boolean} isTokenValidated - Whether eSign token validation is complete
 */

/**
 * Creates a new session object for the given user.
 * @param {string} userId - The user's ID
 * @param {string} username - The user's username
 * @returns {Session} A new session object
 */
export function createSession(userId, username) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_CONFIG.TIMEOUT_MINUTES * 60 * 1000);

  const session = {
    sessionId: generateId(),
    userId,
    username,
    expiresAt: expiresAt.toISOString(),
    lastActivity: now.toISOString(),
    currentStep: 'verify',
    isVerified: false,
    isTokenValidated: false,
  };

  setToLocalStorage(STORAGE_KEYS.SESSION_TOKEN, session.sessionId);
  setToLocalStorage(STORAGE_KEYS.SESSION_EXPIRY, session.expiresAt);
  setToLocalStorage(STORAGE_KEYS.LAST_ACTIVITY, session.lastActivity);
  setToLocalStorage(STORAGE_KEYS.CURRENT_STEP, session.currentStep);
  setToLocalStorage(STORAGE_KEYS.USER_DATA, {
    userId: session.userId,
    username: session.username,
    isVerified: session.isVerified,
    isTokenValidated: session.isTokenValidated,
  });

  return session;
}

/**
 * Retrieves the current session from localStorage.
 * Returns null if no session exists or if the session data is incomplete.
 * @returns {Session|null} The current session or null
 */
export function getSession() {
  const sessionId = getFromLocalStorage(STORAGE_KEYS.SESSION_TOKEN);
  const expiresAt = getFromLocalStorage(STORAGE_KEYS.SESSION_EXPIRY);
  const lastActivity = getFromLocalStorage(STORAGE_KEYS.LAST_ACTIVITY);
  const currentStep = getFromLocalStorage(STORAGE_KEYS.CURRENT_STEP);
  const userData = getFromLocalStorage(STORAGE_KEYS.USER_DATA);

  if (!sessionId || !expiresAt || !userData) {
    return null;
  }

  return {
    sessionId,
    userId: userData.userId || '',
    username: userData.username || '',
    expiresAt,
    lastActivity: lastActivity || new Date().toISOString(),
    currentStep: currentStep || 'welcome',
    isVerified: userData.isVerified || false,
    isTokenValidated: userData.isTokenValidated || false,
  };
}

/**
 * Persists the provided session object to localStorage.
 * @param {Session} session - The session object to persist
 * @returns {boolean} True if the session was successfully saved
 */
export function setSession(session) {
  if (!session || !session.sessionId) {
    return false;
  }

  setToLocalStorage(STORAGE_KEYS.SESSION_TOKEN, session.sessionId);
  setToLocalStorage(STORAGE_KEYS.SESSION_EXPIRY, session.expiresAt);
  setToLocalStorage(STORAGE_KEYS.LAST_ACTIVITY, session.lastActivity);
  setToLocalStorage(STORAGE_KEYS.CURRENT_STEP, session.currentStep);
  setToLocalStorage(STORAGE_KEYS.USER_DATA, {
    userId: session.userId,
    username: session.username,
    isVerified: session.isVerified,
    isTokenValidated: session.isTokenValidated,
  });

  return true;
}

/**
 * Clears all session-related data from localStorage.
 * Used on logout or session expiry.
 */
export function clearSession() {
  removeFromLocalStorage(STORAGE_KEYS.SESSION_TOKEN);
  removeFromLocalStorage(STORAGE_KEYS.SESSION_EXPIRY);
  removeFromLocalStorage(STORAGE_KEYS.LAST_ACTIVITY);
  removeFromLocalStorage(STORAGE_KEYS.CURRENT_STEP);
  removeFromLocalStorage(STORAGE_KEYS.USER_DATA);
  removeFromLocalStorage(STORAGE_KEYS.SELECTED_ACCOUNT);
  removeFromLocalStorage(STORAGE_KEYS.SIGNERS);
  removeFromLocalStorage(STORAGE_KEYS.AUTH_TOKEN);
  removeFromLocalStorage(STORAGE_KEYS.TOKEN_EXPIRY);
  removeFromLocalStorage(STORAGE_KEYS.OTP_ATTEMPTS);
  removeFromLocalStorage(STORAGE_KEYS.OTP_RESENDS);
}

/**
 * Checks whether the current session has expired based on the expiresAt timestamp.
 * @returns {boolean} True if the session is expired or does not exist
 */
export function isSessionExpired() {
  const session = getSession();

  if (!session) {
    return true;
  }

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (isNaN(expiresAt.getTime())) {
    return true;
  }

  return now >= expiresAt;
}

/**
 * Updates the lastActivity timestamp and extends the session expiration.
 * Should be called on meaningful user interactions to keep the session alive.
 * @returns {boolean} True if the activity was updated, false if no session exists or session is expired
 */
export function updateLastActivity() {
  const session = getSession();

  if (!session) {
    return false;
  }

  if (isSessionExpired()) {
    return false;
  }

  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + SESSION_CONFIG.TIMEOUT_MINUTES * 60 * 1000);

  session.lastActivity = now.toISOString();
  session.expiresAt = newExpiresAt.toISOString();

  return setSession(session);
}

/**
 * Returns the number of seconds remaining before the session expires.
 * Returns 0 if the session is expired or does not exist.
 * @returns {number} Seconds remaining in the session
 */
export function getSessionTimeRemaining() {
  const session = getSession();

  if (!session) {
    return 0;
  }

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (isNaN(expiresAt.getTime())) {
    return 0;
  }

  const remainingMs = expiresAt.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.floor(remainingMs / 1000);
}

/**
 * Checks whether the session timeout warning threshold has been reached.
 * Returns true if the session is within the warning window (e.g., last 2 minutes).
 * @returns {boolean} True if the session is in the warning period
 */
export function isSessionWarning() {
  const session = getSession();

  if (!session) {
    return false;
  }

  const remainingSeconds = getSessionTimeRemaining();

  if (remainingSeconds <= 0) {
    return false;
  }

  const warningThresholdSeconds = (SESSION_CONFIG.TIMEOUT_MINUTES - SESSION_CONFIG.WARNING_MINUTES) * 60;

  return remainingSeconds <= warningThresholdSeconds;
}

/**
 * Updates the current workflow step in the session.
 * @param {string} step - The new workflow step
 * @returns {boolean} True if the step was updated successfully
 */
export function updateCurrentStep(step) {
  const session = getSession();

  if (!session) {
    return false;
  }

  session.currentStep = step;
  setToLocalStorage(STORAGE_KEYS.CURRENT_STEP, step);

  return true;
}

/**
 * Marks the session as identity-verified (OTP complete).
 * @returns {boolean} True if the session was updated successfully
 */
export function setVerified() {
  const session = getSession();

  if (!session) {
    return false;
  }

  session.isVerified = true;

  return setSession(session);
}

/**
 * Marks the session as token-validated (eSign token validated).
 * @returns {boolean} True if the session was updated successfully
 */
export function setTokenValidated() {
  const session = getSession();

  if (!session) {
    return false;
  }

  session.isTokenValidated = true;

  return setSession(session);
}

const SessionService = {
  createSession,
  getSession,
  setSession,
  clearSession,
  isSessionExpired,
  updateLastActivity,
  getSessionTimeRemaining,
  isSessionWarning,
  updateCurrentStep,
  setVerified,
  setTokenValidated,
};

export default SessionService;