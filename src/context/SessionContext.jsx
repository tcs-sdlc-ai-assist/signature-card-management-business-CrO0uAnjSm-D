import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  getSession,
  clearSession,
  isSessionExpired,
  updateLastActivity,
  getSessionTimeRemaining,
  isSessionWarning,
  setVerified as sessionSetVerified,
  setTokenValidated as sessionSetTokenValidated,
} from '@/services/SessionService';
import { login as authLogin, logout as authLogout } from '@/services/AuthService';
import { SESSION_CONFIG } from '@/utils/constants';

/**
 * @typedef {Object} SessionUser
 * @property {string} userId - The authenticated user's ID
 * @property {string} username - The authenticated user's username
 */

/**
 * @typedef {Object} SessionState
 * @property {SessionUser|null} currentUser - The currently authenticated user
 * @property {boolean} isAuthenticated - Whether a valid session exists
 * @property {boolean} isVerified - Whether identity verification (OTP) is complete
 * @property {boolean} isTokenValidated - Whether eSign token validation is complete
 * @property {number} sessionTimeRemaining - Seconds remaining in the session
 * @property {boolean} showSessionWarning - Whether the session timeout warning should be displayed
 * @property {boolean} isSessionExpired - Whether the session has expired
 * @property {Function} login - Authenticate with username and password
 * @property {Function} logout - End the current session
 * @property {Function} verify - Mark the session as identity-verified
 * @property {Function} validateToken - Mark the session as token-validated
 * @property {Function} refreshSession - Refresh session activity timestamp
 */

/**
 * @type {React.Context<SessionState|null>}
 */
const SessionContext = createContext(null);

/**
 * Extracts user data from a session object.
 * @param {Object|null} session - The session object
 * @returns {SessionUser|null} The user data or null
 */
function extractUser(session) {
  if (!session || !session.userId) {
    return null;
  }
  return {
    userId: session.userId,
    username: session.username,
  };
}

/**
 * SessionProvider component that manages reactive session state.
 * Wraps SessionService for reactive state updates, manages session
 * timeout timer and warning modal trigger.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 */
export function SessionProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const session = getSession();
    return extractUser(session);
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const session = getSession();
    return session !== null && !isSessionExpired();
  });

  const [isVerified, setIsVerified] = useState(() => {
    const session = getSession();
    return session ? session.isVerified === true : false;
  });

  const [isTokenValidated, setIsTokenValidated] = useState(() => {
    const session = getSession();
    return session ? session.isTokenValidated === true : false;
  });

  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(() => {
    return getSessionTimeRemaining();
  });

  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const timerRef = useRef(null);

  /**
   * Synchronizes local state with the current session from SessionService.
   */
  const syncSessionState = useCallback(() => {
    const session = getSession();

    if (!session || isSessionExpired()) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsVerified(false);
      setIsTokenValidated(false);
      setSessionTimeRemaining(0);
      setShowSessionWarning(false);

      if (session && isSessionExpired()) {
        setSessionExpired(true);
      }
      return;
    }

    setCurrentUser(extractUser(session));
    setIsAuthenticated(true);
    setIsVerified(session.isVerified === true);
    setIsTokenValidated(session.isTokenValidated === true);

    const remaining = getSessionTimeRemaining();
    setSessionTimeRemaining(remaining);

    if (isSessionWarning()) {
      setShowSessionWarning(true);
    } else {
      setShowSessionWarning(false);
    }

    setSessionExpired(false);
  }, []);

  /**
   * Starts the session timer that checks session state every second.
   */
  const startSessionTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      const session = getSession();

      if (!session) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsVerified(false);
        setIsTokenValidated(false);
        setSessionTimeRemaining(0);
        setShowSessionWarning(false);
        return;
      }

      if (isSessionExpired()) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsVerified(false);
        setIsTokenValidated(false);
        setSessionTimeRemaining(0);
        setShowSessionWarning(false);
        setSessionExpired(true);
        clearSession();
        return;
      }

      const remaining = getSessionTimeRemaining();
      setSessionTimeRemaining(remaining);

      if (isSessionWarning()) {
        setShowSessionWarning(true);
      } else {
        setShowSessionWarning(false);
      }
    }, 1000);
  }, []);

  /**
   * Stops the session timer.
   */
  const stopSessionTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      startSessionTimer();
    } else {
      stopSessionTimer();
    }

    return () => {
      stopSessionTimer();
    };
  }, [isAuthenticated, startSessionTimer, stopSessionTimer]);

  /**
   * Authenticates a user with the provided username and password.
   * @param {string} username - The username to authenticate
   * @param {string} password - The password to validate
   * @returns {Promise<import('@/services/AuthService').LoginResult>} The login result
   */
  const login = useCallback(async (username, password) => {
    const result = await authLogin(username, password);

    if (result.success && result.session) {
      const session = getSession();
      setCurrentUser(extractUser(session));
      setIsAuthenticated(true);
      setIsVerified(session ? session.isVerified === true : false);
      setIsTokenValidated(session ? session.isTokenValidated === true : false);
      setSessionTimeRemaining(getSessionTimeRemaining());
      setSessionExpired(false);
      setShowSessionWarning(false);
    }

    return result;
  }, []);

  /**
   * Logs out the current user by clearing the session and resetting state.
   */
  const logout = useCallback(() => {
    stopSessionTimer();
    authLogout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsVerified(false);
    setIsTokenValidated(false);
    setSessionTimeRemaining(0);
    setShowSessionWarning(false);
    setSessionExpired(false);
  }, [stopSessionTimer]);

  /**
   * Marks the session as identity-verified (OTP complete).
   * @returns {boolean} True if the session was updated successfully
   */
  const verify = useCallback(() => {
    const success = sessionSetVerified();

    if (success) {
      setIsVerified(true);
    }

    return success;
  }, []);

  /**
   * Marks the session as token-validated (eSign token validated).
   * @returns {boolean} True if the session was updated successfully
   */
  const validateToken = useCallback(() => {
    const success = sessionSetTokenValidated();

    if (success) {
      setIsTokenValidated(true);
    }

    return success;
  }, []);

  /**
   * Refreshes the session activity timestamp to keep the session alive.
   * @returns {boolean} True if the activity was updated
   */
  const refreshSession = useCallback(() => {
    const success = updateLastActivity();

    if (success) {
      setSessionTimeRemaining(getSessionTimeRemaining());
      setShowSessionWarning(false);
      setSessionExpired(false);
    }

    return success;
  }, []);

  const value = useMemo(() => ({
    currentUser,
    isAuthenticated,
    isVerified,
    isTokenValidated,
    sessionTimeRemaining,
    showSessionWarning,
    isSessionExpired: sessionExpired,
    login,
    logout,
    verify,
    validateToken,
    refreshSession,
  }), [
    currentUser,
    isAuthenticated,
    isVerified,
    isTokenValidated,
    sessionTimeRemaining,
    showSessionWarning,
    sessionExpired,
    login,
    logout,
    verify,
    validateToken,
    refreshSession,
  ]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

SessionProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Custom hook to consume the SessionContext.
 * Must be used within a SessionProvider.
 * @returns {SessionState} The session state and actions
 * @throws {Error} If used outside of a SessionProvider
 */
export function useSession() {
  const context = useContext(SessionContext);

  if (context === null) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context;
}

export default SessionContext;