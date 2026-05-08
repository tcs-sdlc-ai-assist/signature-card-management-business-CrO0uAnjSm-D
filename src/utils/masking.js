import { MASKING_CONFIG } from '@/utils/constants';

/**
 * Masks an account number, showing only the last N digits.
 * @param {string} accountNumber - The full account number to mask
 * @param {number} [visibleDigits] - Number of digits to show at the end
 * @returns {string} Masked account number (e.g., "******1001")
 */
export function maskAccountNumber(accountNumber, visibleDigits = MASKING_CONFIG.ACCOUNT_VISIBLE_DIGITS) {
  if (!accountNumber || typeof accountNumber !== 'string') {
    return '';
  }

  const trimmed = accountNumber.trim();
  if (trimmed.length === 0) {
    return '';
  }

  if (trimmed.length <= visibleDigits) {
    return trimmed;
  }

  const visible = trimmed.slice(-visibleDigits);
  const maskedLength = trimmed.length - visibleDigits;
  const masked = MASKING_CONFIG.MASK_CHAR.repeat(maskedLength);

  return `${masked}${visible}`;
}

/**
 * Masks an email address, showing only the first N characters of the local part and the full domain.
 * @param {string} email - The full email address to mask
 * @param {number} [visibleChars] - Number of characters to show at the start of the local part
 * @returns {string} Masked email (e.g., "joh***@example.com")
 */
export function maskEmail(email, visibleChars = MASKING_CONFIG.EMAIL_VISIBLE_CHARS) {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');

  if (atIndex === -1) {
    return '';
  }

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);

  if (localPart.length <= visibleChars) {
    return `${localPart}${MASKING_CONFIG.MASK_CHAR.repeat(3)}${domain}`;
  }

  const visible = localPart.slice(0, visibleChars);
  return `${visible}${MASKING_CONFIG.MASK_CHAR.repeat(3)}${domain}`;
}

/**
 * Masks a phone number, showing only the last N digits.
 * @param {string} phone - The full phone number to mask
 * @param {number} [visibleDigits] - Number of digits to show at the end
 * @returns {string} Masked phone number (e.g., "******4567")
 */
export function maskPhone(phone, visibleDigits = MASKING_CONFIG.PHONE_VISIBLE_DIGITS) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 0) {
    return '';
  }

  if (digitsOnly.length <= visibleDigits) {
    return digitsOnly;
  }

  const visible = digitsOnly.slice(-visibleDigits);
  const maskedLength = digitsOnly.length - visibleDigits;
  const masked = MASKING_CONFIG.MASK_CHAR.repeat(maskedLength);

  return `${masked}${visible}`;
}

/**
 * Masks a name, showing only the first initial and the full last name.
 * @param {string} firstName - The first name
 * @param {string} lastName - The last name
 * @returns {string} Masked name (e.g., "J. Smith")
 */
export function maskName(firstName, lastName) {
  if (!firstName || typeof firstName !== 'string' || !lastName || typeof lastName !== 'string') {
    return '';
  }

  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();

  if (trimmedFirst.length === 0 || trimmedLast.length === 0) {
    return '';
  }

  const initial = trimmedFirst.charAt(0).toUpperCase();

  return `${initial}. ${trimmedLast}`;
}

/**
 * Masks a Social Security Number, showing only the last N digits.
 * @param {string} ssn - The full SSN to mask
 * @param {number} [visibleDigits] - Number of digits to show at the end
 * @returns {string} Masked SSN (e.g., "***-**-6789")
 */
export function maskSSN(ssn, visibleDigits = MASKING_CONFIG.SSN_VISIBLE_DIGITS) {
  if (!ssn || typeof ssn !== 'string') {
    return '';
  }

  const digitsOnly = ssn.replace(/\D/g, '');

  if (digitsOnly.length !== 9) {
    return '';
  }

  const visible = digitsOnly.slice(-visibleDigits);

  return `${MASKING_CONFIG.MASK_CHAR.repeat(3)}-${MASKING_CONFIG.MASK_CHAR.repeat(2)}-${visible}`;
}