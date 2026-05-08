import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import { useApp } from '@/context/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import AccountCard from '@/components/AccountCard';
import Pagination from '@/components/Pagination';
import Alert from '@/components/Alert';
import { getAccounts } from '@/services/AccountService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';

/**
 * Number of accounts to display per page.
 * @type {number}
 */
const PAGE_SIZE = 6;

/**
 * AccountSelectionScreenContent component containing the account selection logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function AccountSelectionScreenContent() {
  const { goToStep, completeStep, goBack } = useNavigation();
  const { currentUser } = useSession();
  const { selectedAccount, setSelectedAccount } = useApp();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSelectedAccount, setLocalSelectedAccount] = useState(selectedAccount || null);

  const userId = currentUser ? currentUser.userId : 'unknown';

  /**
   * Loads accounts for the authenticated user on mount.
   */
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      if (!currentUser || !currentUser.userId) {
        setError('Unable to load accounts. Please log in again.');
        setLoading(false);
        return;
      }

      const userAccounts = getAccounts(currentUser.userId);

      if (!Array.isArray(userAccounts) || userAccounts.length === 0) {
        setError('No accounts found for your profile. Please contact customer support.');
        setAccounts([]);
        setLoading(false);
        return;
      }

      setAccounts(userAccounts);
      setLoading(false);

      // Auto-select and proceed if only one account
      if (userAccounts.length === 1) {
        const singleAccount = userAccounts[0];
        setLocalSelectedAccount(singleAccount);
        setSelectedAccount(singleAccount);

        logEvent(
          currentUser.userId,
          AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
          {
            action: 'account_auto_selected',
            accountId: singleAccount.id,
            accountName: singleAccount.name,
          },
          AUDIT_OUTCOMES.INFO
        );

        completeStep('accountSelection');
        goToStep('signerManagement');
      }
    } catch (err) {
      setError('An unexpected error occurred while loading accounts. Please try again.');
      setLoading(false);

      logEvent(
        userId,
        AUDIT_EVENT_TYPES.TOKEN_INVALID,
        { action: 'load_accounts', reason: 'Unexpected error' },
        AUDIT_OUTCOMES.FAILURE
      );
    }
  }, [currentUser, userId, setSelectedAccount, completeStep, goToStep]);

  /**
   * Computes the total number of pages.
   */
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(accounts.length / PAGE_SIZE));
  }, [accounts]);

  /**
   * Computes the accounts to display on the current page.
   */
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return accounts.slice(startIndex, endIndex);
  }, [accounts, currentPage]);

  /**
   * Handles selecting an account from the list.
   * @param {Object} account - The selected account object
   */
  const handleSelectAccount = useCallback((account) => {
    if (!account) {
      return;
    }

    setLocalSelectedAccount(account);
  }, []);

  /**
   * Handles page change in pagination.
   * @param {number} page - The new page number
   */
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  /**
   * Handles the Continue button click.
   * Stores the selected account in context and navigates to signer management.
   */
  const handleContinue = useCallback(() => {
    if (!localSelectedAccount) {
      return;
    }

    setSelectedAccount(localSelectedAccount);

    logEvent(
      userId,
      AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
      {
        action: 'account_selected',
        accountId: localSelectedAccount.id,
        accountName: localSelectedAccount.name,
        accountType: localSelectedAccount.accountType,
      },
      AUDIT_OUTCOMES.SUCCESS
    );

    completeStep('accountSelection');
    goToStep('signerManagement');
  }, [localSelectedAccount, userId, setSelectedAccount, completeStep, goToStep]);

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
   * Handles keyboard navigation within the account list.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  const handleListKeyDown = useCallback((event) => {
    if (!paginatedAccounts || paginatedAccounts.length === 0) {
      return;
    }

    const currentIndex = localSelectedAccount
      ? paginatedAccounts.findIndex((a) => a.id === localSelectedAccount.id)
      : -1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < paginatedAccounts.length - 1 ? currentIndex + 1 : 0;
      setLocalSelectedAccount(paginatedAccounts[nextIndex]);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : paginatedAccounts.length - 1;
      setLocalSelectedAccount(paginatedAccounts[prevIndex]);
    }
  }, [paginatedAccounts, localSelectedAccount]);

  const isContinueDisabled = !localSelectedAccount;

  return (
    <PageLayout
      title="Select an Account"
      subtitle="Choose the business account you would like to manage authorized signers for."
      showProgress={true}
      visibleSteps={['welcome', 'login', 'verify', 'tokenValidation', 'accountSelection']}
      showBackButton={true}
      showContinueButton={true}
      showCancelButton={false}
      backButtonText="Back"
      continueButtonText="Continue"
      onBack={handleBack}
      onContinue={handleContinue}
      continueDisabled={isContinueDisabled}
      showSessionTimeout={true}
      ariaLabel="Account selection page"
    >
      <div className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-6">
            <Alert
              message={error}
              variant="critical"
              dismissible={true}
              onDismiss={handleDismissError}
              ariaLabel="Account loading error"
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
              Loading your accounts...
            </p>
          </div>
        )}

        {!loading && !error && accounts.length === 0 && (
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
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <p className="text-sm text-gray-500">
              No eligible accounts were found. Please contact customer support for assistance.
            </p>
          </div>
        )}

        {!loading && !error && accounts.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} available
              </p>
              {localSelectedAccount && (
                <p className="text-sm text-primary-blue" aria-live="polite">
                  Selected: {localSelectedAccount.name}
                </p>
              )}
            </div>

            <div
              role="listbox"
              aria-label="Select a business account"
              aria-activedescendant={localSelectedAccount ? `account-${localSelectedAccount.id}` : undefined}
              onKeyDown={handleListKeyDown}
              className="space-y-3"
            >
              {paginatedAccounts.map((account) => (
                <div key={account.id} id={`account-${account.id}`}>
                  <AccountCard
                    account={account}
                    selected={localSelectedAccount ? localSelectedAccount.id === account.id : false}
                    onSelect={handleSelectAccount}
                    disabled={false}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  ariaLabel="Account list pagination"
                />
              </div>
            )}

            {!localSelectedAccount && (
              <div className="mt-4">
                <p className="text-center text-xs text-gray-500">
                  Please select an account to continue.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

/**
 * AccountSelectionScreen page component (Step 5 of the workflow).
 * Loads accounts for the authenticated user via AccountService. Displays
 * AccountCard list with masked account numbers, account types, and signer
 * counts. Auto-selects and proceeds if only one account exists. Supports
 * pagination for large account lists. On selection, stores the selected
 * account in AppContext and navigates to signer management.
 * Accessible with role='listbox' and keyboard navigation.
 * Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function AccountSelectionScreen() {
  return (
    <ErrorBoundary>
      <AccountSelectionScreenContent />
    </ErrorBoundary>
  );
}

export default AccountSelectionScreen;