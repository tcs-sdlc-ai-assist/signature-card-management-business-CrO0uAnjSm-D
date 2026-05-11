import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import { useApp } from '@/context/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import SignerCard from '@/components/SignerCard';
import FilterSort from '@/components/FilterSort';
import Pagination from '@/components/Pagination';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import RemoveSignerModal from '@/components/RemoveSignerModal';
import UnlockSignerButton from '@/components/UnlockSignerButton';
import ResendInvitationButton from '@/components/ResendInvitationButton';
import { getSigners } from '@/services/SignerService';
import { canUnlock, canResend } from '@/services/RateLimitService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';
import { STATUS } from '@/utils/constants';
import { setToLocalStorage } from '@/utils/helpers';

/**
 * Number of signers to display per page.
 * @type {number}
 */
const PAGE_SIZE = 6;

/**
 * Formats a signer's full display name from their name parts.
 * @param {Object} signer - The signer object
 * @returns {string} The formatted display name
 */
function formatSignerName(signer) {
  if (!signer) {
    return '';
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

  return parts.join(' ');
}

/**
 * Filters signers by search query (matches against first name, last name, and full name).
 * @param {Array<Object>} signers - The signers array
 * @param {string} query - The search query
 * @returns {Array<Object>} Filtered signers
 */
function filterBySearch(signers, query) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return signers;
  }

  const lowerQuery = query.trim().toLowerCase();

  return signers.filter((signer) => {
    const fullName = formatSignerName(signer).toLowerCase();
    const firstName = (signer.firstName || '').toLowerCase();
    const lastName = (signer.lastName || '').toLowerCase();

    return (
      fullName.includes(lowerQuery) ||
      firstName.includes(lowerQuery) ||
      lastName.includes(lowerQuery)
    );
  });
}

/**
 * Filters signers by status.
 * @param {Array<Object>} signers - The signers array
 * @param {string} statusFilter - The status filter value ('all' or a specific status)
 * @returns {Array<Object>} Filtered signers
 */
function filterByStatus(signers, statusFilter) {
  if (!statusFilter || statusFilter === 'all') {
    return signers;
  }

  return signers.filter((signer) => signer.status === statusFilter);
}

/**
 * Sorts signers by the specified sort option.
 * @param {Array<Object>} signers - The signers array
 * @param {string} sortBy - The sort option value
 * @returns {Array<Object>} Sorted signers
 */
function sortSigners(signers, sortBy) {
  const sorted = [...signers];

  switch (sortBy) {
    case 'name-asc':
      sorted.sort((a, b) => {
        const nameA = formatSignerName(a).toLowerCase();
        const nameB = formatSignerName(b).toLowerCase();
        return nameA.localeCompare(nameB);
      });
      break;
    case 'name-desc':
      sorted.sort((a, b) => {
        const nameA = formatSignerName(a).toLowerCase();
        const nameB = formatSignerName(b).toLowerCase();
        return nameB.localeCompare(nameA);
      });
      break;
    case 'status': {
      const statusOrder = {
        [STATUS.ACTIVE]: 1,
        [STATUS.PENDING]: 2,
        [STATUS.LOCKED]: 3,
        [STATUS.REMOVED]: 4,
      };
      sorted.sort((a, b) => {
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;
        return orderA - orderB;
      });
      break;
    }
    case 'date-added':
      sorted.sort((a, b) => {
        const dateA = new Date(a.dateAdded || 0);
        const dateB = new Date(b.dateAdded || 0);
        return dateB.getTime() - dateA.getTime();
      });
      break;
    default:
      break;
  }

  return sorted;
}

