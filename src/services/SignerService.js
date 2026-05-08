import signersMockData from '@/data/signers.json';
import { STORAGE_KEYS, STATUS } from '@/utils/constants';
import { getFromLocalStorage, setToLocalStorage, generateId } from '@/utils/helpers';
import { validateSignerForm } from '@/utils/validators';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';
import { getSession } from '@/services/SessionService';

/**
 * @typedef {Object} Signer
 * @property {string} id - Unique signer identifier
 * @property {string} accountId - Associated account ID
 * @property {string} firstName - Signer's first name
 * @property {string} lastName - Signer's last name
 * @property {string} middleName - Signer's middle name
 * @property {string} suffix - Signer's suffix
 * @property {string} title - Signer's title
 * @property {string} role - Signer's role
 * @property {string} email - Signer's email
 * @property {string} emailMasked - Masked email
 * @property {string} phone - Signer's phone
 * @property {string} phoneMasked - Masked phone
 * @property {string} status - Signer status (active, pending, locked, removed)
 * @property {string} dateAdded - ISO 8601 timestamp
 * @property {Object} invitation - Invitation details
 */

/**
 * @typedef {Object} StagedChange
 * @property {string} id - Unique change identifier
 * @property {string} type - Change type: 'add', 'edit', 'remove'
 * @property {string} accountId - Associated account ID
 * @property {string} signerId - Associated signer ID
 * @property {Object} [before] - Previous signer data (for edits)
 * @property {Object} [after] - New signer data (for adds and edits)
 * @property {string} timestamp - ISO 8601 timestamp of the change
 */

/**
 * localStorage key for the mutable signers data store.
 * @type {string}
 */
const SIGNERS_DATA_KEY = 'scm_signers_data';

/**
 * localStorage key for staged changes.
 * @type {string}
 */
const STAGED_CHANGES_KEY = 'scm_staged_changes';

/**
 * Retrieves the mutable signers list from localStorage, falling back to
 * the static mock data on first access.
 * @returns {Signer[]} The signers array
 */
function getSignersData() {
  const stored = getFromLocalStorage(SIGNERS_DATA_KEY);
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  setToLocalStorage(SIGNERS_DATA_KEY, signersMockData);
  return [...signersMockData];
}

/**
 * Persists the signers array to localStorage.
 * @param {Signer[]} data - The signers array to persist
 */
function setSignersData(data) {
  setToLocalStorage(SIGNERS_DATA_KEY, data);
}

/**
 * Retrieves the staged changes array from localStorage.
 * @returns {StagedChange[]} The staged changes array
 */
function getStagedChangesData() {
  const stored = getFromLocalStorage(STAGED_CHANGES_KEY);
  if (Array.isArray(stored)) {
    return stored;
  }
  return [];
}

/**
 * Persists the staged changes array to localStorage.
 * @param {StagedChange[]} data - The staged changes array to persist
 */
