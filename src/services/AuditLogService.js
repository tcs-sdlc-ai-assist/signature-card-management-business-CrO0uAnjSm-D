import { getFromLocalStorage, setToLocalStorage, generateId } from '@/utils/helpers';
import { maskEmail, maskPhone, maskSSN, maskAccountNumber, maskName } from '@/utils/masking';
import { logEvent as auditServiceLogEvent, getAuditLogs as auditServiceGetAuditLogs, AUDIT_OUTCOMES } from '@/services/AuditService';

/**
 * localStorage key for signer management audit logs.
 * @type {string}
 */
const SIGNER_AUDIT_LOGS_KEY = 'scm_signer_audit_logs';

/**
 * Supported signer management audit event types.
 * @type {Object<string, string>}
 */
export const SIGNER_AUDIT_EVENT_TYPES = {
  SIGNER_ADDED: 'SIGNER_ADDED',
  SIGNER_EDITED: 'SIGNER_EDITED',
  SIGNER_REMOVED: 'SIGNER_REMOVED',
  SIGNER_UNLOCKED: 'SIGNER_UNLOCKED',
  INVITATION_RESENT: 'INVITATION_RESENT',
  SUBMISSION_COMPLETED: 'SUBMISSION_COMPLETED',
};

/**
 * @typedef {Object} SignerAuditEntry
 * @property {string} eventId - Unique identifier for the audit event
 * @property {string} userId - The user ID associated with the event
 * @property {string} actionType - The type of signer management action (from SIGNER_AUDIT_EVENT_TYPES)
 * @property {string} timestamp - ISO 8601 timestamp of the event
 * @property {Object} details - Event-specific details with PII masked
 * @property {Object|null} [before] - Previous state (for edits/removals), PII masked
 * @property {Object|null} [after] - New state (for adds/edits), PII masked
 * @property {string} outcome - The outcome of the event (success, failure, info)
 * @property {string} [referenceId] - Submission reference ID (for submissions)
 */

/**
 * @typedef {Object} AuditLogFilters
 * @property {string} [userId] - Filter by user ID
 * @property {string} [actionType] - Filter by action type
 * @property {string} [accountId] - Filter by account ID
 * @property {string} [signerId] - Filter by signer ID
 * @property {string} [startDate] - Filter by start date (ISO 8601)
 * @property {string} [endDate] - Filter by end date (ISO 8601)
 * @property {string} [referenceId] - Filter by submission reference ID
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
 * Masks PII fields within a details object.
 * Returns a new object with sensitive fields masked.
 * @param {Object} details - The details object potentially containing PII
 * @returns {Object} A new object with PII fields masked
 */
