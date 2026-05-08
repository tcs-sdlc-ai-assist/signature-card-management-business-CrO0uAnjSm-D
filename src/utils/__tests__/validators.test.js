import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateName,
  validateOTP,
  validatePassword,
  validateSignerForm,
} from '@/utils/validators';

describe('validators', () => {
  describe('validateRequired', () => {
    it('returns valid for a non-empty string', () => {
      const result = validateRequired('hello', 'Field');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a string with content after trimming', () => {
      const result = validateRequired('  hello  ', 'Field');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid for an empty string', () => {
      const result = validateRequired('', 'Username');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Username');
      expect(result.error).toContain('required');
    });

    it('returns invalid for a whitespace-only string', () => {
      const result = validateRequired('   ', 'Username');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('required');
    });

    it('returns invalid for null', () => {
      const result = validateRequired(null, 'Field');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('required');
    });

    it('returns invalid for undefined', () => {
      const result = validateRequired(undefined, 'Field');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('required');
    });

    it('uses default field name when none is provided', () => {
      const result = validateRequired('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('This field');
    });

    it('includes the custom field name in the error message', () => {
      const result = validateRequired('', 'Email');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Email');
    });
  });

  describe('validateEmail', () => {
    it('returns valid for a standard email address', () => {
      const result = validateEmail('user@example.com');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for an email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for an email with dots in local part', () => {
      const result = validateEmail('first.last@example.com');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for an email with plus sign in local part', () => {
      const result = validateEmail('user+tag@example.com');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for an email with numbers', () => {
      const result = validateEmail('user123@example456.com');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid for an empty string', () => {
      const result = validateEmail('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('required');
    });

    it('returns invalid for null', () => {
      const result = validateEmail(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for undefined', () => {
      const result = validateEmail(undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for an email without @ symbol', () => {
      const result = validateEmail('userexample.com');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('email');
    });

    it('returns invalid for an email without domain', () => {
      const result = validateEmail('user@');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for an email without local part', () => {
      const result = validateEmail('@example.com');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for an email without TLD', () => {
      const result = validateEmail('user@example');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for an email with spaces', () => {
      const result = validateEmail('user @example.com');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a plain string', () => {
      const result = validateEmail('notanemail');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns valid for email with trimmed whitespace', () => {
      const result = validateEmail('  user@example.com  ');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('validatePhone', () => {
    it('returns valid for a 10-digit phone number', () => {
      const result = validatePhone('5551234567');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a phone number with formatting characters', () => {
      const result = validatePhone('(555) 123-4567');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a phone number with dashes', () => {
      const result = validatePhone('555-123-4567');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a phone number with spaces', () => {
      const result = validatePhone('555 123 4567');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a phone number with dots', () => {
      const result = validatePhone('555.123.4567');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid for an empty string', () => {
      const result = validatePhone('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('required');
    });

    it('returns invalid for null', () => {
      const result = validatePhone(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for undefined', () => {
      const result = validatePhone(undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a phone number with fewer than 10 digits', () => {
      const result = validatePhone('55512345');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('10-digit');
    });

    it('returns invalid for a phone number with more than 10 digits', () => {
      const result = validatePhone('155512345678');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('10-digit');
    });

    it('returns invalid for a phone number with only 1 digit', () => {
      const result = validatePhone('5');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a string with no digits', () => {
      const result = validatePhone('abcdefghij');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateName', () => {
    it('returns valid for a simple name', () => {
      const result = validateName('John', 'First name');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a name with a hyphen', () => {
      const result = validateName('Mary-Jane', 'First name');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a name with an apostrophe', () => {
      const result = validateName("O'Brien", 'Last name');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a name with spaces', () => {
      const result = validateName('De La Cruz', 'Last name');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a two-character name', () => {
      const result = validateName('Li', 'First name');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a 50-character name', () => {
      const longName = 'A'.repeat(50);
      const result = validateName(longName, 'First name');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid for an empty string', () => {
      const result = validateName('', 'First name');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('required');
    });

    it('returns invalid for null', () => {
      const result = validateName(null, 'First name');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for undefined', () => {
      const result = validateName(undefined, 'First name');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a name with numbers', () => {
      const result = validateName('John123', 'First name');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('letters');
    });

    it('returns invalid for a name with special characters', () => {
      const result = validateName('John@Doe', 'First name');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a single character name', () => {
      const result = validateName('J', 'First name');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('2');
    });

    it('returns invalid for a name exceeding 50 characters', () => {
      const longName = 'A'.repeat(51);
      const result = validateName(longName, 'First name');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('50');
    });

    it('returns invalid for a name with only whitespace', () => {
      const result = validateName('   ', 'First name');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('uses default field name when none is provided', () => {
      const result = validateName('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateOTP', () => {
    it('returns valid for a 6-digit numeric code', () => {
      const result = validateOTP('123456');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a 6-digit code with leading zeros', () => {
      const result = validateOTP('000000');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for another valid 6-digit code', () => {
      const result = validateOTP('999999');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid for an empty string', () => {
      const result = validateOTP('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('required');
    });

    it('returns invalid for null', () => {
      const result = validateOTP(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for undefined', () => {
      const result = validateOTP(undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a 5-digit code', () => {
      const result = validateOTP('12345');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('6-digit');
    });

    it('returns invalid for a 7-digit code', () => {
      const result = validateOTP('1234567');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('6-digit');
    });

    it('returns invalid for alphabetic characters', () => {
      const result = validateOTP('abcdef');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('6-digit');
    });

    it('returns invalid for mixed alphanumeric characters', () => {
      const result = validateOTP('12ab56');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a code with spaces', () => {
      const result = validateOTP('123 456');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a code with special characters', () => {
      const result = validateOTP('12-456');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validatePassword', () => {
    it('returns valid for a password meeting all requirements', () => {
      const result = validatePassword('Password1!');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for a complex password', () => {
      const result = validatePassword('Str0ng@Pass');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid for an empty string', () => {
      const result = validatePassword('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('required');
    });

    it('returns invalid for null', () => {
      const result = validatePassword(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a password shorter than 8 characters', () => {
      const result = validatePassword('Pa1!');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a password without uppercase letter', () => {
      const result = validatePassword('password1!');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a password without lowercase letter', () => {
      const result = validatePassword('PASSWORD1!');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a password without a number', () => {
      const result = validatePassword('Password!');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for a password without a special character', () => {
      const result = validatePassword('Password1');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateSignerForm', () => {
    const VALID_FORM_DATA = {
      firstName: 'Jane',
      lastName: 'Doe',
      middleName: 'Marie',
      suffix: '',
      title: 'CFO',
      role: 'Authorized Signer',
      email: 'jane.doe@example.com',
      phone: '5559998888',
    };

    it('returns valid for complete valid form data', () => {
      const result = validateSignerForm(VALID_FORM_DATA);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('returns valid when middleName is empty', () => {
      const formData = { ...VALID_FORM_DATA, middleName: '' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('returns valid when suffix is empty', () => {
      const formData = { ...VALID_FORM_DATA, suffix: '' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('returns valid when middleName is undefined', () => {
      const formData = { ...VALID_FORM_DATA, middleName: undefined };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('returns valid with a valid suffix', () => {
      const formData = { ...VALID_FORM_DATA, suffix: 'Jr.' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('returns invalid when firstName is empty', () => {
      const formData = { ...VALID_FORM_DATA, firstName: '' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.firstName).toBeDefined();
    });

    it('returns invalid when lastName is empty', () => {
      const formData = { ...VALID_FORM_DATA, lastName: '' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.lastName).toBeDefined();
    });

    it('returns invalid when title is empty', () => {
      const formData = { ...VALID_FORM_DATA, title: '' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });

    it('returns invalid when role is empty', () => {
      const formData = { ...VALID_FORM_DATA, role: '' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.role).toBeDefined();
    });

    it('returns invalid when email is empty', () => {
      const formData = { ...VALID_FORM_DATA, email: '' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
    });

    it('returns invalid when email format is invalid', () => {
      const formData = { ...VALID_FORM_DATA, email: 'not-an-email' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
    });

    it('returns invalid when phone is empty', () => {
      const formData = { ...VALID_FORM_DATA, phone: '' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.phone).toBeDefined();
    });

    it('returns invalid when phone has wrong number of digits', () => {
      const formData = { ...VALID_FORM_DATA, phone: '123' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.phone).toBeDefined();
    });

    it('returns invalid when firstName contains numbers', () => {
      const formData = { ...VALID_FORM_DATA, firstName: 'Jane123' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.firstName).toBeDefined();
    });

    it('returns invalid when lastName contains special characters', () => {
      const formData = { ...VALID_FORM_DATA, lastName: 'Doe@#' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.lastName).toBeDefined();
    });

    it('returns invalid when middleName contains numbers', () => {
      const formData = { ...VALID_FORM_DATA, middleName: 'Marie123' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.middleName).toBeDefined();
    });

    it('returns invalid when middleName exceeds 50 characters', () => {
      const formData = { ...VALID_FORM_DATA, middleName: 'A'.repeat(51) };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.middleName).toBeDefined();
    });

    it('returns multiple errors when multiple fields are invalid', () => {
      const formData = {
        firstName: '',
        lastName: '',
        middleName: '',
        suffix: '',
        title: '',
        role: '',
        email: 'invalid-email',
        phone: '123',
      };

      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(6);
      expect(result.errors.firstName).toBeDefined();
      expect(result.errors.lastName).toBeDefined();
      expect(result.errors.title).toBeDefined();
      expect(result.errors.role).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.phone).toBeDefined();
    });

    it('returns errors object with field names as keys', () => {
      const formData = { ...VALID_FORM_DATA, firstName: '', email: 'bad' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(typeof result.errors).toBe('object');
      expect(result.errors.firstName).toBeDefined();
      expect(typeof result.errors.firstName).toBe('string');
      expect(result.errors.email).toBeDefined();
      expect(typeof result.errors.email).toBe('string');
    });

    it('does not return errors for valid optional fields', () => {
      const formData = {
        ...VALID_FORM_DATA,
        middleName: 'Anne',
        suffix: 'Sr.',
      };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(true);
      expect(result.errors.middleName).toBeUndefined();
      expect(result.errors.suffix).toBeUndefined();
    });

    it('validates firstName with hyphenated name', () => {
      const formData = { ...VALID_FORM_DATA, firstName: 'Mary-Jane' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(true);
      expect(result.errors.firstName).toBeUndefined();
    });

    it('validates lastName with apostrophe', () => {
      const formData = { ...VALID_FORM_DATA, lastName: "O'Brien" };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(true);
      expect(result.errors.lastName).toBeUndefined();
    });

    it('validates phone with formatting characters', () => {
      const formData = { ...VALID_FORM_DATA, phone: '(555) 999-8888' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(true);
      expect(result.errors.phone).toBeUndefined();
    });

    it('returns invalid for firstName that is too short', () => {
      const formData = { ...VALID_FORM_DATA, firstName: 'J' };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.firstName).toBeDefined();
    });

    it('returns invalid for firstName that is too long', () => {
      const formData = { ...VALID_FORM_DATA, firstName: 'A'.repeat(51) };
      const result = validateSignerForm(formData);

      expect(result.valid).toBe(false);
      expect(result.errors.firstName).toBeDefined();
    });
  });
});