/**
 * SignerManagementScreenContent component containing the signer management logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function SignerManagementScreenContent() {
  const { goToStep, completeStep, goBack } = useNavigation();
  const { currentUser } = useSession();
  const { selectedAccount, stagedChanges } = useApp();

  const [signers, setSigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);

  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [signerToRemove, setSignerToRemove] = useState(null);

  const userId = currentUser ? currentUser.userId : 'unknown';
  const accountId = selectedAccount ? selectedAccount.id : null;

  /**
   * Loads signers for the selected account.
   */
  const loadSigners = useCallback(() => {
    if (!accountId) {
      setError('No account selected. Please go back and select an account.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accountSigners = getSigners(accountId);
      setSigners(accountSigners);
      setLoading(false);
    } catch (err) {
      setError('An unexpected error occurred while loading signers. Please try again.');
      setLoading(false);

      logEvent(
        userId,
        AUDIT_EVENT_TYPES.TOKEN_INVALID,
        { action: 'load_signers', accountId, reason: 'Unexpected error' },
        AUDIT_OUTCOMES.FAILURE
      );
    }
  }, [accountId, userId]);

  /**
   * Loads signers on mount and when accountId changes.
   */
  useEffect(() => {
    loadSigners();
  }, [loadSigners]);

  /**
   * Applies search, filter, and sort to the signers list.
   */
  const processedSigners = useMemo(() => {
    let result = [...signers];
    result = filterBySearch(result, searchQuery);
    result = filterByStatus(result, statusFilter);
    result = sortSigners(result, sortBy);
    return result;
  }, [signers, searchQuery, statusFilter, sortBy]);

  /**
   * Computes the total number of pages.
   */
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(processedSigners.length / PAGE_SIZE));
  }, [processedSigners]);

  /**
   * Computes the signers to display on the current page.
   */
  const paginatedSigners = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return processedSigners.slice(startIndex, endIndex);
  }, [processedSigners, currentPage, totalPages]);

  /**
   * Resets to page 1 when filters change.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  /**
   * Counts of active/pending signers (non-removed).
   */
  const activeSignerCount = useMemo(() => {
    return signers.filter((s) => s.status !== STATUS.REMOVED).length;
  }, [signers]);

  /**
   * Determines if a signer is the last non-removed signer on the account.
   * @param {Object} signer - The signer to check
   * @returns {boolean}
   */
  const isLastSigner = useCallback((signer) => {
    const nonRemovedSigners = signers.filter((s) => s.status !== STATUS.REMOVED);
    return nonRemovedSigners.length <= 1;
  }, [signers]);

  /**
   * Handles search query change.
   * @param {string} value - The new search query
   */
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  /**
   * Handles status filter change.
   * @param {string} value - The new status filter value
   */
  const handleStatusFilterChange = useCallback((value) => {
    setStatusFilter(value);
  }, []);

  /**
   * Handles sort change.
   * @param {string} value - The new sort option value
   */
  const handleSortChange = useCallback((value) => {
    setSortBy(value);
  }, []);

  /**
   * Handles page change in pagination.
   * @param {number} page - The new page number
   */
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  /**
   * Handles the Add Signer button click.
   * Navigates to the add/edit signer form.
   */
  const handleAddSigner = useCallback(() => {
    setToLocalStorage('scm_edit_signer_id', null);
    goToStep('addEditSigner');
  }, [goToStep]);

  /**
   * Handles the Edit button click on a signer card.
   * Stores the signer to edit and navigates to the add/edit form.
   * @param {Object} signer - The signer to edit
   */
  const handleEditSigner = useCallback((signer) => {
    if (!signer) {
      return;
    }

    logEvent(
      userId,
      AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
      {
        action: 'navigate_edit_signer',
        accountId,
        signerId: signer.id,
        firstName: signer.firstName,
        lastName: signer.lastName,
      },
      AUDIT_OUTCOMES.INFO
    );
    setToLocalStorage('scm_edit_signer_id', signer.id);
    goToStep('addEditSigner');
  }, [userId, accountId, goToStep]);

  /**
   * Handles the Remove button click on a signer card.
   * Opens the remove confirmation modal.
   * @param {Object} signer - The signer to remove
   */
  const handleRemoveSigner = useCallback((signer) => {
    if (!signer) {
      return;
    }

    setSignerToRemove(signer);
    setRemoveModalOpen(true);
  }, []);

  /**
   * Handles the Unlock button click on a signer card.
   * Delegates to the UnlockSignerButton component via callback.
   * @param {Object} signer - The signer to unlock
   */
  const handleUnlockSigner = useCallback((signer) => {
    // Handled by UnlockSignerButton component
  }, []);

  /**
   * Handles the Resend button click on a signer card.
   * Delegates to the ResendInvitationButton component via callback.
   * @param {Object} signer - The signer to resend invitation to
   */
  const handleResendInvitation = useCallback((signer) => {
    // Handled by ResendInvitationButton component
  }, []);

  /**
   * Handles successful signer removal.
   * Reloads the signers list and shows a success message.
   * @param {Object} signer - The removed signer
   */
  const handleRemoveSuccess = useCallback((signer) => {
    setRemoveModalOpen(false);
    setSignerToRemove(null);
    setSuccessMessage(`${formatSignerName(signer)} has been removed from the account.`);
    loadSigners();
  }, [loadSigners]);

  /**
   * Handles failed signer removal.
   * @param {Object} signer - The signer that failed to be removed
   * @param {string} errorMsg - The error message
   */
  const handleRemoveFailure = useCallback((signer, errorMsg) => {
    // Modal handles its own error display
  }, []);

  /**
   * Handles cancelling the remove modal.
   */
  const handleRemoveCancel = useCallback(() => {
    setRemoveModalOpen(false);
    setSignerToRemove(null);
  }, []);

  /**
   * Handles successful signer unlock.
   * Reloads the signers list and shows a success message.
   * @param {Object} signer - The unlocked signer
   */
  const handleUnlockSuccess = useCallback((signer) => {
    setSuccessMessage(`${formatSignerName(signer)} has been unlocked.`);
    loadSigners();
  }, [loadSigners]);

  /**
   * Handles successful invitation resend.
   * Shows a success message.
   * @param {Object} signer - The signer the invitation was resent to
   */
  const handleResendSuccess = useCallback((signer) => {
    setSuccessMessage(`Invitation has been resent to ${formatSignerName(signer)}.`);
    loadSigners();
  }, [loadSigners]);

  /**
   * Handles the Continue button click.
   * Navigates to the confirm signers screen.
   */
  const handleContinue = useCallback(() => {
    logEvent(
      userId,
      AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
      {
        action: 'proceed_to_confirm',
        accountId,
        signerCount: activeSignerCount,
      },
      AUDIT_OUTCOMES.INFO
    );

    completeStep('signerManagement');
    completeStep('addEditSigner');
    goToStep('confirmSigners');
  }, [userId, accountId, activeSignerCount, completeStep, goToStep]);

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

  /**
   * Dismisses the success message alert.
   */
  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const hasUnsavedChanges = Array.isArray(stagedChanges) && stagedChanges.length > 0;

  return (
    <PageLayout
      title="Manage Authorized Signers"
      subtitle={
        selectedAccount
          ? `Managing signers for ${selectedAccount.name} (${selectedAccount.maskedAccountNumber})`
          : 'Manage authorized signers on your account.'
      }
      showProgress={true}
      visibleSteps={['accountSelection', 'signerManagement', 'addEditSigner', 'confirmSigners', 'reviewSigners', 'submission']}
      showBackButton={true}
      showContinueButton={true}
      showCancelButton={true}
      backButtonText="Back"
      continueButtonText="Continue"
      cancelButtonText="Cancel"
      onBack={handleBack}
      onContinue={handleContinue}
      continueDisabled={loading || activeSignerCount === 0}
      hasUnsavedChanges={hasUnsavedChanges}
      showSessionTimeout={true}
      ariaLabel="Signer management page"
    >
      <div className="mx-auto max-w-3xl">
        {error && (
          <div className="mb-6">
            <Alert
              message={error}
              variant="critical"
              dismissible={true}
              onDismiss={handleDismissError}
              ariaLabel="Signer loading error"
            />
          </div>
        )}

        {successMessage && (
          <div className="mb-6">
            <Alert
              message={successMessage}
              variant="success"
              dismissible={true}
              onDismiss={handleDismissSuccess}
              ariaLabel="Signer action success"
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
              Loading signers...
            </p>
          </div>
        )}

        {!loading && !error && (
          <div>
            <div className="mb-6 flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {activeSignerCount} {activeSignerCount === 1 ? 'signer' : 'signers'} on this account
                </p>
                {hasUnsavedChanges && (
                  <p className="mt-1 text-xs text-amber-600">
                    You have unsaved changes.
                  </p>
                )}
              </div>
              <Button
                variant="primary"
                onClick={handleAddSigner}
                ariaLabel="Add Signer"
              >
                Add Signer
              </Button>
            </div>

            <div className="mb-6">
              <FilterSort
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                statusFilter={statusFilter}
                onStatusFilterChange={handleStatusFilterChange}
                sortBy={sortBy}
                onSortChange={handleSortChange}
                disabled={false}
                ariaLabel="Filter and sort signers"
              />
            </div>

            {processedSigners.length === 0 && (
              <div className="rounded border border-gray-200 bg-gray-50 p-8 text-center">
                <svg
                  className="mx-auto mb-4 h-12 w-12 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {signers.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No signers found for this account. Click &quot;Add Signer&quot; to add an authorized signer.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    No signers match your current filters. Try adjusting your search or filter criteria.
                  </p>
                )}
              </div>
            )}

            {processedSigners.length > 0 && (
              <div>
                <div
                  className="space-y-3"
                  role="list"
                  aria-label="Authorized signers list"
                >
                  {paginatedSigners.map((signer) => {
                    const signerIsLast = isLastSigner(signer);
                    const isLocked = signer.status === STATUS.LOCKED;
                    const isPending = signer.status === STATUS.PENDING;

                    return (
                      <div key={signer.id} role="listitem">
                        <SignerCard
                          signer={signer}
                          isLastSigner={signerIsLast}
                          onEdit={handleEditSigner}
                          onRemove={handleRemoveSigner}
                          onUnlock={handleUnlockSigner}
                          onResend={handleResendInvitation}
                          unlockDisabled={isLocked ? !canUnlock(signer.id) : false}
                          resendDisabled={isPending ? !canResend(signer.id) : false}
                        />

                        {isLocked && (
                          <div className="mt-2 ml-4">
                            <UnlockSignerButton
                              signer={signer}
                              onUnlockSuccess={handleUnlockSuccess}
                              disabled={false}
                            />
                          </div>
                        )}

                        {isPending && (
                          <div className="mt-2 ml-4">
                            <ResendInvitationButton
                              signer={signer}
                              onResendSuccess={handleResendSuccess}
                              disabled={false}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      ariaLabel="Signer list pagination"
                    />
                  </div>
                )}

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Showing {paginatedSigners.length} of {processedSigners.length} {processedSigners.length === 1 ? 'signer' : 'signers'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <RemoveSignerModal
          isOpen={removeModalOpen}
          signer={signerToRemove}
          isLastSigner={signerToRemove ? isLastSigner(signerToRemove) : false}
          onCancel={handleRemoveCancel}
          onRemoveSuccess={handleRemoveSuccess}
          onRemoveFailure={handleRemoveFailure}
        />
      </div>
    </PageLayout>
  );
}

/**
 * SignerManagementScreen page component (Step 6 of the workflow).
 * Displays a consolidated list of all authorized signers for the selected
 * account using SignerCard components. Shows total signer count. Includes
 * FilterSort controls for searching, filtering by status, and sorting.
 * Action buttons: 'Add Signer' navigates to the add form. Each SignerCard
 * has Edit, Remove, Unlock (if locked), and Resend (if pending) actions.
 * Integrates UnlockSignerButton and ResendInvitationButton components.
 * 'Continue' button proceeds to the confirm screen.
 * Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function SignerManagementScreen() {
  return (
    <ErrorBoundary>
      <SignerManagementScreenContent />
    </ErrorBoundary>
  );
}

export default SignerManagementScreen;