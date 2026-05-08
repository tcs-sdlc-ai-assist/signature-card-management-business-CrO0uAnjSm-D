import { STORAGE_KEYS, RATE_LIMIT_CONFIG } from '@/utils/constants';
import { getFromLocalStorage, setToLocalStorage } from '@/utils/helpers';
import messages from '@/data/messages.json';

/**
 * localStorage key for rate limit records.
 * @type {string}
 */
const RATE_LIMIT_KEY = 'scm_rate_limits';

/**
 * Supported action types for rate limiting.
 * @type {Object<string, string>}
 */
export const ACTION_TYPES = {
  UNLOCK: 'unlock',
  RESEND: 'resend',
};

/**
 * @typedef {Object} RateLimitRecord
 * @property {number} count - Number of attempts made
 * @property {string} lastAttemptAt - ISO 8601 timestamp of the last attempt
 * @property {string} resetDate - Calendar date string (YYYY-MM-DD) for the current counter
 */

/**
 * @typedef {Object} RateLimitEntry
 * @property {RateLimitRecord} unlock - Unlock attempt record
 * @property {RateLimitRecord} resend - Resend attempt record
 */

/**
 * Returns the current calendar date string in YYYY-MM-DD format.
 * @returns {string} The current date string
 */
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a fresh rate limit record for a new calendar day.
 * @returns {RateLimitRecord} A new rate limit record with zero count
 */
function createFreshRecord() {
  return {
    count: 0,
    lastAttemptAt: null,
    resetDate: getCurrentDateString(),
  };
}

/**
 * Retrieves all rate limit data from localStorage.
 * @returns {Object} The rate limit data keyed by signer ID
 */
function getRateLimitData() {
  const data = getFromLocalStorage(RATE_LIMIT_KEY);
  if (!data || typeof data !== 'object') {
    return {};
  }
  return data;
}

/**
 * Persists rate limit data to localStorage.
 * @param {Object} data - The rate limit data to persist
 */
function setRateLimitData(data) {
  setToLocalStorage(RATE_LIMIT_KEY, data);
}

/**
 * Retrieves the rate limit entry for a specific signer, resetting counters
 * if the calendar day has changed.
 * @param {string} signerId - The signer ID to look up
 * @param {string} actionType - The action type ('unlock' or 'resend')
 * @returns {RateLimitRecord} The rate limit record for the signer and action
 */
function getRecord(signerId, actionType) {
  if (!signerId || typeof signerId !== 'string') {
    return createFreshRecord();
  }

  const trimmedId = signerId.trim();
  if (trimmedId === '') {
    return createFreshRecord();
  }

  const data = getRateLimitData();
  const signerEntry = data[trimmedId];

  if (!signerEntry || typeof signerEntry !== 'object') {
    return createFreshRecord();
  }

  const record = signerEntry[actionType];

  if (!record || typeof record !== 'object') {
    return createFreshRecord();
  }

  const today = getCurrentDateString();

  if (record.resetDate !== today) {
    return createFreshRecord();
  }

  return record;
}

/**
 * Persists a rate limit record for a specific signer and action type.
 * @param {string} signerId - The signer ID
 * @param {string} actionType - The action type ('unlock' or 'resend')
 * @param {RateLimitRecord} record - The rate limit record to persist
 */
function setRecord(signerId, actionType, record) {
  const data = getRateLimitData();
  const trimmedId = signerId.trim();

  if (!data[trimmedId] || typeof data[trimmedId] !== 'object') {
    data[trimmedId] = {};
  }

  data[trimmedId][actionType] = record;
  setRateLimitData(data);
}

/**
 * Returns the maximum allowed attempts for a given action type.
 * @param {string} actionType - The action type ('unlock' or 'resend')
 * @returns {number} The maximum number of attempts allowed per day
 */
function getMaxAttempts(actionType) {
  if (actionType === ACTION_TYPES.UNLOCK) {
    return RATE_LIMIT_CONFIG.MAX_UNLOCK_ATTEMPTS_PER_DAY;
  }
  if (actionType === ACTION_TYPES.RESEND) {
    return RATE_LIMIT_CONFIG.MAX_RESEND_ATTEMPTS_PER_DAY;
  }
  return 3;
}