function maskPIIFields(details) {
  if (!details || typeof details !== 'object') {
    return details || {};
  }

  if (Array.isArray(details)) {
    return details.map((item) => {
      if (item && typeof item === 'object') {
        return maskPIIFields(item);
      }
      return item;
    });
  }

  const masked = {};

  for (const [key, value] of Object.entries(details)) {
    if (value === null || value === undefined) {
      masked[key] = value;
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      masked[key] = maskPIIFields(value);
      continue;
    }

    if (Array.isArray(value)) {
      masked[key] = maskPIIFields(value);
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
 * Retrieves all signer management audit logs from localStorage.
 * @returns {SignerAuditEntry[]} Array of signer audit log entries
 */
function getSignerAuditLogsFromStorage() {
  const logs = getFromLocalStorage(SIGNER_AUDIT_LOGS_KEY);

  if (!Array.isArray(logs)) {
    return [];
  }

  return logs;
}

/**
 * Persists signer management audit logs to localStorage.
 * @param {SignerAuditEntry[]} logs - The audit logs array to persist
 * @returns {boolean} True if the operation succeeded
 */
function setSignerAuditLogsToStorage(logs) {
  return setToLocalStorage(SIGNER_AUDIT_LOGS_KEY, logs);
}

/**
 * Logs a signer management audit event.
 * Appends an immutable entry to the signer audit log in localStorage.
 * Also delegates to the core AuditService.logEvent for unified audit trail.
 * PII in details, before, and after objects is automatically masked.
 *
 * @param {string} userId - The user ID associated with the event
 * @param {string} actionType - The type of signer management action (from SIGNER_AUDIT_EVENT_TYPES)
 * @param {Object} [details={}] - Event-specific details (PII will be masked)
 * @param {string} [outcome='success'] - The outcome of the event (success, failure, info)
 * @returns {SignerAuditEntry} The created audit log entry
 */
export function logEvent(userId, actionType, details = {}, outcome = AUDIT_OUTCOMES.SUCCESS) {
  const maskedDetails = maskPIIFields(details);

  let maskedBefore = null;
  let maskedAfter = null;

  if (details.before && typeof details.before === 'object') {
    maskedBefore = maskPIIFields(details.before);
  }

  if (details.after && typeof details.after === 'object') {
    maskedAfter = maskPIIFields(details.after);
  }

  const entry = {
    eventId: generateId(),
    userId: userId || 'unknown',
    actionType: actionType || 'UNKNOWN',
    timestamp: new Date().toISOString(),
    details: maskedDetails,
    before: maskedBefore,
    after: maskedAfter,
    outcome,
  };

  if (details.referenceId) {
    entry.referenceId = details.referenceId;
  }

  const existingLogs = getSignerAuditLogsFromStorage();
  const updatedLogs = [...existingLogs, entry];
  setSignerAuditLogsToStorage(updatedLogs);

  auditServiceLogEvent(
    userId,
    actionType,
    {
      ...maskedDetails,
      source: 'AuditLogService',
    },
    outcome
  );

  return entry;
}

/**
 * Retrieves signer management audit logs with optional filtering.
 * Supports filtering by userId, actionType, accountId, signerId,
 * date range, and referenceId.
 *
 * @param {AuditLogFilters} [filters={}] - Optional filters to apply
 * @returns {SignerAuditEntry[]} Array of filtered audit log entries, sorted by timestamp descending
 */
export function getAuditLogs(filters = {}) {
  let logs = getSignerAuditLogsFromStorage();

  if (!filters || typeof filters !== 'object') {
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  if (filters.userId && typeof filters.userId === 'string' && filters.userId.trim() !== '') {
    const userId = filters.userId.trim();
    logs = logs.filter((log) => log.userId === userId);
  }

  if (filters.actionType && typeof filters.actionType === 'string' && filters.actionType.trim() !== '') {
    const actionType = filters.actionType.trim();
    logs = logs.filter((log) => log.actionType === actionType);
  }

  if (filters.accountId && typeof filters.accountId === 'string' && filters.accountId.trim() !== '') {
    const accountId = filters.accountId.trim();
    logs = logs.filter((log) => {
      if (log.details && log.details.accountId === accountId) {
        return true;
      }
      return false;
    });
  }

  if (filters.signerId && typeof filters.signerId === 'string' && filters.signerId.trim() !== '') {
    const signerId = filters.signerId.trim();
    logs = logs.filter((log) => {
      if (log.details && log.details.signerId === signerId) {
        return true;
      }
      return false;
    });
  }

  if (filters.startDate && typeof filters.startDate === 'string') {
    const startDate = new Date(filters.startDate);
    if (!isNaN(startDate.getTime())) {
      logs = logs.filter((log) => {
        const logDate = new Date(log.timestamp);
        return !isNaN(logDate.getTime()) && logDate >= startDate;
      });
    }
  }

  if (filters.endDate && typeof filters.endDate === 'string') {
    const endDate = new Date(filters.endDate);
    if (!isNaN(endDate.getTime())) {
      logs = logs.filter((log) => {
        const logDate = new Date(log.timestamp);
        return !isNaN(logDate.getTime()) && logDate <= endDate;
      });
    }
  }

  if (filters.referenceId && typeof filters.referenceId === 'string' && filters.referenceId.trim() !== '') {
    const referenceId = filters.referenceId.trim();
    logs = logs.filter((log) => log.referenceId === referenceId);
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return logs;
}

/**
 * Retrieves signer management audit logs filtered by a specific user ID.
 * @param {string} userId - The user ID to filter by
 * @returns {SignerAuditEntry[]} Array of audit log entries for the specified user
 */
export function getAuditLogsByUser(userId) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return [];
  }

  return getAuditLogs({ userId });
}

/**
 * Retrieves signer management audit logs filtered by a specific action type.
 * @param {string} actionType - The action type to filter by (from SIGNER_AUDIT_EVENT_TYPES)
 * @returns {SignerAuditEntry[]} Array of audit log entries matching the specified action type
 */
export function getAuditLogsByActionType(actionType) {
  if (!actionType || typeof actionType !== 'string' || actionType.trim() === '') {
    return [];
  }

  return getAuditLogs({ actionType });
}

/**
 * Retrieves signer management audit logs filtered by a specific account ID.
 * @param {string} accountId - The account ID to filter by
 * @returns {SignerAuditEntry[]} Array of audit log entries for the specified account
 */
export function getAuditLogsByAccount(accountId) {
  if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
    return [];
  }

  return getAuditLogs({ accountId });
}

/**
 * Retrieves signer management audit logs filtered by a specific signer ID.
 * @param {string} signerId - The signer ID to filter by
 * @returns {SignerAuditEntry[]} Array of audit log entries for the specified signer
 */
export function getAuditLogsBySigner(signerId) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return [];
  }

  return getAuditLogs({ signerId });
}

