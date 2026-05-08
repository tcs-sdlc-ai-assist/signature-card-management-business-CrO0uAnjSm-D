import { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { resendInvitation } from '@/services/SignerService';
import { canResend, incrementResend, getAttemptMessage, getRemainingAttempts, getAttemptCount } from '@/services/RateLimitService';
import { logInvitationResent, logEvent, SIGNER_AUDIT_EVENT_TYPES } from '@/services/AuditLogService';
import { AUDIT_OUTCOMES } from '@/services/AuditService';
import { useSession } from '@/context/SessionContext';

/**
 * ResendInvitationButton component provides a self-service resend invitation
 * action for pending signers. Checks rate limits via RateLimitService before
 * allowing the action. Displays attempt-based messaging with confirmation
 * dialogs and logs all attempts via AuditLogService.
 *
 * @param {Object} props
 * @param {Object} props.signer - The signer object to resend invitation to
 * @param {string} props.signer.id - Unique signer identifier
 * @param {string} props.signer.firstName - Signer's first name
 * @param {string} props.signer.lastName - Signer's last name
 * @param {string} [props.signer.accountId] - Associated account ID
 * @param {Function} [props.onResendSuccess] - Callback invoked after a successful resend
 * @param {Function} [props.onResendFailure] - Callback invoked after a failed resend attempt
 * @param {boolean} [props.disabled=false] - Whether the button is externally disabled
 * @param {string} [props.className] - Additional CSS class names for the button wrapper
 * @returns {React.ReactElement|null}
 */
function ResendInvitationButton({
  signer,
  onResendSuccess,
  onResendFailure,
  disabled = false,
  className,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultAlert, setResultAlert] = useState(null);

  const { currentUser } = useSession();

  const userId = currentUser ? currentUser.userId : 'unknown';

  /**
   * Determines whether the resend action is allowed based on rate limits.
   */
  const isResendAllowed = useMemo(() => {
    if (!signer || !signer.id) {
      return false;
    }
    return canResend(signer.id);
  }, [signer]);

  /**
   * Retrieves the current attempt message for display in the confirmation modal.
   */
  const attemptMessage = useMemo(() => {
    if (!signer || !signer.id) {
      return { title: '', message: '', severity: 'warning' };
    }
    return getAttemptMessage(signer.id, 'resend');
  }, [signer]);

  /**
   * Gets the remaining resend attempts for the current day.
   */
  const remaining = useMemo(() => {
    if (!signer || !signer.id) {
      return 0;
    }
    return getRemainingAttempts(signer.id, 'resend');
  }, [signer]);

  /**
   * Formats the signer's display name.
   * @returns {string}
   */
  const displayName = useMemo(() => {
    if (!signer) {
      return '';
    }
    const parts = [];
    if (signer.firstName) {
      parts.push(signer.firstName);
    }
    if (signer.lastName) {
      parts.push(signer.lastName);
    }
    return parts.join(' ');
  }, [signer]);

  /**
   * Handles the resend button click. Opens the confirmation modal if
   * rate limits allow, otherwise displays the exhausted message.
   */
  const handleClick = useCallback(() => {
    setResultAlert(null);

    if (!signer || !signer.id) {
      return;
    }

    if (!isResendAllowed) {
      const exhaustedMessage = getAttemptMessage(signer.id, 'resend');
      setResultAlert({
        message: exhaustedMessage.message,
        title: exhaustedMessage.title,
        variant: 'critical',
      });
      return;
    }

    setIsModalOpen(true);
  }, [signer, isResendAllowed]);

  /**
   * Handles cancelling the confirmation modal.
   */
  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  /**
   * Handles confirming the resend action. Increments the rate limit counter,
   * calls SignerService.resendInvitation, and logs the result via AuditLogService.
   */
  const handleConfirm = useCallback(() => {
    if (!signer || !signer.id) {
      return;
    }

    setLoading(true);
    setIsModalOpen(false);

    const incrementResult = incrementResend(signer.id);

    if (!incrementResult.success) {
      setResultAlert({
        message: incrementResult.error || 'Maximum resend attempts reached for today.',
        title: 'Resend Unavailable',
        variant: 'critical',
      });

      logEvent(
        userId,
        SIGNER_AUDIT_EVENT_TYPES.INVITATION_RESENT,
        {
          accountId: signer.accountId || '',
          signerId: signer.id,
          firstName: signer.firstName,
          lastName: signer.lastName,
          action: 'resend_invitation',
          reason: 'Rate limit exceeded',
        },
        AUDIT_OUTCOMES.FAILURE
      );

      setLoading(false);

      if (typeof onResendFailure === 'function') {
        onResendFailure(signer, 'Rate limit exceeded');
      }

      return;
    }

    const resendResult = resendInvitation(signer.id);

    if (resendResult.success) {
      logInvitationResent(userId, {
        accountId: signer.accountId || '',
        signerId: signer.id,
        firstName: signer.firstName,
        lastName: signer.lastName,
      });

      setResultAlert({
        message: 'The invitation has been successfully resent to the signer.',
        title: 'Invitation Resent',
        variant: 'success',
      });

      setLoading(false);

      if (typeof onResendSuccess === 'function') {
        onResendSuccess(resendResult.signer || signer);
      }
    } else {
      logEvent(
        userId,
        SIGNER_AUDIT_EVENT_TYPES.INVITATION_RESENT,
        {
          accountId: signer.accountId || '',
          signerId: signer.id,
          firstName: signer.firstName,
          lastName: signer.lastName,
          action: 'resend_invitation',
          reason: resendResult.error || 'Resend failed',
        },
        AUDIT_OUTCOMES.FAILURE
      );

      setResultAlert({
        message: resendResult.error || 'Unable to resend the invitation. Please try again.',
        title: 'Resend Failed',
        variant: 'critical',
      });

      setLoading(false);

      if (typeof onResendFailure === 'function') {
        onResendFailure(signer, resendResult.error);
      }
    }
  }, [signer, userId, onResendSuccess, onResendFailure]);

  /**
   * Dismisses the result alert.
   */
  const handleDismissAlert = useCallback(() => {
    setResultAlert(null);
  }, []);

  if (!signer) {
    return null;
  }

  const isButtonDisabled = disabled || loading || !isResendAllowed;

  const wrapperClasses = classNames(
    'inline-flex flex-col items-start gap-2',
    className
  );

  /**
   * Maps the attempt message severity to an Alert variant.
   * @param {string} severity
   * @returns {string}
   */
  const mapSeverityToVariant = (severity) => {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  return (
    <div className={wrapperClasses}>
      {resultAlert && (
        <Alert
          message={resultAlert.message}
          title={resultAlert.title}
          variant={resultAlert.variant}
          dismissible={true}
          onDismiss={handleDismissAlert}
          ariaLabel={`Resend result: ${resultAlert.title}`}
          className="w-full"
        />
      )}

      <Button
        variant="secondary"
        onClick={handleClick}
        disabled={isButtonDisabled}
        loading={loading}
        ariaLabel={`Resend invitation to ${displayName}`}
      >
        Resend
      </Button>

      <Modal
        isOpen={isModalOpen}
        title={attemptMessage.title || 'Resend Invitation'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmButtonText="Resend"
        cancelButtonText="Cancel"
        showConfirmButton={true}
        showCancelButton={true}
        ariaLabel={`Confirm resend invitation for ${displayName}`}
      >
        <div className="space-y-3">
          {attemptMessage.message && (
            <Alert
              message={attemptMessage.message}
              variant={mapSeverityToVariant(attemptMessage.severity)}
              ariaLabel="Resend attempt information"
            />
          )}
          <p className="text-sm text-body">
            Are you sure you want to resend the invitation to <span className="font-medium">{displayName}</span>?
          </p>
          {remaining > 0 && (
            <p className="text-xs text-gray-500">
              You have {remaining} resend attempt{remaining !== 1 ? 's' : ''} remaining today.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

ResendInvitationButton.propTypes = {
  signer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    accountId: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  onResendSuccess: PropTypes.func,
  onResendFailure: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ResendInvitationButton;