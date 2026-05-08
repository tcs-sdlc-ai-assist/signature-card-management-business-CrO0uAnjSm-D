import { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { unlockSigner } from '@/services/SignerService';
import { canUnlock, incrementUnlock, getAttemptMessage, getRemainingAttempts, getAttemptCount } from '@/services/RateLimitService';
import { logSignerUnlocked, logEvent, SIGNER_AUDIT_EVENT_TYPES } from '@/services/AuditLogService';
import { AUDIT_OUTCOMES } from '@/services/AuditService';
import { useSession } from '@/context/SessionContext';

/**
 * UnlockSignerButton component provides a self-service unlock action for
 * locked signers. Checks rate limits via RateLimitService before allowing
 * the action. Displays attempt-based messaging with confirmation dialogs
 * and logs all attempts via AuditLogService.
 *
 * @param {Object} props
 * @param {Object} props.signer - The signer object to unlock
 * @param {string} props.signer.id - Unique signer identifier
 * @param {string} props.signer.firstName - Signer's first name
 * @param {string} props.signer.lastName - Signer's last name
 * @param {string} [props.signer.accountId] - Associated account ID
 * @param {Function} [props.onUnlockSuccess] - Callback invoked after a successful unlock
 * @param {Function} [props.onUnlockFailure] - Callback invoked after a failed unlock attempt
 * @param {boolean} [props.disabled=false] - Whether the button is externally disabled
 * @param {string} [props.className] - Additional CSS class names for the button wrapper
 * @returns {React.ReactElement|null}
 */
function UnlockSignerButton({
  signer,
  onUnlockSuccess,
  onUnlockFailure,
  disabled = false,
  className,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultAlert, setResultAlert] = useState(null);

  const { currentUser } = useSession();

  const userId = currentUser ? currentUser.userId : 'unknown';

  /**
   * Determines whether the unlock action is allowed based on rate limits.
   */
  const isUnlockAllowed = useMemo(() => {
    if (!signer || !signer.id) {
      return false;
    }
    return canUnlock(signer.id);
  }, [signer]);

  /**
   * Retrieves the current attempt message for display in the confirmation modal.
   */
  const attemptMessage = useMemo(() => {
    if (!signer || !signer.id) {
      return { title: '', message: '', severity: 'warning' };
    }
    return getAttemptMessage(signer.id, 'unlock');
  }, [signer]);

  /**
   * Gets the remaining unlock attempts for the current day.
   */
  const remaining = useMemo(() => {
    if (!signer || !signer.id) {
      return 0;
    }
    return getRemainingAttempts(signer.id, 'unlock');
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
   * Handles the unlock button click. Opens the confirmation modal if
   * rate limits allow, otherwise displays the exhausted message.
   */
  const handleClick = useCallback(() => {
    setResultAlert(null);

    if (!signer || !signer.id) {
      return;
    }

    if (!isUnlockAllowed) {
      const exhaustedMessage = getAttemptMessage(signer.id, 'unlock');
      setResultAlert({
        message: exhaustedMessage.message,
        title: exhaustedMessage.title,
        variant: 'critical',
      });
      return;
    }

    setIsModalOpen(true);
  }, [signer, isUnlockAllowed]);

  /**
   * Handles cancelling the confirmation modal.
   */
  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  /**
   * Handles confirming the unlock action. Increments the rate limit counter,
   * calls SignerService.unlockSigner, and logs the result via AuditLogService.
   */
  const handleConfirm = useCallback(() => {
    if (!signer || !signer.id) {
      return;
    }

    setLoading(true);
    setIsModalOpen(false);

    const incrementResult = incrementUnlock(signer.id);

    if (!incrementResult.success) {
      setResultAlert({
        message: incrementResult.error || 'Maximum unlock attempts reached for today.',
        title: 'Unlock Unavailable',
        variant: 'critical',
      });

      logEvent(
        userId,
        SIGNER_AUDIT_EVENT_TYPES.SIGNER_UNLOCKED,
        {
          accountId: signer.accountId || '',
          signerId: signer.id,
          firstName: signer.firstName,
          lastName: signer.lastName,
          action: 'unlock_signer',
          reason: 'Rate limit exceeded',
        },
        AUDIT_OUTCOMES.FAILURE
      );

      setLoading(false);

      if (typeof onUnlockFailure === 'function') {
        onUnlockFailure(signer, 'Rate limit exceeded');
      }

      return;
    }

    const unlockResult = unlockSigner(signer.id);

    if (unlockResult.success) {
      logSignerUnlocked(userId, {
        accountId: signer.accountId || '',
        signerId: signer.id,
        firstName: signer.firstName,
        lastName: signer.lastName,
      });

      setResultAlert({
        message: 'The signer has been successfully unlocked.',
        title: 'Account Unlocked',
        variant: 'success',
      });

      setLoading(false);

      if (typeof onUnlockSuccess === 'function') {
        onUnlockSuccess(unlockResult.signer || signer);
      }
    } else {
      logEvent(
        userId,
        SIGNER_AUDIT_EVENT_TYPES.SIGNER_UNLOCKED,
        {
          accountId: signer.accountId || '',
          signerId: signer.id,
          firstName: signer.firstName,
          lastName: signer.lastName,
          action: 'unlock_signer',
          reason: unlockResult.error || 'Unlock failed',
        },
        AUDIT_OUTCOMES.FAILURE
      );

      setResultAlert({
        message: unlockResult.error || 'Unable to unlock the signer. Please try again.',
        title: 'Unlock Failed',
        variant: 'critical',
      });

      setLoading(false);

      if (typeof onUnlockFailure === 'function') {
        onUnlockFailure(signer, unlockResult.error);
      }
    }
  }, [signer, userId, onUnlockSuccess, onUnlockFailure]);

  /**
   * Dismisses the result alert.
   */
  const handleDismissAlert = useCallback(() => {
    setResultAlert(null);
  }, []);

  if (!signer) {
    return null;
  }

  const isButtonDisabled = disabled || loading || !isUnlockAllowed;

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
          ariaLabel={`Unlock result: ${resultAlert.title}`}
          className="w-full"
        />
      )}

      <Button
        variant="secondary"
        onClick={handleClick}
        disabled={isButtonDisabled}
        loading={loading}
        ariaLabel={`Unlock ${displayName}`}
      >
        Unlock
      </Button>

      <Modal
        isOpen={isModalOpen}
        title={attemptMessage.title || 'Unlock Signer'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmButtonText="Unlock"
        cancelButtonText="Cancel"
        showConfirmButton={true}
        showCancelButton={true}
        ariaLabel={`Confirm unlock for ${displayName}`}
      >
        <div className="space-y-3">
          {attemptMessage.message && (
            <Alert
              message={attemptMessage.message}
              variant={mapSeverityToVariant(attemptMessage.severity)}
              ariaLabel="Unlock attempt information"
            />
          )}
          <p className="text-sm text-body">
            Are you sure you want to unlock <span className="font-medium">{displayName}</span>?
          </p>
          {remaining > 0 && (
            <p className="text-xs text-gray-500">
              You have {remaining} unlock attempt{remaining !== 1 ? 's' : ''} remaining today.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

UnlockSignerButton.propTypes = {
  signer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    accountId: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  onUnlockSuccess: PropTypes.func,
  onUnlockFailure: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default UnlockSignerButton;