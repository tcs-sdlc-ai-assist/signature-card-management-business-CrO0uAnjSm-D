import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import { useApp } from '@/context/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import ChangesSummary from '@/components/ChangesSummary';
import LegalConsent from '@/components/LegalConsent';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import { getSigners, getStagedChangesByAccount } from '@/services/SignerService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';
import { STATUS } from '@/utils/constants';
import { classNames } from '@/utils/helpers';

/**
 * Maps signer change status to display configuration.
 * @type {Object<string, { label: string, badgeClasses: string, cardClasses: string }>}
 */
const CHANGE_STATUS_MAP = {
  added: {
    label: 'New',
    badgeClasses: 'bg-green-100 text-green-800 border-green-300',
    cardClasses: 'border-green-200 bg-green-50',
  },
  modified: {
    label: 'Modified',
    badgeClasses: 'bg-amber-100 text-amber-800 border-amber-300',
    cardClasses: 'border-amber-200 bg-amber-50',
  },
  removed: {
    label: 'Removed',
    badgeClasses: 'bg-red-100 text-red-800 border-red-300',
    cardClasses: 'border-red-200 bg-red-50',
  },
  unchanged: {
    label: 'Unchanged',
    badgeClasses: 'bg-gray-100 text-gray-600 border-gray-300',
    cardClasses: 'border-gray-200 bg-white',
  },
};

/**
 * Maps signer status values to their display configuration.
 * @type {Object<string, { label: string, classes: string }>}
 */
