import { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';

/**
 * Selectors for focusable elements within the modal.
 * @type {string}
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Modal component for displaying accessible dialog overlays.
 * Supports focus trapping, Escape key to close, ARIA attributes,
 * and prevents background scroll when open.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is currently open
 * @param {string} [props.title] - The modal title displayed in the header
 * @param {React.ReactNode} [props.children] - The modal body content
 * @param {string} [props.confirmButtonText='Confirm'] - Text for the confirm button
 * @param {string} [props.cancelButtonText='Cancel'] - Text for the cancel button
 * @param {Function} [props.onConfirm] - Callback invoked when the confirm button is clicked
 * @param {Function} [props.onCancel] - Callback invoked when the cancel button is clicked or modal is dismissed
 * @param {boolean} [props.showConfirmButton=true] - Whether to show the confirm button
 * @param {boolean} [props.showCancelButton=true] - Whether to show the cancel button
 * @param {string} [props.confirmButtonClassName] - Additional CSS class names for the confirm button
 * @param {string} [props.cancelButtonClassName] - Additional CSS class names for the cancel button
 * @param {string} [props.className] - Additional CSS class names for the modal dialog container
 * @param {string} [props.ariaLabel] - Custom ARIA label for the modal
 * @returns {React.ReactElement|null}
 */
function Modal({
  isOpen,
  title,
  children,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  onConfirm,
  onCancel,
  showConfirmButton = true,
  showCancelButton = true,
  confirmButtonClassName,
  cancelButtonClassName,
  className,
  ariaLabel,
}) {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const titleId = 'modal-title';

  /**
   * Handles closing the modal by invoking the onCancel callback.
   */
  const handleClose = useCallback(() => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
  }, [onCancel]);

  /**
   * Handles the confirm action by invoking the onConfirm callback.
   */
  const handleConfirm = useCallback(() => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  }, [onConfirm]);

  /**
   * Handles click on the backdrop overlay to close the modal.
   * @param {React.MouseEvent} event - The mouse event
   */
  const handleBackdropClick = useCallback((event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  /**
   * Handles keyboard interaction for the backdrop.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  const handleBackdropKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (event.target === event.currentTarget) {
        event.preventDefault();
        handleClose();
      }
    }
  }, [handleClose]);

  /**
   * Traps focus within the modal and handles Escape key to close.
   * @param {KeyboardEvent} event - The keyboard event
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
      return;
    }

    if (event.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(FOCUSABLE_SELECTORS);

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  }, [handleClose]);

  /**
   * Manages body scroll lock, focus capture/restore, and keydown listener.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current = document.activeElement;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown);

    const frameId = requestAnimationFrame(() => {
      if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(FOCUSABLE_SELECTORS);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(frameId);

      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const confirmClasses = classNames('button-primary', confirmButtonClassName);
  const cancelClasses = classNames('button-secondary-2', cancelButtonClassName);

  return (
    <div
      className="hb-modal"
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="presentation"
    >
      <div className="hb-modal-dialog-centered">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={!title ? (ariaLabel || 'Dialog') : ariaLabel}
          tabIndex={-1}
          className={classNames('w-full max-w-lg rounded-lg bg-white p-6 shadow-xl', className)}
        >
          {title && (
            <div className="mb-4">
              <h2
                id={titleId}
                className="text-lg font-medium text-body"
              >
                {title}
              </h2>
            </div>
          )}

          {children && (
            <div className="mb-6 text-sm text-body">
              {children}
            </div>
          )}

          {(showConfirmButton || showCancelButton) && (
            <div className="flex items-center justify-end space-x-3">
              {showCancelButton && (
                <button
                  type="button"
                  onClick={handleClose}
                  className={cancelClasses}
                  aria-label={cancelButtonText}
                >
                  {cancelButtonText}
                </button>
              )}
              {showConfirmButton && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={confirmClasses}
                  aria-label={confirmButtonText}
                >
                  {confirmButtonText}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  confirmButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  showConfirmButton: PropTypes.bool,
  showCancelButton: PropTypes.bool,
  confirmButtonClassName: PropTypes.string,
  cancelButtonClassName: PropTypes.string,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default Modal;