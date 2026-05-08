import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import SignerManagementScreen from '@/pages/SignerManagementScreen';
import { createSession } from '@/services/SessionService';
import { resetSignersData, clearStagedChanges, getSigners } from '@/services/SignerService';
import { clearAllRateLimits } from '@/services/RateLimitService';
import { setToLocalStorage } from '@/utils/helpers';
import { STORAGE_KEYS } from '@/utils/constants';

/**
 * Sets up a fully authenticated and verified session with a selected account.
 * @param {string} [accountId='ACCT-1001'] - The account ID to select
 */
function setupAuthenticatedSession(accountId = 'ACCT-1001') {
  createSession('USR-001', 'jsmith');

  const userData = {
    userId: 'USR-001',
    username: 'jsmith',
    isVerified: true,
    isTokenValidated: true,
  };
  setToLocalStorage(STORAGE_KEYS.USER_DATA, userData);

  const selectedAccount = {
    id: accountId,
    name: 'Smith Enterprise Checking',
    fullAccountNumber: '4532891001',
    maskedAccountNumber: '******1001',
    accountType: 'checking',
    signerCount: 2,
    controllingPartyId: 'USR-001',
  };
  setToLocalStorage(STORAGE_KEYS.SELECTED_ACCOUNT, selectedAccount);
}

/**
 * Sets up a session with ACCT-1003 which has signers with mixed statuses.
 */
function setupSessionWithMixedStatuses() {
  createSession('USR-001', 'jsmith');

  const userData = {
    userId: 'USR-001',
    username: 'jsmith',
    isVerified: true,
    isTokenValidated: true,
  };
  setToLocalStorage(STORAGE_KEYS.USER_DATA, userData);

  const selectedAccount = {
    id: 'ACCT-1003',
    name: 'Smith Money Market Reserve',
    fullAccountNumber: '4532891003',
    maskedAccountNumber: '******1003',
    accountType: 'money market',
    signerCount: 3,
    controllingPartyId: 'USR-001',
  };
  setToLocalStorage(STORAGE_KEYS.SELECTED_ACCOUNT, selectedAccount);
}

/**
 * Wraps the SignerManagementScreen component with required providers for testing.
 * @returns {React.ReactElement}
 */
function renderSignerManagementScreen() {
  return render(
    <AppProvider>
      <BrowserRouter>
        <SignerManagementScreen />
      </BrowserRouter>
    </AppProvider>
  );
}

