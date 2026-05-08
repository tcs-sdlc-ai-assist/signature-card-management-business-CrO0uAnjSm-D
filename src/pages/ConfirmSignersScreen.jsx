import { useState, useCallback, useMemo } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import { useApp } from '@/context/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import ChangesSummary from '@/components/ChangesSummary';
import Alert from '@/components/Alert';
import { getStagedChangesByAccount } from '@/services/SignerService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';

/**
 * ConfirmSignersScreenContent component containing the confirm signers logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function ConfirmSignersScreenContent() {
  const { goToStep, completeStep, goBack } = useNavigation();
  const { currentUser } = useSession();
  const { selectedAccount, stagedChanges } = useApp();

  const [error, setError] = useState(null);

  const userId = currentUser ? currentUser.userId : 'unknown';
  const accountId = selectedAccount ? selectedAccount.id : null;

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
   * Handles the Continue button click.
   * Navigates to the review signers screen.
   */
  const handleContinue = useCallback(() => {
    if (!hasChanges) {
      setError('No changes have been made. Please go back and make changes before continuing.');
      return;
    }

    logEvent(
      userId,
      AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
      {
        action: 'proceed_to_review',
        accountId,
        totalChanges: changesSummary.total,
        additions: changesSummary.additions,
        edits: changesSummary.edits,
        removals: changesSummary.removals,
      },
      AUDIT_OUTCOMES.INFO
    );

    completeStep('confirmSigners');
    goToStep('reviewSigners');
  }, [hasChanges, userId, accountId, changesSummary, completeStep, goToStep]);

  /**
   * Handles the Back button click.
   * Navigates back to signer management.
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

  return (
    <PageLayout
      title="Confirm Signer Changes"
      subtitle={
        selectedAccount
          ? `Review the changes you have made to ${selectedAccount.name} (${selectedAccount.maskedAccountNumber}) before proceeding.`
          : 'Review the changes you have made before proceeding.'
      }
      showProgress={true}
      visibleSteps={['accountSelection', 'signerManagement', 'addEditSigner', 'confirmSigners', 'reviewSigners', 'submission']}
      showBackButton={true}
      showContinueButton={true}
      showCancelButton={true}
      backButtonText="Back"
      continueButtonText="Continue to Review"
      cancelButtonText="Cancel"
      onBack={handleBack}
      onContinue={handleContinue}
      continueDisabled={!hasChanges}
      hasUnsavedChanges={hasChanges}
      showSessionTimeout={true}
      ariaLabel="Confirm signer changes page"
    >
      <div className="mx-auto max-w-3xl">
        {error && (
          <div className="mb-6">
            <Alert
              message={error}
              variant="warning"
              dismissible={true}
              onDismiss={handleDismissError}
              ariaLabel="Confirmation error"
            />
          </div>
        )}

        {!hasChanges && (
          <div className="mb-6">
            <Alert
              message="No changes have been made yet. Please go back to the signer management screen to add, edit, or remove signers before continuing."
              variant="warning"
              ariaLabel="No changes warning"
            />
          </div>
        )}

        <ChangesSummary
          changes={allChanges}
          title="Changes Summary"
          showEmptyState={true}
          emptyMessage="No changes have been made. Please go back to manage signers."
          ariaLabel="Staged signer changes summary"
        />

        {hasChanges && (
          <div className="mt-6 rounded border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              Please review the changes above carefully. You will have one more opportunity to review
              all changes on the next screen before final submission.
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

/**
 * ConfirmSignersScreen page component (Step 7 of the workflow).
 * Displays the ChangesSummary component showing all staged additions,
 * edits, and removals for the selected account. Allows the user to go
 * back to signer management for further changes. Shows a warning if no
 * changes have been made. 'Continue to Review' button proceeds to the
 * final review screen. Wrapped in an ErrorBoundary for resilient error
 * handling.
 *
 * @returns {React.ReactElement}
 */
function ConfirmSignersScreen() {
  return (
    <ErrorBoundary>
      <ConfirmSignersScreenContent />
    </ErrorBoundary>
  );
}

export default ConfirmSignersScreen;