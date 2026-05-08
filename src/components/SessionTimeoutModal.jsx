import { useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSession } from '@/context/SessionContext';
import { useNavigation } from '@/context/NavigationContext';
import Modal from '@/components/Modal';
import messages from '@/data/messages.json';

/**
 * Formats remaining seconds into a human-readable MM:SS string.
 * @param {number} seconds - The number of seconds remaining
 * @returns {string} Formatted time string (e.g., "1:30")
 */
function formatTimeRemaining(seconds) {
  if (!seconds || typeof seconds !== 'number' || seconds <= 0) {
    return '0:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * SessionTimeoutModal component that displays a warning dialog when the
 * user's session is approaching expiration due to inactivity. Shows a
 * countdown timer and provides options to continue the session or log out.
 * Automatically redirects to the login step when the session expires.
 *
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS class names for the modal
 * @returns {React.ReactElement|null}
 */
function SessionTimeoutModal({ className }) {
  const {
    showSessionWarning,
    sessionTimeRemaining,
    isSessionExpired,
    refreshSession,
    logout,
  } = useSession();

  const { resetNavigation, goToStep } = useNavigation();

  const sessionMessages = messages.session;

  /**
   * Handles continuing the session by refreshing the activity timestamp.
   */
  const handleContinueSession = useCallback(() => {
    refreshSession();
  }, [refreshSession]);

  /**
   * Handles logging out the user and navigating to the login step.
   */
  const handleLogout = useCallback(() => {
    logout();
    resetNavigation();
  }, [logout, resetNavigation]);

  /**
   * Auto-redirect to login when the session expires.
   */
  useEffect(() => {
    if (isSessionExpired) {
      logout();
      resetNavigation();
    }
  }, [isSessionExpired, logout, resetNavigation]);

  const formattedTime = useMemo(() => {
    return formatTimeRemaining(sessionTimeRemaining);
  }, [sessionTimeRemaining]);

  if (!showSessionWarning) {
    return null;
  }

  return (
    <Modal
      isOpen={showSessionWarning}
      title={sessionMessages.timeoutWarning.title}
      onConfirm={handleContinueSession}
      onCancel={handleLogout}
      confirmButtonText={sessionMessages.timeoutWarning.continueButtonText}
      cancelButtonText={sessionMessages.timeoutWarning.logoutButtonText}
      showConfirmButton={true}
      showCancelButton={true}
      ariaLabel="Session timeout warning"
      className={className}
    >
      <div className="text-sm text-body">
        <p className="mb-3">{sessionMessages.timeoutWarning.message}</p>
        <p className="text-center text-lg font-medium text-primary-blue" aria-live="polite" aria-atomic="true">
          Time remaining: <span className="font-bold">{formattedTime}</span>
        </p>
      </div>
    </Modal>
  );
}

SessionTimeoutModal.propTypes = {
  className: PropTypes.string,
};

export default SessionTimeoutModal;