function setStagedChangesData(data) {
  setToLocalStorage(STAGED_CHANGES_KEY, data);
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
 * Retrieves all signers for a given account ID.
 * Excludes signers with status 'removed' unless explicitly included.
 * @param {string} accountId - The account ID to filter by
 * @param {boolean} [includeRemoved=false] - Whether to include removed signers
 * @returns {Signer[]} Array of signer objects for the account
 */
export function getSigners(accountId, includeRemoved = false) {
  if (!accountId || typeof accountId !== 'string') {
    return [];
  }

  const trimmedId = accountId.trim();
  if (trimmedId === '') {
    return [];
  }

  const allSigners = getSignersData();
  const filtered = allSigners.filter((signer) => {
    if (signer.accountId !== trimmedId) {
      return false;
    }
    if (!includeRemoved && signer.status === STATUS.REMOVED) {
      return false;
    }
    return true;
  });

  return filtered;
}

/**
 * Retrieves a single signer by their ID.
 * @param {string} signerId - The signer ID to look up
 * @returns {Signer|null} The signer object, or null if not found
 */
export function getSignerById(signerId) {
  if (!signerId || typeof signerId !== 'string') {
    return null;
  }

  const trimmedId = signerId.trim();
  if (trimmedId === '') {
    return null;
  }

  const allSigners = getSignersData();
  const signer = allSigners.find((s) => s.id === trimmedId);

  return signer || null;
}

/**
 * Adds a new signer to the specified account.
 * The signer is created with 'pending' status and a staged change is recorded.
 * @param {string} accountId - The account ID to add the signer to
 * @param {Object} signerData - The signer form data
 * @param {string} signerData.firstName - Signer's first name
 * @param {string} signerData.lastName - Signer's last name
 * @param {string} [signerData.middleName] - Signer's middle name
 * @param {string} [signerData.suffix] - Signer's suffix
 * @param {string} signerData.title - Signer's title
 * @param {string} signerData.role - Signer's role
 * @param {string} signerData.email - Signer's email
 * @param {string} signerData.phone - Signer's phone
 * @returns {{ success: boolean, signer?: Signer, error?: string, errors?: Object<string, string> }}
 */
export function addSigner(accountId, signerData) {
  if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
    return {
      success: false,
      error: 'Account ID is required.',
    };
  }

  if (!signerData || typeof signerData !== 'object') {
    return {
      success: false,
      error: 'Signer data is required.',
    };
  }

  const validation = validateSignerForm(signerData);
  if (!validation.valid) {
    return {
      success: false,
      error: 'Validation failed. Please correct the errors and try again.',
      errors: validation.errors,
    };
  }

  const trimmedAccountId = accountId.trim();

  // Check for duplicate signer on the same account
  const existingSigners = getSigners(trimmedAccountId);
  const isDuplicate = existingSigners.some(
    (s) =>
      s.firstName.toLowerCase() === String(signerData.firstName).trim().toLowerCase() &&
      s.lastName.toLowerCase() === String(signerData.lastName).trim().toLowerCase() &&
      s.email.toLowerCase() === String(signerData.email).trim().toLowerCase()
  );

  if (isDuplicate) {
    return {
      success: false,
      error: 'A signer with the same information already exists on this account. Please review the existing signers.',
    };
  }

  const now = new Date().toISOString();
  const signerId = `SGN-${generateId().substring(0, 8).toUpperCase()}`;

  const newSigner = {
    id: signerId,
    accountId: trimmedAccountId,
    firstName: String(signerData.firstName).trim(),
    lastName: String(signerData.lastName).trim(),
    middleName: signerData.middleName ? String(signerData.middleName).trim() : '',
    suffix: signerData.suffix ? String(signerData.suffix).trim() : '',
    title: String(signerData.title).trim(),
    role: String(signerData.role).trim(),
    email: String(signerData.email).trim(),
    emailMasked: '',
    phone: String(signerData.phone).replace(/\D/g, ''),
    phoneMasked: '',
    status: STATUS.PENDING,
    dateAdded: now,
    invitation: {
      sentDate: now,
      acceptedDate: null,
      method: 'email',
    },
  };

  const allSigners = getSignersData();
  allSigners.push(newSigner);
  setSignersData(allSigners);

  // Stage the change
  const stagedChanges = getStagedChangesData();
  stagedChanges.push({
    id: generateId(),
    type: 'add',
    accountId: trimmedAccountId,
    signerId: signerId,
    before: null,
    after: { ...newSigner },
    timestamp: now,
  });
  setStagedChangesData(stagedChanges);

  logEvent(
    getCurrentUserId(),
    AUDIT_EVENT_TYPES.OTP_VERIFIED, // Using closest available event type for signer actions
    {
      action: 'add_signer',
      accountId: trimmedAccountId,
      signerId: signerId,
      firstName: newSigner.firstName,
      lastName: newSigner.lastName,
      email: newSigner.email,
    },
    AUDIT_OUTCOMES.SUCCESS
  );

  return {
    success: true,
    signer: newSigner,
  };
}