describe('SignerManagementScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSignersData();
    clearStagedChanges();
    clearAllRateLimits();
  });

  describe('rendering', () => {
    it('renders the page title', () => {
      setupAuthenticatedSession();
      renderSignerManagementScreen();

      expect(screen.getByText('Manage Authorized Signers')).toBeInTheDocument();
    });

    it('renders the signer list for the selected account', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
        expect(screen.getByText('Sarah Anne Smith')).toBeInTheDocument();
      });
    });

    it('displays the signer count', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText(/2 signers on this account/i)).toBeInTheDocument();
      });
    });

    it('renders the Add Signer button', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add signer/i });
        expect(addButton).toBeInTheDocument();
      });
    });

    it('renders filter and sort controls', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByLabelText(/search signers by name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter signers by status/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort signers/i)).toBeInTheDocument();
      });
    });

    it('renders the Continue button', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        const continueButton = screen.getByRole('button', { name: /continue/i });
        expect(continueButton).toBeInTheDocument();
      });
    });

    it('renders the Back button', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeInTheDocument();
      });
    });

    it('renders the Cancel button', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(cancelButton).toBeInTheDocument();
      });
    });

    it('displays account name in the subtitle', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText(/Smith Enterprise Checking/i)).toBeInTheDocument();
      });
    });

    it('shows error when no account is selected', async () => {
      createSession('USR-001', 'jsmith');
      const userData = {
        userId: 'USR-001',
        username: 'jsmith',
        isVerified: true,
        isTokenValidated: true,
      };
      setToLocalStorage(STORAGE_KEYS.USER_DATA, userData);

      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText(/no account selected/i)).toBeInTheDocument();
      });
    });
  });

  describe('signer list with mixed statuses', () => {
    it('renders signers with different statuses for ACCT-1003', async () => {
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
        expect(screen.getByText(/David/)).toBeInTheDocument();
        expect(screen.getByText(/Emily/)).toBeInTheDocument();
      });
    });

    it('displays status badges for signers', async () => {
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Locked')).toBeInTheDocument();
      });
    });

    it('displays correct signer count for ACCT-1003', async () => {
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText(/3 signers on this account/i)).toBeInTheDocument();
      });
    });
  });

  describe('filtering by name', () => {
    it('filters signers by first name', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
        expect(screen.getByText('Sarah Anne Smith')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText(/search signers by name/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
        expect(screen.queryByText('Sarah Anne Smith')).not.toBeInTheDocument();
      });
    });

    it('filters signers by last name', async () => {
      const user = userEvent.setup();
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText(/Chen/)).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText(/search signers by name/i);
      await user.type(searchInput, 'Chen');

      await waitFor(() => {
        expect(screen.getByText(/Chen/)).toBeInTheDocument();
        expect(screen.queryByText(/Turner/)).not.toBeInTheDocument();
      });
    });

    it('shows empty state when no signers match search', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText(/search signers by name/i);
      await user.type(searchInput, 'Nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/no signers match/i)).toBeInTheDocument();
      });
    });

    it('clears search and shows all signers again', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText(/search signers by name/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.queryByText('Sarah Anne Smith')).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
        expect(screen.getByText('Sarah Anne Smith')).toBeInTheDocument();
      });
    });
  });

  describe('filtering by status', () => {
    it('filters signers by active status', async () => {
      const user = userEvent.setup();
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filter signers by status/i);
      await user.selectOptions(statusFilter, 'active');

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
        expect(screen.queryByText(/David/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Emily/)).not.toBeInTheDocument();
      });
    });

    it('filters signers by pending status', async () => {
      const user = userEvent.setup();
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText(/David/)).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filter signers by status/i);
      await user.selectOptions(statusFilter, 'pending');

      await waitFor(() => {
        expect(screen.getByText(/David/)).toBeInTheDocument();
        expect(screen.queryByText('John Robert Smith')).not.toBeInTheDocument();
        expect(screen.queryByText(/Emily/)).not.toBeInTheDocument();
      });
    });

    it('filters signers by locked status', async () => {
      const user = userEvent.setup();
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText(/Emily/)).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filter signers by status/i);
      await user.selectOptions(statusFilter, 'locked');

      await waitFor(() => {
        expect(screen.getByText(/Emily/)).toBeInTheDocument();
        expect(screen.queryByText('John Robert Smith')).not.toBeInTheDocument();
        expect(screen.queryByText(/David/)).not.toBeInTheDocument();
      });
    });

    it('shows all signers when filter is set to all', async () => {
      const user = userEvent.setup();
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filter signers by status/i);
      await user.selectOptions(statusFilter, 'active');

      await waitFor(() => {
        expect(screen.queryByText(/David/)).not.toBeInTheDocument();
      });

      await user.selectOptions(statusFilter, 'all');

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
        expect(screen.getByText(/David/)).toBeInTheDocument();
        expect(screen.getByText(/Emily/)).toBeInTheDocument();
      });
    });
  });

  describe('sorting', () => {
    it('sorts signers by name A-Z by default', async () => {
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      });

      const sortSelect = screen.getByLabelText(/sort signers/i);
      expect(sortSelect.value).toBe('name-asc');
    });

    it('sorts signers by name Z-A', async () => {
      const user = userEvent.setup();
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort signers/i);
      await user.selectOptions(sortSelect, 'name-desc');

      await waitFor(() => {
        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });

    it('sorts signers by status', async () => {
      const user = userEvent.setup();
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort signers/i);
      await user.selectOptions(sortSelect, 'status');

      await waitFor(() => {
        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });

    it('sorts signers by date added', async () => {
      const user = userEvent.setup();
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort signers/i);
      await user.selectOptions(sortSelect, 'date-added');

      await waitFor(() => {
        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('signer card actions', () => {
    it('renders Edit button on active signer cards', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('renders Remove button on signer cards when not last signer', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        const removeButtons = screen.getAllByRole('button', { name: /remove/i });
        expect(removeButtons.length).toBeGreaterThan(0);
      });
    });

    it('renders Unlock button for locked signers', async () => {
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        const unlockButtons = screen.getAllByRole('button', { name: /unlock/i });
        expect(unlockButtons.length).toBeGreaterThan(0);
      });
    });

    it('renders Resend button for pending signers', async () => {
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        const resendButtons = screen.getAllByRole('button', { name: /resend/i });
        expect(resendButtons.length).toBeGreaterThan(0);
      });
    });

    it('opens remove confirmation modal when Remove is clicked', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Remove Signer')).toBeInTheDocument();
      });
    });

    it('closes remove modal when Cancel is clicked', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Remove Signer')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to remove/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('signer removal', () => {
    it('removes a signer and shows success message', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
        expect(screen.getByText('Sarah Anne Smith')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove john/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Remove Signer')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /remove signer/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/has been removed/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('shows empty state message when account has no signers matching filter', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filter signers by status/i);
      await user.selectOptions(statusFilter, 'locked');

      await waitFor(() => {
        expect(screen.getByText(/no signers match/i)).toBeInTheDocument();
      });
    });
  });

  describe('showing count information', () => {
    it('displays showing count text', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText(/showing 2 of 2/i)).toBeInTheDocument();
      });
    });

    it('updates showing count after filtering', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText(/showing 2 of 2/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText(/search signers by name/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText(/showing 1 of 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('single signer account', () => {
    it('does not show Remove button when only one signer exists', async () => {
      setupAuthenticatedSession('ACCT-1002');

      const selectedAccount = {
        id: 'ACCT-1002',
        name: 'Smith Business Savings',
        fullAccountNumber: '4532891002',
        maskedAccountNumber: '******1002',
        accountType: 'savings',
        signerCount: 1,
        controllingPartyId: 'USR-001',
      };
      setToLocalStorage(STORAGE_KEYS.SELECTED_ACCOUNT, selectedAccount);

      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/1 signer on this account/i)).toBeInTheDocument();
      });

      const removeButtons = screen.queryAllByRole('button', { name: /remove/i });
      expect(removeButtons.length).toBe(0);
    });
  });

  describe('combined filter and search', () => {
    it('applies both search and status filter together', async () => {
      const user = userEvent.setup();
      setupSessionWithMixedStatuses();
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filter signers by status/i);
      await user.selectOptions(statusFilter, 'active');

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
        expect(screen.queryByText(/David/)).not.toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText(/search signers by name/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Robert Smith')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('renders the signer list with proper list role', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        const list = screen.getByRole('list', { name: /authorized signers list/i });
        expect(list).toBeInTheDocument();
      });
    });

    it('renders signer cards as list items', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });

    it('renders search controls with proper aria labels', async () => {
      setupAuthenticatedSession('ACCT-1001');
      renderSignerManagementScreen();

      await waitFor(() => {
        expect(screen.getByRole('search', { name: /filter and sort signers/i })).toBeInTheDocument();
      });
    });
  });
});