import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';

/**
 * @typedef {'critical' | 'warning' | 'success' | 'info'} AlertVariant
 */

/**
 * Maps alert variants to their corresponding CSS class names.
 * @type {Object<string, string>}
 */
const VARIANT_CLASS_MAP = {
  critical: 'hb-alert-critical',
  warning: 'hb-alert-warning',
  success: 'hb-alert-success',
  info: 'hb-alert-info',
};

/**
 * Fallback styles for the info variant which does not have a predefined
 * class in index.css.
 * @type {string}
 */
const INFO_FALLBACK_CLASSES = 'relative rounded border px-4 py-3 text-sm bg-blue-50 border-blue-300 text-blue-800';

/**
 * Maps alert variants to default ARIA labels when none is provided.
 * @type {Object<string, string>}
 */
const DEFAULT_ARIA_LABELS = {
  critical: 'Critical alert',
  warning: 'Warning alert',
  success: 'Success alert',
  info: 'Informational alert',
};

/**
 * Alert component for displaying accessible alert/notification messages.
 * Supports critical, warning, success, and info variants with optional
 * dismiss functionality and proper ARIA attributes.
 *
 * @param {Object} props
 * @param {string} props.message - The alert message to display
 * @param {AlertVariant} [props.variant='info'] - The visual variant of the alert
 * @param {boolean} [props.dismissible=false] - Whether the alert can be dismissed
 * @param {Function} [props.onDismiss] - Callback invoked when the alert is dismissed
 * @param {string} [props.ariaLabel] - Custom ARIA label for the alert region
 * @param {string} [props.title] - Optional title displayed above the message
 * @param {string} [props.className] - Additional CSS class names
 * @param {React.ReactNode} [props.children] - Optional children rendered after the message
 * @returns {React.ReactElement|null}
 */
function Alert({
  message,
  variant = 'info',
  dismissible = false,
  onDismiss,
  ariaLabel,
  title,
  className,
  children,
}) {
  const [visible, setVisible] = useState(true);
  const alertRef = useRef(null);

  useEffect(() => {
    if (visible && alertRef.current) {
      alertRef.current.focus();
    }
  }, [visible]);

  /**
   * Handles dismissing the alert by hiding it and invoking the onDismiss callback.
   */
  const handleDismiss = useCallback(() => {
    setVisible(false);
    if (typeof onDismiss === 'function') {
      onDismiss();
    }
  }, [onDismiss]);

  /**
   * Handles keyboard interaction on the dismiss button.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  const handleDismissKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismiss();
    }
  }, [handleDismiss]);

  if (!visible) {
    return null;
  }

  if (!message && !children) {
    return null;
  }

  const resolvedVariant = VARIANT_CLASS_MAP[variant] ? variant : 'info';
  const variantClass = VARIANT_CLASS_MAP[resolvedVariant];
  const usesFallback = resolvedVariant === 'info' && !variantClass;
  const resolvedAriaLabel = ariaLabel || DEFAULT_ARIA_LABELS[resolvedVariant] || 'Alert';

  const alertClasses = classNames(
    resolvedVariant === 'info' ? INFO_FALLBACK_CLASSES : variantClass,
    className
  );

  return (
    <div
      ref={alertRef}
      role="alert"
      aria-label={resolvedAriaLabel}
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={-1}
      className={alertClasses}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {title && (
            <p className="mb-1 font-medium">{title}</p>
          )}
          {message && (
            <p>{message}</p>
          )}
          {children}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            onKeyDown={handleDismissKeyDown}
            aria-label="Dismiss alert"
            className="ml-3 inline-flex flex-shrink-0 items-center justify-center rounded p-1 transition-colors duration-200 hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-1"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

Alert.propTypes = {
  message: PropTypes.string,
  variant: PropTypes.oneOf(['critical', 'warning', 'success', 'info']),
  dismissible: PropTypes.bool,
  onDismiss: PropTypes.func,
  ariaLabel: PropTypes.string,
  title: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node,
};

export default Alert;