import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import { useApp } from '@/context/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import ChangesSummary from '@/components/ChangesSummary';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import { submitChanges } from '@/services/SubmissionService';
import { getStagedChangesByAccount, clearStagedChanges } from '@/services/SignerService';
import { logEvent, SIGNER_AUDIT_EVENT_TYPES } from '@/services/AuditLogService';
import { AUDIT_OUTCOMES } from '@/services/AuditService';
import { formatTimestamp } from '@/utils/helpers';
import messages from '@/data/messages.json';

/**
 * SubmissionConfirmationScreenContent component containing the submission logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function SubmissionConfirmationScreenContent() {
  const { resetNavigation, completeStep } = useNavigation();
  const { currentUser } = useSession();
  const { selectedAccount, stagedChanges, clearStagedChanges: clearAppStagedChanges, clearSelectedAccount } = useApp();

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [error, setError] = useState(null);
  const [submittedChanges, setSubmittedChanges] = useState([]);

  const hasSubmittedRef = useRef(false);

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

  /**
   * Computes a summary of changes by type.
   */
  const changesSummary = useMemo(() => {
    const changes = submitted ? submittedChanges : allChanges;
    const additions = changes.filter((c) => c.type === 'add').length;
    const edits = changes.filter((c) => c.type === 'edit').length;
    const removals = changes.filter((c) => c.type === 'remove').length;

    return {
      additions,
      edits,
      removals,
      total: additions + edits + removals,
    };
  }, [allChanges, submittedChanges, submitted]);

  /**
   * Performs the submission on mount. Prevents duplicate submissions
   * via the hasSubmittedRef guard.
   */
  useEffect(() => {
    if (hasSubmittedRef.current) {
      return;
    }

    if (!accountId) {
      setError('No account selected. Please go back and select an account.');
      return;
    }

    if (allChanges.length === 0 && !submitted) {
      setError('No changes to submit. Please go back and make changes before submitting.');
      return;
    }

    hasSubmittedRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      // Capture changes before submission clears them
      const changesToSubmit = [...allChanges];

      const result = submitChanges(accountId, changesToSubmit);

      if (result.success) {
        setReferenceId(result.referenceId);
        setSubmissionId(result.submissionId);
        setSubmittedAt(result.submittedAt);
        setSubmittedChanges(changesToSubmit);
        setSubmitted(true);
        setSubmitting(false);

        // Clear staged changes from AppContext
        clearAppStagedChanges();

        // Complete the submission step
        completeStep('submission');

        logEvent(
          userId,
          SIGNER_AUDIT_EVENT_TYPES.SUBMISSION_COMPLETED,
          {
            accountId,
            referenceId: result.referenceId,
            submissionId: result.submissionId,
            totalChanges: changesToSubmit.length,
            additions: changesToSubmit.filter((c) => c.type === 'add').length,
            edits: changesToSubmit.filter((c) => c.type === 'edit').length,
            removals: changesToSubmit.filter((c) => c.type === 'remove').length,
            action: 'submission_confirmed',
          },
          AUDIT_OUTCOMES.SUCCESS
        );
      } else {
        setError(result.error || messages.errors.submissionFailed.message);
        setSubmitting(false);

        logEvent(
          userId,
          SIGNER_AUDIT_EVENT_TYPES.SUBMISSION_COMPLETED,
          {
            accountId,
            action: 'submit_changes',
            reason: result.error || 'Submission failed',
          },
          AUDIT_OUTCOMES.FAILURE
        );
      }
    } catch (err) {
      setError(messages.errors.submissionFailed.message);
      setSubmitting(false);

      logEvent(
        userId,
        SIGNER_AUDIT_EVENT_TYPES.SUBMISSION_COMPLETED,
        {
          accountId,
          action: 'submit_changes',
          reason: 'Unexpected error during submission',
        },
        AUDIT_OUTCOMES.FAILURE
      );
    }
  }, [accountId, allChanges, submitted, userId, clearAppStagedChanges, completeStep]);

  /**
   * Handles the Done button click.
   * Clears all state and navigates back to the welcome screen.
   */
  const handleDone = useCallback(() => {
    clearStagedChanges();
    clearAppStagedChanges();
    clearSelectedAccount();
    resetNavigation();
  }, [clearAppStagedChanges, clearSelectedAccount, resetNavigation]);

  /**
   * Handles the retry button click for failed submissions.
   */
  const handleRetry = useCallback(() => {
    hasSubmittedRef.current = false;
    setError(null);
    setSubmitting(true);

    try {
      const changesToSubmit = [...allChanges];

      if (changesToSubmit.length === 0) {
        setError('No changes to submit. Please go back and make changes before submitting.');
        setSubmitting(false);
        return;
      }

      const result = submitChanges(accountId, changesToSubmit);

      if (result.success) {
        setReferenceId(result.referenceId);
        setSubmissionId(result.submissionId);
        setSubmittedAt(result.submittedAt);
        setSubmittedChanges(changesToSubmit);
        setSubmitted(true);
        setSubmitting(false);

        clearAppStagedChanges();
        completeStep('submission');

        logEvent(
          userId,
          SIGNER_AUDIT_EVENT_TYPES.SUBMISSION_COMPLETED,
          {
            accountId,
            referenceId: result.referenceId,
            submissionId: result.submissionId,
            totalChanges: changesToSubmit.length,
            action: 'submission_confirmed_retry',
          },
          AUDIT_OUTCOMES.SUCCESS
        );
      } else {
        setError(result.error || messages.errors.submissionFailed.message);
        setSubmitting(false);
      }
    } catch (err) {
      setError(messages.errors.submissionFailed.message);
      setSubmitting(false);
    }
  }, [accountId, allChanges, userId, clearAppStagedChanges, completeStep]);

  /**
   * Dismisses the error alert.
   */
  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Formats the submitted timestamp for display.
   */
  const formattedTimestamp = useMemo(() => {
    if (!submittedAt) {
      return '';
    }
    return formatTimestamp(submittedAt);
  }, [submittedAt]);

  return (
    <PageLayout
      title={submitted ? 'Submission Confirmed' : 'Submitting Changes'}
      subtitle={
        submitted
          ? 'Your signature card changes have been submitted for processing.'
          : 'Please wait while we process your submission.'
      }
      showProgress={true}
      visibleSteps={['accountSelection', 'signerManagement', 'addEditSigner', 'confirmSigners', 'reviewSigners', 'submission']}
      showBackButton={false}
      showContinueButton={false}
      showCancelButton={false}
      showFooter={false}
      showSessionTimeout={true}
      ariaLabel="Submission confirmation page"
    >
      <div className="mx-auto max-w-3xl">
        {error && (
          <div className="mb-6">
            <Alert
              message={error}
              title={messages.errors.submissionFailed.title}
              variant="critical"
              dismissible={true}
              onDismiss={handleDismissError}
              ariaLabel="Submission error"
            />
          </div>
        )}

        {submitting && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              className="mb-4 h-12 w-12 animate-spin text-primary-blue"
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
              Submitting your signature card changes...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Please do not close this page.
            </p>
          </div>
        )}

        {!submitting && !submitted && error && (
          <div className="mt-6 flex flex-col items-center gap-4 rounded border border-gray-200 bg-white p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <p className="text-sm text-gray-600">
              Your submission could not be completed. Please try again.
            </p>

            <div className="flex flex-col gap-3 tablet:flex-row">
              <Button
                variant="primary"
                onClick={handleRetry}
                ariaLabel="Retry Submission"
              >
                Retry Submission
              </Button>
              <Button
                variant="secondary"
                onClick={handleDone}
                ariaLabel="Return to Home"
              >
                Return to Home
              </Button>
            </div>
          </div>
        )}

        {!submitting && submitted && (
          <div className="space-y-8">
            <div className="flex flex-col items-center rounded border border-green-200 bg-green-50 p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
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

              <h2 className="mb-2 text-lg font-medium text-green-800" aria-live="polite">
                {messages.success.signatureCardSubmitted.title}
              </h2>
              <p className="mb-4 max-w-md text-sm text-green-700">
                {messages.success.signatureCardSubmitted.message}
              </p>

              {referenceId && (
                <div className="mb-4 rounded border border-green-300 bg-white px-6 py-3">
                  <p className="text-xs text-gray-500">Confirmation Number</p>
                  <p
                    className="text-lg font-bold text-primary-blue"
                    aria-label={`Confirmation number: ${referenceId}`}
                  >
                    {referenceId}
                  </p>
                </div>
              )}

              {formattedTimestamp && (
                <p className="text-xs text-gray-500">
                  Submitted on {formattedTimestamp}
                </p>
              )}
            </div>

            {selectedAccount && (
              <div
                className="rounded border border-gray-200 bg-white p-4"
                role="region"
                aria-label="Submission details"
              >
                <h3 className="mb-3 text-sm font-medium text-body">
                  Submission Details
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-medium text-body">{selectedAccount.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Account Number</span>
                    <span className="font-medium text-body">{selectedAccount.maskedAccountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Account Type</span>
                    <span className="font-medium capitalize text-body">{selectedAccount.accountType}</span>
                  </div>
                  {referenceId && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Reference ID</span>
                      <span className="font-medium text-body">{referenceId}</span>
                    </div>
                  )}
                  {formattedTimestamp && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Submitted At</span>
                      <span className="font-medium text-body">{formattedTimestamp}</span>
                    </div>
                  )}
                  {currentUser && currentUser.username && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Submitted By</span>
                      <span className="font-medium text-body">{currentUser.username}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-medium text-body">
                  Changes Submitted
                </h2>
                <div className="flex items-center gap-2">
                  {changesSummary.additions > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      +{changesSummary.additions} added
                    </span>
                  )}
                  {changesSummary.edits > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      ~{changesSummary.edits} edited
                    </span>
                  )}
                  {changesSummary.removals > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      -{changesSummary.removals} removed
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {changesSummary.total} {changesSummary.total === 1 ? 'change' : 'changes'} total
                  </span>
                </div>
              </div>

              <ChangesSummary
                changes={submittedChanges}
                title=""
                showEmptyState={true}
                emptyMessage="No changes were included in this submission."
                ariaLabel="Submitted signer changes summary"
              />
            </div>

            <div
              className="rounded border border-blue-200 bg-blue-50 p-4"
              role="region"
              aria-label="Next steps"
            >
              <h3 className="mb-2 text-sm font-medium text-blue-800">
                What Happens Next?
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
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
                  <span>Your changes have been submitted and are now being reviewed by the financial institution.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
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
                  <span>New signers will receive an invitation to complete their enrollment via their registered contact method.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
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
                  <span>You will receive a confirmation notification once the changes have been reviewed and approved.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
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
                  <span>Please save your confirmation number <span className="font-medium">{referenceId}</span> for your records.</span>
                </li>
              </ul>
            </div>

            <div
              className="rounded border border-gray-200 bg-gray-50 p-4"
              role="region"
              aria-label="Confirmation notification"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-body">
                    Confirmation Notification Sent
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    A confirmation notification has been sent to your registered contact method with the details of this submission.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center pt-4">
              <Button
                variant="primary"
                onClick={handleDone}
                ariaLabel="Done"
                className="px-10"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

/**
 * SubmissionConfirmationScreen page component (Step 9 of the workflow).
 * On mount, calls SubmissionService.submitChanges to process all staged
 * signer changes for the selected account. Displays a confirmation number
 * (reference ID), summary of changes made, submission timestamp, and next
 * steps messaging. Sends a mock confirmation notification. Prevents
 * duplicate submissions via idempotency check and ref guard. Provides a
 * 'Done' button to return to the welcome screen and clear all state.
 * All changes are logged with a full audit trail via AuditLogService.
 * Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function SubmissionConfirmationScreen() {
  return (
    <ErrorBoundary>
      <SubmissionConfirmationScreenContent />
    </ErrorBoundary>
  );
}

export default SubmissionConfirmationScreen;