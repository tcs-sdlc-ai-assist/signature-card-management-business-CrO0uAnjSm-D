import { getFromLocalStorage, setToLocalStorage, generateId, generateConfirmationNumber } from '@/utils/helpers';
import { getSession } from '@/services/SessionService';
import { getStagedChangesByAccount, clearStagedChangesByAccount, getSigners } from '@/services/SignerService';
import { logSubmissionCompleted, logEvent, SIGNER_AUDIT_EVENT_TYPES } from '@/services/AuditLogService';
import { AUDIT_OUTCOMES } from '@/services/AuditService';

/**
 * localStorage key for submission records.
 * @type {string}
 */
const SUBMISSIONS_KEY = 'scm_submissions';

/**
 * localStorage key for tracking idempotency of in-flight submissions.
 * @type {string}
 */
const SUBMISSION_LOCK_KEY = 'scm_submission_lock';

/**
 * @typedef {Object} SubmissionRecord
 * @property {string} id - Unique submission identifier
 * @property {string} referenceId - Human-readable confirmation/reference number
 * @property {string} accountId - The account ID the submission is for
 * @property {string} userId - The user ID who submitted
 * @property {Array<Object>} changes - Array of staged change objects included in the submission
 * @property {number} additionsCount - Number of signers added
 * @property {number} editsCount - Number of signers edited
 * @property {number} removalsCount - Number of signers removed
 * @property {string} status - Submission status (submitted, processing, completed)
 * @property {string} submittedAt - ISO 8601 timestamp of submission
 * @property {string|null} completedAt - ISO 8601 timestamp of completion (if applicable)
 */

/**
 * @typedef {Object} SubmitChangesResult
 * @property {boolean} success - Whether the submission was successful
 * @property {string} [referenceId] - The confirmation/reference number
 * @property {string} [submissionId] - The unique submission ID
 * @property {string} [submittedAt] - ISO 8601 timestamp of submission
 * @property {string} [error] - Error message (on failure)
 */

/**
 * Retrieves all submission records from localStorage.
 * @returns {SubmissionRecord[]} Array of submission records
 */
function getSubmissionsData() {
  const stored = getFromLocalStorage(SUBMISSIONS_KEY);
  if (Array.isArray(stored)) {
    return stored;
  }
  return [];
}

/**
 * Persists submission records to localStorage.
 * @param {SubmissionRecord[]} data - The submissions array to persist
 */
function setSubmissionsData(data) {
  setToLocalStorage(SUBMISSIONS_KEY, data);
}

/**
 * Returns the current user ID from the session, or 'unknown'.
 * @returns {string} The current user ID
 */
function getCurrentUserId() {
  const session = getSession();
  return session ? session.userId : 'unknown';
}

/**
 * Checks whether a submission is currently in progress for the given account
 * to prevent duplicate submissions.
 * @param {string} accountId - The account ID to check
 * @returns {boolean} True if a submission is currently in progress
 */
function isSubmissionInProgress(accountId) {
  if (!accountId || typeof accountId !== 'string') {
    return false;
  }

  const lock = getFromLocalStorage(SUBMISSION_LOCK_KEY);

  if (!lock || typeof lock !== 'object') {
    return false;
  }

  if (lock.accountId !== accountId.trim()) {
    return false;
  }

  if (lock.timestamp) {
    const lockTime = new Date(lock.timestamp);
    const now = new Date();
    const fiveMinutesMs = 5 * 60 * 1000;

    if (now.getTime() - lockTime.getTime() >= fiveMinutesMs) {
      setToLocalStorage(SUBMISSION_LOCK_KEY, null);
      return false;
    }
  }

  return true;
}

/**
 * Sets a submission lock for the given account to prevent duplicate submissions.
 * @param {string} accountId - The account ID to lock
 */
