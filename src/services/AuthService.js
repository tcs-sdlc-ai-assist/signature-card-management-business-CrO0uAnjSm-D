import users from '@/data/users.json';
import { STORAGE_KEYS, RATE_LIMIT_CONFIG } from '@/utils/constants';
import { getFromLocalStorage, setToLocalStorage } from '@/utils/helpers';
import { createSession, clearSession, getSession } from '@/services/SessionService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';

/**
 * @typedef {Object} LoginResult
 * @property {boolean} success - Whether the login was successful
 * @property {Object} [session] - The created session object (on success)
 * @property {string} [error] - Error message (on failure)
 * @property {number} [attemptsRemaining] - Number of login attempts remaining before lockout
 * @property {boolean} [locked] - Whether the account is now locked
 */

/**
 * Retrieves the login attempts record from localStorage.
 * The record is keyed by username and tracks failure count, lock status, and lock timestamp.
 * @returns {Object} The login attempts record
 */
function getLoginAttemptsRecord() {
  const record = getFromLocalStorage(STORAGE_KEYS.LOGIN_ATTEMPTS);
  if (!record || typeof record !== 'object') {
    return {};
  }
  return record;
}

/**
 * Persists the login attempts record to localStorage.
 * @param {Object} record - The login attempts record
 */
function setLoginAttemptsRecord(record) {
  setToLocalStorage(STORAGE_KEYS.LOGIN_ATTEMPTS, record);
}

/**
 * Retrieves the number of failed login attempts for a given username.
 * @param {string} username - The username to check
 * @returns {number} The number of failed login attempts
 */
export function getLoginAttempts(username) {
  if (!username || typeof username !== 'string') {
    return 0;
  }

  const record = getLoginAttemptsRecord();
  const userRecord = record[username];

  if (!userRecord) {
    return 0;
  }

  return userRecord.failures || 0;
}

/**
 * Checks whether a user account is locked due to too many failed login attempts.
 * An account is locked if the failure count has reached or exceeded the maximum
 * allowed login attempts. Lock status is also checked against a 24-hour window
 * based on the lock timestamp.
 * @param {string} username - The username to check
 * @returns {boolean} True if the account is locked
 */
export function isAccountLocked(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }

  const record = getLoginAttemptsRecord();
  const userRecord = record[username];

  if (!userRecord) {
    return false;
  }

  if (!userRecord.locked) {
    return false;
  }

  if (userRecord.lockTimestamp) {
    const lockTime = new Date(userRecord.lockTimestamp);
    const now = new Date();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    if (now.getTime() - lockTime.getTime() >= twentyFourHoursMs) {
      userRecord.locked = false;
      userRecord.failures = 0;
      userRecord.lockTimestamp = null;
      record[username] = userRecord;
      setLoginAttemptsRecord(record);
      return false;
    }
  }

  return true;
}

/**
 * Resets the login attempts for a given username.
 * Clears the failure count, lock status, and lock timestamp.
 * @param {string} username - The username to reset
 * @returns {boolean} True if the reset was successful
 */
export function resetLoginAttempts(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }

  const record = getLoginAttemptsRecord();

  if (record[username]) {
    delete record[username];
    setLoginAttemptsRecord(record);
  }

  return true;
}

/**
 * Increments the failed login attempt counter for a given username.
 * If the maximum number of attempts is reached, the account is locked.
 * @param {string} username - The username to increment
 * @returns {{ failures: number, locked: boolean, attemptsRemaining: number }}
 */
function incrementLoginAttempts(username) {
  const record = getLoginAttemptsRecord();

  if (!record[username]) {
    record[username] = {
      failures: 0,
      locked: false,
      lockTimestamp: null,
    };
  }

  record[username].failures += 1;

  const failures = record[username].failures;
  const maxAttempts = RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS;
  const attemptsRemaining = Math.max(0, maxAttempts - failures);

  if (failures >= maxAttempts) {
    record[username].locked = true;
    record[username].lockTimestamp = new Date().toISOString();
  }

  setLoginAttemptsRecord(record);

  return {
    failures,
    locked: record[username].locked,
    attemptsRemaining,
  };
}

/**
 * Finds a user in the mock data by username.
 * @param {string} username - The username to search for
 * @returns {Object|null} The user object or null if not found
 */
