import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';

/**
 * Generates an array of page numbers and ellipsis markers for display.
 * Shows first page, last page, current page, and surrounding pages with
 * ellipsis for gaps.
 * @param {number} currentPage - The current active page (1-based)
 * @param {number} totalPages - The total number of pages
 * @returns {Array<number|string>} Array of page numbers and '...' markers
 */
function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  const showLeftEllipsis = currentPage > 3;
  const showRightEllipsis = currentPage < totalPages - 2;

  pages.push(1);

  if (showLeftEllipsis) {
    pages.push('...');
  }

  const start = showLeftEllipsis ? Math.max(2, currentPage - 1) : 2;
  const end = showRightEllipsis ? Math.min(totalPages - 1, currentPage + 1) : totalPages - 1;

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (showRightEllipsis) {
    pages.push('...');
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * ChevronLeftIcon component for the previous button.
 * @returns {React.ReactElement}
 */
function ChevronLeftIcon() {
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
        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * ChevronRightIcon component for the next button.
 * @returns {React.ReactElement}
 */
function ChevronRightIcon() {
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
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Reusable Pagination component with previous/next buttons and page number
 * display. Supports accessible navigation with ARIA attributes and keyboard
 * interaction.
 *
 * @param {Object} props
 * @param {number} props.currentPage - The current active page (1-based)
 * @param {number} props.totalPages - The total number of pages
 * @param {Function} props.onPageChange - Callback invoked with the new page number when a page is selected
 * @param {string} [props.className] - Additional CSS class names for the wrapper
 * @param {string} [props.ariaLabel] - Custom ARIA label for the navigation region
 * @returns {React.ReactElement|null}
 */
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  ariaLabel,
}) {
  const safeCurrentPage = Math.max(1, Math.min(Math.floor(Number(currentPage) || 1), totalPages));
  const safeTotalPages = Math.max(1, Math.floor(Number(totalPages) || 1));

  const canGoPrevious = safeCurrentPage > 1;
  const canGoNext = safeCurrentPage < safeTotalPages;

  const pageNumbers = useMemo(() => {
    return getPageNumbers(safeCurrentPage, safeTotalPages);
  }, [safeCurrentPage, safeTotalPages]);

  /**
   * Handles navigating to the previous page.
   */
  const handlePrevious = useCallback(() => {
    if (!canGoPrevious) {
      return;
    }

    if (typeof onPageChange === 'function') {
      onPageChange(safeCurrentPage - 1);
    }
  }, [canGoPrevious, safeCurrentPage, onPageChange]);

  /**
   * Handles navigating to the next page.
   */
  const handleNext = useCallback(() => {
    if (!canGoNext) {
      return;
    }

    if (typeof onPageChange === 'function') {
      onPageChange(safeCurrentPage + 1);
    }
  }, [canGoNext, safeCurrentPage, onPageChange]);

  /**
   * Handles navigating to a specific page number.
   * @param {number} page - The page number to navigate to
   */
  const handlePageClick = useCallback((page) => {
    if (page === safeCurrentPage) {
      return;
    }

    if (typeof onPageChange === 'function') {
      onPageChange(page);
    }
  }, [safeCurrentPage, onPageChange]);

  /**
   * Handles keyboard interaction on the previous button.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  const handlePreviousKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePrevious();
    }
  }, [handlePrevious]);

  /**
   * Handles keyboard interaction on the next button.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  const handleNextKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNext();
    }
  }, [handleNext]);

  if (safeTotalPages <= 1) {
    return null;
  }

  const resolvedAriaLabel = ariaLabel || 'Pagination navigation';

  const wrapperClasses = classNames(
    'flex items-center justify-center',
    className
  );

  const buttonBaseClasses = 'inline-flex items-center justify-center rounded border px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-1';

  const previousClasses = classNames(
    buttonBaseClasses,
    {
      'border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700': canGoPrevious,
      'cursor-not-allowed border-gray-200 text-gray-300 opacity-50': !canGoPrevious,
    }
  );

  const nextClasses = classNames(
    buttonBaseClasses,
    {
      'border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700': canGoNext,
      'cursor-not-allowed border-gray-200 text-gray-300 opacity-50': !canGoNext,
    }
  );

  return (
    <nav
      aria-label={resolvedAriaLabel}
      className={wrapperClasses}
    >
      <ul className="flex items-center gap-1">
        <li>
          <button
            type="button"
            onClick={handlePrevious}
            onKeyDown={handlePreviousKeyDown}
            disabled={!canGoPrevious}
            aria-label="Go to previous page"
            aria-disabled={!canGoPrevious}
            className={previousClasses}
          >
            <ChevronLeftIcon />
            <span className="ml-1 hidden tablet:inline">Previous</span>
          </button>
        </li>

        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <li
                key={`ellipsis-${index}`}
                aria-hidden="true"
                role="presentation"
              >
                <span className="inline-flex items-center justify-center px-2 py-2 text-sm text-gray-400">
                  &hellip;
                </span>
              </li>
            );
          }

          const isActive = page === safeCurrentPage;

          const pageButtonClasses = classNames(
            'inline-flex items-center justify-center rounded border px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-1',
            {
              'border-primary-blue bg-primary-blue text-white': isActive,
              'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400': !isActive,
            }
          );

          return (
            <li key={page}>
              <button
                type="button"
                onClick={() => handlePageClick(page)}
                aria-label={`Page ${page}`}
                aria-current={isActive ? 'page' : undefined}
                className={pageButtonClasses}
              >
                {page}
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={handleNext}
            onKeyDown={handleNextKeyDown}
            disabled={!canGoNext}
            aria-label="Go to next page"
            aria-disabled={!canGoNext}
            className={nextClasses}
          >
            <span className="mr-1 hidden tablet:inline">Next</span>
            <ChevronRightIcon />
          </button>
        </li>
      </ul>
    </nav>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default Pagination;