/**
 * Edits an existing signer's information.
 * Tracks before/after changes and stages the edit.
 * @param {string} signerId - The signer ID to edit
 * @param {Object} updates - The updated signer fields
 * @returns {{ success: boolean, signer?: Signer, error?: string, errors?: Object<string, string> }}
 */
export function editSigner(signerId, updates) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return {
      success: false,
      error: 'Signer ID is required.',
    };
  }

  if (!updates || typeof updates !== 'object') {
    return {
      success: false,
      error: 'Update data is required.',
    };
  }

  const trimmedSignerId = signerId.trim();
  const allSigners = getSignersData();
  const signerIndex = allSigners.findIndex((s) => s.id === trimmedSignerId);

  if (signerIndex === -1) {
    return {
      success: false,
      error: 'Signer not found.',
    };
  }

  const existingSigner = { ...allSigners[signerIndex] };

  if (existingSigner.status === STATUS.REMOVED) {
    return {
      success: false,
      error: 'Cannot edit a removed signer.',
    };
  }

  // Build merged data for validation
  const mergedData = {
    firstName: updates.firstName !== undefined ? updates.firstName : existingSigner.firstName,
    lastName: updates.lastName !== undefined ? updates.lastName : existingSigner.lastName,
    middleName: updates.middleName !== undefined ? updates.middleName : existingSigner.middleName,
    suffix: updates.suffix !== undefined ? updates.suffix : existingSigner.suffix,
    title: updates.title !== undefined ? updates.title : existingSigner.title,
    role: updates.role !== undefined ? updates.role : existingSigner.role,
    email: updates.email !== undefined ? updates.email : existingSigner.email,
    phone: updates.phone !== undefined ? updates.phone : existingSigner.phone,
  };

  const validation = validateSignerForm(mergedData);
  if (!validation.valid) {
    return {
      success: false,
      error: 'Validation failed. Please correct the errors and try again.',
      errors: validation.errors,
    };
  }

  const now = new Date().toISOString();

  const updatedSigner = {
    ...existingSigner,
    firstName: String(mergedData.firstName).trim(),
    lastName: String(mergedData.lastName).trim(),
    middleName: mergedData.middleName ? String(mergedData.middleName).trim() : '',
    suffix: mergedData.suffix ? String(mergedData.suffix).trim() : '',
    title: String(mergedData.title).trim(),
    role: String(mergedData.role).trim(),
    email: String(mergedData.email).trim(),
    phone: String(mergedData.phone).replace(/\D/g, ''),
  };

  allSigners[signerIndex] = updatedSigner;
  setSignersData(allSigners);

  // Stage the change
  const stagedChanges = getStagedChangesData();
  stagedChanges.push({
    id: generateId(),
    type: 'edit',
    accountId: existingSigner.accountId,
    signerId: trimmedSignerId,
    before: existingSigner,
    after: { ...updatedSigner },
    timestamp: now,
  });
  setStagedChangesData(stagedChanges);

  logEvent(
    getCurrentUserId(),
    AUDIT_EVENT_TYPES.OTP_VERIFIED,
    {
      action: 'edit_signer',
      accountId: existingSigner.accountId,
      signerId: trimmedSignerId,
      firstName: updatedSigner.firstName,
      lastName: updatedSigner.lastName,
      email: updatedSigner.email,
    },
    AUDIT_OUTCOMES.SUCCESS
  );

  return {
    success: true,
    signer: updatedSigner,
  };
}

/**
 * Stages a signer for removal. Prevents removal of the last active/pending signer
 * on an account.
 * @param {string} signerId - The signer ID to remove
 * @returns {{ success: boolean, error?: string }}
 */
