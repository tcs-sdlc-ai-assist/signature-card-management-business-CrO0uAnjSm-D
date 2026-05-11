import { useState, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import Alert from '@/components/Alert';
import { validateSignerForm, validateName, validateEmail, validatePhone, validateRequired } from '@/utils/validators';

/**
 * Available signer role options.
 * @type {Array<{ value: string, label: string }>}
 */
const ROLE_OPTIONS = [
  { value: '', label: 'Select a role' },
  { value: 'Primary Signer', label: 'Primary Signer' },
  { value: 'Secondary Signer', label: 'Secondary Signer' },
  { value: 'Authorized Signer', label: 'Authorized Signer' },
];

/**
 * Available signer title options.
 * @type {Array<{ value: string, label: string }>}
 */
const TITLE_OPTIONS = [
  { value: '', label: 'Select a title' },
  { value: 'Owner', label: 'Owner' },
  { value: 'Co-Owner', label: 'Co-Owner' },
  { value: 'CFO', label: 'CFO' },
  { value: 'VP of Finance', label: 'VP of Finance' },
  { value: 'Controller', label: 'Controller' },
  { value: 'Assistant Controller', label: 'Assistant Controller' },
  { value: 'Treasurer', label: 'Treasurer' },
  { value: 'Managing Partner', label: 'Managing Partner' },
  { value: 'Partner', label: 'Partner' },
  { value: 'Operations Manager', label: 'Operations Manager' },
  { value: 'Other', label: 'Other' },
];

/**
 * Available suffix options.
 * @type {Array<{ value: string, label: string }>}
 */
const SUFFIX_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Jr.', label: 'Jr.' },
  { value: 'Sr.', label: 'Sr.' },
  { value: 'II', label: 'II' },
  { value: 'III', label: 'III' },
  { value: 'IV', label: 'IV' },
];

/**
 * Default empty form data for a new signer.
 * @type {Object}
 */
const DEFAULT_FORM_DATA = {
  firstName: '',
  lastName: '',
  middleName: '',
  suffix: '',
  title: '',
  role: '',
  email: '',
  phone: '',
  additionalContact: '',
};

/**
 * Reusable signer form component used by both Add and Edit flows.
 * Provides real-time inline validation, accessible form labels, error
 * announcements, and pre-population for edit mode.
 *
 * @param {Object} props
 * @param {Object} [props.initialData] - Initial signer data for pre-populating the form (edit mode)
 * @param {boolean} [props.isEditMode=false] - Whether the form is in edit mode
 * @param {Function} props.onSubmit - Callback invoked with validated form data on submission
 * @param {Function} [props.onCancel] - Callback invoked when the cancel button is clicked
 * @param {boolean} [props.loading=false] - Whether the form submission is in progress
 * @param {string} [props.submitButtonText] - Custom text for the submit button
 * @param {string} [props.cancelButtonText='Cancel'] - Custom text for the cancel button
 * @param {string} [props.serverError] - Server-side error message to display
 * @param {Object} [props.serverErrors] - Server-side field-level errors
 * @param {string} [props.className] - Additional CSS class names for the form wrapper
 * @param {string} [props.ariaLabel] - Custom ARIA label for the form
 * @returns {React.ReactElement}
 */
