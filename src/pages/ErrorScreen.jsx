import { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import Button from '@/components/Button';
import Alert from '@/components/Alert';
import { classNames } from '@/utils/helpers';
import messages from '@/data/messages.json';

/**
 * Maps error type strings to their display configuration.
 * @type {Object<string, { title: string, message: string, icon: string, showRetry: boolean, showReturn: boolean }>}
 */
const ERROR_TYPE_CONFIG = {
  tokenExpired: {
    title: messages.errors.tokenExpired.title,
    message: messages.errors.tokenExpired.message,
    icon: 'clock',
    showRetry: false,
    showReturn: true,
  },
  tokenInvalid: {
    title: messages.errors.tokenInvalid.title,
    message: messages.errors.tokenInvalid.message,
    icon: 'shield',
    showRetry: false,
    showReturn: true,
  },
  sessionExpired: {
    title: messages.session.expired.title,
    message: messages.session.expired.message,
    icon: 'clock',
    showRetry: false,
    showReturn: true,
  },
  unauthorized: {
    title: messages.errors.unauthorized.title,
    message: messages.errors.unauthorized.message,
    icon: 'lock',
    showRetry: false,
    showReturn: true,
  },
  networkError: {
    title: messages.errors.networkError.title,
    message: messages.errors.networkError.message,
    icon: 'wifi',
    showRetry: true,
    showReturn: true,
  },
  serverError: {
    title: messages.errors.serverError.title,
    message: messages.errors.serverError.message,
    icon: 'server',
    showRetry: true,
    showReturn: true,
  },
  generic: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or return to the home page.',
    icon: 'alert',
    showRetry: true,
    showReturn: true,
  },
};

/**
 * ClockIcon component for expired-related errors.
 * @returns {React.ReactElement}
 */