export function removeSigner(signerId) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return {
      success: false,
      error: 'Signer ID is required.',
    };
  }

  const trimmedSignerId = signerId.trim();
  const allSigners = getSignersData();
  const signerIndex = allSigners.findIndex((s) => s.id === trimmedSignerId);

  if (signerIndex === -1) {
    return {
      success: false,
      error: 'Signer not found.',
    };
  }

  const signer = allSigners[signerIndex];

  if (signer.status === STATUS.REMOVED) {
    return {
      success: false,
      error: 'Signer has already been removed.',
    };
  }

  // Prevent removal of the last signer on the account
  const accountSigners = allSigners.filter(
    (s) => s.accountId === signer.accountId && s.status !== STATUS.REMOVED
  );

  if (accountSigners.length <= 1) {
    return {
      success: false,
      error: 'Cannot remove the last signer on an account. At least one authorized signer must remain.',
    };
  }

  const now = new Date().toISOString();
  const previousData = { ...signer };

  allSigners[signerIndex] = {
    ...signer,
    status: STATUS.REMOVED,
  };
  setSignersData(allSigners);

  // Stage the change
  const stagedChanges = getStagedChangesData();
  stagedChanges.push({
    id: generateId(),
    type: 'remove',
    accountId: signer.accountId,
    signerId: trimmedSignerId,
    before: previousData,
    after: null,
    timestamp: now,
  });
  setStagedChangesData(stagedChanges);

  logEvent(
    getCurrentUserId(),
    AUDIT_EVENT_TYPES.OTP_VERIFIED,
    {
      action: 'remove_signer',
      accountId: signer.accountId,
      signerId: trimmedSignerId,
      firstName: signer.firstName,
      lastName: signer.lastName,
    },
    AUDIT_OUTCOMES.SUCCESS
  );

  return {
    success: true,
  };
}

/**
 * Unlocks a signer by changing their status from 'locked' to 'active'.
 * @param {string} signerId - The signer ID to unlock
 * @returns {{ success: boolean, signer?: Signer, error?: string }}
 */
export function unlockSigner(signerId) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return {
      success: false,
      error: 'Signer ID is required.',
    };
  }

  const trimmedSignerId = signerId.trim();
  const allSigners = getSignersData();
  const signerIndex = allSigners.findIndex((s) => s.id === trimmedSignerId);

  if (signerIndex === -1) {
    return {
      success: false,
      error: 'Signer not found.',
    };
  }

  const signer = allSigners[signerIndex];

  if (signer.status !== STATUS.LOCKED) {
    return {
      success: false,
      error: `Signer is not locked. Current status: ${signer.status}.`,
    };
  }

  const now = new Date().toISOString();

  allSigners[signerIndex] = {
    ...signer,
    status: STATUS.ACTIVE,
  };
  setSignersData(allSigners);

  logEvent(
    getCurrentUserId(),
    AUDIT_EVENT_TYPES.OTP_VERIFIED,
    {
      action: 'unlock_signer',
      accountId: signer.accountId,
      signerId: trimmedSignerId,
      firstName: signer.firstName,
      lastName: signer.lastName,
      previousStatus: STATUS.LOCKED,
      newStatus: STATUS.ACTIVE,
    },
    AUDIT_OUTCOMES.SUCCESS
  );

  return {
    success: true,
    signer: allSigners[signerIndex],
  };
}

/**
 * Resends an invitation to a signer with 'pending' status.
 * Generates a new invitation timestamp.
 * @param {string} signerId - The signer ID to resend the invitation to
 * @returns {{ success: boolean, signer?: Signer, error?: string }}
 */
