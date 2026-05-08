import { useState, useCallback, useId } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';

/**
 * EyeIcon component for showing password visibility toggle (eye open).
 * @returns {React.ReactElement}
 */
function EyeIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * EyeOffIcon component for hiding password visibility toggle (eye closed).
 * @returns {React.ReactElement}
 */
function EyeOffIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

/**
 * Reusable form field component with floating label pattern.
 * Supports text, email, tel, and password input types with optional
 * password visibility toggle. Implements accessible validation states
 * with aria-describedby, aria-invalid, and aria-required attributes.
 *
 * @param {Object} props
 * @param {string} props.label - The label text for the input field
 * @param {string} props.name - The name attribute for the input field
 * @param {string} props.value - The current value of the input field
 * @param {Function} props.onChange - Change handler callback
 * @param {Function} [props.onBlur] - Blur handler callback
 * @param {string} [props.error] - Validation error message to display
 * @param {boolean} [props.required=false] - Whether the field is required
 * @param {string} [props.type='text'] - The input type (text, email, tel, password)
 * @param {boolean} [props.showPasswordToggle=false] - Whether to show the password visibility toggle
 * @param {string} [props.className] - Additional CSS class names for the wrapper
 * @param {string} [props.placeholder] - Placeholder text (used for floating label positioning)
 * @param {boolean} [props.disabled=false] - Whether the input is disabled
 * @param {string} [props.autoComplete] - The autocomplete attribute value
 * @param {number} [props.maxLength] - Maximum character length for the input
 * @returns {React.ReactElement}
 */
function FormField({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  type = 'text',
  showPasswordToggle = false,
  className,
  placeholder,
  disabled = false,
  autoComplete,
  maxLength,
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const uniqueId = useId();
  const inputId = `formfield-${name}-${uniqueId}`;
  const errorId = `formfield-error-${name}-${uniqueId}`;

  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const isFloating = isFocused || hasValue;
  const hasError = typeof error === 'string' && error.length > 0;

  const resolvedType = type === 'password' && passwordVisible ? 'text' : type;

  /**
   * Handles focus event on the input field.
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  /**
   * Handles blur event on the input field.
   * @param {React.FocusEvent<HTMLInputElement>} event - The blur event
   */
  const handleBlur = useCallback((event) => {
    setIsFocused(false);
    if (typeof onBlur === 'function') {
      onBlur(event);
    }
  }, [onBlur]);

  /**
   * Handles change event on the input field.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event
   */
  const handleChange = useCallback((event) => {
    if (typeof onChange === 'function') {
      onChange(event);
    }
  }, [onChange]);

  /**
   * Toggles password visibility.
   */
  const handleTogglePassword = useCallback(() => {
    setPasswordVisible((prev) => !prev);
  }, []);

  /**
   * Handles keyboard interaction on the password toggle button.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  const handleToggleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTogglePassword();
    }
  }, [handleTogglePassword]);

  const wrapperClasses = classNames(
    'relative',
    className
  );

  const inputClasses = classNames(
    'peer w-full rounded border bg-white px-3 pb-2 pt-5 text-sm text-body outline-none transition-colors duration-200',
    {
      'border-gray-300 focus:border-primary-blue focus:ring-1 focus:ring-primary-blue': !hasError,
      'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500': hasError,
      'cursor-not-allowed bg-gray-50 opacity-60': disabled,
      'pr-10': type === 'password' && showPasswordToggle,
    }
  );

  const labelClasses = classNames(
    'pointer-events-none absolute left-3 transition-all duration-200',
    {
      'top-1 text-xs': isFloating,
      'top-3.5 text-sm': !isFloating,
      'text-primary-blue': isFocused && !hasError,
      'text-red-500': hasError,
      'text-gray-500': !isFocused && !hasError,
    }
  );

  return (
    <div className={wrapperClasses}>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={resolvedType}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          autoComplete={autoComplete}
          maxLength={maxLength}
          placeholder={placeholder || ' '}
          className={inputClasses}
        />
        <label
          htmlFor={inputId}
          className={labelClasses}
        >
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
          )}
        </label>
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            onClick={handleTogglePassword}
            onKeyDown={handleToggleKeyDown}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            tabIndex={0}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors duration-200 hover:text-gray-700 focus:outline-none focus:text-primary-blue"
          >
            {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
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

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  error: PropTypes.string,
  required: PropTypes.bool,
  type: PropTypes.oneOf(['text', 'email', 'tel', 'password']),
  showPasswordToggle: PropTypes.bool,
  className: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  autoComplete: PropTypes.string,
  maxLength: PropTypes.number,
};

export default FormField;