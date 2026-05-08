import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';
import ProgressIndicator from '@/components/ProgressIndicator';
import Button from '@/components/Button';
import ExitConfirmationModal from '@/components/ExitConfirmationModal';
import SessionTimeoutModal from '@/components/SessionTimeoutModal';

/**
 * PageLayout component providing consistent page structure across the application.
 * Includes a fluid-wrapper container, optional ProgressIndicator, page title/subtitle
 * area, main content area, and optional footer with navigation buttons (Back/Continue/Cancel).
 * Manages exit confirmation modal display when the user attempts to cancel with unsaved changes.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The main content to render within the layout
 * @param {string} [props.title] - The page title displayed in the header area
 * @param {string} [props.subtitle] - The page subtitle displayed below the title
 * @param {boolean} [props.showProgress=false] - Whether to display the ProgressIndicator
 * @param {string[]} [props.visibleSteps] - Optional subset of steps to display in the ProgressIndicator
 * @param {boolean} [props.showBackButton=false] - Whether to display the Back button in the footer
 * @param {boolean} [props.showContinueButton=false] - Whether to display the Continue button in the footer
 * @param {boolean} [props.showCancelButton=false] - Whether to display the Cancel button in the footer
 * @param {string} [props.backButtonText='Back'] - Text for the Back button
 * @param {string} [props.continueButtonText='Continue'] - Text for the Continue button
 * @param {string} [props.cancelButtonText='Cancel'] - Text for the Cancel button
 * @param {Function} [props.onBack] - Callback invoked when the Back button is clicked
 * @param {Function} [props.onContinue] - Callback invoked when the Continue button is clicked
 * @param {Function} [props.onCancel] - Callback invoked when the Cancel button is clicked
 * @param {boolean} [props.continueDisabled=false] - Whether the Continue button is disabled
 * @param {boolean} [props.continueLoading=false] - Whether the Continue button is in a loading state
 * @param {boolean} [props.backDisabled=false] - Whether the Back button is disabled
 * @param {boolean} [props.hasUnsavedChanges=false] - Whether unsaved changes exist (triggers exit confirmation on cancel)
 * @param {Function} [props.onExitConfirmed] - Optional callback invoked after exit is confirmed in the modal
 * @param {boolean} [props.showFooter] - Whether to show the footer area. Defaults to true if any footer button is shown.
 * @param {boolean} [props.showSessionTimeout=true] - Whether to display the SessionTimeoutModal
 * @param {string} [props.className] - Additional CSS class names for the main content area
 * @param {string} [props.headerClassName] - Additional CSS class names for the header area
 * @param {string} [props.footerClassName] - Additional CSS class names for the footer area
 * @param {string} [props.ariaLabel] - Custom ARIA label for the main content region
 * @param {React.ReactNode} [props.headerContent] - Optional custom content rendered in the header area after title/subtitle
 * @param {React.ReactNode} [props.footerContent] - Optional custom content rendered in the footer area before buttons
 * @returns {React.ReactElement}
 */
