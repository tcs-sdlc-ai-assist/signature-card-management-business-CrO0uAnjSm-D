import { useState, useCallback } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import { useApp } from '@/context/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import SignerForm from '@/components/SignerForm';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import { addSigner } from '@/services/SignerService';
import { logSignerAdded, logEvent, SIGNER_AUDIT_EVENT_TYPES } from '@/services/AuditLogService';
import { AUDIT_OUTCOMES } from '@/services/AuditService';

/**
 * AddSignerScreenContent component containing the add signer logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function AddSignerScreenContent() {
  const { goToStep, goBack } = useNavigation();
  const { currentUser } = useSession();
  const { selectedAccount, addStagedChange } = useApp();

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [serverErrors, setServerErrors] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [addedCount, setAddedCount] = useState(0);
  const [showForm, setShowForm] = useState(true);

  const userId = currentUser ? currentUser.userId : 'unknown';
  const accountId = selectedAccount ? selectedAccount.id : null;

  /**
   * Handles the signer form submission.
   * Calls SignerService.addSigner and logs the event via AuditLogService.
   * @param {Object} formData - The validated signer form data
   */
  const handleSubmit = useCallback((formData) => {
    if (!accountId) {
      setServerError('No account selected. Please go back and select an account.');
      return;
    }

    setLoading(true);
    setServerError(null);
    setServerErrors(null);
    setSuccessMessage(null);

    const result = addSigner(accountId, formData);

    if (result.success) {
      logSignerAdded(userId, {
        accountId,
        signerId: result.signer.id,
        firstName: result.signer.firstName,
        lastName: result.signer.lastName,
        email: result.signer.email,
        after: { ...result.signer },
      });

      addStagedChange({
        id: result.signer.id,
        type: 'add',
        accountId,
        signerId: result.signer.id,
        before: null,
        after: { ...result.signer },
        timestamp: new Date().toISOString(),
      });

      setLoading(false);
      setAddedCount((prev) => prev + 1);

      const displayName = [result.signer.firstName, result.signer.lastName]
        .filter(Boolean)
        .join(' ');

      setSuccessMessage(
        `${displayName} has been successfully added as an authorized signer.`
      );
      setShowForm(false);
    } else {
      logEvent(
        userId,
        SIGNER_AUDIT_EVENT_TYPES.SIGNER_ADDED,
        {
          accountId,
          action: 'add_signer',
          reason: result.error || 'Add signer failed',
          firstName: formData.firstName,
          lastName: formData.lastName,
        },
        AUDIT_OUTCOMES.FAILURE
      );

      setLoading(false);

      if (result.errors) {
        setServerErrors(result.errors);
      }

      setServerError(result.error || 'Unable to add the signer. Please try again.');
    }
  }, [accountId, userId, addStagedChange]);

  /**
   * Handles the cancel button click.
   * Navigates back to signer management.
   */
  const handleCancel = useCallback(() => {
    goToStep('signerManagement');
  }, [goToStep]);

  /**
   * Handles the "Add Another Signer" button click.
   * Resets the form to allow adding another signer.
   */
  const handleAddAnother = useCallback(() => {
    setSuccessMessage(null);
    setServerError(null);
    setServerErrors(null);
    setShowForm(true);
  }, []);

  /**
   * Handles the "Return to Signer Management" button click.
   * Navigates back to the signer management screen.
   */
  const handleReturnToManagement = useCallback(() => {
    goToStep('signerManagement');
  }, [goToStep]);

  /**
   * Handles the Back button click.
   */
  const handleBack = useCallback(() => {
    goToStep('signerManagement');
  }, [goToStep]);

  /**
   * Dismisses the server error alert.
   */
  const handleDismissError = useCallback(() => {
    setServerError(null);
  }, []);

  /**
   * Dismisses the success message alert.
   */
  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return (
    <PageLayout
      title="Add Authorized Signer"
      subtitle={
        selectedAccount
          ? `Adding a new signer to ${selectedAccount.name} (${selectedAccount.maskedAccountNumber})`
          : 'Add a new authorized signer to the selected account.'
      }
      showProgress={true}
      visibleSteps={['accountSelection', 'signerManagement', 'addEditSigner', 'confirmSigners', 'reviewSigners', 'submission']}
      showBackButton={true}
      showContinueButton={false}
      showCancelButton={false}
      backButtonText="Back"
      onBack={handleBack}
      hasUnsavedChanges={addedCount > 0}
      showSessionTimeout={true}
      ariaLabel="Add authorized signer page"
    >
      <div className="mx-auto max-w-2xl">
        {serverError && (
          <div className="mb-6">
            <Alert
              message={serverError}
              variant="critical"
              dismissible={true}
              onDismiss={handleDismissError}
              ariaLabel="Add signer error"
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
              ariaLabel="Add signer success"
            />
          </div>
        )}

        {addedCount > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {addedCount} {addedCount === 1 ? 'signer' : 'signers'} added during this session.
            </p>
          </div>
        )}

        {showForm && (
          <SignerForm
            isEditMode={false}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            submitButtonText="Add Signer"
            cancelButtonText="Cancel"
            serverError={null}
            serverErrors={serverErrors}
            ariaLabel="Add signer form"
          />
        )}

        {!showForm && successMessage && (
          <div className="mt-6 flex flex-col items-center gap-4 rounded border border-gray-200 bg-white p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <p className="text-sm text-gray-600">
              What would you like to do next?
            </p>

            <div className="flex flex-col gap-3 tablet:flex-row">
              <Button
                variant="primary"
                onClick={handleAddAnother}
                ariaLabel="Add Another Signer"
              >
                Add Another Signer
              </Button>
              <Button
                variant="secondary"
                onClick={handleReturnToManagement}
                ariaLabel="Return to Signer Management"
              >
                Return to Signer Management
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

/**
 * AddSignerScreen page component (Step 6a of the workflow).
 * Renders SignerForm in add mode. On successful form completion, calls
 * SignerService.addSigner to add the signer to the pending list. Supports
 * adding multiple signers before returning to signer management. Shows a
 * success alert after each addition. Logs events via AuditLogService.
 * Navigates back to signer management on completion.
 * Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function AddSignerScreen() {
  return (
    <ErrorBoundary>
      <AddSignerScreenContent />
    </ErrorBoundary>
  );
}

export default AddSignerScreen;