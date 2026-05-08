import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';
import { STATUS } from '@/utils/constants';

/**
 * @typedef {Object} StagedChange
 * @property {string} id - Unique change identifier
 * @property {string} type - Change type: 'add', 'edit', 'remove'
 * @property {string} accountId - Associated account ID
 * @property {string} signerId - Associated signer ID
 * @property {Object|null} [before] - Previous signer data (for edits/removals)
 * @property {Object|null} [after] - New signer data (for adds/edits)
 * @property {string} timestamp - ISO 8601 timestamp of the change
 */

/**
 * Fields to display in before/after comparison for edits.
 * @type {Array<{ key: string, label: string }>}
 */
const COMPARABLE_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'suffix', label: 'Suffix' },
  { key: 'title', label: 'Title' },
  { key: 'role', label: 'Role' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

/**
 * Formats a signer's full display name from their name parts.
 * @param {Object} signer - The signer object
 * @returns {string} The formatted display name
 */
function formatSignerName(signer) {
  if (!signer) {
    return 'Unknown Signer';
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

  return parts.length > 0 ? parts.join(' ') : 'Unknown Signer';
}

/**
 * Extracts the changed fields between before and after objects for an edit change.
 * @param {Object|null} before - The previous signer data
 * @param {Object|null} after - The new signer data
 * @returns {Array<{ label: string, before: string, after: string }>} Array of changed field comparisons
 */
function getChangedFields(before, after) {
  if (!before || !after) {
    return [];
  }

  const changes = [];

  for (const field of COMPARABLE_FIELDS) {
    const beforeValue = before[field.key] !== undefined && before[field.key] !== null
      ? String(before[field.key]).trim()
      : '';
    const afterValue = after[field.key] !== undefined && after[field.key] !== null
      ? String(after[field.key]).trim()
      : '';

    if (beforeValue !== afterValue) {
      changes.push({
        label: field.label,
        before: beforeValue || '(empty)',
        after: afterValue || '(empty)',
      });
    }
  }

  return changes;
}

/**
 * AdditionIcon component for the additions section.
 * @returns {React.ReactElement}
 */
function AdditionIcon() {
  return (
    <svg
      className="h-5 w-5 text-green-600"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * EditIcon component for the edits section.
 * @returns {React.ReactElement}
 */
function EditIcon() {
  return (
    <svg
      className="h-5 w-5 text-amber-600"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );
}

/**
 * RemovalIcon component for the removals section.
 * @returns {React.ReactElement}
 */
function RemovalIcon() {
  return (
    <svg
      className="h-5 w-5 text-red-600"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * CountBadge component for displaying the count of changes per type.
 *
 * @param {Object} props
 * @param {number} props.count - The count to display
 * @param {string} props.colorClasses - Tailwind color classes for the badge
 * @returns {React.ReactElement}
 */
function CountBadge({ count, colorClasses }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
        colorClasses
      )}
    >
      {count}
    </span>
  );
}

CountBadge.propTypes = {
  count: PropTypes.number.isRequired,
  colorClasses: PropTypes.string.isRequired,
};

/**
 * AdditionItem component for displaying a single added signer.
 *
 * @param {Object} props
 * @param {Object} props.change - The staged change object
 * @returns {React.ReactElement}
 */
function AdditionItem({ change }) {
  const signer = change.after;
  const displayName = formatSignerName(signer);

  return (
    <div
      className="rounded border border-green-200 bg-green-50 p-3"
      role="listitem"
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">
          <AdditionIcon />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            {displayName}
          </p>
          {signer && (signer.role || signer.title) && (
            <p className="mt-0.5 text-xs text-green-700">
              {signer.role && <span>{signer.role}</span>}
              {signer.role && signer.title && <span className="mx-1">·</span>}
              {signer.title && <span>{signer.title}</span>}
            </p>
          )}
          {signer && signer.email && (
            <p className="mt-0.5 text-xs text-green-600">
              {signer.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

AdditionItem.propTypes = {
  change: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    after: PropTypes.object,
  }).isRequired,
};

/**
 * EditItem component for displaying a single edited signer with before/after comparison.
 *
 * @param {Object} props
 * @param {Object} props.change - The staged change object
 * @returns {React.ReactElement}
 */
function EditItem({ change }) {
  const displayName = formatSignerName(change.after || change.before);
  const changedFields = useMemo(() => {
    return getChangedFields(change.before, change.after);
  }, [change.before, change.after]);

  return (
    <div
      className="rounded border border-amber-200 bg-amber-50 p-3"
      role="listitem"
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">
          <EditIcon />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            {displayName}
          </p>
          {changedFields.length > 0 && (
            <div className="mt-2 space-y-1">
              {changedFields.map((field) => (
                <div
                  key={field.label}
                  className="flex flex-col text-xs tablet:flex-row tablet:items-center tablet:gap-2"
                >
                  <span className="font-medium text-amber-700">
                    {field.label}:
                  </span>
                  <span className="text-amber-600 line-through">
                    {field.before}
                  </span>
                  <span className="hidden text-amber-500 tablet:inline" aria-hidden="true">
                    →
                  </span>
                  <span className="font-medium text-amber-800">
                    {field.after}
                  </span>
                </div>
              ))}
            </div>
          )}
          {changedFields.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No field-level differences detected.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

EditItem.propTypes = {
  change: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    before: PropTypes.object,
    after: PropTypes.object,
  }).isRequired,
};

/**
 * RemovalItem component for displaying a single removed signer.
 *
 * @param {Object} props
 * @param {Object} props.change - The staged change object
 * @returns {React.ReactElement}
 */
function RemovalItem({ change }) {
  const signer = change.before;
  const displayName = formatSignerName(signer);

  return (
    <div
      className="rounded border border-red-200 bg-red-50 p-3"
      role="listitem"
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">
          <RemovalIcon />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">
            {displayName}
          </p>
          {signer && (signer.role || signer.title) && (
            <p className="mt-0.5 text-xs text-red-700">
              {signer.role && <span>{signer.role}</span>}
              {signer.role && signer.title && <span className="mx-1">·</span>}
              {signer.title && <span>{signer.title}</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

RemovalItem.propTypes = {
  change: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    before: PropTypes.object,
  }).isRequired,
};

/**
 * ChangesSummary component for displaying a grouped summary of staged signer changes.
 * Groups changes by type: additions (green), edits (amber), removals (red).
 * Shows before/after values for edits. Displays total count of each change type.
 * Used on both Confirm and Review screens.
 *
 * @param {Object} props
 * @param {Array<Object>} props.changes - Array of staged change objects
 * @param {string} [props.title='Changes Summary'] - The section title
 * @param {boolean} [props.showEmptyState=true] - Whether to show a message when there are no changes
 * @param {string} [props.emptyMessage='No changes have been made.'] - Message to display when there are no changes
 * @param {string} [props.className] - Additional CSS class names for the wrapper
 * @param {string} [props.ariaLabel] - Custom ARIA label for the summary region
 * @returns {React.ReactElement}
 */
function ChangesSummary({
  changes,
  title = 'Changes Summary',
  showEmptyState = true,
  emptyMessage = 'No changes have been made.',
  className,
  ariaLabel,
}) {
  /**
   * Groups changes by type and computes counts.
   */
  const { additions, edits, removals, totalCount } = useMemo(() => {
    const validChanges = Array.isArray(changes) ? changes : [];

    const additionsList = validChanges.filter((c) => c.type === 'add');
    const editsList = validChanges.filter((c) => c.type === 'edit');
    const removalsList = validChanges.filter((c) => c.type === 'remove');

    return {
      additions: additionsList,
      edits: editsList,
      removals: removalsList,
      totalCount: validChanges.length,
    };
  }, [changes]);

  const hasAdditions = additions.length > 0;
  const hasEdits = edits.length > 0;
  const hasRemovals = removals.length > 0;
  const hasChanges = totalCount > 0;

  const resolvedAriaLabel = ariaLabel || 'Staged changes summary';

  const wrapperClasses = classNames(
    'w-full',
    className
  );

  return (
    <div
      role="region"
      aria-label={resolvedAriaLabel}
      className={wrapperClasses}
    >
      {title && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-medium text-body">
            {title}
          </h2>
          {hasChanges && (
            <div className="flex items-center gap-2">
              {hasAdditions && (
                <CountBadge
                  count={additions.length}
                  colorClasses="bg-green-100 text-green-800"
                />
              )}
              {hasEdits && (
                <CountBadge
                  count={edits.length}
                  colorClasses="bg-amber-100 text-amber-800"
                />
              )}
              {hasRemovals && (
                <CountBadge
                  count={removals.length}
                  colorClasses="bg-red-100 text-red-800"
                />
              )}
              <span className="text-xs text-gray-500">
                {totalCount} {totalCount === 1 ? 'change' : 'changes'} total
              </span>
            </div>
          )}
        </div>
      )}

      {!hasChanges && showEmptyState && (
        <div className="rounded border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">
            {emptyMessage}
          </p>
        </div>
      )}

      {hasChanges && (
        <div className="space-y-6">
          {hasAdditions && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-medium text-green-800">
                  Additions
                </h3>
                <CountBadge
                  count={additions.length}
                  colorClasses="bg-green-100 text-green-800"
                />
              </div>
              <div
                className="space-y-2"
                role="list"
                aria-label="Added signers"
              >
                {additions.map((change) => (
                  <AdditionItem key={change.id} change={change} />
                ))}
              </div>
            </div>
          )}

          {hasEdits && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-medium text-amber-800">
                  Edits
                </h3>
                <CountBadge
                  count={edits.length}
                  colorClasses="bg-amber-100 text-amber-800"
                />
              </div>
              <div
                className="space-y-2"
                role="list"
                aria-label="Edited signers"
              >
                {edits.map((change) => (
                  <EditItem key={change.id} change={change} />
                ))}
              </div>
            </div>
          )}

          {hasRemovals && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-medium text-red-800">
                  Removals
                </h3>
                <CountBadge
                  count={removals.length}
                  colorClasses="bg-red-100 text-red-800"
                />
              </div>
              <div
                className="space-y-2"
                role="list"
                aria-label="Removed signers"
              >
                {removals.map((change) => (
                  <RemovalItem key={change.id} change={change} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ChangesSummary.propTypes = {
  changes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['add', 'edit', 'remove']).isRequired,
      accountId: PropTypes.string,
      signerId: PropTypes.string,
      before: PropTypes.object,
      after: PropTypes.object,
      timestamp: PropTypes.string,
    })
  ).isRequired,
  title: PropTypes.string,
  showEmptyState: PropTypes.bool,
  emptyMessage: PropTypes.string,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default ChangesSummary;