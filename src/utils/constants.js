/**
 * Application-wide constants and configuration values
 * for the Signature Card Management System.
 */

/**
 * Workflow steps defining the application flow.
 * @type {string[]}
 */
export const STEPS = [
  'welcome',
  'login',
  'verify',
  'tokenValidation',
  'accountSelection',
  'signerManagement',
  'addEditSigner',
  'confirmSigners',
  'reviewSigners',
  'submission',
];

/**
 * localStorage key constants used throughout the application.
 * @type {Object<string, string>}
 */
export const STORAGE_KEYS = {
  SESSION_TOKEN: 'scm_session_token',
  SESSION_EXPIRY: 'scm_session_expiry',
  AUTH_TOKEN: 'scm_auth_token',
  TOKEN_EXPIRY: 'scm_token_expiry',
  CURRENT_STEP: 'scm_current_step',
  LOGIN_ATTEMPTS: 'scm_login_attempts',
  OTP_ATTEMPTS: 'scm_otp_attempts',
  OTP_RESENDS: 'scm_otp_resends',
  UNLOCK_ATTEMPTS: 'scm_unlock_attempts',
  RESEND_ATTEMPTS: 'scm_resend_attempts',
  SELECTED_ACCOUNT: 'scm_selected_account',
  SIGNERS: 'scm_signers',
  USER_DATA: 'scm_user_data',
  LAST_ACTIVITY: 'scm_last_activity',
  LOCK_TIMESTAMP: 'scm_lock_timestamp',
};

/**
 * Status values for signers and accounts.
 * @type {Object<string, string>}
 */
export const STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  LOCKED: 'locked',
  REMOVED: 'removed',
};

/**
 * Rate limiting configuration sourced from environment variables.
 * @type {Object<string, number>}
 */
export const RATE_LIMIT_CONFIG = {
  MAX_LOGIN_ATTEMPTS: Number(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS) || 5,
  MAX_OTP_ATTEMPTS: Number(import.meta.env.VITE_MAX_OTP_ATTEMPTS) || 3,
  MAX_OTP_RESENDS: Number(import.meta.env.VITE_MAX_OTP_RESENDS) || 3,
  MAX_UNLOCK_ATTEMPTS_PER_DAY: Number(import.meta.env.VITE_MAX_UNLOCK_ATTEMPTS_PER_DAY) || 3,
  MAX_RESEND_ATTEMPTS_PER_DAY: Number(import.meta.env.VITE_MAX_RESEND_ATTEMPTS_PER_DAY) || 3,
};

/**
 * Session configuration sourced from environment variables.
 * @type {Object<string, number>}
 */
export const SESSION_CONFIG = {
  TIMEOUT_MINUTES: Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 15,
  WARNING_MINUTES: Number(import.meta.env.VITE_SESSION_WARNING_MINUTES) || 13,
};

/**
 * OTP configuration sourced from environment variables.
 * @type {Object<string, number>}
 */
export const OTP_CONFIG = {
  EXPIRY_SECONDS: Number(import.meta.env.VITE_OTP_EXPIRY_SECONDS) || 300,
};

/**
 * Token configuration sourced from environment variables.
 * @type {Object<string, number>}
 */
export const TOKEN_CONFIG = {
  EXPIRY_HOURS: Number(import.meta.env.VITE_TOKEN_EXPIRY_HOURS) || 72,
};

/**
 * Masking configuration for sensitive data display.
 * @type {Object<string, *>}
 */
export const MASKING_CONFIG = {
  ACCOUNT_VISIBLE_DIGITS: 4,
  PHONE_VISIBLE_DIGITS: 4,
  EMAIL_VISIBLE_CHARS: 3,
  MASK_CHAR: '*',
  SSN_VISIBLE_DIGITS: 4,
};