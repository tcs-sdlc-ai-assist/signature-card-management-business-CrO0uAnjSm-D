import { STORAGE_KEYS, RATE_LIMIT_CONFIG, OTP_CONFIG } from '@/utils/constants';
import { getFromLocalStorage, setToLocalStorage } from '@/utils/helpers';
import { getSession, setSession, clearSession } from '@/services/SessionService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';

/**
 * Demo OTP code used for verification in the mock environment.
 * @type {string}
 */
const DEMO_OTP_CODE = '123456';

/**
 * Cooldown period in seconds between OTP resend requests.
 * @type {number}
 */
const OTP_COOLDOWN_SECONDS = 60;

/**
 * @typedef {Object} VerificationState
 * @property {number} attempts - Number of OTP verification attempts made
 * @property {number} maxAttempts - Maximum allowed OTP verification attempts
 * @property {number} resends - Number of OTP resend requests made
 * @property {number} maxResends - Maximum allowed OTP resend requests
 * @property {boolean} isOnCooldown - Whether the cooldown period is active
 * @property {number} cooldownRemaining - Seconds remaining in the cooldown period
 * @property {string|null} lastSentAt - ISO 8601 timestamp of the last OTP sent
 * @property {string|null} expiresAt - ISO 8601 timestamp when the current OTP expires
 */

/**
 * @typedef {Object} SendOTPResult
 * @property {boolean} success - Whether the OTP was sent successfully
 * @property {string} [error] - Error message (on failure)
 * @property {string} [expiresAt] - ISO 8601 timestamp when the OTP expires
 * @property {number} [cooldown] - Cooldown period in seconds before next resend
 * @property {number} [resendsRemaining] - Number of resend attempts remaining
 */

/**
 * @typedef {Object} VerifyOTPResult
 * @property {boolean} success - Whether the OTP verification was successful
 * @property {string} [error] - Error message (on failure)
 * @property {number} [attemptsRemaining] - Number of verification attempts remaining
 * @property {boolean} [sessionTerminated] - Whether the session was terminated due to exhausted attempts
 */

/**
 * Retrieves the OTP attempts record from localStorage.
 * @returns {Object} The OTP attempts record
 */
function getOTPAttemptsRecord() {
  const record = getFromLocalStorage(STORAGE_KEYS.OTP_ATTEMPTS);
  if (!record || typeof record !== 'object') {
    return {
      attempts: 0,
      lastAttemptAt: null,
    };
  }
  return record;
}

/**
 * Persists the OTP attempts record to localStorage.
 * @param {Object} record - The OTP attempts record
 */
function setOTPAttemptsRecord(record) {
  setToLocalStorage(STORAGE_KEYS.OTP_ATTEMPTS, record);
}

/**
 * Retrieves the OTP resends record from localStorage.
 * @returns {Object} The OTP resends record
 */
function getOTPResendsRecord() {
  const record = getFromLocalStorage(STORAGE_KEYS.OTP_RESENDS);
  if (!record || typeof record !== 'object') {
    return {
      resends: 0,
      lastSentAt: null,
      expiresAt: null,
    };
  }
  return record;
}

/**
 * Persists the OTP resends record to localStorage.
 * @param {Object} record - The OTP resends record
 */
function setOTPResendsRecord(record) {
  setToLocalStorage(STORAGE_KEYS.OTP_RESENDS, record);
}

/**
 * Calculates the remaining cooldown time in seconds based on the last sent timestamp.
 * @param {string|null} lastSentAt - ISO 8601 timestamp of the last OTP sent
 * @returns {number} Seconds remaining in the cooldown period, or 0 if cooldown has elapsed
 */
function getCooldownRemaining(lastSentAt) {
  if (!lastSentAt) {
    return 0;
  }

  const lastSent = new Date(lastSentAt);
  if (isNaN(lastSent.getTime())) {
    return 0;
  }

  const now = new Date();
  const elapsedMs = now.getTime() - lastSent.getTime();
  const cooldownMs = OTP_COOLDOWN_SECONDS * 1000;
  const remainingMs = cooldownMs - elapsedMs;

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
}

/**
 * Returns the current verification state including attempts, resends, and cooldown status.
 * @returns {VerificationState} The current verification state
 */
export function getVerificationState() {
  const attemptsRecord = getOTPAttemptsRecord();
  const resendsRecord = getOTPResendsRecord();
  const cooldownRemaining = getCooldownRemaining(resendsRecord.lastSentAt);

  return {
    attempts: attemptsRecord.attempts || 0,
    maxAttempts: RATE_LIMIT_CONFIG.MAX_OTP_ATTEMPTS,
    resends: resendsRecord.resends || 0,
    maxResends: RATE_LIMIT_CONFIG.MAX_OTP_RESENDS,
    isOnCooldown: cooldownRemaining > 0,
    cooldownRemaining,
    lastSentAt: resendsRecord.lastSentAt || null,
    expiresAt: resendsRecord.expiresAt || null,
  };
}

/**
 * Simulates sending a one-time passcode to the user via the specified delivery method.
 * Enforces a cooldown period between sends and a maximum number of resend attempts.
 * The first call is considered the initial send; subsequent calls are resends.
 * @param {string} [deliveryMethod='email'] - The delivery method ('email' or 'sms')
 * @returns {Promise<SendOTPResult>} The result of the send operation
 */
