import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';

/**
 * Maps account type values to their display configuration.
 * @type {Object<string, { label: string, classes: string }>}
 */
const ACCOUNT_TYPE_BADGE_MAP = {
  checking: {
    label: 'Checking',
    classes: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  savings: {
    label: 'Savings',
    classes: 'bg-green-100 text-green-800 border-green-300',
  },
  'money market': {
    label: 'Money Market',
    classes: 'bg-purple-100 text-purple-800 border-purple-300',
  },
};

/**
 * AccountTypeBadge component renders a colored badge indicating the account type.
 *
 * @param {Object} props
 * @param {string} props.accountType - The account type value
 * @returns {React.ReactElement}
 */
function AccountTypeBadge({ accountType }) {
  const normalizedType = accountType ? accountType.toLowerCase() : '';
  const config = ACCOUNT_TYPE_BADGE_MAP[normalizedType] || {
    label: accountType || 'Unknown',
    classes: 'bg-gray-100 text-gray-600 border-gray-300',
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.classes
      )}
      aria-label={`Account type: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

AccountTypeBadge.propTypes = {
  accountType: PropTypes.string.isRequired,
};

/**
 * AccountCard component for displaying an individual account's information
 * with a selectable/clickable state. Shows account name, masked account number,
 * account type badge, and current signer count.
 *
 * @param {Object} props
 * @param {Object} props.account - The account data object
 * @param {string} props.account.id - Unique account identifier
 * @param {string} props.account.name - Account display name
 * @param {string} props.account.maskedAccountNumber - Masked account number for display
 * @param {string} props.account.accountType - Type of account (checking, savings, money market)
 * @param {number} props.account.signerCount - Number of authorized signers on the account
 * @param {boolean} [props.selected=false] - Whether the account card is currently selected
 * @param {Function} [props.onSelect] - Callback invoked when the account card is clicked/selected
 * @param {boolean} [props.disabled=false] - Whether the account card is disabled
 * @param {string} [props.className] - Additional CSS class names for the card container
 * @returns {React.ReactElement|null}
 */
function AccountCard({
  account,
  selected = false,
  onSelect,
  disabled = false,
  className,
}) {
  /**
   * Handles the click event on the account card.
   */
  const handleClick = useCallback(() => {
    if (disabled) {
      return;
    }

    if (typeof onSelect === 'function') {
      onSelect(account);
    }
  }, [onSelect, account, disabled]);

  /**
   * Handles keyboard interaction on the account card.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  const handleKeyDown = useCallback((event) => {
    if (disabled) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (typeof onSelect === 'function') {
        onSelect(account);
      }
    }
  }, [onSelect, account, disabled]);

  if (!account) {
    return null;
  }

  const cardClasses = classNames(
    'rounded border bg-white p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2',
    {
      'border-primary-blue bg-blue-50 shadow-md ring-1 ring-primary-blue': selected,
      'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300': !selected && !disabled,
      'cursor-pointer': !disabled,
      'cursor-not-allowed opacity-50': disabled,
    },
    className
  );

  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cardClasses}
    >
      <div className="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-body">
              {account.name}
            </h3>
            <AccountTypeBadge accountType={account.accountType} />
          </div>

          <div className="space-y-1 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4 flex-shrink-0 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span aria-label="Masked account number">{account.maskedAccountNumber}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4 flex-shrink-0 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span aria-label="Number of signers">
                {account.signerCount} {account.signerCount === 1 ? 'signer' : 'signers'}
              </span>
            </div>
          </div>
        </div>

        {selected && (
          <div className="mt-3 flex-shrink-0 tablet:ml-4 tablet:mt-0">
            <svg
              className="h-6 w-6 text-primary-blue"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

AccountCard.propTypes = {
  account: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    maskedAccountNumber: PropTypes.string.isRequired,
    accountType: PropTypes.string.isRequired,
    signerCount: PropTypes.number.isRequired,
    controllingPartyId: PropTypes.string,
    fullAccountNumber: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default AccountCard;