/**
 * Checks whether a signer can be unlocked (unlock attempts < max for current calendar day).
 * @param {string} signerId - The signer ID to check
 * @returns {boolean} True if the signer can be unlocked
 */
export function canUnlock(signerId) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return false;
  }

  const record = getRecord(signerId, ACTION_TYPES.UNLOCK);
  const max = getMaxAttempts(ACTION_TYPES.UNLOCK);

  return record.count < max;
}

/**
 * Checks whether an invitation can be resent for a signer
 * (resend attempts < max for current calendar day).
 * @param {string} signerId - The signer ID to check
 * @returns {boolean} True if the invitation can be resent
 */
export function canResend(signerId) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return false;
  }

  const record = getRecord(signerId, ACTION_TYPES.RESEND);
  const max = getMaxAttempts(ACTION_TYPES.RESEND);

  return record.count < max;
}

/**
 * Increments the unlock attempt counter for a signer.
 * Resets the counter if the calendar day has changed.
 * @param {string} signerId - The signer ID to increment
 * @returns {{ success: boolean, count: number, remaining: number, error?: string }}
 */
export function incrementUnlock(signerId) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return {
      success: false,
      count: 0,
      remaining: 0,
      error: 'Signer ID is required.',
    };
  }

  const record = getRecord(signerId, ACTION_TYPES.UNLOCK);
  const max = getMaxAttempts(ACTION_TYPES.UNLOCK);

  if (record.count >= max) {
    return {
      success: false,
      count: record.count,
      remaining: 0,
      error: 'Maximum unlock attempts reached for today. Please try again tomorrow or contact customer support.',
    };
  }

  const updatedRecord = {
    count: record.count + 1,
    lastAttemptAt: new Date().toISOString(),
    resetDate: getCurrentDateString(),
  };

  setRecord(signerId, ACTION_TYPES.UNLOCK, updatedRecord);

  const remaining = Math.max(0, max - updatedRecord.count);

  return {
    success: true,
    count: updatedRecord.count,
    remaining,
  };
}

/**
 * Increments the resend attempt counter for a signer.
 * Resets the counter if the calendar day has changed.
 * @param {string} signerId - The signer ID to increment
 * @returns {{ success: boolean, count: number, remaining: number, error?: string }}
 */
export function incrementResend(signerId) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return {
      success: false,
      count: 0,
      remaining: 0,
      error: 'Signer ID is required.',
    };
  }

  const record = getRecord(signerId, ACTION_TYPES.RESEND);
  const max = getMaxAttempts(ACTION_TYPES.RESEND);

  if (record.count >= max) {
    return {
      success: false,
      count: record.count,
      remaining: 0,
      error: 'Maximum resend attempts reached for today. Please try again tomorrow or contact customer support.',
    };
  }

  const updatedRecord = {
    count: record.count + 1,
    lastAttemptAt: new Date().toISOString(),
    resetDate: getCurrentDateString(),
  };

  setRecord(signerId, ACTION_TYPES.RESEND, updatedRecord);

  const remaining = Math.max(0, max - updatedRecord.count);

  return {
    success: true,
    count: updatedRecord.count,
    remaining,
  };
}

/**
 * Returns the number of remaining attempts for a signer and action type.
 * @param {string} signerId - The signer ID to check
 * @param {string} actionType - The action type ('unlock' or 'resend')
 * @returns {number} The number of remaining attempts for the current calendar day
 */
export function getRemainingAttempts(signerId, actionType) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return 0;
  }

  if (!actionType || typeof actionType !== 'string') {
    return 0;
  }

  const validAction = actionType.trim().toLowerCase();

  if (validAction !== ACTION_TYPES.UNLOCK && validAction !== ACTION_TYPES.RESEND) {
    return 0;
  }

  const record = getRecord(signerId, validAction);
  const max = getMaxAttempts(validAction);

  return Math.max(0, max - record.count);
}

/**
 * Returns the appropriate messaging based on the current attempt count
 * for a signer and action type.
 * @param {string} signerId - The signer ID to check
 * @param {string} actionType - The action type ('unlock' or 'resend')
 * @returns {{ title: string, message: string, severity: string }}
 */