function PageLayout({
  children,
  title,
  subtitle,
  showProgress = false,
  visibleSteps,
  showBackButton = false,
  showContinueButton = false,
  showCancelButton = false,
  backButtonText = 'Back',
  continueButtonText = 'Continue',
  cancelButtonText = 'Cancel',
  onBack,
  onContinue,
  onCancel,
  continueDisabled = false,
  continueLoading = false,
  backDisabled = false,
  hasUnsavedChanges = false,
  onExitConfirmed,
  showFooter,
  showSessionTimeout = true,
  className,
  headerClassName,
  footerClassName,
  ariaLabel,
  headerContent,
  footerContent,
}) {
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const hasFooterButtons = showBackButton || showContinueButton || showCancelButton;
  const shouldShowFooter = showFooter !== undefined ? showFooter : (hasFooterButtons || !!footerContent);

  /**
   * Handles the Cancel button click.
   * If unsaved changes exist, opens the exit confirmation modal.
   * Otherwise, invokes the onCancel callback directly.
   */
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setIsExitModalOpen(true);
    } else {
      if (typeof onCancel === 'function') {
        onCancel();
      }
    }
  }, [hasUnsavedChanges, onCancel]);

  /**
   * Handles the user choosing to stay in the exit confirmation modal.
   */
  const handleStay = useCallback(() => {
    setIsExitModalOpen(false);
  }, []);

  /**
   * Handles the user confirming exit in the exit confirmation modal.
   */
  const handleExitConfirmed = useCallback(() => {
    setIsExitModalOpen(false);
    if (typeof onExitConfirmed === 'function') {
      onExitConfirmed();
    }
  }, [onExitConfirmed]);

  /**
   * Handles the Back button click.
   */
  const handleBack = useCallback(() => {
    if (typeof onBack === 'function') {
      onBack();
    }
  }, [onBack]);

  /**
   * Handles the Continue button click.
   */
  const handleContinue = useCallback(() => {
    if (typeof onContinue === 'function') {
      onContinue();
    }
  }, [onContinue]);

  const hasHeader = !!title || !!subtitle || !!headerContent || showProgress;

  const mainClasses = classNames(
    'flex-1',
    className
  );

  const headerClasses = classNames(
    'mb-6',
    headerClassName
  );

  const footerClasses = classNames(
    'mt-8 border-t border-gray-200 pt-6',
    footerClassName
  );

  return (
    <div className="fluid-wrapper py-6">
      {showProgress && (
        <div className="mb-8">
          <ProgressIndicator
            visibleSteps={visibleSteps}
            ariaLabel="Workflow progress"
          />
        </div>
      )}

      {hasHeader && (
        <div className={headerClasses}>
          {title && (
            <h1 className="text-2xl font-medium text-body">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">
              {subtitle}
            </p>
          )}
          {headerContent}
        </div>
      )}

      <main
        role="main"
        aria-label={ariaLabel || title || 'Page content'}
        className={mainClasses}
      >
        {children}
      </main>

      {shouldShowFooter && (
        <div className={footerClasses}>
          {footerContent}
          {hasFooterButtons && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {showBackButton && (
                  <Button
                    variant="secondary"
                    onClick={handleBack}
                    disabled={backDisabled}
                    ariaLabel={backButtonText}
                  >
                    {backButtonText}
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {showCancelButton && (
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    ariaLabel={cancelButtonText}
                  >
                    {cancelButtonText}
                  </Button>
                )}
                {showContinueButton && (
                  <Button
                    variant="primary"
                    onClick={handleContinue}
                    disabled={continueDisabled}
                    loading={continueLoading}
                    ariaLabel={continueButtonText}
                  >
                    {continueButtonText}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ExitConfirmationModal
        isOpen={isExitModalOpen}
        onStay={handleStay}
        onExit={handleExitConfirmed}
      />

      {showSessionTimeout && (
        <SessionTimeoutModal />
      )}
    </div>
  );
}

PageLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  showProgress: PropTypes.bool,
  visibleSteps: PropTypes.arrayOf(PropTypes.string),
  showBackButton: PropTypes.bool,
  showContinueButton: PropTypes.bool,
  showCancelButton: PropTypes.bool,
  backButtonText: PropTypes.string,
  continueButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  onBack: PropTypes.func,
  onContinue: PropTypes.func,
  onCancel: PropTypes.func,
  continueDisabled: PropTypes.bool,
  continueLoading: PropTypes.bool,
  backDisabled: PropTypes.bool,
  hasUnsavedChanges: PropTypes.bool,
  onExitConfirmed: PropTypes.func,
  showFooter: PropTypes.bool,
  showSessionTimeout: PropTypes.bool,
  className: PropTypes.string,
  headerClassName: PropTypes.string,
  footerClassName: PropTypes.string,
  ariaLabel: PropTypes.string,
  headerContent: PropTypes.node,
  footerContent: PropTypes.node,
};

export default PageLayout;