import { useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import WelcomeScreen from '@/pages/WelcomeScreen';
import LoginScreen from '@/pages/LoginScreen';
import IdentityVerificationScreen from '@/pages/IdentityVerificationScreen';
import TokenValidationScreen from '@/pages/TokenValidationScreen';
import AccountSelectionScreen from '@/pages/AccountSelectionScreen';
import SignerManagementScreen from '@/pages/SignerManagementScreen';
import AddSignerScreen from '@/pages/AddSignerScreen';
import EditSignerScreen from '@/pages/EditSignerScreen';
import ConfirmSignersScreen from '@/pages/ConfirmSignersScreen';
import ReviewSignersScreen from '@/pages/ReviewSignersScreen';
import SubmissionConfirmationScreen from '@/pages/SubmissionConfirmationScreen';
import ErrorScreen from '@/pages/ErrorScreen';

/**
 * Route guard component that checks if the user is authenticated.
 * Redirects to the login page if the user is not authenticated.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The child components to render if authenticated
 * @returns {React.ReactElement}
 */
function AuthenticatedRoute({ children }) {
  const { isAuthenticated } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Route guard component that checks if the user has completed identity verification.
 * Redirects to the verify page if the user is not verified.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The child components to render if verified
 * @returns {React.ReactElement}
 */
function VerifiedRoute({ children }) {
  const { isAuthenticated, isVerified } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isVerified) {
    return <Navigate to="/verify" replace />;
  }

  return children;
}

/**
 * Route guard component that checks if the user has completed token validation.
 * Redirects to the token validation page if the token is not validated.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The child components to render if token is validated
 * @returns {React.ReactElement}
 */
function TokenValidatedRoute({ children }) {
  const { isAuthenticated, isVerified, isTokenValidated } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isVerified) {
    return <Navigate to="/verify" replace />;
  }

  if (!isTokenValidated) {
    return <Navigate to="/validate-token" replace />;
  }

  return children;
}

/**
 * StepRouter component that maps the current navigation step to the
 * appropriate route. Renders inside the AppProvider so that navigation
 * and session contexts are available.
 *
 * @returns {React.ReactElement}
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route
        path="/verify"
        element={
          <AuthenticatedRoute>
            <IdentityVerificationScreen />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/validate-token"
        element={
          <VerifiedRoute>
            <TokenValidationScreen />
          </VerifiedRoute>
        }
      />
      <Route
        path="/select-account"
        element={
          <TokenValidatedRoute>
            <AccountSelectionScreen />
          </TokenValidatedRoute>
        }
      />
      <Route
        path="/manage-signers"
        element={
          <TokenValidatedRoute>
            <SignerManagementScreen />
          </TokenValidatedRoute>
        }
      />
      <Route
        path="/add-signer"
        element={
          <TokenValidatedRoute>
            <AddSignerScreen />
          </TokenValidatedRoute>
        }
      />
      <Route
        path="/edit-signer/:id"
        element={
          <TokenValidatedRoute>
            <EditSignerScreen />
          </TokenValidatedRoute>
        }
      />
      <Route
        path="/confirm-signers"
        element={
          <TokenValidatedRoute>
            <ConfirmSignersScreen />
          </TokenValidatedRoute>
        }
      />
      <Route
        path="/review-signers"
        element={
          <TokenValidatedRoute>
            <ReviewSignersScreen />
          </TokenValidatedRoute>
        }
      />
      <Route
        path="/submission-confirmation"
        element={
          <TokenValidatedRoute>
            <SubmissionConfirmationScreen />
          </TokenValidatedRoute>
        }
      />
      <Route path="/error" element={<ErrorScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Root application component.
 * Wraps the entire app in AppProvider (combined context provider including
 * SessionProvider and NavigationProvider). Sets up React Router with routes
 * for all pages. Includes route guards for authenticated-only routes.
 * Renders ErrorBoundary at the top level for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;