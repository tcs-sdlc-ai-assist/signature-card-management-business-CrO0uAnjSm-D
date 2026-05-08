import { getFromLocalStorage, setToLocalStorage, generateId } from '@/utils/helpers';
import { maskEmail, maskPhone, maskSSN, maskAccountNumber, maskName } from '@/utils/masking';

/**
 * localStorage key for audit logs.
 * @type {string}
 */
const AUDIT_LOGS_KEY = 'scm_audit_logs';

/**
 * Supported audit event types.
 * @type {Object<string, string>}
 */
export const AUDIT_EVENT_TYPES = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',
  TOKEN_VALIDATED: 'TOKEN_VALIDATED',
  TOKEN_INVALID: 'TOKEN_INVALID',
};

/**
 * Supported audit event outcomes.
 * @type {Object<string, string>}
 */
export const AUDIT_OUTCOMES = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  INFO: 'info',
};

/**
 * @typedef {Object} AuditEntry
 * @property {string} eventId - Unique identifier for the audit event
 * @property {string} userId - The user ID associated with the event
 * @property {string} eventType - The type of event (from AUDIT_EVENT_TYPES)
 * @property {string} timestamp - ISO 8601 timestamp of the event
 * @property {Object} details - Event-specific details with PII masked
 * @property {string} outcome - The outcome of the event (success, failure, info)
 */

/**
 * Known PII field names that should be masked in audit details.
 * @type {Object<string, Function>}
 */
const PII_MASKERS = {
  email: (value) => maskEmail(value),
  phone: (value) => maskPhone(value),
  ssn: (value) => maskSSN(value),
  accountNumber: (value) => maskAccountNumber(value),
  fullAccountNumber: (value) => maskAccountNumber(value),
};

/**
 * Known PII fields that require name masking (firstName + lastName pairs).
 * @type {string[]}
 */
const NAME_FIELDS = ['firstName', 'lastName'];

/**
 * Masks PII fields within a details object.
 * Returns a new object with sensitive fields masked.
 * @param {Object} details - The details object potentially containing PII
 * @returns {Object} A new object with PII fields masked
 */
function maskDetailsFields(details) {
  if (!details || typeof details !== 'object') {
    return details || {};
  }

  const masked = {};

  for (const [key, value] of Object.entries(details)) {
    if (value === null || value === undefined) {
      masked[key] = value;
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      masked[key] = maskDetailsFields(value);
      continue;
    }

    if (typeof value === 'string' && PII_MASKERS[key]) {
      masked[key] = PII_MASKERS[key](value);
      continue;
    }

    if (typeof value === 'string' && key === 'password') {
      masked[key] = '********';
      continue;
    }

    if (typeof value === 'string' && key === 'username') {
      masked[key] = value;
      continue;
    }

    masked[key] = value;
  }

  if (details.firstName && details.lastName) {
    masked.maskedName = maskName(details.firstName, details.lastName);
    if (masked.firstName) {
      masked.firstName = String(details.firstName).charAt(0) + '***';
    }
    if (masked.lastName) {
      masked.lastName = details.lastName;
    }
  }

  return masked;
}

/**
 * Retrieves all audit logs from localStorage.
 * @returns {AuditEntry[]} Array of audit log entries
 */
export function getAuditLogs() {
  const logs = getFromLocalStorage(AUDIT_LOGS_KEY);

  if (!Array.isArray(logs)) {
    return [];
  }

  return logs;
}

/**
 * Appends an immutable audit log entry to localStorage.
 * The entry includes a unique eventId, timestamp, and masked PII in details.
 * @param {string} userId - The user ID associated with the event
 * @param {string} eventType - The type of event (from AUDIT_EVENT_TYPES)
 * @param {Object} [details={}] - Event-specific details (PII will be masked)
 * @param {string} [outcome='info'] - The outcome of the event
 * @returns {AuditEntry} The created audit log entry
 */
export function logEvent(userId, eventType, details = {}, outcome = AUDIT_OUTCOMES.INFO) {
  const maskedDetails = maskDetailsFields(details);

  const entry = {
    eventId: generateId(),
    userId: userId || 'unknown',
    eventType: eventType || 'UNKNOWN',
    timestamp: new Date().toISOString(),
    details: maskedDetails,
    outcome,
  };

  const existingLogs = getAuditLogs();
  const updatedLogs = [...existingLogs, entry];

  setToLocalStorage(AUDIT_LOGS_KEY, updatedLogs);

  return entry;
}

/**
 * Retrieves audit logs filtered by a specific user ID.
 * @param {string} userId - The user ID to filter by
 * @returns {AuditEntry[]} Array of audit log entries for the specified user
 */
export function getAuditLogsByUser(userId) {
  if (!userId || typeof userId !== 'string') {
    return [];
  }

  const logs = getAuditLogs();

  return logs.filter((log) => log.userId === userId);
}

/**
 * Retrieves audit logs filtered by a specific event type.
 * @param {string} eventType - The event type to filter by (from AUDIT_EVENT_TYPES)
 * @returns {AuditEntry[]} Array of audit log entries matching the specified event type
 */
export function getAuditLogsByType(eventType) {
  if (!eventType || typeof eventType !== 'string') {
    return [];
  }

  const logs = getAuditLogs();

  return logs.filter((log) => log.eventType === eventType);
}

/**
 * Clears all audit logs from localStorage.
 * This is primarily intended for testing purposes.
 * @returns {boolean} True if the operation succeeded
 */
export function clearAuditLogs() {
  return setToLocalStorage(AUDIT_LOGS_KEY, []);
}

const AuditService = {
  logEvent,
  getAuditLogs,
  getAuditLogsByUser,
  getAuditLogsByType,
  clearAuditLogs,
  AUDIT_EVENT_TYPES,
  AUDIT_OUTCOMES,
};

export default AuditService;