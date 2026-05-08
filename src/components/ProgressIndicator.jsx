import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigation } from '@/context/NavigationContext';
import { classNames } from '@/utils/helpers';
import { STEPS } from '@/utils/constants';

/**
 * Human-readable labels for each workflow step.
 * @type {Object<string, string>}
 */
const STEP_LABELS = {
  welcome: 'Welcome',
  login: 'Login',
  verify: 'Verify Identity',
  tokenValidation: 'Token Validation',
  accountSelection: 'Select Account',
  signerManagement: 'Manage Signers',
  addEditSigner: 'Add/Edit Signer',
  confirmSigners: 'Confirm Signers',
  reviewSigners: 'Review',
  submission: 'Submit',
};

/**
 * Checkmark icon rendered for completed steps.
 * @returns {React.ReactElement}
 */
function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
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
  );
}

/**
 * Determines the visual status of a step relative to the current step.
 * @param {string} step - The step to evaluate
 * @param {string} currentStep - The current active step
 * @param {string[]} completedSteps - Array of completed step names
 * @returns {'completed' | 'active' | 'upcoming'}
 */
function getStepStatus(step, currentStep, completedSteps) {
  if (completedSteps.includes(step)) {
    return 'completed';
  }
  if (step === currentStep) {
    return 'active';
  }
  return 'upcoming';
}

/**
 * Individual step item within the progress indicator.
 *
 * @param {Object} props
 * @param {number} props.stepNumber - The 1-based step number
 * @param {string} props.label - The human-readable step label
 * @param {'completed' | 'active' | 'upcoming'} props.status - The visual status of the step
 * @param {boolean} props.isLast - Whether this is the last step
 * @returns {React.ReactElement}
 */
function ProgressStep({ stepNumber, label, status, isLast }) {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const isUpcoming = status === 'upcoming';

  const circleClasses = classNames(
    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors duration-200',
    {
      'bg-primary-blue text-white': isCompleted,
      'border-2 border-primary-blue bg-white text-primary-blue': isActive,
      'border-2 border-gray-300 bg-white text-gray-400': isUpcoming,
    }
  );

  const labelClasses = classNames(
    'text-xs font-medium transition-colors duration-200 desktop:mt-2 desktop:text-center',
    'ml-3 desktop:ml-0',
    {
      'text-primary-blue': isCompleted || isActive,
      'text-gray-400': isUpcoming,
    }
  );

  const connectorClasses = classNames(
    'transition-colors duration-200',
    'hidden desktop:block desktop:h-0.5 desktop:flex-1',
    {
      'bg-primary-blue': isCompleted,
      'bg-gray-300': !isCompleted,
    }
  );

  const verticalConnectorClasses = classNames(
    'transition-colors duration-200',
    'desktop:hidden ml-4 w-0.5 h-6',
    {
      'bg-primary-blue': isCompleted,
      'bg-gray-300': !isCompleted,
    }
  );

  return (
    <>
      <li
        className="flex items-center desktop:flex-col desktop:items-center"
        aria-current={isActive ? 'step' : undefined}
      >
        <div className={circleClasses}>
          {isCompleted ? (
            <CheckIcon />
          ) : (
            <span aria-hidden="true">{stepNumber}</span>
          )}
        </div>
        <span className={labelClasses}>
          {label}
        </span>
      </li>
      {!isLast && (
        <>
          <li
            className="hidden desktop:flex desktop:flex-1 desktop:items-center"
            aria-hidden="true"
            role="presentation"
          >
            <div className={connectorClasses} />
          </li>
          <li
            className="flex justify-start desktop:hidden"
            aria-hidden="true"
            role="presentation"
          >
            <div className={verticalConnectorClasses} />
          </li>
        </>
      )}
    </>
  );
}

ProgressStep.propTypes = {
  stepNumber: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['completed', 'active', 'upcoming']).isRequired,
  isLast: PropTypes.bool.isRequired,
};

/**
 * Step-based progress indicator component showing the user's current
 * position in the workflow. Displays step numbers, labels, and completion
 * status. Uses NavigationContext to determine current/completed/upcoming
 * steps. Accessible with ARIA attributes. Responsive layout: horizontal
 * on desktop, vertical on mobile.
 *
 * @param {Object} props
 * @param {string[]} [props.visibleSteps] - Optional subset of STEPS to display. Defaults to all STEPS.
 * @param {string} [props.className] - Additional CSS class names for the wrapper
 * @param {string} [props.ariaLabel] - Custom ARIA label for the navigation region
 * @returns {React.ReactElement}
 */
function ProgressIndicator({
  visibleSteps,
  className,
  ariaLabel,
}) {
  const { currentStep, completedSteps } = useNavigation();

  const stepsToDisplay = useMemo(() => {
    if (Array.isArray(visibleSteps) && visibleSteps.length > 0) {
      return visibleSteps.filter((step) => STEPS.includes(step));
    }
    return STEPS;
  }, [visibleSteps]);

  const stepItems = useMemo(() => {
    return stepsToDisplay.map((step, index) => {
      const status = getStepStatus(step, currentStep, completedSteps);
      const label = STEP_LABELS[step] || step;
      const stepNumber = index + 1;
      const isLast = index === stepsToDisplay.length - 1;

      return {
        key: step,
        stepNumber,
        label,
        status,
        isLast,
      };
    });
  }, [stepsToDisplay, currentStep, completedSteps]);

  const wrapperClasses = classNames(
    'w-full',
    className
  );

  const resolvedAriaLabel = ariaLabel || 'Workflow progress';

  return (
    <nav
      aria-label={resolvedAriaLabel}
      className={wrapperClasses}
    >
      <ol className="flex flex-col desktop:flex-row desktop:items-center">
        {stepItems.map((item) => (
          <ProgressStep
            key={item.key}
            stepNumber={item.stepNumber}
            label={item.label}
            status={item.status}
            isLast={item.isLast}
          />
        ))}
      </ol>
    </nav>
  );
}

ProgressIndicator.propTypes = {
  visibleSteps: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default ProgressIndicator;