function SignerForm({
  initialData,
  isEditMode = false,
  onSubmit,
  onCancel,
  loading = false,
  submitButtonText,
  cancelButtonText = 'Cancel',
  serverError,
  serverErrors,
  className,
  ariaLabel,
}) {
  const [formData, setFormData] = useState(() => {
    if (initialData && typeof initialData === 'object') {
      return {
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        middleName: initialData.middleName || '',
        suffix: initialData.suffix || '',
        title: initialData.title || '',
        role: initialData.role || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        additionalContact: initialData.additionalContact || '',
      };
    }
    return { ...DEFAULT_FORM_DATA };
  });

  /**
   * Syncs form data when initialData changes (e.g., async load in edit mode).
   */
  useEffect(() => {
    if (initialData && typeof initialData === 'object') {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        middleName: initialData.middleName || '',
        suffix: initialData.suffix || '',
        title: initialData.title || '',
        role: initialData.role || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        additionalContact: initialData.additionalContact || '',
      });
    }
  }, [initialData]);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  /**
   * Merges server-side field errors into the local errors state when they change.
   */
  useEffect(() => {
    if (serverErrors && typeof serverErrors === 'object') {
      setErrors((prev) => ({
        ...prev,
        ...serverErrors,
      }));
    }
  }, [serverErrors]);

  /**
   * Validates a single field and returns the error message or null.
   * @param {string} fieldName - The field name to validate
   * @param {string} value - The field value
   * @returns {string|null} The error message or null if valid
   */
  const validateField = useCallback((fieldName, value) => {
    switch (fieldName) {
      case 'firstName': {
        const result = validateName(value, 'First name');
        return result.valid ? null : result.error;
      }
      case 'lastName': {
        const result = validateName(value, 'Last name');
        return result.valid ? null : result.error;
      }
      case 'middleName': {
        if (!value || String(value).trim() === '') {
          return null;
        }
        const nameRegex = /^[A-Za-z\s'\-]+$/;
        if (!nameRegex.test(String(value).trim())) {
          return 'Name may only contain letters, hyphens, apostrophes, and spaces.';
        }
        if (String(value).trim().length > 50) {
          return 'Middle name must not exceed 50 characters.';
        }
        return null;
      }
      case 'suffix': {
        return null;
      }
      case 'title': {
        const result = validateRequired(value, 'Title');
        return result.valid ? null : result.error;
      }
      case 'role': {
        const result = validateRequired(value, 'Role');
        return result.valid ? null : result.error;
      }
      case 'email': {
        const result = validateEmail(value);
        return result.valid ? null : result.error;
      }
      case 'phone': {
        const result = validatePhone(value);
        return result.valid ? null : result.error;
      }
      case 'additionalContact': {
        return null;
      }
      default:
        return null;
    }
  }, []);

  /**
   * Handles input change events, updating form data and performing
   * inline validation for touched fields.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} event - The change event
   */
  const handleChange = useCallback((event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (touched[name] || formSubmitted) {
      const fieldError = validateField(name, value);
      setErrors((prev) => {
        const updated = { ...prev };
        if (fieldError) {
          updated[name] = fieldError;
        } else {
          delete updated[name];
        }
        return updated;
      });
    }
  }, [touched, formSubmitted, validateField]);

  /**
   * Handles input blur events, marking the field as touched and validating it.
   * @param {React.FocusEvent<HTMLInputElement|HTMLSelectElement>} event - The blur event
   */
  const handleBlur = useCallback((event) => {
    const { name, value } = event.target;

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    const fieldError = validateField(name, value);
    setErrors((prev) => {
      const updated = { ...prev };
      if (fieldError) {
        updated[name] = fieldError;
      } else {
        delete updated[name];
      }
      return updated;
    });
  }, [validateField]);

  /**
   * Handles select change events for title, role, and suffix fields.
   * @param {React.ChangeEvent<HTMLSelectElement>} event - The change event
   */
  const handleSelectChange = useCallback((event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    const fieldError = validateField(name, value);
    setErrors((prev) => {
      const updated = { ...prev };
      if (fieldError) {
        updated[name] = fieldError;
      } else {
        delete updated[name];
      }
      return updated;
    });
  }, [validateField]);

  /**
   * Handles form submission, performing full validation before invoking onSubmit.
   * @param {React.FormEvent<HTMLFormElement>} event - The form event
   */
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    setFormSubmitted(true);

    const allTouched = {};
    for (const key of Object.keys(formData)) {
      allTouched[key] = true;
    }
    setTouched(allTouched);

    const validation = validateSignerForm(formData);

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    if (typeof onSubmit === 'function') {
      onSubmit({ ...formData });
    }
  }, [formData, onSubmit]);

  /**
   * Handles the cancel button click.
   */
  const handleCancel = useCallback(() => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
  }, [onCancel]);

  const resolvedSubmitText = submitButtonText || (isEditMode ? 'Save Changes' : 'Add Signer');
  const resolvedAriaLabel = ariaLabel || (isEditMode ? 'Edit signer form' : 'Add signer form');

  const hasErrors = Object.keys(errors).length > 0;

  const formClasses = classNames(
    'w-full',
    className
  );

  const selectBaseClasses = 'peer w-full rounded border bg-white px-3 pb-2 pt-5 text-sm text-body outline-none transition-colors duration-200';
  const selectNormalClasses = 'border-gray-300 focus:border-primary-blue focus:ring-1 focus:ring-primary-blue';
  const selectErrorClasses = 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={resolvedAriaLabel}
      className={formClasses}
    >
      {serverError && (
        <div className="mb-6">
          <Alert
            message={serverError}
            variant="critical"
            ariaLabel="Form submission error"
          />
        </div>
      )}

      {formSubmitted && hasErrors && (
        <div className="mb-6">
          <Alert
            message="Please correct the errors below before continuing."
            variant="warning"
            ariaLabel="Form validation errors"
          />
        </div>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2">
          <FormField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.firstName || formSubmitted ? errors.firstName : undefined}
            required={true}
            type="text"
            autoComplete="given-name"
            maxLength={50}
          />

          <FormField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.lastName || formSubmitted ? errors.lastName : undefined}
            required={true}
            type="text"
            autoComplete="family-name"
            maxLength={50}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2">
          <FormField
            label="Middle Name"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.middleName || formSubmitted ? errors.middleName : undefined}
            required={false}
            type="text"
            autoComplete="additional-name"
            maxLength={50}
          />

          <div className="relative">
            <select
              id="signer-suffix"
              name="suffix"
              value={formData.suffix}
              onChange={handleSelectChange}
              onBlur={handleBlur}
              aria-label="Suffix"
              className={classNames(
                selectBaseClasses,
                errors.suffix && (touched.suffix || formSubmitted) ? selectErrorClasses : selectNormalClasses
              )}
            >
              {SUFFIX_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label
              htmlFor="signer-suffix"
              className={classNames(
                'pointer-events-none absolute left-3 top-1 text-xs transition-all duration-200',
                {
                  'text-red-500': errors.suffix && (touched.suffix || formSubmitted),
                  'text-gray-500': !(errors.suffix && (touched.suffix || formSubmitted)),
                }
              )}
            >
              Suffix
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2">
          <div className="relative">
            <select
              id="signer-title"
              name="title"
              value={formData.title}
              onChange={handleSelectChange}
              onBlur={handleBlur}
              required
              aria-required="true"
              aria-invalid={!!(errors.title && (touched.title || formSubmitted))}
              aria-describedby={errors.title && (touched.title || formSubmitted) ? 'signer-title-error' : undefined}
              className={classNames(
                selectBaseClasses,
                errors.title && (touched.title || formSubmitted) ? selectErrorClasses : selectNormalClasses
              )}
            >
              {TITLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label
              htmlFor="signer-title"
              className={classNames(
                'pointer-events-none absolute left-3 top-1 text-xs transition-all duration-200',
                {
                  'text-red-500': errors.title && (touched.title || formSubmitted),
                  'text-gray-500': !(errors.title && (touched.title || formSubmitted)),
                }
              )}
            >
              Title<span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
            </label>
            {errors.title && (touched.title || formSubmitted) && (
              <p
                id="signer-title-error"
                className="invaliderr"
                role="alert"
              >
                {errors.title}
              </p>
            )}
          </div>

          <div className="relative">
            <select
              id="signer-role"
              name="role"
              value={formData.role}
              onChange={handleSelectChange}
              onBlur={handleBlur}
              required
              aria-required="true"
              aria-invalid={!!(errors.role && (touched.role || formSubmitted))}
              aria-describedby={errors.role && (touched.role || formSubmitted) ? 'signer-role-error' : undefined}
              className={classNames(
                selectBaseClasses,
                errors.role && (touched.role || formSubmitted) ? selectErrorClasses : selectNormalClasses
              )}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label
              htmlFor="signer-role"
              className={classNames(
                'pointer-events-none absolute left-3 top-1 text-xs transition-all duration-200',
                {
                  'text-red-500': errors.role && (touched.role || formSubmitted),
                  'text-gray-500': !(errors.role && (touched.role || formSubmitted)),
                }
              )}
            >
              Role<span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
            </label>
            {errors.role && (touched.role || formSubmitted) && (
              <p
                id="signer-role-error"
                className="invaliderr"
                role="alert"
              >
                {errors.role}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2">
          <FormField
            label="Email Address"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.email || formSubmitted ? errors.email : undefined}
            required={true}
            type="email"
            autoComplete="email"
          />

          <FormField
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.phone || formSubmitted ? errors.phone : undefined}
            required={true}
            type="tel"
            autoComplete="tel"
            maxLength={10}
          />
        </div>

        <FormField
          label="Additional Contact Information"
          name="additionalContact"
          value={formData.additionalContact}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.additionalContact || formSubmitted ? errors.additionalContact : undefined}
          required={false}
          type="text"
        />
      </div>

      <div className="mt-8 flex items-center justify-end space-x-3">
        {onCancel && (
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={loading}
            ariaLabel={cancelButtonText}
          >
            {cancelButtonText}
          </Button>
        )}
        <Button
          variant="primary"
          type="submit"
          loading={loading}
          disabled={loading}
          ariaLabel={resolvedSubmitText}
        >
          {resolvedSubmitText}
        </Button>
      </div>
    </form>
  );
}

SignerForm.propTypes = {
  initialData: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    middleName: PropTypes.string,
    suffix: PropTypes.string,
    title: PropTypes.string,
    role: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    additionalContact: PropTypes.string,
  }),
  isEditMode: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  loading: PropTypes.bool,
  submitButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  serverError: PropTypes.string,
  serverErrors: PropTypes.object,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default SignerForm;