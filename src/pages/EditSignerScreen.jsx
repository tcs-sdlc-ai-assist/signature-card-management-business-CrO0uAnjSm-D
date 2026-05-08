import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import { useApp } from '@/context/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import SignerForm from '@/components/SignerForm';
import Alert from '@/components/Alert';
import { getSignerById, editSigner } from '@/services/SignerService';
import { logSignerEdited, logEvent, SIGNER_AUDIT_EVENT_TYPES } from '@/services/AuditLogService';
import { AUDIT_OUTCOMES } from '@/services/AuditService';
import { getFromLocalStorage, setToLocalStorage } from '@/utils/helpers';

/**
 * localStorage key for the signer being edited.
 * @type {string}
 */
const EDIT_SIGNER_KEY = 'scm_edit_signer_id';

/**
 * EditSignerScreenContent component containing the edit signer logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function EditSignerScreenContent() {
  const { goToStep } = useNavigation();
  const { currentUser } = useSession();
  const { selectedAccount, addStagedChange } = useApp();

  const [loading, setLoading] = useState(false);
  const [signerLoading, setSignerLoading] = useState(true);
  const [serverError, setServerError] = useState(null);
  const [serverErrors, setServerErrors] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [signer, setSigner] = useState(null);
  const [signerNotFound, setSignerNotFound] = useState(false);

  const userId = currentUser ? currentUser.userId : 'unknown';
  const accountId = selectedAccount ? selectedAccount.id : null;

  /**
   * Loads the signer to edit from localStorage or SignerService.
   */
  useEffect(() => {
    setSignerLoading(true);
    setSignerNotFound(false);
    setServerError(null);

    try {
      const editSignerId = getFromLocalStorage(EDIT_SIGNER_KEY);

      if (!editSignerId || typeof editSignerId !== 'string' || editSignerId.trim() === '') {
        setSignerNotFound(true);
        setSignerLoading(false);
        return;
      }

      const foundSigner = getSignerById(editSignerId);

      if (!foundSigner) {
        setSignerNotFound(true);
        setSignerLoading(false);
        return;
      }

      setSigner(foundSigner);
      setSignerLoading(false);
    } catch (err) {
      setServerError('An unexpected error occurred while loading signer data. Please try again.');
      setSignerLoading(false);
    }
  }, []);

  /**
   * Builds the initial form data from the signer object.
   */
  const initialData = useMemo(() => {
    if (!signer) {
      return null;
    }

    return {
      firstName: signer.firstName || '',
      lastName: signer.lastName || '',
      middleName: signer.middleName || '',
      suffix: signer.suffix || '',
      title: signer.title || '',
      role: signer.role || '',
      email: signer.email || '',
      phone: signer.phone || '',
      additionalContact: signer.additionalContact || '',
    };
  }, [signer]);

  /**
   * Handles the signer form submission.
   * Calls SignerService.editSigner and logs the event via AuditLogService.
   * @param {Object} formData - The validated signer form data
   */
  const handleSubmit = useCallback((formData) => {
    if (!signer || !signer.id) {
      setServerError('No signer selected for editing. Please go back and select a signer.');
      return;
    }

    setLoading(true);
    setServerError(null);
    setServerErrors(null);
    setSuccessMessage(null);

    const result = editSigner(signer.id, formData);

    if (result.success) {
      logSignerEdited(userId, {
        accountId: signer.accountId || accountId || '',
        signerId: signer.id,
        firstName: result.signer.firstName,
        lastName: result.signer.lastName,
        email: result.signer.email,
        before: { ...signer },
        after: { ...result.signer },
      });

      addStagedChange({
        id: `edit-${signer.id}-${Date.now()}`,
        type: 'edit',
        accountId: signer.accountId || accountId || '',
        signerId: signer.id,
        before: { ...signer },
        after: { ...result.signer },
        timestamp: new Date().toISOString(),
      });

      setLoading(false);

      const displayName = [result.signer.firstName, result.signer.lastName]
        .filter(Boolean)
        .join(' ');

      setSuccessMessage(
        `${displayName}'s information has been successfully updated.`
      );

      setSigner(result.signer);

      // Navigate back to signer management after a brief delay
      setTimeout(() => {
        setToLocalStorage(EDIT_SIGNER_KEY, null);
        goToStep('signerManagement');
      }, 1500);
    } else {
      logEvent(
        userId,
        SIGNER_AUDIT_EVENT_TYPES.SIGNER_EDITED,
        {
          accountId: signer.accountId || accountId || '',
          signerId: signer.id,
          action: 'edit_signer',
          reason: result.error || 'Edit signer failed',
          firstName: formData.firstName,
          lastName: formData.lastName,
        },
        AUDIT_OUTCOMES.FAILURE
      );

      setLoading(false);

      if (result.errors) {
        setServerErrors(result.errors);
      }

      setServerError(result.error || 'Unable to update the signer. Please try again.');
    }
  }, [signer, userId, accountId, addStagedChange, goToStep]);

  /**
   * Handles the cancel button click.
   * Navigates back to signer management.
   */
  const handleCancel = useCallback(() => {
    setToLocalStorage(EDIT_SIGNER_KEY, null);
    goToStep('signerManagement');
  }, [goToStep]);

  /**
   * Handles the Back button click.
   */
  const handleBack = useCallback(() => {
    setToLocalStorage(EDIT_SIGNER_KEY, null);
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

  /**
   * Formats the signer's display name for the subtitle.
   */
  const signerDisplayName = useMemo(() => {
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
  }, [signer]);

  return (
    <PageLayout
      title="Edit Authorized Signer"
      subtitle={
        signer
          ? `Editing ${signerDisplayName} on ${selectedAccount ? selectedAccount.name : 'the selected account'} (${selectedAccount ? selectedAccount.maskedAccountNumber : ''})`
          : 'Edit an existing authorized signer on the selected account.'
      }
      showProgress={true}
      visibleSteps={['accountSelection', 'signerManagement', 'addEditSigner', 'confirmSigners', 'reviewSigners', 'submission']}
      showBackButton={true}
      showContinueButton={false}
      showCancelButton={false}
      backButtonText="Back"
      onBack={handleBack}
      hasUnsavedChanges={false}
      showSessionTimeout={true}
      ariaLabel="Edit authorized signer page"
    >
      <div className="mx-auto max-w-2xl">
        {serverError && (
          <div className="mb-6">
            <Alert
              message={serverError}
              variant="critical"
              dismissible={true}
              onDismiss={handleDismissError}
              ariaLabel="Edit signer error"
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
              ariaLabel="Edit signer success"
            />
          </div>
        )}

        {signerLoading && (
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
              Loading signer information...
            </p>
          </div>
        )}

        {!signerLoading && signerNotFound && (
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
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
            <p className="mb-4 text-sm text-gray-500">
              No signer was selected for editing. Please go back to the signer management screen and select a signer to edit.
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="button-primary"
              aria-label="Return to Signer Management"
            >
              Return to Signer Management
            </button>
          </div>
        )}

        {!signerLoading && !signerNotFound && signer && initialData && (
          <SignerForm
            initialData={initialData}
            isEditMode={true}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            submitButtonText="Save Changes"
            cancelButtonText="Cancel"
            serverError={null}
            serverErrors={serverErrors}
            ariaLabel="Edit signer form"
          />
        )}
      </div>
    </PageLayout>
  );
}

/**
 * EditSignerScreen page component (Step 6b of the workflow).
 * Renders SignerForm in edit mode with pre-populated data from the selected
 * signer. On successful form completion, calls SignerService.editSigner to
 * update the signer's information with before/after tracking. Logs changes
 * via AuditLogService. Navigates back to signer management on completion.
 * Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function EditSignerScreen() {
  return (
    <ErrorBoundary>
      <EditSignerScreenContent />
    </ErrorBoundary>
  );
}

export default EditSignerScreen;