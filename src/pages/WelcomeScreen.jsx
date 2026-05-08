import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';
import { useNavigation } from '@/context/NavigationContext';
import { captureToken } from '@/services/TokenService';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import welcomeContent from '@/data/welcomeContent.json';

/**
 * Icon components for the process steps.
 */

/**
 * IdentityIcon for the "Verify Your Identity" step.
 * @returns {React.ReactElement}
 */
function IdentityIcon() {
  return (
    <svg
      className="h-10 w-10 text-primary-blue"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/**
 * AccountIcon for the "Select an Account" step.
 * @returns {React.ReactElement}
 */
function AccountIcon() {
  return (
    <svg
      className="h-10 w-10 text-primary-blue"
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
  );
}

/**
 * SignersIcon for the "Manage Signers" step.
 * @returns {React.ReactElement}
 */
function SignersIcon() {
  return (
    <svg
      className="h-10 w-10 text-primary-blue"
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
  );
}

/**
 * ReviewIcon for the "Review & Submit" step.
 * @returns {React.ReactElement}
 */
function ReviewIcon() {
  return (
    <svg
      className="h-10 w-10 text-primary-blue"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

/**
 * Maps icon name strings from welcomeContent.json to icon components.
 * @type {Object<string, Function>}
 */
const ICON_MAP = {
  identity: IdentityIcon,
  account: AccountIcon,
  signers: SignersIcon,
  review: ReviewIcon,
};

/**
 * ProcessStepCard component for displaying a single process step.
 *
 * @param {Object} props
 * @param {string} props.icon - The icon key from ICON_MAP
 * @param {string} props.title - The step title
 * @param {string} props.description - The step description
 * @param {number} props.stepNumber - The 1-based step number
 * @returns {React.ReactElement}
 */
function ProcessStepCard({ icon, title, description, stepNumber }) {
  const IconComponent = ICON_MAP[icon] || null;

  return (
    <div
      className="flex flex-col items-center rounded border border-gray-200 bg-white p-6 text-center shadow-sm transition-shadow duration-200 hover:shadow-md"
      role="listitem"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        {IconComponent ? (
          <IconComponent />
        ) : (
          <span
            className="text-2xl font-bold text-primary-blue"
            aria-hidden="true"
          >
            {stepNumber}
          </span>
        )}
      </div>
      <h3 className="mb-2 text-base font-medium text-body">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-gray-600">
        {description}
      </p>
    </div>
  );
}

ProcessStepCard.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  stepNumber: PropTypes.number.isRequired,
};

/**
 * WelcomeScreen page component (Step 1 of the workflow).
 * Displays content-managed informational content from welcomeContent.json:
 * title, subtitle, process overview steps, estimated time, and legal disclaimer.
 * Captures KYC/eSign token from URL query parameter via TokenService.captureToken.
 * Shows an error alert if the token is missing or malformed.
 * Prominent "Get Started" CTA button navigates to the login step.
 * Accessible without authentication. Responsive layout.
 *
 * @returns {React.ReactElement}
 */
function WelcomeScreen() {
  const { goToStep, completeStep } = useNavigation();

  const [tokenError, setTokenError] = useState(null);
  const [tokenCaptured, setTokenCaptured] = useState(false);

  /**
   * On mount, attempt to capture the eSign token from the URL query parameters.
   */
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenParam = searchParams.get('token');

      if (tokenParam && typeof tokenParam === 'string' && tokenParam.trim() !== '') {
        const result = captureToken(searchParams);

        if (result.success) {
          setTokenCaptured(true);
          setTokenError(null);
        } else {
          setTokenError(result.error || 'The invitation link appears to be invalid. Please check the link and try again.');
          setTokenCaptured(false);
        }
      } else {
        // No token in URL — this is acceptable; token may be captured later
        setTokenCaptured(false);
        setTokenError(null);
      }
    } catch (error) {
      setTokenError('An error occurred while processing the invitation link. Please try again.');
      setTokenCaptured(false);
    }
  }, []);

  /**
   * Handles the "Get Started" button click.
   * Completes the welcome step and navigates to the login step.
   */
  const handleGetStarted = useCallback(() => {
    completeStep('welcome');
    goToStep('login');
  }, [completeStep, goToStep]);

  /**
   * Dismisses the token error alert.
   */
  const handleDismissTokenError = useCallback(() => {
    setTokenError(null);
  }, []);

  const processSteps = useMemo(() => {
    if (Array.isArray(welcomeContent.processSteps)) {
      return welcomeContent.processSteps;
    }
    return [];
  }, []);

  return (
    <div className="fluid-wrapper py-6">
      <main
        role="main"
        aria-label="Welcome to Signature Card Management"
        className="flex-1"
      >
        {tokenError && (
          <div className="mb-6">
            <Alert
              message={tokenError}
              title="Invalid Invitation Link"
              variant="critical"
              dismissible={true}
              onDismiss={handleDismissTokenError}
              ariaLabel="Token error alert"
            />
          </div>
        )}

        <div className="mb-10 text-center">
          <h1 className="mb-3 text-2xl font-medium text-body tablet:text-3xl">
            {welcomeContent.title}
          </h1>
          {welcomeContent.subtitle && (
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-gray-600 tablet:text-base">
              {welcomeContent.subtitle}
            </p>
          )}
        </div>

        {processSteps.length > 0 && (
          <div className="mb-10">
            <div
              className="grid grid-cols-1 gap-6 tablet:grid-cols-2 desktop:grid-cols-4"
              role="list"
              aria-label="Process overview steps"
            >
              {processSteps.map((step, index) => (
                <ProcessStepCard
                  key={step.title}
                  icon={step.icon}
                  title={step.title}
                  description={step.description}
                  stepNumber={index + 1}
                />
              ))}
            </div>
          </div>
        )}

        {welcomeContent.estimatedTime && (
          <div className="mb-8 text-center">
            <p className="text-sm text-gray-500">
              <svg
                className="mr-1.5 inline-block h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              {welcomeContent.estimatedTime}
            </p>
          </div>
        )}

        {welcomeContent.legalDisclaimer && (
          <div className="mx-auto mb-8 max-w-3xl">
            <div
              className="rounded border border-gray-100 bg-gray-50 p-4 text-xs leading-relaxed text-gray-500"
              role="document"
              aria-label="Legal disclaimer"
            >
              {welcomeContent.legalDisclaimer}
            </div>
          </div>
        )}

        <div className="text-center">
          <Button
            variant="primary"
            onClick={handleGetStarted}
            ariaLabel={welcomeContent.ctaButtonText || 'Get Started'}
            className="px-10 py-3 text-base"
          >
            {welcomeContent.ctaButtonText || 'Get Started'}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default WelcomeScreen;