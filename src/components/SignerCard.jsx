import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';
import { STATUS } from '@/utils/constants';

/**
 * Maps signer status values to their display configuration.
 * @type {Object<string, { label: string, classes: string }>}
 */
const STATUS_BADGE_MAP = {
  [STATUS.ACTIVE]: {
    label: 'Active',
    classes: 'bg-green-100 text-green-800 border-green-300',
  },
  [STATUS.PENDING]: {
    label: 'Pending',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  [STATUS.LOCKED]: {
    label: 'Locked',
    classes: 'bg-red-100 text-red-800 border-red-300',
  },
  [STATUS.REMOVED]: {
    label: 'Removed',
    classes: 'bg-gray-100 text-gray-500 border-gray-300',
  },
};

/**
 * StatusBadge component renders a colored badge indicating the signer's status.
 *
 * @param {Object} props
 * @param {string} props.status - The signer status value
 * @returns {React.ReactElement}
 */
function StatusBadge({ status }) {
  const config = STATUS_BADGE_MAP[status] || {
    label: status || 'Unknown',
    classes: 'bg-gray-100 text-gray-600 border-gray-300',
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.classes
      )}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

/**
 * Formats a signer's full display name from their name parts.
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
 * SignerCard component for displaying an individual signer's information
 * with contextual action buttons based on their status.
 *
 * Displays the signer's name, role/title, status badge, and masked contact
 * information. Action buttons are conditionally rendered:
 * - Edit: available for all non-removed signers
 * - Remove: available for all non-removed signers except when isLastSigner is true
 * - Unlock: available only for locked signers
 * - Resend: available only for pending signers
 *
 * @param {Object} props
 * @param {Object} props.signer - The signer data object
 * @param {string} props.signer.id - Unique signer identifier
 * @param {string} props.signer.firstName - Signer's first name
 * @param {string} props.signer.lastName - Signer's last name
 * @param {string} [props.signer.middleName] - Signer's middle name
 * @param {string} [props.signer.suffix] - Signer's suffix
 * @param {string} props.signer.title - Signer's title
 * @param {string} props.signer.role - Signer's role
 * @param {string} props.signer.status - Signer's status
 * @param {string} [props.signer.emailMasked] - Masked email for display
 * @param {string} [props.signer.phoneMasked] - Masked phone for display
 * @param {boolean} [props.isLastSigner=false] - Whether this is the last signer on the account
 * @param {Function} [props.onEdit] - Callback invoked when the Edit button is clicked
 * @param {Function} [props.onRemove] - Callback invoked when the Remove button is clicked
 * @param {Function} [props.onUnlock] - Callback invoked when the Unlock button is clicked
 * @param {Function} [props.onResend] - Callback invoked when the Resend button is clicked
 * @param {boolean} [props.unlockDisabled=false] - Whether the Unlock button is disabled
 * @param {boolean} [props.resendDisabled=false] - Whether the Resend button is disabled
 * @param {string} [props.className] - Additional CSS class names for the card container
 * @returns {React.ReactElement|null}
 */
function SignerCard({
  signer,
  isLastSigner = false,
  onEdit,
  onRemove,
  onUnlock,
  onResend,
  unlockDisabled = false,
  resendDisabled = false,
  className,
}) {
  const handleEdit = useCallback(() => {
    if (typeof onEdit === 'function') {
      onEdit(signer);
    }
  }, [onEdit, signer]);

  const handleRemove = useCallback(() => {
    if (typeof onRemove === 'function') {
      onRemove(signer);
    }
  }, [onRemove, signer]);

  const handleUnlock = useCallback(() => {
    if (typeof onUnlock === 'function') {
      onUnlock(signer);
    }
  }, [onUnlock, signer]);

  const handleResend = useCallback(() => {
    if (typeof onResend === 'function') {
      onResend(signer);
    }
  }, [onResend, signer]);

  if (!signer) {
    return null;
  }

  const displayName = formatSignerName(signer);
  const isRemoved = signer.status === STATUS.REMOVED;
  const isLocked = signer.status === STATUS.LOCKED;
  const isPending = signer.status === STATUS.PENDING;

  const showEdit = !isRemoved;
  const showRemove = !isRemoved && !isLastSigner;
  const showUnlock = isLocked;
  const showResend = isPending;

  const hasActions = showEdit || showRemove || showUnlock || showResend;

  const cardClasses = classNames(
    'rounded border border-gray-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md',
    className
  );

  return (
    <div
      className={cardClasses}
      role="region"
      aria-label={`Signer: ${displayName}`}
    >
      <div className="flex flex-col tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-body">
              {displayName}
            </h3>
            <StatusBadge status={signer.status} />
          </div>

          {(signer.role || signer.title) && (
            <div className="mb-2 text-sm text-gray-600">
              {signer.role && (
                <span>{signer.role}</span>
              )}
              {signer.role && signer.title && (
                <span className="mx-1">·</span>
              )}
              {signer.title && (
                <span>{signer.title}</span>
              )}
            </div>
          )}

          <div className="space-y-1 text-sm text-gray-500">
            {signer.emailMasked && (
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span aria-label="Masked email">{signer.emailMasked}</span>
              </div>
            )}
            {signer.phoneMasked && (
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span aria-label="Masked phone number">{signer.phoneMasked}</span>
              </div>
            )}
          </div>
        </div>

        {hasActions && (
          <div
            className="mt-3 flex flex-wrap items-center gap-2 tablet:ml-4 tablet:mt-0 tablet:flex-shrink-0"
            role="group"
            aria-label={`Actions for ${displayName}`}
          >
            {showEdit && (
              <button
                type="button"
                onClick={handleEdit}
                aria-label={`Edit ${displayName}`}
                className="inline-flex items-center justify-center rounded border border-primary-blue px-3 py-1.5 text-xs font-medium text-primary-blue transition-colors duration-200 hover:bg-primary-blue hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-1"
              >
                Edit
              </button>
            )}
            {showRemove && (
              <button
                type="button"
                onClick={handleRemove}
                aria-label={`Remove ${displayName}`}
                className="inline-flex items-center justify-center rounded border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors duration-200 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1"
              >
                Remove
              </button>
            )}
            {showUnlock && (
              <button
                type="button"
                onClick={handleUnlock}
                disabled={unlockDisabled}
                aria-label={`Unlock ${displayName}`}
                aria-disabled={unlockDisabled}
                className={classNames(
                  'inline-flex items-center justify-center rounded border px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1',
                  {
                    'border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white focus:ring-primary-blue': !unlockDisabled,
                    'cursor-not-allowed border-gray-300 text-gray-400 opacity-50': unlockDisabled,
                  }
                )}
              >
                Unlock
              </button>
            )}
            {showResend && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendDisabled}
                aria-label={`Resend invitation to ${displayName}`}
                aria-disabled={resendDisabled}
                className={classNames(
                  'inline-flex items-center justify-center rounded border px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1',
                  {
                    'border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white focus:ring-primary-blue': !resendDisabled,
                    'cursor-not-allowed border-gray-300 text-gray-400 opacity-50': resendDisabled,
                  }
                )}
              >
                Resend
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

SignerCard.propTypes = {
  signer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    middleName: PropTypes.string,
    suffix: PropTypes.string,
    title: PropTypes.string,
    role: PropTypes.string,
    status: PropTypes.string.isRequired,
    emailMasked: PropTypes.string,
    phoneMasked: PropTypes.string,
  }).isRequired,
  isLastSigner: PropTypes.bool,
  onEdit: PropTypes.func,
  onRemove: PropTypes.func,
  onUnlock: PropTypes.func,
  onResend: PropTypes.func,
  unlockDisabled: PropTypes.bool,
  resendDisabled: PropTypes.bool,
  className: PropTypes.string,
};

export default SignerCard;