function setSubmissionLock(accountId) {
  setToLocalStorage(SUBMISSION_LOCK_KEY, {
    accountId: accountId.trim(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Clears the submission lock.
 */
function clearSubmissionLock() {
  setToLocalStorage(SUBMISSION_LOCK_KEY, null);
}

/**
 * Checks whether a submission with the same set of changes already exists
 * for the given account to enforce idempotency.
 * @param {string} accountId - The account ID to check
 * @param {Array<Object>} changes - The staged changes to check against
 * @returns {SubmissionRecord|null} The existing submission if found, null otherwise
 */
function findDuplicateSubmission(accountId, changes) {
  if (!accountId || !Array.isArray(changes) || changes.length === 0) {
    return null;
  }

  const submissions = getSubmissionsData();
  const trimmedAccountId = accountId.trim();

  const changeIds = changes.map((c) => c.id).sort().join(',');

  const duplicate = submissions.find((sub) => {
    if (sub.accountId !== trimmedAccountId) {
      return false;
    }

    if (!Array.isArray(sub.changes)) {
      return false;
    }

    const subChangeIds = sub.changes.map((c) => c.id).sort().join(',');
    return subChangeIds === changeIds;
  });

  return duplicate || null;
}

/**
 * Submits all staged signer changes for a given account.
 * Generates a confirmation number/reference ID, records the timestamp,
 * prevents duplicate submissions via idempotency check, and logs all
 * changes via AuditLogService.
 *
 * @param {string} accountId - The account ID to submit changes for
 * @param {Array<Object>} [stagedChanges] - Optional array of staged changes. If not provided, retrieves from SignerService.
 * @returns {SubmitChangesResult} The result of the submission
 */
export function submitChanges(accountId, stagedChanges) {
  if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
    return {
      success: false,
      error: 'Account ID is required.',
    };
  }

  const trimmedAccountId = accountId.trim();
  const userId = getCurrentUserId();

  if (isSubmissionInProgress(trimmedAccountId)) {
    return {
      success: false,
      error: 'A submission is already in progress for this account. Please wait.',
    };
  }

  const changes = Array.isArray(stagedChanges) && stagedChanges.length > 0
    ? stagedChanges
    : getStagedChangesByAccount(trimmedAccountId);

  if (!Array.isArray(changes) || changes.length === 0) {
    return {
      success: false,
      error: 'No changes to submit. Please make changes before submitting.',
    };
  }

  const existingSubmission = findDuplicateSubmission(trimmedAccountId, changes);
  if (existingSubmission) {
    return {
      success: true,
      referenceId: existingSubmission.referenceId,
      submissionId: existingSubmission.id,
      submittedAt: existingSubmission.submittedAt,
    };
  }

  setSubmissionLock(trimmedAccountId);

  try {
    const now = new Date().toISOString();
    const submissionId = `SUB-${generateId().substring(0, 8).toUpperCase()}`;
    const referenceId = generateConfirmationNumber('SCM');

    const additions = changes.filter((c) => c.type === 'add');
    const edits = changes.filter((c) => c.type === 'edit');
    const removals = changes.filter((c) => c.type === 'remove');

    const submissionRecord = {
      id: submissionId,
      referenceId,
      accountId: trimmedAccountId,
      userId,
      changes: changes.map((c) => ({ ...c })),
      additionsCount: additions.length,
      editsCount: edits.length,
      removalsCount: removals.length,
      status: 'submitted',
      submittedAt: now,
      completedAt: null,
    };

    const submissions = getSubmissionsData();
    submissions.push(submissionRecord);
    setSubmissionsData(submissions);

    logSubmissionCompleted(userId, {
      accountId: trimmedAccountId,
      submissionId,
      referenceId,
      additionsCount: additions.length,
      editsCount: edits.length,
      removalsCount: removals.length,
      totalChanges: changes.length,
      timestamp: now,
    });

    clearStagedChangesByAccount(trimmedAccountId);

    clearSubmissionLock();

    return {
      success: true,
      referenceId,
      submissionId,
      submittedAt: now,
    };
  } catch (error) {
    clearSubmissionLock();

    logEvent(userId, SIGNER_AUDIT_EVENT_TYPES.SUBMISSION_COMPLETED, {
      accountId: trimmedAccountId,
      action: 'submit_changes',
      error: 'Submission failed unexpectedly.',
    }, AUDIT_OUTCOMES.FAILURE);

    return {
      success: false,
      error: 'We were unable to submit your signature card changes. Please review your information and try again.',
    };
  }
}

/**
 * Retrieves all past submission records, sorted by submittedAt descending.
 * @returns {SubmissionRecord[]} Array of submission records
 */
export function getSubmissionHistory() {
  const submissions = getSubmissionsData();

  return submissions.sort((a, b) => {
    const dateA = new Date(a.submittedAt);
    const dateB = new Date(b.submittedAt);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Retrieves submission history filtered by a specific user ID.
 * @param {string} userId - The user ID to filter by
 * @returns {SubmissionRecord[]} Array of submission records for the specified user
 */
export function getSubmissionHistoryByUser(userId) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return [];
  }

  const submissions = getSubmissionHistory();
  return submissions.filter((sub) => sub.userId === userId.trim());
}

/**
 * Retrieves submission history filtered by a specific account ID.
 * @param {string} accountId - The account ID to filter by
 * @returns {SubmissionRecord[]} Array of submission records for the specified account
 */
export function getSubmissionHistoryByAccount(accountId) {
  if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
    return [];
  }

  const submissions = getSubmissionHistory();
  return submissions.filter((sub) => sub.accountId === accountId.trim());
}

/**
 * Retrieves a specific submission record by its ID.
 * @param {string} submissionId - The submission ID to look up
 * @returns {SubmissionRecord|null} The submission record, or null if not found
 */
export function getSubmissionById(submissionId) {
  if (!submissionId || typeof submissionId !== 'string' || submissionId.trim() === '') {
    return null;
  }

  const trimmedId = submissionId.trim();
  const submissions = getSubmissionsData();
  const submission = submissions.find((sub) => sub.id === trimmedId);

  return submission || null;
}

/**
 * Retrieves a specific submission record by its reference ID (confirmation number).
 * @param {string} referenceId - The reference/confirmation number to look up
 * @returns {SubmissionRecord|null} The submission record, or null if not found
 */
export function getSubmissionByReferenceId(referenceId) {
  if (!referenceId || typeof referenceId !== 'string' || referenceId.trim() === '') {
    return null;
  }

  const trimmedRef = referenceId.trim();
  const submissions = getSubmissionsData();
  const submission = submissions.find((sub) => sub.referenceId === trimmedRef);

  return submission || null;
}

/**
 * Updates the status of a submission record.
 * @param {string} submissionId - The submission ID to update
 * @param {string} newStatus - The new status value (submitted, processing, completed)
 * @returns {{ success: boolean, error?: string }}
 */
export function updateSubmissionStatus(submissionId, newStatus) {
  if (!submissionId || typeof submissionId !== 'string' || submissionId.trim() === '') {
    return {
      success: false,
      error: 'Submission ID is required.',
    };
  }

  if (!newStatus || typeof newStatus !== 'string' || newStatus.trim() === '') {
    return {
      success: false,
      error: 'New status is required.',
    };
  }

  const validStatuses = ['submitted', 'processing', 'completed'];
  const trimmedStatus = newStatus.trim().toLowerCase();

  if (!validStatuses.includes(trimmedStatus)) {
    return {
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
    };
  }

  const trimmedId = submissionId.trim();
  const submissions = getSubmissionsData();
  const submissionIndex = submissions.findIndex((sub) => sub.id === trimmedId);

  if (submissionIndex === -1) {
    return {
      success: false,
      error: 'Submission not found.',
    };
  }

  submissions[submissionIndex].status = trimmedStatus;

  if (trimmedStatus === 'completed') {
    submissions[submissionIndex].completedAt = new Date().toISOString();
  }

  setSubmissionsData(submissions);

  return {
    success: true,
  };
}

/**
 * Checks whether there is an existing submission for the given account.
 * @param {string} accountId - The account ID to check
 * @returns {boolean} True if at least one submission exists for the account
 */
export function hasSubmission(accountId) {
  if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
    return false;
  }

  const submissions = getSubmissionsData();
  return submissions.some((sub) => sub.accountId === accountId.trim());
}

/**
 * Clears all submission records from localStorage.
 * Primarily intended for testing purposes.
 * @returns {boolean} True if the operation succeeded
 */
export function clearSubmissions() {
  return setToLocalStorage(SUBMISSIONS_KEY, []);
}

const SubmissionService = {
  submitChanges,
  getSubmissionHistory,
  getSubmissionHistoryByUser,
  getSubmissionHistoryByAccount,
  getSubmissionById,
  getSubmissionByReferenceId,
  updateSubmissionStatus,
  hasSubmission,
  clearSubmissions,
};

export default SubmissionService;