export function getAttemptMessage(signerId, actionType) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return {
      title: '',
      message: '',
      severity: 'warning',
    };
  }

  if (!actionType || typeof actionType !== 'string') {
    return {
      title: '',
      message: '',
      severity: 'warning',
    };
  }

  const validAction = actionType.trim().toLowerCase();

  if (validAction !== ACTION_TYPES.UNLOCK && validAction !== ACTION_TYPES.RESEND) {
    return {
      title: '',
      message: '',
      severity: 'warning',
    };
  }

  const record = getRecord(signerId, validAction);
  const max = getMaxAttempts(validAction);
  const currentAttempt = record.count + 1;

  const messageGroup = messages[validAction];

  if (!messageGroup) {
    return {
      title: '',
      message: '',
      severity: 'warning',
    };
  }

  if (record.count >= max) {
    if (messageGroup.exhausted) {
      return {
        title: messageGroup.exhausted.title,
        message: messageGroup.exhausted.message,
        severity: messageGroup.exhausted.severity,
      };
    }
    return {
      title: 'Attempts Exhausted',
      message: `You have exceeded the maximum number of ${validAction} attempts for today.`,
      severity: 'critical',
    };
  }

  const attemptKey = String(currentAttempt);

  if (messageGroup.attempts && messageGroup.attempts[attemptKey]) {
    const attemptMessage = messageGroup.attempts[attemptKey];
    return {
      title: attemptMessage.title,
      message: attemptMessage.message,
      severity: attemptMessage.severity,
    };
  }

  return {
    title: `${validAction.charAt(0).toUpperCase() + validAction.slice(1)} Attempt ${currentAttempt} of ${max}`,
    message: `You have ${max - record.count} attempt${max - record.count !== 1 ? 's' : ''} remaining.`,
    severity: currentAttempt >= max ? 'critical' : 'warning',
  };
}

/**
 * Returns the current attempt count for a signer and action type.
 * @param {string} signerId - The signer ID to check
 * @param {string} actionType - The action type ('unlock' or 'resend')
 * @returns {number} The current attempt count for the current calendar day
 */
export function getAttemptCount(signerId, actionType) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return 0;
  }

  if (!actionType || typeof actionType !== 'string') {
    return 0;
  }

  const validAction = actionType.trim().toLowerCase();

  if (validAction !== ACTION_TYPES.UNLOCK && validAction !== ACTION_TYPES.RESEND) {
    return 0;
  }

  const record = getRecord(signerId, validAction);
  return record.count || 0;
}

/**
 * Resets rate limit counters for a specific signer and action type.
 * Primarily intended for testing purposes.
 * @param {string} signerId - The signer ID to reset
 * @param {string} [actionType] - The action type to reset. If omitted, resets both.
 * @returns {boolean} True if the operation succeeded
 */
export function resetRateLimit(signerId, actionType) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return false;
  }

  const trimmedId = signerId.trim();
  const data = getRateLimitData();

  if (!data[trimmedId]) {
    return true;
  }

  if (actionType && typeof actionType === 'string') {
    const validAction = actionType.trim().toLowerCase();
    if (validAction === ACTION_TYPES.UNLOCK || validAction === ACTION_TYPES.RESEND) {
      data[trimmedId][validAction] = createFreshRecord();
    }
  } else {
    data[trimmedId] = {
      [ACTION_TYPES.UNLOCK]: createFreshRecord(),
      [ACTION_TYPES.RESEND]: createFreshRecord(),
    };
  }

  setRateLimitData(data);
  return true;
}

/**
 * Clears all rate limit data from localStorage.
 * Primarily intended for testing purposes.
 * @returns {boolean} True if the operation succeeded
 */
export function clearAllRateLimits() {
  return setToLocalStorage(RATE_LIMIT_KEY, {});
}

const RateLimitService = {
  canUnlock,
  canResend,
  incrementUnlock,
  incrementResend,
  getRemainingAttempts,
  getAttemptMessage,
  getAttemptCount,
  resetRateLimit,
  clearAllRateLimits,
  ACTION_TYPES,
};

export default RateLimitService;