/**
 * Retrieves signer management audit logs filtered by a submission reference ID.
 * @param {string} referenceId - The submission reference ID to filter by
 * @returns {SignerAuditEntry[]} Array of audit log entries for the specified submission
 */
export function getAuditLogsByReference(referenceId) {
  if (!referenceId || typeof referenceId !== 'string' || referenceId.trim() === '') {
    return [];
  }

  return getAuditLogs({ referenceId });
}

/**
 * Logs a signer added event with before/after values.
 * @param {string} userId - The user ID who performed the action
 * @param {Object} details - Event details including accountId, signerId, and signer data
 * @returns {SignerAuditEntry} The created audit log entry
 */
export function logSignerAdded(userId, details = {}) {
  return logEvent(userId, SIGNER_AUDIT_EVENT_TYPES.SIGNER_ADDED, {
    ...details,
    action: 'add_signer',
    before: null,
    after: details.after || details.signerData || null,
  }, AUDIT_OUTCOMES.SUCCESS);
}

/**
 * Logs a signer edited event with before/after values.
 * @param {string} userId - The user ID who performed the action
 * @param {Object} details - Event details including accountId, signerId, before, and after data
 * @returns {SignerAuditEntry} The created audit log entry
 */
export function logSignerEdited(userId, details = {}) {
  return logEvent(userId, SIGNER_AUDIT_EVENT_TYPES.SIGNER_EDITED, {
    ...details,
    action: 'edit_signer',
  }, AUDIT_OUTCOMES.SUCCESS);
}

/**
 * Logs a signer removed event with before values.
 * @param {string} userId - The user ID who performed the action
 * @param {Object} details - Event details including accountId, signerId, and before data
 * @returns {SignerAuditEntry} The created audit log entry
 */
export function logSignerRemoved(userId, details = {}) {
  return logEvent(userId, SIGNER_AUDIT_EVENT_TYPES.SIGNER_REMOVED, {
    ...details,
    action: 'remove_signer',
    after: null,
  }, AUDIT_OUTCOMES.SUCCESS);
}

/**
 * Logs a signer unlocked event.
 * @param {string} userId - The user ID who performed the action
 * @param {Object} details - Event details including accountId, signerId
 * @returns {SignerAuditEntry} The created audit log entry
 */
export function logSignerUnlocked(userId, details = {}) {
  return logEvent(userId, SIGNER_AUDIT_EVENT_TYPES.SIGNER_UNLOCKED, {
    ...details,
    action: 'unlock_signer',
  }, AUDIT_OUTCOMES.SUCCESS);
}

/**
 * Logs an invitation resent event.
 * @param {string} userId - The user ID who performed the action
 * @param {Object} details - Event details including accountId, signerId
 * @returns {SignerAuditEntry} The created audit log entry
 */
export function logInvitationResent(userId, details = {}) {
  return logEvent(userId, SIGNER_AUDIT_EVENT_TYPES.INVITATION_RESENT, {
    ...details,
    action: 'resend_invitation',
  }, AUDIT_OUTCOMES.SUCCESS);
}

/**
 * Logs a submission completed event with a reference ID.
 * @param {string} userId - The user ID who performed the action
 * @param {Object} details - Event details including accountId, referenceId, and changes summary
 * @returns {SignerAuditEntry} The created audit log entry
 */
export function logSubmissionCompleted(userId, details = {}) {
  return logEvent(userId, SIGNER_AUDIT_EVENT_TYPES.SUBMISSION_COMPLETED, {
    ...details,
    action: 'submit_changes',
  }, AUDIT_OUTCOMES.SUCCESS);
}

/**
 * Clears all signer management audit logs from localStorage.
 * This is primarily intended for testing purposes.
 * @returns {boolean} True if the operation succeeded
 */
export function clearAuditLogs() {
  return setToLocalStorage(SIGNER_AUDIT_LOGS_KEY, []);
}

const AuditLogService = {
  logEvent,
  getAuditLogs,
  getAuditLogsByUser,
  getAuditLogsByActionType,
  getAuditLogsByAccount,
  getAuditLogsBySigner,
  getAuditLogsByReference,
  logSignerAdded,
  logSignerEdited,
  logSignerRemoved,
  logSignerUnlocked,
  logInvitationResent,
  logSubmissionCompleted,
  clearAuditLogs,
  SIGNER_AUDIT_EVENT_TYPES,
};

export default AuditLogService;