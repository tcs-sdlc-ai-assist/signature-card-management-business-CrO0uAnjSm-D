import { useState, useCallback, useId } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';

/**
 * Default legal disclaimer text used when none is provided.
 * @type {string}
 */
const DEFAULT_LEGAL_TEXT =
  'By proceeding, you acknowledge that you are an authorized controlling party for the account(s) you intend to manage. All changes to authorized signers are subject to review and approval by the financial institution. Submitting false or misleading information may result in account restrictions and potential legal action. Please ensure all signer information is accurate and up to date before submitting.';

/**
 * LegalConsent component renders a legal consent/acknowledgment checkbox
 * with full legal text. The checkbox must be checked to enable submission.
 * Accessible with proper label association, aria-required, and focus management.
 *
 * @param {Object} props
 * @param {boolean} props.checked - Whether the consent checkbox is currently checked
 * @param {Function} props.onChange - Callback invoked when the checkbox state changes
 * @param {string} [props.legalText] - Custom legal disclaimer text to display
 * @param {boolean} [props.required=true] - Whether the checkbox is required
 * @param {boolean} [props.disabled=false] - Whether the checkbox is disabled
 * @param {string} [props.error] - Validation error message to display
 * @param {string} [props.className] - Additional CSS class names for the wrapper
 * @param {string} [props.ariaLabel] - Custom ARIA label for the checkbox
 * @returns {React.ReactElement}
 */
function LegalConsent({
  checked,
  onChange,
  legalText,
  required = true,
  disabled = false,
  error,
  className,
  ariaLabel,
}) {
  const uniqueId = useId();
  const checkboxId = `legal-consent-${uniqueId}`;
  const errorId = `legal-consent-error-${uniqueId}`;
  const legalTextId = `legal-consent-text-${uniqueId}`;

  const resolvedLegalText = legalText || DEFAULT_LEGAL_TEXT;
  const hasError = typeof error === 'string' && error.length > 0;

  /**
   * Handles the checkbox change event.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event
   */
  const handleChange = useCallback((event) => {
    if (typeof onChange === 'function') {
      onChange(event.target.checked);
    }
  }, [onChange]);

  /**
   * Handles keyboard interaction on the checkbox wrapper for accessibility.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  const handleKeyDown = useCallback((event) => {
    if (disabled) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (typeof onChange === 'function') {
        onChange(!checked);
      }
    }
  }, [onChange, checked, disabled]);

  const wrapperClasses = classNames(
    'w-full rounded border bg-white p-4',
    {
      'border-gray-200': !hasError,
      'border-red-500': hasError,
      'opacity-50 cursor-not-allowed': disabled,
    },
    className
  );

  const checkboxClasses = classNames(
    'h-5 w-5 flex-shrink-0 rounded border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2',
    {
      'border-gray-300 text-primary-blue': !hasError,
      'border-red-500 text-red-600': hasError,
      'cursor-not-allowed': disabled,
      'cursor-pointer': !disabled,
    }
  );

  const describedByIds = [];
  if (hasError) {
    describedByIds.push(errorId);
  }
  describedByIds.push(legalTextId);

  return (
    <div className={wrapperClasses}>
      <div
        id={legalTextId}
        className="mb-4 max-h-48 overflow-y-auto rounded border border-gray-100 bg-gray-50 p-3 text-xs leading-relaxed text-gray-600"
        role="document"
        aria-label="Legal disclaimer"
      >
        {resolvedLegalText}
      </div>

      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={describedByIds.join(' ')}
          aria-label={ariaLabel || 'I acknowledge and agree to the legal terms'}
          className={checkboxClasses}
        />
        <label
          htmlFor={checkboxId}
          className={classNames(
            'text-sm leading-snug',
            {
              'text-body': !hasError,
              'text-red-600': hasError,
              'cursor-pointer': !disabled,
              'cursor-not-allowed': disabled,
            }
          )}
        >
          I acknowledge that I have read and agree to the terms and conditions outlined above.
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
          )}
        </label>
      </div>

      {hasError && (
        <p
          id={errorId}
          className="invaliderr"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

LegalConsent.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  legalText: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default LegalConsent;