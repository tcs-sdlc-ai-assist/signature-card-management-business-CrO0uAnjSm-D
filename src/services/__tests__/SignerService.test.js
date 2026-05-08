import { describe, it, expect, beforeEach } from 'vitest';
import {
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
} from '@/services/SignerService';
import { createSession } from '@/services/SessionService';

/**
 * Valid signer form data for testing add/edit operations.
 * @type {Object}
 */
const VALID_SIGNER_DATA = {
  firstName: 'Jane',
  lastName: 'Doe',
  middleName: 'Marie',
  suffix: '',
  title: 'CFO',
  role: 'Authorized Signer',
  email: 'jane.doe@example.com',
  phone: '5559998888',
};

describe('SignerService', () => {
  beforeEach(() => {
    localStorage.clear();
    // Create a valid session for audit logging
    createSession('USR-001', 'jsmith');
    // Reset signers data to original mock data
    resetSignersData();
    // Clear any staged changes
    clearStagedChanges();
  });

  describe('getSigners', () => {
    it('returns signers for a valid account ID', () => {
      const signers = getSigners('ACCT-1001');

      expect(Array.isArray(signers)).toBe(true);
      expect(signers.length).toBeGreaterThan(0);

      signers.forEach((signer) => {
        expect(signer.accountId).toBe('ACCT-1001');
      });
    });

    it('excludes removed signers by default', () => {
      const signers = getSigners('ACCT-1001');

      const removedSigners = signers.filter((s) => s.status === 'removed');
      expect(removedSigners.length).toBe(0);
    });

    it('includes removed signers when includeRemoved is true', () => {
      const signers = getSigners('ACCT-1001', true);

      const removedSigners = signers.filter((s) => s.status === 'removed');
      expect(removedSigners.length).toBeGreaterThan(0);
    });

    it('returns empty array for non-existent account ID', () => {
      const signers = getSigners('ACCT-NONEXISTENT');

      expect(Array.isArray(signers)).toBe(true);
      expect(signers.length).toBe(0);
    });

    it('returns empty array for empty string account ID', () => {
      const signers = getSigners('');

      expect(Array.isArray(signers)).toBe(true);
      expect(signers.length).toBe(0);
    });

    it('returns empty array for null account ID', () => {
      const signers = getSigners(null);

      expect(Array.isArray(signers)).toBe(true);
      expect(signers.length).toBe(0);
    });

    it('returns empty array for undefined account ID', () => {
      const signers = getSigners(undefined);

      expect(Array.isArray(signers)).toBe(true);
      expect(signers.length).toBe(0);
    });

    it('returns correct signers for account with multiple signers', () => {
      const signers = getSigners('ACCT-1003');

      // ACCT-1003 has 3 signers in mock data (SGN-004, SGN-005, SGN-006)
      expect(signers.length).toBe(3);
    });

    it('returns correct signers for account with single signer', () => {
      const signers = getSigners('ACCT-1002');

      // ACCT-1002 has 1 signer in mock data (SGN-003)
      expect(signers.length).toBe(1);
      expect(signers[0].id).toBe('SGN-003');
    });

    it('returns signers with expected properties', () => {
      const signers = getSigners('ACCT-1001');

      expect(signers.length).toBeGreaterThan(0);

      const signer = signers[0];
      expect(signer).toHaveProperty('id');
      expect(signer).toHaveProperty('accountId');
      expect(signer).toHaveProperty('firstName');
      expect(signer).toHaveProperty('lastName');
      expect(signer).toHaveProperty('status');
      expect(signer).toHaveProperty('role');
      expect(signer).toHaveProperty('title');
    });
  });

  describe('getSignerById', () => {
    it('returns the correct signer for a valid signer ID', () => {
      const signer = getSignerById('SGN-001');

      expect(signer).not.toBeNull();
      expect(signer.id).toBe('SGN-001');
      expect(signer.firstName).toBe('John');
      expect(signer.lastName).toBe('Smith');
    });

    it('returns null for a non-existent signer ID', () => {
      const signer = getSignerById('SGN-NONEXISTENT');

      expect(signer).toBeNull();
    });

    it('returns null for empty string signer ID', () => {
      const signer = getSignerById('');

      expect(signer).toBeNull();
    });

    it('returns null for null signer ID', () => {
      const signer = getSignerById(null);

      expect(signer).toBeNull();
    });

    it('returns null for undefined signer ID', () => {
      const signer = getSignerById(undefined);

      expect(signer).toBeNull();
    });
  });

  describe('addSigner', () => {
    it('successfully adds a signer with valid data', () => {
      const result = addSigner('ACCT-1001', VALID_SIGNER_DATA);

      expect(result.success).toBe(true);
      expect(result.signer).toBeDefined();
      expect(result.signer.firstName).toBe('Jane');
      expect(result.signer.lastName).toBe('Doe');
      expect(result.signer.email).toBe('jane.doe@example.com');
      expect(result.signer.status).toBe('pending');
    });

    it('assigns a unique signer ID to the new signer', () => {
      const result = addSigner('ACCT-1001', VALID_SIGNER_DATA);

      expect(result.success).toBe(true);
      expect(result.signer.id).toBeDefined();
      expect(result.signer.id).toMatch(/^SGN-/);
    });

    it('sets the new signer status to pending', () => {
      const result = addSigner('ACCT-1001', VALID_SIGNER_DATA);

      expect(result.success).toBe(true);
      expect(result.signer.status).toBe('pending');
    });

    it('sets the accountId on the new signer', () => {
      const result = addSigner('ACCT-1001', VALID_SIGNER_DATA);

      expect(result.success).toBe(true);
      expect(result.signer.accountId).toBe('ACCT-1001');
    });

    it('creates an invitation record for the new signer', () => {
      const result = addSigner('ACCT-1001', VALID_SIGNER_DATA);

      expect(result.success).toBe(true);
      expect(result.signer.invitation).toBeDefined();
      expect(result.signer.invitation.sentDate).toBeDefined();
      expect(result.signer.invitation.acceptedDate).toBeNull();
      expect(result.signer.invitation.method).toBe('email');
    });

    it('stages an add change after adding a signer', () => {
      const result = addSigner('ACCT-1001', VALID_SIGNER_DATA);

      expect(result.success).toBe(true);

      const stagedChanges = getStagedChanges();
      const addChange = stagedChanges.find(
        (c) => c.type === 'add' && c.signerId === result.signer.id
      );

      expect(addChange).toBeDefined();
      expect(addChange.accountId).toBe('ACCT-1001');
      expect(addChange.before).toBeNull();
      expect(addChange.after).toBeDefined();
      expect(addChange.after.firstName).toBe('Jane');
    });

    it('adds the signer to the signers list', () => {
      const signersBefore = getSigners('ACCT-1001');
      const countBefore = signersBefore.length;

      const result = addSigner('ACCT-1001', VALID_SIGNER_DATA);
      expect(result.success).toBe(true);

      const signersAfter = getSigners('ACCT-1001');
      expect(signersAfter.length).toBe(countBefore + 1);
    });

    it('returns error for empty account ID', () => {
      const result = addSigner('', VALID_SIGNER_DATA);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for null account ID', () => {
      const result = addSigner(null, VALID_SIGNER_DATA);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for null signer data', () => {
      const result = addSigner('ACCT-1001', null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns validation errors for invalid signer data', () => {
      const invalidData = {
        firstName: '',
        lastName: '',
        title: '',
        role: '',
        email: 'invalid-email',
        phone: '123',
      };

      const result = addSigner('ACCT-1001', invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });

    it('prevents adding a duplicate signer on the same account', () => {
      // SGN-001 is John Smith on ACCT-1001
      const duplicateData = {
        firstName: 'John',
        lastName: 'Smith',
        middleName: '',
        suffix: '',
        title: 'Owner',
        role: 'Primary Signer',
        email: 'john.smith@example.com',
        phone: '5551234567',
      };

      const result = addSigner('ACCT-1001', duplicateData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('already exists');
    });

    it('returns error for missing required fields', () => {
      const incompleteData = {
        firstName: 'Jane',
        lastName: 'Doe',
        // missing title, role, email, phone
      };

      const result = addSigner('ACCT-1001', incompleteData);

      expect(result.success).toBe(false);
    });
  });

  describe('editSigner', () => {
    it('successfully edits a signer with valid updates', () => {
      const updates = {
        firstName: 'Jonathan',
        lastName: 'Smith',
        middleName: 'Robert',
        suffix: '',
        title: 'Owner',
        role: 'Primary Signer',
        email: 'jonathan.smith@example.com',
        phone: '5551234567',
      };

      const result = editSigner('SGN-001', updates);

      expect(result.success).toBe(true);
      expect(result.signer).toBeDefined();
      expect(result.signer.firstName).toBe('Jonathan');
      expect(result.signer.email).toBe('jonathan.smith@example.com');
    });

    it('tracks before and after values in staged changes', () => {
      const originalSigner = getSignerById('SGN-001');

      const updates = {
        firstName: 'Jonathan',
        lastName: 'Smith',
        middleName: 'Robert',
        suffix: '',
        title: 'Owner',
        role: 'Primary Signer',
        email: 'jonathan.smith@example.com',
        phone: '5551234567',
      };

      const result = editSigner('SGN-001', updates);
      expect(result.success).toBe(true);

      const stagedChanges = getStagedChanges();
      const editChange = stagedChanges.find(
        (c) => c.type === 'edit' && c.signerId === 'SGN-001'
      );

      expect(editChange).toBeDefined();
      expect(editChange.before).toBeDefined();
      expect(editChange.after).toBeDefined();
      expect(editChange.before.firstName).toBe('John');
      expect(editChange.after.firstName).toBe('Jonathan');
      expect(editChange.before.email).toBe('john.smith@example.com');
      expect(editChange.after.email).toBe('jonathan.smith@example.com');
    });

    it('updates the signer in the data store', () => {
      const updates = {
        firstName: 'Jonathan',
        lastName: 'Smith',
        middleName: 'Robert',
        suffix: '',
        title: 'Owner',
        role: 'Primary Signer',
        email: 'jonathan.smith@example.com',
        phone: '5551234567',
      };

      editSigner('SGN-001', updates);

      const updatedSigner = getSignerById('SGN-001');
      expect(updatedSigner.firstName).toBe('Jonathan');
      expect(updatedSigner.email).toBe('jonathan.smith@example.com');
    });

    it('returns error for non-existent signer ID', () => {
      const result = editSigner('SGN-NONEXISTENT', VALID_SIGNER_DATA);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    it('returns error for empty signer ID', () => {
      const result = editSigner('', VALID_SIGNER_DATA);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for null signer ID', () => {
      const result = editSigner(null, VALID_SIGNER_DATA);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for null update data', () => {
      const result = editSigner('SGN-001', null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns validation errors for invalid update data', () => {
      const invalidUpdates = {
        firstName: '',
        lastName: '',
        title: '',
        role: '',
        email: 'not-an-email',
        phone: '123',
      };

      const result = editSigner('SGN-001', invalidUpdates);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('prevents editing a removed signer', () => {
      // SGN-011 is a removed signer on ACCT-1001
      const result = editSigner('SGN-011', VALID_SIGNER_DATA);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('removed');
    });

    it('preserves unchanged fields when only some fields are updated', () => {
      const originalSigner = getSignerById('SGN-001');

      const partialUpdates = {
        firstName: 'Jonathan',
        lastName: originalSigner.lastName,
        middleName: originalSigner.middleName,
        suffix: originalSigner.suffix,
        title: originalSigner.title,
        role: originalSigner.role,
        email: originalSigner.email,
        phone: originalSigner.phone,
      };

      const result = editSigner('SGN-001', partialUpdates);

      expect(result.success).toBe(true);
      expect(result.signer.firstName).toBe('Jonathan');
      expect(result.signer.lastName).toBe(originalSigner.lastName);
      expect(result.signer.title).toBe(originalSigner.title);
      expect(result.signer.role).toBe(originalSigner.role);
    });
  });

  describe('removeSigner', () => {
    it('successfully removes a signer when multiple signers exist', () => {
      // ACCT-1001 has 2 active signers (SGN-001, SGN-002)
      const result = removeSigner('SGN-001');

      expect(result.success).toBe(true);
    });

    it('sets the signer status to removed', () => {
      removeSigner('SGN-001');

      const signer = getSignerById('SGN-001');
      expect(signer.status).toBe('removed');
    });

    it('stages a remove change', () => {
      removeSigner('SGN-001');

      const stagedChanges = getStagedChanges();
      const removeChange = stagedChanges.find(
        (c) => c.type === 'remove' && c.signerId === 'SGN-001'
      );

      expect(removeChange).toBeDefined();
      expect(removeChange.before).toBeDefined();
      expect(removeChange.before.firstName).toBe('John');
      expect(removeChange.after).toBeNull();
    });

    it('prevents removal of the last signer on an account', () => {
      // ACCT-1002 has only 1 signer (SGN-003)
      const result = removeSigner('SGN-003');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('last signer');
    });

    it('returns error for non-existent signer ID', () => {
      const result = removeSigner('SGN-NONEXISTENT');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    it('returns error for empty signer ID', () => {
      const result = removeSigner('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for null signer ID', () => {
      const result = removeSigner(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error when trying to remove an already removed signer', () => {
      // SGN-011 is already removed
      const result = removeSigner('SGN-011');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('already been removed');
    });

    it('excludes removed signer from default getSigners results', () => {
      const signersBefore = getSigners('ACCT-1001');
      const countBefore = signersBefore.length;

      removeSigner('SGN-001');

      const signersAfter = getSigners('ACCT-1001');
      expect(signersAfter.length).toBe(countBefore - 1);
    });

    it('includes removed signer when includeRemoved is true', () => {
      removeSigner('SGN-001');

      const signersWithRemoved = getSigners('ACCT-1001', true);
      const removedSigner = signersWithRemoved.find((s) => s.id === 'SGN-001');

      expect(removedSigner).toBeDefined();
      expect(removedSigner.status).toBe('removed');
    });
  });

  describe('unlockSigner', () => {
    it('successfully unlocks a locked signer', () => {
      // SGN-006 is a locked signer on ACCT-1003
      const result = unlockSigner('SGN-006');

      expect(result.success).toBe(true);
      expect(result.signer).toBeDefined();
      expect(result.signer.status).toBe('active');
    });

    it('changes the signer status from locked to active', () => {
      unlockSigner('SGN-006');

      const signer = getSignerById('SGN-006');
      expect(signer.status).toBe('active');
    });

    it('returns error when signer is not locked', () => {
      // SGN-001 is an active signer
      const result = unlockSigner('SGN-001');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not locked');
    });

    it('returns error for non-existent signer ID', () => {
      const result = unlockSigner('SGN-NONEXISTENT');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    it('returns error for empty signer ID', () => {
      const result = unlockSigner('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for null signer ID', () => {
      const result = unlockSigner(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns the updated signer object on success', () => {
      const result = unlockSigner('SGN-006');

      expect(result.success).toBe(true);
      expect(result.signer).toBeDefined();
      expect(result.signer.id).toBe('SGN-006');
      expect(result.signer.firstName).toBe('Emily');
      expect(result.signer.lastName).toBe('Turner');
    });

    it('returns error when trying to unlock a pending signer', () => {
      // SGN-005 is a pending signer
      const result = unlockSigner('SGN-005');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not locked');
    });
  });

  describe('resendInvitation', () => {
    it('successfully resends invitation to a pending signer', () => {
      // SGN-005 is a pending signer on ACCT-1003
      const result = resendInvitation('SGN-005');

      expect(result.success).toBe(true);
      expect(result.signer).toBeDefined();
    });

    it('updates the invitation sentDate', () => {
      const signerBefore = getSignerById('SGN-005');
      const sentDateBefore = signerBefore.invitation.sentDate;

      const result = resendInvitation('SGN-005');

      expect(result.success).toBe(true);
      expect(result.signer.invitation.sentDate).toBeDefined();
      // The new sentDate should be different from the original
      expect(result.signer.invitation.sentDate).not.toBe(sentDateBefore);
    });

    it('resets the acceptedDate to null on resend', () => {
      const result = resendInvitation('SGN-005');

      expect(result.success).toBe(true);
      expect(result.signer.invitation.acceptedDate).toBeNull();
    });

    it('returns error when signer is not pending', () => {
      // SGN-001 is an active signer
      const result = resendInvitation('SGN-001');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('pending');
    });

    it('returns error for non-existent signer ID', () => {
      const result = resendInvitation('SGN-NONEXISTENT');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    it('returns error for empty signer ID', () => {
      const result = resendInvitation('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for null signer ID', () => {
      const result = resendInvitation(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error when trying to resend to a locked signer', () => {
      // SGN-006 is a locked signer
      const result = resendInvitation('SGN-006');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('pending');
    });

    it('preserves the invitation method on resend', () => {
      const signerBefore = getSignerById('SGN-005');
      const methodBefore = signerBefore.invitation.method;

      const result = resendInvitation('SGN-005');

      expect(result.success).toBe(true);
      expect(result.signer.invitation.method).toBe(methodBefore);
    });
  });

  describe('getStagedChanges', () => {
    it('returns empty array when no changes have been made', () => {
      const changes = getStagedChanges();

      expect(Array.isArray(changes)).toBe(true);
      expect(changes.length).toBe(0);
    });

    it('returns all staged changes after add, edit, and remove operations', () => {
      // Add a signer
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      // Edit a signer
      editSigner('SGN-002', {
        firstName: 'Sarah',
        lastName: 'Johnson',
        middleName: 'Anne',
        suffix: '',
        title: 'Co-Owner',
        role: 'Secondary Signer',
        email: 'sarah.johnson@example.com',
        phone: '5551234568',
      });

      // Remove a signer (ACCT-1003 has 3 signers)
      removeSigner('SGN-004');

      const changes = getStagedChanges();

      expect(changes.length).toBe(3);

      const addChanges = changes.filter((c) => c.type === 'add');
      const editChanges = changes.filter((c) => c.type === 'edit');
      const removeChanges = changes.filter((c) => c.type === 'remove');

      expect(addChanges.length).toBe(1);
      expect(editChanges.length).toBe(1);
      expect(removeChanges.length).toBe(1);
    });

    it('includes timestamp on each staged change', () => {
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      const changes = getStagedChanges();

      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].timestamp).toBeDefined();

      const timestamp = new Date(changes[0].timestamp);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('includes unique IDs on each staged change', () => {
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      const secondSignerData = {
        ...VALID_SIGNER_DATA,
        firstName: 'Bob',
        lastName: 'Builder',
        email: 'bob.builder@example.com',
      };
      addSigner('ACCT-1001', secondSignerData);

      const changes = getStagedChanges();

      expect(changes.length).toBe(2);
      expect(changes[0].id).not.toBe(changes[1].id);
    });
  });

  describe('getStagedChangesByAccount', () => {
    it('returns only changes for the specified account', () => {
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      const differentAccountData = {
        ...VALID_SIGNER_DATA,
        firstName: 'Bob',
        lastName: 'Builder',
        email: 'bob.builder@example.com',
      };
      addSigner('ACCT-1003', differentAccountData);

      const changesForAcct1001 = getStagedChangesByAccount('ACCT-1001');
      const changesForAcct1003 = getStagedChangesByAccount('ACCT-1003');

      expect(changesForAcct1001.length).toBe(1);
      expect(changesForAcct1003.length).toBe(1);

      expect(changesForAcct1001[0].accountId).toBe('ACCT-1001');
      expect(changesForAcct1003[0].accountId).toBe('ACCT-1003');
    });

    it('returns empty array for account with no changes', () => {
      const changes = getStagedChangesByAccount('ACCT-1002');

      expect(Array.isArray(changes)).toBe(true);
      expect(changes.length).toBe(0);
    });

    it('returns empty array for empty account ID', () => {
      const changes = getStagedChangesByAccount('');

      expect(Array.isArray(changes)).toBe(true);
      expect(changes.length).toBe(0);
    });

    it('returns empty array for null account ID', () => {
      const changes = getStagedChangesByAccount(null);

      expect(Array.isArray(changes)).toBe(true);
      expect(changes.length).toBe(0);
    });
  });

  describe('clearStagedChanges', () => {
    it('clears all staged changes', () => {
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      expect(getStagedChanges().length).toBeGreaterThan(0);

      const result = clearStagedChanges();

      expect(result).toBe(true);
      expect(getStagedChanges().length).toBe(0);
    });

    it('returns true even when no changes exist', () => {
      const result = clearStagedChanges();

      expect(result).toBe(true);
    });
  });

  describe('clearStagedChangesByAccount', () => {
    it('clears staged changes only for the specified account', () => {
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      const differentAccountData = {
        ...VALID_SIGNER_DATA,
        firstName: 'Bob',
        lastName: 'Builder',
        email: 'bob.builder@example.com',
      };
      addSigner('ACCT-1003', differentAccountData);

      expect(getStagedChanges().length).toBe(2);

      clearStagedChangesByAccount('ACCT-1001');

      const remainingChanges = getStagedChanges();
      expect(remainingChanges.length).toBe(1);
      expect(remainingChanges[0].accountId).toBe('ACCT-1003');
    });

    it('returns false for empty account ID', () => {
      const result = clearStagedChangesByAccount('');

      expect(result).toBe(false);
    });

    it('returns false for null account ID', () => {
      const result = clearStagedChangesByAccount(null);

      expect(result).toBe(false);
    });

    it('returns true when clearing changes for an account with no changes', () => {
      const result = clearStagedChangesByAccount('ACCT-1002');

      expect(result).toBe(true);
    });
  });

  describe('hasStagedChanges', () => {
    it('returns false when no changes exist for the account', () => {
      expect(hasStagedChanges('ACCT-1001')).toBe(false);
    });

    it('returns true when changes exist for the account', () => {
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      expect(hasStagedChanges('ACCT-1001')).toBe(true);
    });

    it('returns false for a different account with no changes', () => {
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      expect(hasStagedChanges('ACCT-1002')).toBe(false);
    });

    it('returns false for null account ID', () => {
      expect(hasStagedChanges(null)).toBe(false);
    });

    it('returns false for empty account ID', () => {
      expect(hasStagedChanges('')).toBe(false);
    });
  });

  describe('getStagedChangesSummary', () => {
    it('returns zero counts when no changes exist', () => {
      const summary = getStagedChangesSummary('ACCT-1001');

      expect(summary.additions).toBe(0);
      expect(summary.edits).toBe(0);
      expect(summary.removals).toBe(0);
      expect(summary.total).toBe(0);
    });

    it('correctly counts additions', () => {
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      const summary = getStagedChangesSummary('ACCT-1001');

      expect(summary.additions).toBe(1);
      expect(summary.edits).toBe(0);
      expect(summary.removals).toBe(0);
      expect(summary.total).toBe(1);
    });

    it('correctly counts edits', () => {
      editSigner('SGN-001', {
        firstName: 'Jonathan',
        lastName: 'Smith',
        middleName: 'Robert',
        suffix: '',
        title: 'Owner',
        role: 'Primary Signer',
        email: 'jonathan.smith@example.com',
        phone: '5551234567',
      });

      const summary = getStagedChangesSummary('ACCT-1001');

      expect(summary.additions).toBe(0);
      expect(summary.edits).toBe(1);
      expect(summary.removals).toBe(0);
      expect(summary.total).toBe(1);
    });

    it('correctly counts removals', () => {
      removeSigner('SGN-001');

      const summary = getStagedChangesSummary('ACCT-1001');

      expect(summary.additions).toBe(0);
      expect(summary.edits).toBe(0);
      expect(summary.removals).toBe(1);
      expect(summary.total).toBe(1);
    });

    it('correctly counts mixed change types', () => {
      // Add a signer to ACCT-1001
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      // Edit a signer on ACCT-1001
      editSigner('SGN-002', {
        firstName: 'Sarah',
        lastName: 'Johnson',
        middleName: 'Anne',
        suffix: '',
        title: 'Co-Owner',
        role: 'Secondary Signer',
        email: 'sarah.johnson@example.com',
        phone: '5551234568',
      });

      // Remove a signer from ACCT-1001 (SGN-001)
      removeSigner('SGN-001');

      const summary = getStagedChangesSummary('ACCT-1001');

      expect(summary.additions).toBe(1);
      expect(summary.edits).toBe(1);
      expect(summary.removals).toBe(1);
      expect(summary.total).toBe(3);
    });
  });

  describe('resetSignersData', () => {
    it('resets signers data to original mock data', () => {
      // Make a change
      addSigner('ACCT-1001', VALID_SIGNER_DATA);

      const signersAfterAdd = getSigners('ACCT-1001');

      // Reset
      const result = resetSignersData();
      expect(result).toBe(true);

      const signersAfterReset = getSigners('ACCT-1001');

      // Should have fewer signers after reset (the added one is gone)
      expect(signersAfterReset.length).toBeLessThan(signersAfterAdd.length);
    });
  });

  describe('end-to-end signer management flow', () => {
    it('supports a complete add, edit, remove workflow', () => {
      // Step 1: Add a new signer
      const addResult = addSigner('ACCT-1001', VALID_SIGNER_DATA);
      expect(addResult.success).toBe(true);
      const newSignerId = addResult.signer.id;

      // Step 2: Verify the signer was added
      const signerAfterAdd = getSignerById(newSignerId);
      expect(signerAfterAdd).not.toBeNull();
      expect(signerAfterAdd.firstName).toBe('Jane');
      expect(signerAfterAdd.status).toBe('pending');

      // Step 3: Edit the new signer
      const editResult = editSigner(newSignerId, {
        firstName: 'Janet',
        lastName: 'Doe',
        middleName: 'Marie',
        suffix: '',
        title: 'CFO',
        role: 'Primary Signer',
        email: 'janet.doe@example.com',
        phone: '5559998888',
      });
      expect(editResult.success).toBe(true);
      expect(editResult.signer.firstName).toBe('Janet');
      expect(editResult.signer.role).toBe('Primary Signer');

      // Step 4: Verify staged changes
      const changes = getStagedChangesByAccount('ACCT-1001');
      expect(changes.length).toBe(2); // add + edit

      const summary = getStagedChangesSummary('ACCT-1001');
      expect(summary.additions).toBe(1);
      expect(summary.edits).toBe(1);
      expect(summary.total).toBe(2);

      // Step 5: Clear staged changes
      clearStagedChangesByAccount('ACCT-1001');
      expect(hasStagedChanges('ACCT-1001')).toBe(false);
    });

    it('supports unlock followed by edit workflow', () => {
      // SGN-006 is locked on ACCT-1003
      const unlockResult = unlockSigner('SGN-006');
      expect(unlockResult.success).toBe(true);
      expect(unlockResult.signer.status).toBe('active');

      // Now edit the unlocked signer
      const editResult = editSigner('SGN-006', {
        firstName: 'Emily',
        lastName: 'Turner',
        middleName: 'Grace',
        suffix: '',
        title: 'Controller',
        role: 'Primary Signer',
        email: 'emily.turner@example.com',
        phone: '5553456789',
      });

      expect(editResult.success).toBe(true);
      expect(editResult.signer.role).toBe('Primary Signer');
    });

    it('supports resend invitation workflow for pending signers', () => {
      // SGN-005 is pending on ACCT-1003
      const resendResult = resendInvitation('SGN-005');
      expect(resendResult.success).toBe(true);

      // Verify the signer is still pending
      const signer = getSignerById('SGN-005');
      expect(signer.status).toBe('pending');
      expect(signer.invitation.sentDate).toBeDefined();
      expect(signer.invitation.acceptedDate).toBeNull();
    });

    it('prevents removing the last signer after others are removed', () => {
      // ACCT-1001 has 2 active signers: SGN-001 and SGN-002
      const removeFirst = removeSigner('SGN-001');
      expect(removeFirst.success).toBe(true);

      // Now SGN-002 is the last signer — removal should fail
      const removeLast = removeSigner('SGN-002');
      expect(removeLast.success).toBe(false);
      expect(removeLast.error).toContain('last signer');
    });
  });
});