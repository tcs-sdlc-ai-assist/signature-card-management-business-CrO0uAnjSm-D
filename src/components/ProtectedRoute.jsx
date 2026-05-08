import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/context/SessionContext';

/**
 * ProtectedRoute component that checks authentication and verification status
 * via SessionContext before rendering protected page content.
 *
 * Authentication checks performed on each navigation:
 * - Session existence and expiration
 * - Authentication status (redirects to /login if unauthenticated)
 * - Identity verification status (redirects to /verify if unverified)
 * - Token validation status (redirects to /validate-token if not validated)
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The protected page content to render
 * @param {boolean} [props.requireVerification=false] - Whether identity verification is required
 * @param {boolean} [props.requireTokenValidation=false] - Whether token validation is required
 * @returns {React.ReactElement}
 */
function ProtectedRoute({
  children,
  requireVerification = false,
  requireTokenValidation = false,
}) {
  const {
    isAuthenticated,
    isVerified,
    isTokenValidated,
    isSessionExpired: sessionExpired,
    refreshSession,
  } = useSession();

  const location = useLocation();

  /**
   * Refresh session activity on each navigation to keep the session alive
   * for meaningful user interactions.
   */
  useEffect(() => {
    if (isAuthenticated && !sessionExpired) {
      refreshSession();
    }
  }, [location.pathname, isAuthenticated, sessionExpired, refreshSession]);

  /**
   * If the session has expired, redirect to the login page.
   */
  if (sessionExpired) {
    return <Navigate to="/login" replace />;
  }

  /**
   * If the user is not authenticated, redirect to the login page.
   */
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  /**
   * If identity verification is required but not completed,
   * redirect to the verification page.
   */
  if (requireVerification && !isVerified) {
    return <Navigate to="/verify" replace />;
  }

  /**
   * If token validation is required but not completed,
   * redirect to the token validation page.
   * Token validation also requires verification to be complete.
   */
  if (requireTokenValidation) {
    if (!isVerified) {
      return <Navigate to="/verify" replace />;
    }

    if (!isTokenValidated) {
      return <Navigate to="/validate-token" replace />;
    }
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireVerification: PropTypes.bool,
  requireTokenValidation: PropTypes.bool,
};

export default ProtectedRoute;