const STATUS_BADGE_MAP = {
  [STATUS.ACTIVE]: {
    label: 'Active',
    classes: 'bg-green-100 text-green-800 border-green-300',
  },
  [STATUS.PENDING]: {
    label: 'Pending',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  [STATUS.LOCKED]: {
    label: 'Locked',
    classes: 'bg-red-100 text-red-800 border-red-300',
  },
  [STATUS.REMOVED]: {
    label: 'Removed',
    classes: 'bg-gray-100 text-gray-500 border-gray-300',
  },
};

/**
 * Formats a signer's full display name from their name parts.
 * @param {Object} signer - The signer object
 * @returns {string} The formatted display name
 */
function formatSignerName(signer) {
  if (!signer) {
    return 'Unknown Signer';
  }

  const parts = [];

  if (signer.firstName) {
    parts.push(signer.firstName);
  }

  if (signer.middleName) {
    parts.push(signer.middleName);
  }

  if (signer.lastName) {
    parts.push(signer.lastName);
  }

  if (signer.suffix) {
    parts.push(signer.suffix);
  }

  return parts.length > 0 ? parts.join(' ') : 'Unknown Signer';
}

/**
 * Determines the change status of a signer based on staged changes.
 * @param {Object} signer - The signer object
 * @param {Array<Object>} changes - The staged changes array
 * @returns {string} The change status: 'added', 'modified', 'removed', or 'unchanged'
 */
function getSignerChangeStatus(signer, changes) {
  if (!signer || !Array.isArray(changes)) {
    return 'unchanged';
  }

  const addChange = changes.find(
    (c) => c.type === 'add' && c.signerId === signer.id
  );
  if (addChange) {
    return 'added';
  }

  const removeChange = changes.find(
    (c) => c.type === 'remove' && c.signerId === signer.id
  );
  if (removeChange) {
    return 'removed';
  }

  const editChange = changes.find(
    (c) => c.type === 'edit' && c.signerId === signer.id
  );
  if (editChange) {
    return 'modified';
  }

  return 'unchanged';
}

/**
 * StatusBadge component renders a colored badge indicating the signer's status.
 *
 * @param {Object} props
 * @param {string} props.status - The signer status value
 * @returns {React.ReactElement}
 */
function StatusBadge({ status }) {
  const config = STATUS_BADGE_MAP[status] || {
    label: status || 'Unknown',
    classes: 'bg-gray-100 text-gray-600 border-gray-300',
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.classes
      )}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

/**
 * ChangeStatusBadge component renders a colored badge indicating the change type.
 *
 * @param {Object} props
 * @param {string} props.changeStatus - The change status value
 * @returns {React.ReactElement}
 */
function ChangeStatusBadge({ changeStatus }) {
  const config = CHANGE_STATUS_MAP[changeStatus] || CHANGE_STATUS_MAP.unchanged;

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.badgeClasses
      )}
      aria-label={`Change: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

/**
 * ReviewSignerCard component for displaying a signer in the final review list.
 *
 * @param {Object} props
 * @param {Object} props.signer - The signer data object
 * @param {string} props.changeStatus - The change status of the signer
 * @returns {React.ReactElement}
 */
function ReviewSignerCard({ signer, changeStatus }) {
  const config = CHANGE_STATUS_MAP[changeStatus] || CHANGE_STATUS_MAP.unchanged;
  const displayName = formatSignerName(signer);
  const isRemoved = changeStatus === 'removed';

  const cardClasses = classNames(
    'rounded border p-4 transition-shadow duration-200',
    config.cardClasses,
    {
      'opacity-60': isRemoved,
    }
  );

  return (
    <div
      className={cardClasses}
      role="region"
      aria-label={`Signer: ${displayName} - ${config.label}`}
    >
      <div className="flex flex-col tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3
              className={classNames(
                'text-base font-medium',
                {
                  'text-body': !isRemoved,
                  'text-gray-500 line-through': isRemoved,
                }
              )}
            >
              {displayName}
            </h3>
            <StatusBadge status={signer.status} />
            <ChangeStatusBadge changeStatus={changeStatus} />
          </div>

          {(signer.role || signer.title) && (
            <div className="mb-2 text-sm text-gray-600">
              {signer.role && (
                <span>{signer.role}</span>
              )}
              {signer.role && signer.title && (
                <span className="mx-1">·</span>
              )}
              {signer.title && (
                <span>{signer.title}</span>
              )}
            </div>
          )}

          <div className="space-y-1 text-sm text-gray-500">
            {signer.emailMasked && (
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span aria-label="Masked email">{signer.emailMasked}</span>
              </div>
            )}
            {signer.phoneMasked && (
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span aria-label="Masked phone number">{signer.phoneMasked}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AccountDetailsCard component for displaying account and controlling party info.
 *
 * @param {Object} props
 * @param {Object} props.account - The selected account object
 * @param {Object} props.currentUser - The current user object
 * @returns {React.ReactElement}
 */
function AccountDetailsCard({ account, currentUser }) {
  if (!account) {
    return null;
  }

  return (
    <div
      className="rounded border border-gray-200 bg-white p-4"
      role="region"
      aria-label="Account details"
    >
      <h3 className="mb-3 text-sm font-medium text-body">
        Account Details
      </h3>
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Account Name</span>
          <span className="font-medium text-body">{account.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Account Number</span>
          <span className="font-medium text-body">{account.maskedAccountNumber}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Account Type</span>
          <span className="font-medium capitalize text-body">{account.accountType}</span>
        </div>
        {currentUser && currentUser.username && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Controlling Party</span>
            <span className="font-medium text-body">{currentUser.username}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ReviewSignersScreenContent component containing the review signers logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function ReviewSignersScreenContent() {
  const { goToStep, completeStep, goBack } = useNavigation();
  const { currentUser } = useSession();
  const { selectedAccount, stagedChanges } = useApp();

  const [legalConsent, setLegalConsent] = useState(false);
  const [legalConsentError, setLegalConsentError] = useState(null);
  const [error, setError] = useState(null);
  const [signers, setSigners] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = currentUser ? currentUser.userId : 'unknown';
  const accountId = selectedAccount ? selectedAccount.id : null;

  /**
   * Loads all signers for the selected account (including removed).
   */
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      if (!accountId) {
        setError('No account selected. Please go back and select an account.');
        setLoading(false);
        return;
      }

      const accountSigners = getSigners(accountId, true);
      setSigners(accountSigners);
      setLoading(false);
    } catch (err) {
      setError('An unexpected error occurred while loading signer data. Please try again.');
      setLoading(false);
    }
  }, [accountId]);

  /**
   * Retrieves staged changes from both AppContext and SignerService,
   * preferring AppContext if available.
   */
  const allChanges = useMemo(() => {
    if (Array.isArray(stagedChanges) && stagedChanges.length > 0) {
      return stagedChanges;
    }

    if (accountId) {
      const serviceChanges = getStagedChangesByAccount(accountId);
      if (Array.isArray(serviceChanges) && serviceChanges.length > 0) {
        return serviceChanges;
      }
    }

    return [];
  }, [stagedChanges, accountId]);

  const hasChanges = allChanges.length > 0;

  /**
   * Computes a summary of changes by type.
   */
  const changesSummary = useMemo(() => {
    const additions = allChanges.filter((c) => c.type === 'add').length;
    const edits = allChanges.filter((c) => c.type === 'edit').length;
    const removals = allChanges.filter((c) => c.type === 'remove').length;

    return {
      additions,
      edits,
      removals,
      total: additions + edits + removals,
    };
  }, [allChanges]);

  /**
   * Builds the list of signers with their change status for display.
   * Includes removed signers from staged changes that may not be in the current list.
   */
  const reviewSigners = useMemo(() => {
    const signerList = signers.map((signer) => {
      const changeStatus = getSignerChangeStatus(signer, allChanges);
      return {
        ...signer,
        changeStatus,
      };
    });

    // Sort: added first, then modified, then unchanged, then removed
    const sortOrder = { added: 0, modified: 1, unchanged: 2, removed: 3 };
    signerList.sort((a, b) => {
      const orderA = sortOrder[a.changeStatus] !== undefined ? sortOrder[a.changeStatus] : 99;
      const orderB = sortOrder[b.changeStatus] !== undefined ? sortOrder[b.changeStatus] : 99;
      return orderA - orderB;
    });

    return signerList;
  }, [signers, allChanges]);

  /**
   * Counts of signers by change status.
   */
  const signerCounts = useMemo(() => {
    const added = reviewSigners.filter((s) => s.changeStatus === 'added').length;
    const modified = reviewSigners.filter((s) => s.changeStatus === 'modified').length;
    const removed = reviewSigners.filter((s) => s.changeStatus === 'removed').length;
    const unchanged = reviewSigners.filter((s) => s.changeStatus === 'unchanged').length;

    return { added, modified, removed, unchanged, total: reviewSigners.length };
  }, [reviewSigners]);

  /**
   * Handles the legal consent checkbox change.
   * @param {boolean} checked - Whether the checkbox is checked
   */
  const handleLegalConsentChange = useCallback((checked) => {
    setLegalConsent(checked);
    if (checked) {
      setLegalConsentError(null);
    }
  }, []);

  /**
   * Handles the Submit button click.
   * Validates legal consent and navigates to the submission screen.
   */
  const handleSubmit = useCallback(() => {
    if (!legalConsent) {
      setLegalConsentError('You must acknowledge and agree to the legal terms before submitting.');
      return;
    }

    if (!hasChanges) {
      setError('No changes have been made. Please go back and make changes before submitting.');
      return;
    }

    logEvent(
      userId,
      AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
      {
        action: 'proceed_to_submission',
        accountId,
        totalChanges: changesSummary.total,
        additions: changesSummary.additions,
        edits: changesSummary.edits,
        removals: changesSummary.removals,
        legalConsentGiven: true,
      },
      AUDIT_OUTCOMES.INFO
    );

    completeStep('reviewSigners');
    goToStep('submission');
  }, [legalConsent, hasChanges, userId, accountId, changesSummary, completeStep, goToStep]);

  /**
   * Handles the Edit button click.
   * Navigates back to signer management for further changes.
   */
  const handleEdit = useCallback(() => {
    goToStep('signerManagement');
  }, [goToStep]);

  /**
   * Handles the Back button click.
   */
  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  /**
   * Dismisses the error alert.
   */
  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  const isSubmitDisabled = !legalConsent || !hasChanges || loading;

  return (
    <PageLayout
      title="Review & Submit"
      subtitle={
        selectedAccount
          ? `Final review of signer changes for ${selectedAccount.name} (${selectedAccount.maskedAccountNumber}). Please review all changes carefully before submitting.`
          : 'Review all changes carefully before submitting.'
      }
      showProgress={true}
      visibleSteps={['accountSelection', 'signerManagement', 'addEditSigner', 'confirmSigners', 'reviewSigners', 'submission']}
      showBackButton={true}
      showContinueButton={false}
      showCancelButton={true}
      backButtonText="Back"
      cancelButtonText="Cancel"
      onBack={handleBack}
      hasUnsavedChanges={hasChanges}
      showSessionTimeout={true}
      ariaLabel="Review and submit signer changes page"
    >
      <div className="mx-auto max-w-3xl">
        {error && (
          <div className="mb-6">
            <Alert
              message={error}
              variant="critical"
              dismissible={true}
              onDismiss={handleDismissError}
              ariaLabel="Review error"
            />
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              className="mb-4 h-10 w-10 animate-spin text-primary-blue"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm font-medium text-body" aria-live="polite" aria-atomic="true">
              Loading review data...
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            <AccountDetailsCard
              account={selectedAccount}
              currentUser={currentUser}
            />

            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-medium text-body">
                  Changes Overview
                </h2>
                {hasChanges && (
                  <div className="flex items-center gap-2">
                    {changesSummary.additions > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        +{changesSummary.additions}
                      </span>
                    )}
                    {changesSummary.edits > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        ~{changesSummary.edits}
                      </span>
                    )}
                    {changesSummary.removals > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        -{changesSummary.removals}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {changesSummary.total} {changesSummary.total === 1 ? 'change' : 'changes'} total
                    </span>
                  </div>
                )}
              </div>

              <ChangesSummary
                changes={allChanges}
                title=""
                showEmptyState={true}
                emptyMessage="No changes have been made."
                ariaLabel="Staged signer changes detail"
              />
            </div>

            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-medium text-body">
                  Complete Signer List
                </h2>
                <Button
                  variant="secondary"
                  onClick={handleEdit}
                  ariaLabel="Edit Signers"
                >
                  Edit Signers
                </Button>
              </div>

              {reviewSigners.length === 0 && (
                <div className="rounded border border-gray-200 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">
                    No signers found for this account.
                  </p>
                </div>
              )}

              {reviewSigners.length > 0 && (
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    {signerCounts.added > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden="true" />
                        {signerCounts.added} new
                      </span>
                    )}
                    {signerCounts.modified > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
                        {signerCounts.modified} modified
                      </span>
                    )}
                    {signerCounts.removed > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
                        {signerCounts.removed} removed
                      </span>
                    )}
                    {signerCounts.unchanged > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" aria-hidden="true" />
                        {signerCounts.unchanged} unchanged
                      </span>
                    )}
                  </div>

                  <div
                    className="space-y-3"
                    role="list"
                    aria-label="Complete authorized signers list for review"
                  >
                    {reviewSigners.map((signer) => (
                      <div key={signer.id} role="listitem">
                        <ReviewSignerCard
                          signer={signer}
                          changeStatus={signer.changeStatus}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-500">
                      {signerCounts.total} {signerCounts.total === 1 ? 'signer' : 'signers'} total
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-4 text-lg font-medium text-body">
                Legal Acknowledgment
              </h2>
              <LegalConsent
                checked={legalConsent}
                onChange={handleLegalConsentChange}
                required={true}
                disabled={!hasChanges}
                error={legalConsentError}
                ariaLabel="I acknowledge and agree to the legal terms for submitting signer changes"
              />
            </div>

            {!hasChanges && (
              <div className="mb-6">
                <Alert
                  message="No changes have been made. Please go back to the signer management screen to add, edit, or remove signers before submitting."
                  variant="warning"
                  ariaLabel="No changes warning"
                />
              </div>
            )}

            <div className="rounded border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                By clicking &quot;Submit Changes&quot;, your updated signature card will be submitted for processing.
                You will receive a confirmation number once the submission is complete.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={handleEdit}
                ariaLabel="Return to Edit Signers"
              >
                Edit Signers
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                ariaLabel="Submit Changes"
              >
                Submit Changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

/**
 * ReviewSignersScreen page component (Step 8 of the workflow).
 * Final review page displaying a read-only view of the complete authorized
 * signer list after all changes have been applied. Clearly distinguishes
 * unchanged, modified, new, and removed signers using color coding and
 * badges. Displays account details and controlling party information.
 * Includes a LegalConsent checkbox that must be checked to enable the
 * Submit button. 'Edit' button returns to signer management for further
 * changes. 'Submit' button proceeds to the submission screen.
 * Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function ReviewSignersScreen() {
  return (
    <ErrorBoundary>
      <ReviewSignersScreenContent />
    </ErrorBoundary>
  );
}

export default ReviewSignersScreen;