export async function sendOTP(deliveryMethod = 'email') {
  const session = getSession();

  if (!session) {
    return {
      success: false,
      error: 'No active session. Please log in again.',
    };
  }

  const resendsRecord = getOTPResendsRecord();
  const cooldownRemaining = getCooldownRemaining(resendsRecord.lastSentAt);

  if (cooldownRemaining > 0) {
    return {
      success: false,
      error: `Please wait ${cooldownRemaining} seconds before requesting a new passcode.`,
      cooldown: cooldownRemaining,
    };
  }

  const currentResends = resendsRecord.resends || 0;

  if (currentResends >= RATE_LIMIT_CONFIG.MAX_OTP_RESENDS) {
    logEvent(
      session.userId,
      AUDIT_EVENT_TYPES.OTP_SENT,
      { deliveryMethod, reason: 'Resend limit reached', resends: currentResends },
      AUDIT_OUTCOMES.FAILURE
    );

    return {
      success: false,
      error: 'You have used all available passcode resend attempts. Please try again later or contact customer support.',
      resendsRemaining: 0,
    };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_CONFIG.EXPIRY_SECONDS * 1000);

  const updatedResendsRecord = {
    resends: currentResends + 1,
    lastSentAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  setOTPResendsRecord(updatedResendsRecord);

  const resendsRemaining = RATE_LIMIT_CONFIG.MAX_OTP_RESENDS - updatedResendsRecord.resends;

  logEvent(
    session.userId,
    AUDIT_EVENT_TYPES.OTP_SENT,
    {
      deliveryMethod,
      resendCount: updatedResendsRecord.resends,
      resendsRemaining,
    },
    AUDIT_OUTCOMES.SUCCESS
  );

  return {
    success: true,
    expiresAt: expiresAt.toISOString(),
    cooldown: OTP_COOLDOWN_SECONDS,
    resendsRemaining,
  };
}

/**
 * Verifies the provided OTP code against the demo code.
 * Tracks verification attempts and terminates the session after the maximum
 * number of failed attempts is reached.
 * @param {string} code - The OTP code to verify
 * @returns {Promise<VerifyOTPResult>} The result of the verification
 */
export async function verifyOTP(code) {
  const session = getSession();

  if (!session) {
    return {
      success: false,
      error: 'No active session. Please log in again.',
      sessionTerminated: true,
    };
  }

  if (!code || typeof code !== 'string' || code.trim() === '') {
    return {
      success: false,
      error: 'Please enter a valid 6-digit one-time passcode.',
    };
  }

  const trimmedCode = code.trim();
  const otpRegex = /^\d{6}$/;

  if (!otpRegex.test(trimmedCode)) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit one-time passcode.',
    };
  }

  const attemptsRecord = getOTPAttemptsRecord();
  const currentAttempts = attemptsRecord.attempts || 0;

  if (currentAttempts >= RATE_LIMIT_CONFIG.MAX_OTP_ATTEMPTS) {
    logEvent(
      session.userId,
      AUDIT_EVENT_TYPES.OTP_FAILED,
      { reason: 'OTP attempts exhausted', attempts: currentAttempts },
      AUDIT_OUTCOMES.FAILURE
    );

    return {
      success: false,
      error: 'You have exceeded the maximum number of passcode verification attempts. Please request a new passcode or contact customer support.',
      attemptsRemaining: 0,
      sessionTerminated: false,
    };
  }

  const resendsRecord = getOTPResendsRecord();

  if (resendsRecord.expiresAt) {
    const expiresAt = new Date(resendsRecord.expiresAt);
    const now = new Date();

    if (!isNaN(expiresAt.getTime()) && now >= expiresAt) {
      logEvent(
        session.userId,
        AUDIT_EVENT_TYPES.OTP_FAILED,
        { reason: 'OTP expired' },
        AUDIT_OUTCOMES.FAILURE
      );

      return {
        success: false,
        error: 'Your one-time passcode has expired. Please request a new one.',
      };
    }
  }

  if (trimmedCode === DEMO_OTP_CODE) {
    setOTPAttemptsRecord({ attempts: 0, lastAttemptAt: null });

    session.isVerified = true;
    setSession(session);

    logEvent(
      session.userId,
      AUDIT_EVENT_TYPES.OTP_VERIFIED,
      { method: 'otp' },
      AUDIT_OUTCOMES.SUCCESS
    );

    return {
      success: true,
    };
  }

  const newAttempts = currentAttempts + 1;
  const attemptsRemaining = Math.max(0, RATE_LIMIT_CONFIG.MAX_OTP_ATTEMPTS - newAttempts);

  setOTPAttemptsRecord({
    attempts: newAttempts,
    lastAttemptAt: new Date().toISOString(),
  });

  logEvent(
    session.userId,
    AUDIT_EVENT_TYPES.OTP_FAILED,
    {
      reason: 'Invalid OTP code',
      attempts: newAttempts,
      attemptsRemaining,
    },
    AUDIT_OUTCOMES.FAILURE
  );

  if (newAttempts >= RATE_LIMIT_CONFIG.MAX_OTP_ATTEMPTS) {
    clearSession();

    return {
      success: false,
      error: 'You have exceeded the maximum number of passcode verification attempts. Your session has been terminated for security. Please log in again.',
      attemptsRemaining: 0,
      sessionTerminated: true,
    };
  }

  return {
    success: false,
    error: `The one-time passcode you entered is incorrect. You have ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`,
    attemptsRemaining,
    sessionTerminated: false,
  };
}

/**
 * Resets the OTP verification state, clearing attempts and resend counters.
 * Used when starting a new verification flow or after successful verification.
 * @returns {boolean} True if the reset was successful
 */
export function resetVerificationState() {
  setOTPAttemptsRecord({ attempts: 0, lastAttemptAt: null });
  setOTPResendsRecord({ resends: 0, lastSentAt: null, expiresAt: null });
  return true;
}

const VerificationService = {
  sendOTP,
  verifyOTP,
  getVerificationState,
  resetVerificationState,
};

export default VerificationService;