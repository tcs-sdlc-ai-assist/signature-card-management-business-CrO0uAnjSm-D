import { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import Modal from '@/components/Modal';
import Alert from '@/components/Alert';
import { removeSigner } from '@/services/SignerService';
import { logSignerRemoved, logEvent, SIGNER_AUDIT_EVENT_TYPES } from '@/services/AuditLogService';
import { AUDIT_OUTCOMES } from '@/services/AuditService';
import { useSession } from '@/context/SessionContext';
import messages from '@/data/messages.json';

/**
 * Formats a signer's display name from their name parts.
 * @param {Object} signer - The signer object
 * @returns {string} The formatted display name
 */
function formatSignerName(signer) {
  if (!signer) {
    return '';
  }

  const parts = [];

  if (signer.firstName) {
    parts.push(signer.firstName);
  }

  if (signer.middleName) {
    parts.push(signer.middleName);
  }

  if (signer.lastName) {
    parts.push(signer.lastName);
  }

  if (signer.suffix) {
    parts.push(signer.suffix);
  }

  return parts.join(' ');
}

/**
 * RemoveSignerModal component that displays a confirmation dialog when
 * the user attempts to remove an authorized signer from an account.
 * Checks if the signer is the last remaining signer and prevents removal
 * with an error message. On confirm, calls SignerService.removeSigner to
 * stage the removal and logs the event via AuditLogService.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is currently open
 * @param {Object} props.signer - The signer object to remove
 * @param {string} props.signer.id - Unique signer identifier
 * @param {string} props.signer.firstName - Signer's first name
 * @param {string} props.signer.lastName - Signer's last name
 * @param {string} [props.signer.middleName] - Signer's middle name
 * @param {string} [props.signer.suffix] - Signer's suffix
 * @param {string} [props.signer.accountId] - Associated account ID
 * @param {boolean} [props.isLastSigner=false] - Whether this is the last signer on the account
 * @param {Function} [props.onCancel] - Callback invoked when the user cancels the removal
 * @param {Function} [props.onRemoveSuccess] - Callback invoked after a successful removal
 * @param {Function} [props.onRemoveFailure] - Callback invoked after a failed removal attempt
 * @param {string} [props.className] - Additional CSS class names for the modal
 * @returns {React.ReactElement|null}
 */
function RemoveSignerModal({
  isOpen,
  signer,
  isLastSigner = false,
  onCancel,
  onRemoveSuccess,
  onRemoveFailure,
  className,
}) {
  const [loading, setLoading] = useState(false);
  const [resultAlert, setResultAlert] = useState(null);

  const { currentUser } = useSession();

  const userId = currentUser ? currentUser.userId : 'unknown';

  const confirmationMessages = messages.confirmation.removeSigner;

  /**
   * Formats the signer's display name.
   */
  const displayName = useMemo(() => {
    return formatSignerName(signer);
  }, [signer]);

  /**
   * Builds the confirmation message with the signer's name interpolated.
   */
  const confirmationMessage = useMemo(() => {
    if (!confirmationMessages || !confirmationMessages.message) {
      return '';
    }
    return confirmationMessages.message.replace('{signerName}', displayName);
  }, [confirmationMessages, displayName]);

  /**
   * Handles the user cancelling the removal.
   */
  const handleCancel = useCallback(() => {
    setResultAlert(null);
    if (typeof onCancel === 'function') {
      onCancel();
    }
  }, [onCancel]);

  /**
   * Handles confirming the signer removal. Calls SignerService.removeSigner
   * and logs the result via AuditLogService.
   */
  const handleConfirm = useCallback(() => {
    if (!signer || !signer.id) {
      return;
    }

    if (isLastSigner) {
      setResultAlert({
        message: 'Cannot remove the last signer on an account. At least one authorized signer must remain.',
        title: 'Removal Not Allowed',
        variant: 'critical',
      });
      return;
    }

    setLoading(true);
    setResultAlert(null);

    const result = removeSigner(signer.id);

    if (result.success) {
      logSignerRemoved(userId, {
        accountId: signer.accountId || '',
        signerId: signer.id,
        firstName: signer.firstName,
        lastName: signer.lastName,
        before: { ...signer },
      });

      setLoading(false);
      setResultAlert(null);

      if (typeof onRemoveSuccess === 'function') {
        onRemoveSuccess(signer);
      }
    } else {
      logEvent(
        userId,
        SIGNER_AUDIT_EVENT_TYPES.SIGNER_REMOVED,
        {
          accountId: signer.accountId || '',
          signerId: signer.id,
          firstName: signer.firstName,
          lastName: signer.lastName,
          action: 'remove_signer',
          reason: result.error || 'Removal failed',
        },
        AUDIT_OUTCOMES.FAILURE
      );

      setResultAlert({
        message: result.error || 'Unable to remove the signer. Please try again.',
        title: 'Removal Failed',
        variant: 'critical',
      });

      setLoading(false);

      if (typeof onRemoveFailure === 'function') {
        onRemoveFailure(signer, result.error);
      }
    }
  }, [signer, isLastSigner, userId, onRemoveSuccess, onRemoveFailure]);

  /**
   * Dismisses the result alert.
   */
  const handleDismissAlert = useCallback(() => {
    setResultAlert(null);
  }, []);

  if (!isOpen || !signer) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      title={confirmationMessages.title}
      onConfirm={isLastSigner ? undefined : handleConfirm}
      onCancel={handleCancel}
      confirmButtonText={confirmationMessages.confirmButtonText}
      cancelButtonText={confirmationMessages.cancelButtonText}
      showConfirmButton={!isLastSigner}
      showCancelButton={true}
      ariaLabel={`Confirm removal of ${displayName}`}
      className={className}
    >
      <div className="space-y-3">
        {resultAlert && (
          <Alert
            message={resultAlert.message}
            title={resultAlert.title}
            variant={resultAlert.variant}
            dismissible={true}
            onDismiss={handleDismissAlert}
            ariaLabel={`Removal result: ${resultAlert.title}`}
          />
        )}

        {isLastSigner && (
          <Alert
            message="Cannot remove the last signer on an account. At least one authorized signer must remain."
            title="Removal Not Allowed"
            variant="critical"
            ariaLabel="Last signer removal warning"
          />
        )}

        {!isLastSigner && (
          <p className="text-sm text-body">
            {confirmationMessage}
          </p>
        )}

        {loading && (
          <p className="text-sm text-gray-500" aria-live="polite">
            Removing signer...
          </p>
        )}
      </div>
    </Modal>
  );
}

RemoveSignerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  signer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    middleName: PropTypes.string,
    suffix: PropTypes.string,
    accountId: PropTypes.string,
    status: PropTypes.string,
  }),
  isLastSigner: PropTypes.bool,
  onCancel: PropTypes.func,
  onRemoveSuccess: PropTypes.func,
  onRemoveFailure: PropTypes.func,
  className: PropTypes.string,
};

export default RemoveSignerModal;