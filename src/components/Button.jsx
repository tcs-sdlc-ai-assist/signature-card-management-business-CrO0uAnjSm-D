import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';

/**
 * @typedef {'primary' | 'secondary' | 'danger' | 'link'} ButtonVariant
 */

/**
 * Maps button variants to their corresponding CSS class names.
 * @type {Object<string, string>}
 */
const VARIANT_CLASS_MAP = {
  primary: 'button-primary',
  secondary: 'button-secondary-2',
  danger: 'inline-flex items-center justify-center rounded px-6 py-2.5 text-sm font-medium text-white transition-colors duration-200 bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600',
  link: 'inline-flex items-center justify-center rounded px-6 py-2.5 text-sm font-medium transition-colors duration-200 text-primary-blue underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue bg-transparent',
};

/**
 * Loading spinner SVG component rendered inside the button when loading is true.
 *
 * @returns {React.ReactElement}
 */
function LoadingSpinner() {
  return (
    <svg
      className="mr-2 h-4 w-4 animate-spin"
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
  );
}

/**
 * Reusable Button component supporting primary, secondary, danger, and link variants.
 * Includes loading state with spinner, proper disabled styling, and ARIA attributes.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The button content
 * @param {ButtonVariant} [props.variant='primary'] - The visual variant of the button
 * @param {'button' | 'submit' | 'reset'} [props.type='button'] - The HTML button type
 * @param {Function} [props.onClick] - Click handler callback
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.loading=false] - Whether the button is in a loading state
 * @param {string} [props.ariaLabel] - Custom ARIA label for the button
 * @param {string} [props.className] - Additional CSS class names
 * @returns {React.ReactElement}
 */
function Button({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  loading = false,
  ariaLabel,
  className,
}) {
  /**
   * Handles the button click, preventing interaction when disabled or loading.
   * @param {React.MouseEvent<HTMLButtonElement>} event - The mouse event
   */
  const handleClick = useCallback((event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }

    if (typeof onClick === 'function') {
      onClick(event);
    }
  }, [onClick, disabled, loading]);

  const resolvedVariant = VARIANT_CLASS_MAP[variant] ? variant : 'primary';
  const variantClass = VARIANT_CLASS_MAP[resolvedVariant];

  const isDisabled = disabled || loading;

  const buttonClasses = classNames(
    variantClass,
    {
      'cursor-not-allowed opacity-50': isDisabled,
    },
    className
  );

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={buttonClasses}
    >
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'link']),
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  ariaLabel: PropTypes.string,
  className: PropTypes.string,
};

export default Button;