/**
 * General-purpose helper utilities for the Signature Card Management System.
 */

/**
 * Generates a UUID-like identifier string.
 * @returns {string} A UUID-like string (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
 */
export function generateId() {
  const hex = '0123456789abcdef';
  const segments = [8, 4, 4, 4, 12];

  return segments
    .map((length) => {
      let segment = '';
      for (let i = 0; i < length; i++) {
        segment += hex[Math.floor(Math.random() * hex.length)];
      }
      return segment;
    })
    .join('-');
}

/**
 * Generates a confirmation number string with a prefix and random alphanumeric characters.
 * @param {string} [prefix='SCM'] - The prefix for the confirmation number
 * @returns {string} A confirmation number (e.g., "SCM-20240215-A1B2C3")
 */
export function generateConfirmationNumber(prefix = 'SCM') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars[Math.floor(Math.random() * chars.length)];
  }

  return `${prefix}-${datePart}-${randomPart}`;
}

/**
 * Formats an ISO timestamp string into a human-readable date and time string.
 * @param {string} timestamp - An ISO 8601 timestamp string
 * @returns {string} Formatted date and time (e.g., "Feb 15, 2024, 10:30 AM") or empty string if invalid
 */
export function formatTimestamp(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') {
    return '';
  }

  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats an ISO timestamp string into a human-readable date string (no time).
 * @param {string} timestamp - An ISO 8601 timestamp string
 * @returns {string} Formatted date (e.g., "Feb 15, 2024") or empty string if invalid
 */
export function formatDate(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') {
    return '';
  }

  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Creates a deep clone of the provided value using structured cloning via JSON serialization.
 * @param {*} value - The value to deep clone
 * @returns {*} A deep clone of the value
 */
export function deepClone(value) {
  if (value === null || value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

/**
 * Creates a debounced version of the provided function that delays invocation
 * until after the specified wait time has elapsed since the last call.
 * @param {Function} fn - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} The debounced function with a cancel() method
 */
export function debounce(fn, wait) {
  let timeoutId = null;

  function debounced(...args) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, wait);
  }

  debounced.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Conditionally joins class name strings together, filtering out falsy values.
 * Accepts strings, objects (where keys are class names and values are booleans),
 * and arrays of the same.
 * @param {...(string|Object<string, boolean>|Array|undefined|null|false)} args - Class name arguments
 * @returns {string} A single space-separated class name string
 */
export function classNames(...args) {
  const classes = [];

  for (const arg of args) {
    if (!arg) {
      continue;
    }

    if (typeof arg === 'string') {
      classes.push(arg.trim());
    } else if (Array.isArray(arg)) {
      const inner = classNames(...arg);
      if (inner) {
        classes.push(inner);
      }
    } else if (typeof arg === 'object') {
      for (const [key, value] of Object.entries(arg)) {
        if (value) {
          classes.push(key.trim());
        }
      }
    }
  }

  return classes.filter(Boolean).join(' ');
}

/**
 * Retrieves a value from localStorage and parses it as JSON.
 * Returns null if the key does not exist or if parsing fails.
 * @param {string} key - The localStorage key
 * @returns {*} The parsed value, or null if not found or on error
 */
export function getFromLocalStorage(key) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item);
  } catch {
    return null;
  }
}

/**
 * Serializes a value as JSON and stores it in localStorage.
 * @param {string} key - The localStorage key
 * @param {*} value - The value to store
 * @returns {boolean} True if the operation succeeded, false otherwise
 */
export function setToLocalStorage(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes an item from localStorage.
 * @param {string} key - The localStorage key to remove
 * @returns {boolean} True if the operation succeeded, false otherwise
 */
export function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}