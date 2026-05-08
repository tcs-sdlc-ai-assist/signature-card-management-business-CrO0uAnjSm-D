import { useCallback } from 'react';
import PropTypes from 'prop-types';
import Modal from '@/components/Modal';
import { useNavigation } from '@/context/NavigationContext';
import { useApp } from '@/context/AppContext';
import { clearStagedChanges } from '@/services/SignerService';
import messages from '@/data/messages.json';

/**
 * ExitConfirmationModal component that displays a confirmation dialog when
 * the user attempts to cancel or exit the workflow while unsaved changes
 * exist. Warns the user that unsaved changes will be lost and provides
 * options to stay on the current page or exit and discard changes.
 *
 * On exit, clears all staged changes from both SignerService and AppContext,
 * then redirects the user to the welcome screen.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is currently open
 * @param {Function} [props.onStay] - Callback invoked when the user chooses to stay
 * @param {Function} [props.onExit] - Optional callback invoked after exit cleanup, before navigation
 * @param {string} [props.className] - Additional CSS class names for the modal
 * @returns {React.ReactElement|null}
 */
function ExitConfirmationModal({ isOpen, onStay, onExit, className }) {
  const { resetNavigation } = useNavigation();
  const { clearStagedChanges: clearAppStagedChanges, clearSelectedAccount } = useApp();

  const confirmationMessages = messages.confirmation.cancelChanges;

  /**
   * Handles the user choosing to stay on the current page.
   * Invokes the onStay callback to close the modal.
   */
  const handleStay = useCallback(() => {
    if (typeof onStay === 'function') {
      onStay();
    }
  }, [onStay]);

  /**
   * Handles the user choosing to exit the workflow.
   * Clears all staged changes, clears the selected account,
   * invokes the optional onExit callback, and navigates to the welcome screen.
   */
  const handleExit = useCallback(() => {
    clearStagedChanges();
    clearAppStagedChanges();
    clearSelectedAccount();

    if (typeof onExit === 'function') {
      onExit();
    }

    resetNavigation();
  }, [onExit, resetNavigation, clearAppStagedChanges, clearSelectedAccount]);

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      title={confirmationMessages.title}
      onConfirm={handleExit}
      onCancel={handleStay}
      confirmButtonText={confirmationMessages.confirmButtonText}
      cancelButtonText={confirmationMessages.cancelButtonText}
      showConfirmButton={true}
      showCancelButton={true}
      ariaLabel="Exit confirmation"
      className={className}
    >
      <p className="text-sm text-body">
        {confirmationMessages.message}
      </p>
    </Modal>
  );
}

ExitConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onStay: PropTypes.func,
  onExit: PropTypes.func,
  className: PropTypes.string,
};

export default ExitConfirmationModal;