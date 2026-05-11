import tokens from '@/data/tokens.json';
import { STORAGE_KEYS, TOKEN_CONFIG } from '@/utils/constants';
import { getFromLocalStorage, setToLocalStorage } from '@/utils/helpers';
import { getSession, setSession } from '@/services/SessionService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';

/**
 * @typedef {Object} CaptureTokenResult
 * @property {boolean} success - Whether the token was captured successfully
 * @property {string} [token] - The captured token string
 * @property {string} [error] - Error message (on failure)
 */

/**
 * @typedef {Object} TokenValidationResult
 * @property {boolean} valid - Whether the token is valid
 * @property {string} [status] - The token status (pending, confirmed, expired)
 * @property {string} [error] - Error message (on failure)
 * @property {Object} [tokenData] - The full token record from mock data
 */

/**
 * @typedef {Object} UpdateTokenStatusResult
 * @property {boolean} success - Whether the status was updated successfully
 * @property {string} [error] - Error message (on failure)
 * @property {string} [newStatus] - The updated status
 */

/**
 * Retrieves the mutable tokens list from localStorage, falling back to the
 * static mock data on first access.
 * @returns {Array<Object>} The tokens array
 */
function getTokensData() {
  const stored = getFromLocalStorage('scm_tokens_data');
  if (Array.isArray(stored) && stored.length > 0) {
    // Verify stored data matches expected tokens to prevent stale cache issues
    const expectedIds = tokens.map((t) => t.id);
    const storedIds = stored.map((t) => t.id);
    const idsMatch = expectedIds.every((id) => storedIds.includes(id));
    if (idsMatch) {
      return stored;
    }
  }
  setToLocalStorage('scm_tokens_data', tokens);
  return [...tokens];
}

/**
 * Persists the tokens array to localStorage.
 * @param {Array<Object>} data - The tokens array to persist
 */
function setTokensData(data) {
  setToLocalStorage('scm_tokens_data', data);
}

/**
 * Extracts an eSign token from URL query parameters and stores it in the session.
 * Looks for a query parameter named "token" in the provided URLSearchParams or string.
 * @param {URLSearchParams|string} urlParams - The URL query parameters or query string
 * @returns {CaptureTokenResult} The result of the capture operation
 */
export function captureToken(urlParams) {
  let params;

  if (urlParams instanceof URLSearchParams) {
    params = urlParams;
  } else if (typeof urlParams === 'string') {
    const queryString = urlParams.startsWith('?') ? urlParams : `?${urlParams}`;
    params = new URLSearchParams(queryString);
  } else {
    return {
      success: false,
      error: 'Invalid URL parameters provided.',
    };
  }

  const token = params.get('token');

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return {
      success: false,
      error: 'No token found in the URL parameters.',
    };
  }

  const trimmedToken = token.trim();

  setToLocalStorage(STORAGE_KEYS.AUTH_TOKEN, trimmedToken);

  const session = getSession();
  if (session) {
    logEvent(
      session.userId,
      AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
      { action: 'capture', tokenPrefix: trimmedToken.substring(0, 10) + '...' },
      AUDIT_OUTCOMES.INFO
    );
  }

  return {
    success: true,
    token: trimmedToken,
  };
}

/**
 * Validates the stored eSign token against mock data.
 * Checks for existence, expiration (72-hour default from TOKEN_CONFIG),
 * and association with the currently authenticated user.
 * @returns {Promise<TokenValidationResult>} The result of the validation
 */