function findUserByUsername(username) {
  if (!username || typeof username !== 'string') {
    return null;
  }

  const trimmed = username.trim().toLowerCase();
  return users.find((u) => u.username.toLowerCase() === trimmed) || null;
}

/**
 * Authenticates a user with the provided username and password.
 * Validates credentials against mock user data, tracks failed attempts,
 * enforces account lockout after the configured maximum failures,
 * and creates a session on success.
 * @param {string} username - The username to authenticate
 * @param {string} password - The password to validate
 * @returns {Promise<LoginResult>} The login result
 */
export async function login(username, password) {
  if (!username || typeof username !== 'string' || !username.trim()) {
    return {
      success: false,
      error: 'Username is required.',
    };
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    return {
      success: false,
      error: 'Password is required.',
    };
  }

  const trimmedUsername = username.trim();

  if (isAccountLocked(trimmedUsername)) {
    logEvent(
      trimmedUsername,
      AUDIT_EVENT_TYPES.LOGIN_FAILURE,
      { username: trimmedUsername, reason: 'Account is locked' },
      AUDIT_OUTCOMES.FAILURE
    );

    return {
      success: false,
      error: 'Your account has been locked due to too many failed login attempts. Please use the unlock option or contact customer support.',
      locked: true,
    };
  }

  const user = findUserByUsername(trimmedUsername);

  if (!user) {
    const result = incrementLoginAttempts(trimmedUsername);

    logEvent(
      trimmedUsername,
      AUDIT_EVENT_TYPES.LOGIN_FAILURE,
      { username: trimmedUsername, reason: 'User not found', attemptsRemaining: result.attemptsRemaining },
      AUDIT_OUTCOMES.FAILURE
    );

    if (result.locked) {
      return {
        success: false,
        error: 'Your account has been locked due to too many failed login attempts. Please use the unlock option or contact customer support.',
        locked: true,
        attemptsRemaining: 0,
      };
    }

    return {
      success: false,
      error: 'The username or password you entered is incorrect. Please try again.',
      attemptsRemaining: result.attemptsRemaining,
      locked: false,
    };
  }

  if (user.locked) {
    logEvent(
      user.id,
      AUDIT_EVENT_TYPES.LOGIN_FAILURE,
      { username: trimmedUsername, reason: 'User account is locked in data' },
      AUDIT_OUTCOMES.FAILURE
    );

    return {
      success: false,
      error: 'Your account has been locked due to too many failed login attempts. Please use the unlock option or contact customer support.',
      locked: true,
    };
  }

  if (user.password !== password) {
    const result = incrementLoginAttempts(trimmedUsername);

    logEvent(
      user.id,
      AUDIT_EVENT_TYPES.LOGIN_FAILURE,
      { username: trimmedUsername, reason: 'Invalid password', attemptsRemaining: result.attemptsRemaining },
      AUDIT_OUTCOMES.FAILURE
    );

    if (result.locked) {
      return {
        success: false,
        error: 'Your account has been locked due to too many failed login attempts. Please use the unlock option or contact customer support.',
        locked: true,
        attemptsRemaining: 0,
      };
    }

    return {
      success: false,
      error: 'The username or password you entered is incorrect. Please try again.',
      attemptsRemaining: result.attemptsRemaining,
      locked: false,
    };
  }

  resetLoginAttempts(trimmedUsername);

  const session = createSession(user.id, user.username);

  logEvent(
    user.id,
    AUDIT_EVENT_TYPES.LOGIN_SUCCESS,
    { username: trimmedUsername },
    AUDIT_OUTCOMES.SUCCESS
  );

  return {
    success: true,
    session,
  };
}

/**
 * Logs out the current user by clearing the session and logging the event.
 * @returns {void}
 */
export function logout() {
  const session = getSession();
  const userId = session ? session.userId : 'unknown';
  const username = session ? session.username : 'unknown';

  clearSession();

  logEvent(
    userId,
    AUDIT_EVENT_TYPES.LOGOUT,
    { username },
    AUDIT_OUTCOMES.INFO
  );
}

const AuthService = {
  login,
  logout,
  getLoginAttempts,
  isAccountLocked,
  resetLoginAttempts,
};

export default AuthService;