import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import Button from '@/components/Button';
import Alert from '@/components/Alert';
import { validateToken, updateTokenStatus, getStoredToken } from '@/services/TokenService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';
import messages from '@/data/messages.json';

/**
 * LoadingSpinner component displayed during token validation.
 * @returns {React.ReactElement}
 */
function LoadingSpinner() {
  return (
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
        Validating your invitation link...
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Please wait while we verify your access.
      </p>
    </div>
  );
}

/**
 * SuccessDisplay component shown after successful token validation.
 *
 * @param {Object} props
 * @param {string} props.message - The success message to display
 * @returns {React.ReactElement}
 */
function SuccessDisplay({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
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
      <p className="text-sm font-medium text-green-800" aria-live="polite" aria-atomic="true">
        {message}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Redirecting to account selection...
      </p>
    </div>
  );
}

/**
 * ErrorDisplay component shown when token validation fails.
 *
 * @param {Object} props
 * @param {string} props.title - The error title
 * @param {string} props.message - The error message
 * @param {string} props.status - The token status (expired, invalid, unauthorized)
 * @param {Function} props.onRetry - Callback invoked when the retry button is clicked
 * @param {boolean} props.canRetry - Whether the retry button should be shown
 * @returns {React.ReactElement}
 */
function ErrorDisplay({ title, message, status, onRetry, canRetry }) {
  const getInstructions = useCallback(() => {
    switch (status) {
      case 'expired':
        return 'Your invitation link has expired. Please contact the account owner to request a new invitation link.';
      case 'unauthorized':
        return 'You are not authorized to use this invitation link. Please ensure you are logged in with the correct account.';
      case 'invalid':
      default:
        return 'The invitation link is invalid or has already been used. Please contact the account owner to request a new invitation.';
    }
  }, [status]);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
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

      <div className="mb-6 w-full max-w-md">
        <Alert
          message={message}
          title={title}
          variant="critical"
          ariaLabel="Token validation error"
        />
      </div>

      <p className="mb-6 max-w-md text-center text-sm text-gray-600">
        {getInstructions()}
      </p>

      {canRetry && (
        <Button
          variant="primary"
          onClick={onRetry}
          ariaLabel="Retry Validation"
        >
          Retry Validation
        </Button>
      )}
    </div>
  );
}

/**
 * TokenValidationScreenContent component containing the token validation logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function TokenValidationScreenContent() {
  const { goToStep, completeStep, resetNavigation } = useNavigation();
  const { currentUser, validateToken: sessionValidateToken, logout } = useSession();

  const [validating, setValidating] = useState(true);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [canRetry, setCanRetry] = useState(false);

  const hasValidatedRef = useRef(false);
  const redirectTimerRef = useRef(null);

  const userId = currentUser ? currentUser.userId : 'unknown';

  /**
   * Performs the token validation by calling TokenService.validateToken.
   */
  const performValidation = useCallback(async () => {
    setValidating(true);
    setValidationSuccess(false);
    setErrorState(null);
    setCanRetry(false);

    try {
      const storedToken = getStoredToken();

      if (!storedToken) {
        logEvent(
          userId,
          AUDIT_EVENT_TYPES.TOKEN_INVALID,
          { reason: 'No token found in storage' },
          AUDIT_OUTCOMES.FAILURE
        );

        setErrorState({
          title: messages.errors.tokenInvalid.title,
          message: 'No invitation token was found. Please use a valid invitation link to access this application.',
          status: 'invalid',
        });
        setCanRetry(false);
        setValidating(false);
        return;
      }

      const result = await validateToken();

      if (result.valid) {
        sessionValidateToken();

        logEvent(
          userId,
          AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
          {
            tokenId: result.tokenData ? result.tokenData.id : 'unknown',
            status: result.status,
          },
          AUDIT_OUTCOMES.SUCCESS
        );

        if (result.status === 'pending' && storedToken) {
          updateTokenStatus(storedToken, 'confirmed');
        }

        setValidationSuccess(true);
        setValidating(false);

        redirectTimerRef.current = setTimeout(() => {
          completeStep('tokenValidation');
          goToStep('accountSelection');
        }, 1500);
      } else {
        const status = result.status || 'invalid';

        let errorTitle = messages.errors.tokenInvalid.title;
        let errorMessage = result.error || messages.errors.tokenInvalid.message;

        if (status === 'expired') {
          errorTitle = messages.errors.tokenExpired.title;
          errorMessage = result.error || messages.errors.tokenExpired.message;
        } else if (status === 'unauthorized') {
          errorTitle = messages.errors.unauthorized.title;
          errorMessage = result.error || messages.errors.unauthorized.message;
        }

        logEvent(
          userId,
          AUDIT_EVENT_TYPES.TOKEN_INVALID,
          {
            reason: errorMessage,
            status,
          },
          AUDIT_OUTCOMES.FAILURE
        );

        setErrorState({
          title: errorTitle,
          message: errorMessage,
          status,
        });
        setCanRetry(status !== 'expired');
        setValidating(false);
      }
    } catch (error) {
      logEvent(
        userId,
        AUDIT_EVENT_TYPES.TOKEN_INVALID,
        { reason: 'Unexpected error during token validation' },
        AUDIT_OUTCOMES.FAILURE
      );

      setErrorState({
        title: messages.errors.serverError.title,
        message: messages.errors.serverError.message,
        status: 'invalid',
      });
      setCanRetry(true);
      setValidating(false);
    }
  }, [userId, sessionValidateToken, completeStep, goToStep]);

  /**
   * Handles the retry button click.
   */
  const handleRetry = useCallback(() => {
    hasValidatedRef.current = false;
    performValidation();
  }, [performValidation]);

  /**
   * Automatically validate token on mount.
   */
  useEffect(() => {
    if (!hasValidatedRef.current) {
      hasValidatedRef.current = true;
      performValidation();
    }

    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [performValidation]);

  return (
    <PageLayout
      title="Token Validation"
      subtitle="Verifying your invitation link to ensure secure access."
      showProgress={true}
      visibleSteps={['welcome', 'login', 'verify', 'tokenValidation', 'accountSelection']}
      showSessionTimeout={true}
      ariaLabel="Token validation page"
    >
      <div className="mx-auto max-w-md">
        {validating && (
          <LoadingSpinner />
        )}

        {!validating && validationSuccess && (
          <SuccessDisplay
            message="Your invitation link has been verified successfully."
          />
        )}

        {!validating && errorState && (
          <ErrorDisplay
            title={errorState.title}
            message={errorState.message}
            status={errorState.status}
            onRetry={handleRetry}
            canRetry={canRetry}
          />
        )}
      </div>
    </PageLayout>
  );
}

/**
 * TokenValidationScreen page component (Step 4 of the workflow).
 * Automatically validates the eSign token on mount via TokenService.validateToken.
 * Shows loading state during validation. On success, updates token status and
 * redirects to account selection. On failure (invalid/expired/wrong user),
 * displays appropriate error message with instructions.
 * Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function TokenValidationScreen() {
  return (
    <ErrorBoundary>
      <TokenValidationScreenContent />
    </ErrorBoundary>
  );
}

export default TokenValidationScreen;