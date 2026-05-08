import { useState, useCallback, useMemo, useId } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';
import { STATUS } from '@/utils/constants';

/**
 * Available status filter options.
 * @type {Array<{ value: string, label: string }>}
 */
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: STATUS.ACTIVE, label: 'Active' },
  { value: STATUS.PENDING, label: 'Pending' },
  { value: STATUS.LOCKED, label: 'Locked' },
];

/**
 * Available sort options.
 * @type {Array<{ value: string, label: string }>}
 */
const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'status', label: 'Status' },
  { value: 'date-added', label: 'Date Added' },
];

/**
 * SearchIcon component for the search input.
 * @returns {React.ReactElement}
 */
function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 text-gray-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * ClearIcon component for the search input clear button.
 * @returns {React.ReactElement}
 */
function ClearIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * FilterSort component providing search, status filter, and sort controls
 * for the signer list. Accessible with proper labels and ARIA attributes.
 *
 * @param {Object} props
 * @param {string} [props.searchQuery=''] - The current search query value
 * @param {Function} [props.onSearchChange] - Callback invoked when the search query changes
 * @param {string} [props.statusFilter='all'] - The current status filter value
 * @param {Function} [props.onStatusFilterChange] - Callback invoked when the status filter changes
 * @param {string} [props.sortBy='name-asc'] - The current sort option value
 * @param {Function} [props.onSortChange] - Callback invoked when the sort option changes
 * @param {boolean} [props.disabled=false] - Whether the controls are disabled
 * @param {string} [props.className] - Additional CSS class names for the wrapper
 * @param {string} [props.ariaLabel] - Custom ARIA label for the controls region
 * @returns {React.ReactElement}
 */
function FilterSort({
  searchQuery = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  sortBy = 'name-asc',
  onSortChange,
  disabled = false,
  className,
  ariaLabel,
}) {
  const uniqueId = useId();
  const searchId = `filter-search-${uniqueId}`;
  const statusId = `filter-status-${uniqueId}`;
  const sortId = `filter-sort-${uniqueId}`;

  /**
   * Handles changes to the search input.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event
   */
  const handleSearchChange = useCallback((event) => {
    if (typeof onSearchChange === 'function') {
      onSearchChange(event.target.value);
    }
  }, [onSearchChange]);

  /**
   * Handles clearing the search input.
   */
  const handleClearSearch = useCallback(() => {
    if (typeof onSearchChange === 'function') {
      onSearchChange('');
    }
  }, [onSearchChange]);

  /**
   * Handles keyboard interaction on the clear button.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  const handleClearKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClearSearch();
    }
  }, [handleClearSearch]);

  /**
   * Handles changes to the status filter dropdown.
   * @param {React.ChangeEvent<HTMLSelectElement>} event - The change event
   */
  const handleStatusFilterChange = useCallback((event) => {
    if (typeof onStatusFilterChange === 'function') {
      onStatusFilterChange(event.target.value);
    }
  }, [onStatusFilterChange]);

  /**
   * Handles changes to the sort dropdown.
   * @param {React.ChangeEvent<HTMLSelectElement>} event - The change event
   */
  const handleSortChange = useCallback((event) => {
    if (typeof onSortChange === 'function') {
      onSortChange(event.target.value);
    }
  }, [onSortChange]);

  const hasSearchQuery = typeof searchQuery === 'string' && searchQuery.length > 0;

  const resolvedAriaLabel = ariaLabel || 'Filter and sort signers';

  const wrapperClasses = classNames(
    'w-full',
    className
  );

  const selectClasses = classNames(
    'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-body outline-none transition-colors duration-200',
    'focus:border-primary-blue focus:ring-1 focus:ring-primary-blue',
    {
      'cursor-not-allowed bg-gray-50 opacity-60': disabled,
    }
  );

  const inputClasses = classNames(
    'w-full rounded border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm text-body outline-none transition-colors duration-200',
    'focus:border-primary-blue focus:ring-1 focus:ring-primary-blue',
    {
      'cursor-not-allowed bg-gray-50 opacity-60': disabled,
    }
  );

  return (
    <div
      role="search"
      aria-label={resolvedAriaLabel}
      className={wrapperClasses}
    >
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-end">
        <div className="flex-1">
          <label
            htmlFor={searchId}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Search by name
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </div>
            <input
              id={searchId}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              disabled={disabled}
              placeholder="Search signers..."
              aria-label="Search signers by name"
              autoComplete="off"
              className={inputClasses}
            />
            {hasSearchQuery && !disabled && (
              <button
                type="button"
                onClick={handleClearSearch}
                onKeyDown={handleClearKeyDown}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 hover:text-gray-600 focus:outline-none focus:text-primary-blue"
              >
                <ClearIcon />
              </button>
            )}
          </div>
        </div>

        <div className="w-full tablet:w-48">
          <label
            htmlFor={statusId}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Filter by status
          </label>
          <select
            id={statusId}
            value={statusFilter}
            onChange={handleStatusFilterChange}
            disabled={disabled}
            aria-label="Filter signers by status"
            className={selectClasses}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full tablet:w-48">
          <label
            htmlFor={sortId}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Sort by
          </label>
          <select
            id={sortId}
            value={sortBy}
            onChange={handleSortChange}
            disabled={disabled}
            aria-label="Sort signers"
            className={selectClasses}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

FilterSort.propTypes = {
  searchQuery: PropTypes.string,
  onSearchChange: PropTypes.func,
  statusFilter: PropTypes.string,
  onStatusFilterChange: PropTypes.func,
  sortBy: PropTypes.string,
  onSortChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default FilterSort;