export async function validateToken() {
  const session = getSession();

  if (!session) {
    return {
      valid: false,
      error: 'No active session. Please log in again.',
    };
  }

  let storedToken = getFromLocalStorage(STORAGE_KEYS.AUTH_TOKEN);

  // For demo/MVP: auto-resolve a token for the current user if none was captured from URL
  if (!storedToken || typeof storedToken !== 'string' || storedToken.trim() === '') {
    const tokensData = getTokensData();
    const autoToken = tokensData.find(
      (t) => t.associatedUserId === session.userId && t.status !== 'expired'
    );

    if (autoToken && autoToken.token) {
      storedToken = autoToken.token;
      setToLocalStorage(STORAGE_KEYS.AUTH_TOKEN, storedToken);
    } else {
      logEvent(
        session.userId,
        AUDIT_EVENT_TYPES.TOKEN_INVALID,
        { reason: 'No token stored in session' },
        AUDIT_OUTCOMES.FAILURE
      );

      return {
        valid: false,
        error: 'No token found. Please use a valid invitation link to continue.',
      };
    }
  }

  const tokensData = getTokensData();
  const tokenRecord = tokensData.find((t) => t.token === storedToken.trim());

  if (!tokenRecord) {
    logEvent(
      session.userId,
      AUDIT_EVENT_TYPES.TOKEN_INVALID,
      { reason: 'Token not found in records', tokenPrefix: storedToken.substring(0, 10) + '...' },
      AUDIT_OUTCOMES.FAILURE
    );

    return {
      valid: false,
      status: 'invalid',
      error: 'The link you used is invalid or has already been used. Please contact the account owner to request a new invitation.',
    };
  }

  if (tokenRecord.status === 'expired') {
    logEvent(
      session.userId,
      AUDIT_EVENT_TYPES.TOKEN_INVALID,
      { reason: 'Token status is expired', tokenId: tokenRecord.id },
      AUDIT_OUTCOMES.FAILURE
    );

    return {
      valid: false,
      status: 'expired',
      error: 'The link you used has expired. Please request a new invitation link to continue.',
    };
  }

  const now = new Date();
  const expiryMs = TOKEN_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000;

  // Use explicit expiresAt from token data if available, otherwise compute from createdAt
  let tokenExpired = false;
  if (tokenRecord.expiresAt) {
    const expiresAt = new Date(tokenRecord.expiresAt);
    if (!isNaN(expiresAt.getTime())) {
      tokenExpired = now.getTime() >= expiresAt.getTime();
    }
  } else {
    const createdAt = new Date(tokenRecord.createdAt);
    if (isNaN(createdAt.getTime())) {
      logEvent(
        session.userId,
        AUDIT_EVENT_TYPES.TOKEN_INVALID,
        { reason: 'Invalid token creation date', tokenId: tokenRecord.id },
        AUDIT_OUTCOMES.FAILURE
      );

      return {
        valid: false,
        status: 'invalid',
        error: 'The link you used is invalid. Please contact the account owner to request a new invitation.',
      };
    }
    tokenExpired = now.getTime() - createdAt.getTime() >= expiryMs;
  }

  if (tokenExpired) {
    updateTokenStatus(storedToken, 'expired');

    logEvent(
      session.userId,
      AUDIT_EVENT_TYPES.TOKEN_INVALID,
      { reason: 'Token has exceeded expiry duration', tokenId: tokenRecord.id },
      AUDIT_OUTCOMES.FAILURE
    );

    return {
      valid: false,
      status: 'expired',
      error: 'The link you used has expired. Please request a new invitation link to continue.',
    };
  }

  if (tokenRecord.associatedUserId !== session.userId) {
    logEvent(
      session.userId,
      AUDIT_EVENT_TYPES.TOKEN_INVALID,
      {
        reason: 'Token not associated with current user',
        tokenId: tokenRecord.id,
        tokenUserId: tokenRecord.associatedUserId,
        sessionUserId: session.userId,
      },
      AUDIT_OUTCOMES.FAILURE
    );

    return {
      valid: false,
      status: 'unauthorized',
      error: 'You are not authorized to use this invitation link. Please log in with the correct account.',
    };
  }

  const tokenExpiresAt = new Date(new Date(tokenRecord.createdAt).getTime() + expiryMs);
  setToLocalStorage(STORAGE_KEYS.TOKEN_EXPIRY, tokenExpiresAt.toISOString());

  session.isTokenValidated = true;
  setSession(session);

  logEvent(
    session.userId,
    AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
    { tokenId: tokenRecord.id, status: tokenRecord.status },
    AUDIT_OUTCOMES.SUCCESS
  );

  return {
    valid: true,
    status: tokenRecord.status,
    tokenData: {
      id: tokenRecord.id,
      status: tokenRecord.status,
      associatedUserId: tokenRecord.associatedUserId,
      createdAt: tokenRecord.createdAt,
      expiresAt: tokenRecord.expiresAt,
    },
  };
}

/**
 * Updates the status of a token in the mock data store.
 * Commonly used to transition a token from "pending" to "confirmed" or to "expired".
 * @param {string} token - The token string to update
 * @param {string} newStatus - The new status value (e.g., 'confirmed', 'expired')
 * @returns {UpdateTokenStatusResult} The result of the update operation
 */
export function updateTokenStatus(token, newStatus) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return {
      success: false,
      error: 'Token is required.',
    };
  }

  if (!newStatus || typeof newStatus !== 'string' || newStatus.trim() === '') {
    return {
      success: false,
      error: 'New status is required.',
    };
  }

  const validStatuses = ['pending', 'confirmed', 'expired'];
  const trimmedStatus = newStatus.trim().toLowerCase();

  if (!validStatuses.includes(trimmedStatus)) {
    return {
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
    };
  }

  const tokensData = getTokensData();
  const tokenIndex = tokensData.findIndex((t) => t.token === token.trim());

  if (tokenIndex === -1) {
    return {
      success: false,
      error: 'Token not found.',
    };
  }

  tokensData[tokenIndex].status = trimmedStatus;
  setTokensData(tokensData);

  const session = getSession();
  const userId = session ? session.userId : 'unknown';

  logEvent(
    userId,
    AUDIT_EVENT_TYPES.TOKEN_VALIDATED,
    {
      action: 'statusUpdate',
      tokenId: tokensData[tokenIndex].id,
      previousStatus: tokensData[tokenIndex].status,
      newStatus: trimmedStatus,
    },
    AUDIT_OUTCOMES.INFO
  );

  return {
    success: true,
    newStatus: trimmedStatus,
  };
}

/**
 * Retrieves the currently stored token from localStorage.
 * @returns {string|null} The stored token string or null if not found
 */
export function getStoredToken() {
  return getFromLocalStorage(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Checks whether the stored token has expired based on the token expiry timestamp.
 * @returns {boolean} True if the token is expired or no expiry is set
 */
export function isTokenExpired() {
  const expiry = getFromLocalStorage(STORAGE_KEYS.TOKEN_EXPIRY);

  if (!expiry) {
    return true;
  }

  const expiresAt = new Date(expiry);

  if (isNaN(expiresAt.getTime())) {
    return true;
  }

  return new Date() >= expiresAt;
}

/**
 * Clears the stored token and token expiry from localStorage.
 * @returns {void}
 */
export function clearToken() {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
}

const TokenService = {
  captureToken,
  validateToken,
  updateTokenStatus,
  getStoredToken,
  isTokenExpired,
  clearToken,
};

export default TokenService;