export function resendInvitation(signerId) {
  if (!signerId || typeof signerId !== 'string' || signerId.trim() === '') {
    return {
      success: false,
      error: 'Signer ID is required.',
    };
  }

  const trimmedSignerId = signerId.trim();
  const allSigners = getSignersData();
  const signerIndex = allSigners.findIndex((s) => s.id === trimmedSignerId);

  if (signerIndex === -1) {
    return {
      success: false,
      error: 'Signer not found.',
    };
  }

  const signer = allSigners[signerIndex];

  if (signer.status !== STATUS.PENDING) {
    return {
      success: false,
      error: `Invitation can only be resent to signers with pending status. Current status: ${signer.status}.`,
    };
  }

  const now = new Date().toISOString();

  allSigners[signerIndex] = {
    ...signer,
    invitation: {
      ...signer.invitation,
      sentDate: now,
      acceptedDate: null,
      method: signer.invitation ? signer.invitation.method : 'email',
    },
  };
  setSignersData(allSigners);

  logEvent(
    getCurrentUserId(),
    AUDIT_EVENT_TYPES.OTP_SENT,
    {
      action: 'resend_invitation',
      accountId: signer.accountId,
      signerId: trimmedSignerId,
      firstName: signer.firstName,
      lastName: signer.lastName,
      email: signer.email,
    },
    AUDIT_OUTCOMES.SUCCESS
  );

  return {
    success: true,
    signer: allSigners[signerIndex],
  };
}

/**
 * Returns all staged changes (pending additions, edits, and removals).
 * @returns {StagedChange[]} Array of staged change objects
 */
export function getStagedChanges() {
  return getStagedChangesData();
}

/**
 * Returns staged changes filtered by account ID.
 * @param {string} accountId - The account ID to filter by
 * @returns {StagedChange[]} Array of staged change objects for the account
 */
export function getStagedChangesByAccount(accountId) {
  if (!accountId || typeof accountId !== 'string') {
    return [];
  }

  const trimmedId = accountId.trim();
  if (trimmedId === '') {
    return [];
  }

  const allChanges = getStagedChangesData();
  return allChanges.filter((change) => change.accountId === trimmedId);
}

/**
 * Clears all staged changes from localStorage.
 * @returns {boolean} True if the operation succeeded
 */
export function clearStagedChanges() {
  setStagedChangesData([]);
  return true;
}

/**
 * Clears staged changes for a specific account.
 * @param {string} accountId - The account ID to clear changes for
 * @returns {boolean} True if the operation succeeded
 */
export function clearStagedChangesByAccount(accountId) {
  if (!accountId || typeof accountId !== 'string') {
    return false;
  }

  const trimmedId = accountId.trim();
  if (trimmedId === '') {
    return false;
  }

  const allChanges = getStagedChangesData();
  const remaining = allChanges.filter((change) => change.accountId !== trimmedId);
  setStagedChangesData(remaining);
  return true;
}

/**
 * Checks whether there are any staged changes for a given account.
 * @param {string} accountId - The account ID to check
 * @returns {boolean} True if there are staged changes for the account
 */
export function hasStagedChanges(accountId) {
  if (!accountId || typeof accountId !== 'string') {
    return false;
  }

  const changes = getStagedChangesByAccount(accountId);
  return changes.length > 0;
}

/**
 * Returns a summary of staged changes for a given account.
 * @param {string} accountId - The account ID to summarize
 * @returns {{ additions: number, edits: number, removals: number, total: number }}
 */
export function getStagedChangesSummary(accountId) {
  const changes = getStagedChangesByAccount(accountId);

  const additions = changes.filter((c) => c.type === 'add').length;
  const edits = changes.filter((c) => c.type === 'edit').length;
  const removals = changes.filter((c) => c.type === 'remove').length;

  return {
    additions,
    edits,
    removals,
    total: additions + edits + removals,
  };
}

/**
 * Resets the signers data store back to the original mock data.
 * Primarily intended for testing purposes.
 * @returns {boolean} True if the operation succeeded
 */
export function resetSignersData() {
  setToLocalStorage(SIGNERS_DATA_KEY, [...signersMockData]);
  return true;
}

const SignerService = {
  getSigners,
  getSignerById,
  addSigner,
  editSigner,
  removeSigner,
  unlockSigner,
  resendInvitation,
  getStagedChanges,
  getStagedChangesByAccount,
  clearStagedChanges,
  clearStagedChangesByAccount,
  hasStagedChanges,
  getStagedChangesSummary,
  resetSignersData,
};

export default SignerService;