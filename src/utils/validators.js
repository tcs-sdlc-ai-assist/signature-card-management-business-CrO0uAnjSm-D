import messages from '@/data/messages.json';

const validationMessages = messages.validation;

/**
 * Replaces placeholder tokens in a message template.
 * @param {string} template - Message template with {field}, {min}, {max} placeholders
 * @param {Object<string, string|number>} values - Replacement values
 * @returns {string} Formatted message
 */
function formatMessage(template, values = {}) {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

/**
 * Validates that a value is not empty.
 * @param {string} value - The value to validate
 * @param {string} [fieldName='This field'] - The field name for error messages
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateRequired(value, fieldName = 'This field') {
  if (value === undefined || value === null || String(value).trim() === '') {
    return {
      valid: false,
      error: formatMessage(validationMessages.required, { field: fieldName }),
    };
  }
  return { valid: true, error: null };
}

/**
 * Validates an email address format.
 * @param {string} email - The email to validate
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateEmail(email) {
  const requiredCheck = validateRequired(email, 'Email');
  if (!requiredCheck.valid) {
    return requiredCheck;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email).trim())) {
    return {
      valid: false,
      error: validationMessages.invalidEmail,
    };
  }
  return { valid: true, error: null };
}

/**
 * Validates a phone number (10 digits).
 * @param {string} phone - The phone number to validate
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validatePhone(phone) {
  const requiredCheck = validateRequired(phone, 'Phone number');
  if (!requiredCheck.valid) {
    return requiredCheck;
  }

  const digitsOnly = String(phone).replace(/\D/g, '');
  if (digitsOnly.length !== 10) {
    return {
      valid: false,
      error: validationMessages.invalidPhone,
    };
  }
  return { valid: true, error: null };
}

/**
 * Validates a name field (letters, hyphens, apostrophes, and spaces only).
 * @param {string} name - The name to validate
 * @param {string} [fieldName='Name'] - The field name for error messages
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateName(name, fieldName = 'Name') {
  const requiredCheck = validateRequired(name, fieldName);
  if (!requiredCheck.valid) {
    return requiredCheck;
  }

  const nameRegex = /^[A-Za-z\s'\-]+$/;
  if (!nameRegex.test(String(name).trim())) {
    return {
      valid: false,
      error: validationMessages.nameFormat,
    };
  }

  if (String(name).trim().length < 2) {
    return {
      valid: false,
      error: formatMessage(validationMessages.minLength, { field: fieldName, min: 2 }),
    };
  }

  if (String(name).trim().length > 50) {
    return {
      valid: false,
      error: formatMessage(validationMessages.maxLength, { field: fieldName, max: 50 }),
    };
  }

  return { valid: true, error: null };
}

/**
 * Validates a 6-digit one-time passcode.
 * @param {string} otp - The OTP to validate
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateOTP(otp) {
  const requiredCheck = validateRequired(otp, 'One-time passcode');
  if (!requiredCheck.valid) {
    return requiredCheck;
  }

  const otpRegex = /^\d{6}$/;
  if (!otpRegex.test(String(otp).trim())) {
    return {
      valid: false,
      error: validationMessages.otpFormat,
    };
  }
  return { valid: true, error: null };
}

/**
 * Validates a password against security requirements.
 * Must be at least 8 characters and include an uppercase letter,
 * a lowercase letter, a number, and a special character.
 * @param {string} password - The password to validate
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validatePassword(password) {
  const requiredCheck = validateRequired(password, 'Password');
  if (!requiredCheck.valid) {
    return requiredCheck;
  }

  const pwd = String(password);

  if (pwd.length < 8) {
    return {
      valid: false,
      error: validationMessages.passwordRequirements,
    };
  }

  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      error: validationMessages.passwordRequirements,
    };
  }

  return { valid: true, error: null };
}

/**
 * Composite validator for the signer form.
 * Validates all signer fields and returns field-level errors.
 * @param {Object} formData - The signer form data
 * @param {string} formData.firstName - Signer's first name
 * @param {string} formData.lastName - Signer's last name
 * @param {string} [formData.middleName] - Signer's middle name (optional)
 * @param {string} [formData.suffix] - Signer's suffix (optional)
 * @param {string} formData.title - Signer's title
 * @param {string} formData.role - Signer's role
 * @param {string} formData.email - Signer's email
 * @param {string} formData.phone - Signer's phone number
 * @returns {{ valid: boolean, errors: Object<string, string> }}
 */
export function validateSignerForm(formData) {
  const errors = {};

  const firstNameResult = validateName(formData.firstName, 'First name');
  if (!firstNameResult.valid) {
    errors.firstName = firstNameResult.error;
  }

  const lastNameResult = validateName(formData.lastName, 'Last name');
  if (!lastNameResult.valid) {
    errors.lastName = lastNameResult.error;
  }

  if (formData.middleName && String(formData.middleName).trim() !== '') {
    const middleNameRegex = /^[A-Za-z\s'\-]+$/;
    if (!middleNameRegex.test(String(formData.middleName).trim())) {
      errors.middleName = validationMessages.nameFormat;
    } else if (String(formData.middleName).trim().length > 50) {
      errors.middleName = formatMessage(validationMessages.maxLength, { field: 'Middle name', max: 50 });
    }
  }

  if (formData.suffix && String(formData.suffix).trim() !== '') {
    const suffixRegex = /^[A-Za-z.\s]+$/;
    if (!suffixRegex.test(String(formData.suffix).trim())) {
      errors.suffix = formatMessage(validationMessages.invalidFormat, { field: 'Suffix' });
    }
  }

  const titleResult = validateRequired(formData.title, 'Title');
  if (!titleResult.valid) {
    errors.title = titleResult.error;
  }

  const roleResult = validateRequired(formData.role, 'Role');
  if (!roleResult.valid) {
    errors.role = roleResult.error;
  }

  const emailResult = validateEmail(formData.email);
  if (!emailResult.valid) {
    errors.email = emailResult.error;
  }

  const phoneResult = validatePhone(formData.phone);
  if (!phoneResult.valid) {
    errors.phone = phoneResult.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}