function ClockIcon() {
  return (
    <svg
      className="h-12 w-12 text-red-500"
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
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/**
 * ShieldIcon component for invalid token errors.
 * @returns {React.ReactElement}
 */
function ShieldIcon() {
  return (
    <svg
      className="h-12 w-12 text-red-500"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * LockIcon component for unauthorized errors.
 * @returns {React.ReactElement}
 */
function LockIcon() {
  return (
    <svg
      className="h-12 w-12 text-red-500"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * WifiIcon component for network errors.
 * @returns {React.ReactElement}
 */
function WifiIcon() {
  return (
    <svg
      className="h-12 w-12 text-red-500"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

/**
 * ServerIcon component for server errors.
 * @returns {React.ReactElement}
 */
function ServerIcon() {
  return (
    <svg
      className="h-12 w-12 text-red-500"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

/**
 * AlertIcon component for generic errors.
 * @returns {React.ReactElement}
 */
function AlertIcon() {
  return (
    <svg
      className="h-12 w-12 text-red-500"
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
  );
}

/**
 * Maps icon name strings to icon components.
 * @type {Object<string, Function>}
 */
const ICON_MAP = {
  clock: ClockIcon,
  shield: ShieldIcon,
  lock: LockIcon,
  wifi: WifiIcon,
  server: ServerIcon,
  alert: AlertIcon,
};

/**
 * ErrorScreenContent component containing the error display logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @param {Object} props
 * @param {string} [props.errorType='generic'] - The type of error to display
 * @param {string} [props.title] - Custom error title (overrides errorType config)
 * @param {string} [props.message] - Custom error message (overrides errorType config)
 * @param {boolean} [props.showRetry] - Whether to show the retry button (overrides errorType config)
 * @param {boolean} [props.showReturn] - Whether to show the return to welcome button (overrides errorType config)
 * @param {Function} [props.onRetry] - Custom retry callback
 * @param {Function} [props.onReturn] - Custom return callback
 * @param {string} [props.retryButtonText='Try Again'] - Custom text for the retry button
 * @param {string} [props.returnButtonText='Return to Home'] - Custom text for the return button
 * @param {string} [props.className] - Additional CSS class names
 * @param {string} [props.ariaLabel] - Custom ARIA label for the error region
 * @returns {React.ReactElement}
 */
function ErrorScreenContent({
  errorType = 'generic',
  title,
  message,
  showRetry,
  showReturn,
  onRetry,
  onReturn,
  retryButtonText = 'Try Again',
  returnButtonText = 'Return to Home',
  className,
  ariaLabel,
}) {
  const { resetNavigation } = useNavigation();
  const { logout } = useSession();

  const config = useMemo(() => {
    const baseConfig = ERROR_TYPE_CONFIG[errorType] || ERROR_TYPE_CONFIG.generic;

    return {
      title: title || baseConfig.title,
      message: message || baseConfig.message,
      icon: baseConfig.icon,
      showRetry: showRetry !== undefined ? showRetry : baseConfig.showRetry,
      showReturn: showReturn !== undefined ? showReturn : baseConfig.showReturn,
    };
  }, [errorType, title, message, showRetry, showReturn]);

  const IconComponent = ICON_MAP[config.icon] || AlertIcon;

  /**
   * Handles the retry button click.
   * Invokes the custom onRetry callback if provided, otherwise reloads the page.
   */
  const handleRetry = useCallback(() => {
    if (typeof onRetry === 'function') {
      onRetry();
    } else {
      window.location.reload();
    }
  }, [onRetry]);

  /**
   * Handles the return to welcome button click.
   * Invokes the custom onReturn callback if provided, otherwise logs out
   * and resets navigation to the welcome screen.
   */
  const handleReturn = useCallback(() => {
    if (typeof onReturn === 'function') {
      onReturn();
    } else {
      logout();
      resetNavigation();
    }
  }, [onReturn, logout, resetNavigation]);

  const resolvedAriaLabel = ariaLabel || 'Error page';

  const wrapperClasses = classNames(
    'fluid-wrapper py-6',
    className
  );

  /**
   * Provides additional context based on error type.
   * @returns {string|null}
   */
  const getAdditionalInstructions = useCallback(() => {
    switch (errorType) {
      case 'tokenExpired':
        return 'Your invitation link has expired. Please contact the account owner to request a new invitation link.';
      case 'tokenInvalid':
        return 'The invitation link is invalid or has already been used. Please contact the account owner to request a new invitation.';
      case 'sessionExpired':
        return 'Your session has expired due to inactivity. Please log in again to continue.';
      case 'unauthorized':
        return 'You are not authorized to access this resource. Please ensure you are logged in with the correct account.';
      case 'networkError':
        return 'Please check your internet connection and try again. If the problem persists, contact customer support.';
      case 'serverError':
        return 'An unexpected server error occurred. Please try again later. If the problem persists, contact customer support.';
      default:
        return 'If this problem persists, please contact customer support for assistance.';
    }
  }, [errorType]);

  const additionalInstructions = getAdditionalInstructions();

  return (
    <div className={wrapperClasses}>
      <main
        role="main"
        aria-label={resolvedAriaLabel}
        className="flex-1"
      >
        <div className="mx-auto max-w-lg">
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="flex flex-col items-center rounded border border-gray-200 bg-white p-8 text-center shadow-sm"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <IconComponent />
            </div>

            <h1 className="mb-3 text-2xl font-medium text-body">
              {config.title}
            </h1>

            <p className="mb-4 max-w-md text-sm leading-relaxed text-gray-600">
              {config.message}
            </p>

            {additionalInstructions && (
              <p className="mb-6 max-w-md text-xs leading-relaxed text-gray-500">
                {additionalInstructions}
              </p>
            )}

            <div className="flex flex-col gap-3 tablet:flex-row">
              {config.showRetry && (
                <Button
                  variant="primary"
                  onClick={handleRetry}
                  ariaLabel={retryButtonText}
                >
                  {retryButtonText}
                </Button>
              )}
              {config.showReturn && (
                <Button
                  variant={config.showRetry ? 'secondary' : 'primary'}
                  onClick={handleReturn}
                  ariaLabel={returnButtonText}
                >
                  {returnButtonText}
                </Button>
              )}
            </div>
          </div>

          {(errorType === 'tokenExpired' || errorType === 'tokenInvalid') && (
            <div className="mt-6">
              <Alert
                message="If you believe this is an error, please contact customer support with the details of the invitation you received."
                variant="info"
                ariaLabel="Contact support information"
              />
            </div>
          )}

          {errorType === 'sessionExpired' && (
            <div className="mt-6">
              <Alert
                message="For your security, sessions expire after a period of inactivity. Please log in again to continue where you left off."
                variant="warning"
                ariaLabel="Session expiry information"
              />
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              If you need assistance, please contact customer support.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

ErrorScreenContent.propTypes = {
  errorType: PropTypes.oneOf([
    'tokenExpired',
    'tokenInvalid',
    'sessionExpired',
    'unauthorized',
    'networkError',
    'serverError',
    'generic',
  ]),
  title: PropTypes.string,
  message: PropTypes.string,
  showRetry: PropTypes.bool,
  showReturn: PropTypes.bool,
  onRetry: PropTypes.func,
  onReturn: PropTypes.func,
  retryButtonText: PropTypes.string,
  returnButtonText: PropTypes.string,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

/**
 * ErrorScreen page component for displaying unrecoverable errors.
 * Handles missing/malformed KYC tokens, expired sessions, invalid tokens,
 * network errors, and server errors. Shows an error icon, descriptive
 * message, additional instructions, and action buttons (retry or return
 * to welcome). Accessible with proper heading hierarchy, ARIA attributes,
 * and role="alert" for screen reader announcements.
 * Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @param {Object} props - See ErrorScreenContent propTypes
 * @returns {React.ReactElement}
 */
function ErrorScreen(props) {
  return (
    <ErrorBoundary>
      <ErrorScreenContent {...props} />
    </ErrorBoundary>
  );
}

ErrorScreen.propTypes = {
  errorType: PropTypes.oneOf([
    'tokenExpired',
    'tokenInvalid',
    'sessionExpired',
    'unauthorized',
    'networkError',
    'serverError',
    'generic',
  ]),
  title: PropTypes.string,
  message: PropTypes.string,
  showRetry: PropTypes.bool,
  showReturn: PropTypes.bool,
  onRetry: PropTypes.func,
  onReturn: PropTypes.func,
  retryButtonText: PropTypes.string,
  returnButtonText: PropTypes.string,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default ErrorScreen;