import accounts from '@/data/accounts.json';
import { maskAccountNumber } from '@/utils/masking';

/**
 * @typedef {Object} Account
 * @property {string} id - Unique account identifier
 * @property {string} name - Account display name
 * @property {string} fullAccountNumber - Full account number (unmasked)
 * @property {string} maskedAccountNumber - Masked account number for display
 * @property {string} accountType - Type of account (checking, savings, money market)
 * @property {number} signerCount - Number of authorized signers on the account
 * @property {string} controllingPartyId - ID of the controlling party (user)
 */

/**
 * @typedef {Object} PaginatedAccountsResult
 * @property {Account[]} accounts - Array of account objects for the current page
 * @property {number} page - Current page number (1-based)
 * @property {number} pageSize - Number of items per page
 * @property {number} totalItems - Total number of accounts
 * @property {number} totalPages - Total number of pages
 */

/**
 * Applies account number masking to an account object.
 * Returns a new object with the maskedAccountNumber field updated.
 * @param {Object} account - The raw account object
 * @returns {Account} A new account object with masked account number
 */
function applyMasking(account) {
  if (!account || typeof account !== 'object') {
    return account;
  }

  return {
    ...account,
    maskedAccountNumber: maskAccountNumber(account.fullAccountNumber),
  };
}

/**
 * Retrieves all accounts for a given controlling party (user) with masked account numbers.
 * @param {string} controllingPartyId - The controlling party (user) ID to filter by
 * @returns {Account[]} Array of account objects with masked account numbers
 */
export function getAccounts(controllingPartyId) {
  if (!controllingPartyId || typeof controllingPartyId !== 'string') {
    return [];
  }

  const trimmedId = controllingPartyId.trim();

  if (trimmedId === '') {
    return [];
  }

  const filtered = accounts.filter(
    (account) => account.controllingPartyId === trimmedId
  );

  return filtered.map(applyMasking);
}

/**
 * Retrieves a single account by its ID with masked account number.
 * @param {string} accountId - The account ID to look up
 * @returns {Account|null} The account object with masked account number, or null if not found
 */
export function getAccountById(accountId) {
  if (!accountId || typeof accountId !== 'string') {
    return null;
  }

  const trimmedId = accountId.trim();

  if (trimmedId === '') {
    return null;
  }

  const account = accounts.find((a) => a.id === trimmedId);

  if (!account) {
    return null;
  }

  return applyMasking(account);
}

/**
 * Retrieves a paginated list of accounts for a given controlling party (user).
 * @param {string} controllingPartyId - The controlling party (user) ID to filter by
 * @param {number} [page=1] - The page number (1-based)
 * @param {number} [pageSize=10] - The number of items per page
 * @returns {PaginatedAccountsResult} Paginated result with accounts and metadata
 */
export function getAccountsPaginated(controllingPartyId, page = 1, pageSize = 10) {
  const allAccounts = getAccounts(controllingPartyId);

  const totalItems = allAccounts.length;

  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safePageSize = Math.max(1, Math.floor(Number(pageSize) || 10));

  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));

  const clampedPage = Math.min(safePage, totalPages);

  const startIndex = (clampedPage - 1) * safePageSize;
  const endIndex = startIndex + safePageSize;

  const paginatedAccounts = allAccounts.slice(startIndex, endIndex);

  return {
    accounts: paginatedAccounts,
    page: clampedPage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
  };
}

const AccountService = {
  getAccounts,
  getAccountById,
  getAccountsPaginated,
};

export default AccountService;