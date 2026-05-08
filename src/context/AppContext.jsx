import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { NavigationProvider, useNavigation } from '@/context/NavigationContext';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { getFromLocalStorage, setToLocalStorage } from '@/utils/helpers';
import { STORAGE_KEYS } from '@/utils/constants';

/**
 * @typedef {Object} AppState
 * @property {Object|null} selectedAccount - The currently selected account
 * @property {Array<Object>} stagedChanges - Array of staged signer changes
 * @property {Function} setSelectedAccount - Set the selected account
 * @property {Function} clearSelectedAccount - Clear the selected account
 * @property {Function} setStagedChanges - Set the staged changes array
 * @property {Function} addStagedChange - Add a single staged change
 * @property {Function} clearStagedChanges - Clear all staged changes
 */

/**
 * @type {React.Context<AppState|null>}
 */
const AppContext = createContext(null);

/**
 * localStorage key for staged changes managed by AppContext.
 * @type {string}
 */
const APP_STAGED_CHANGES_KEY = 'scm_staged_changes';

/**
 * Inner provider component that manages selectedAccount and stagedChanges state.
 * Must be rendered inside NavigationProvider and SessionProvider so that
 * useNavigation and useSession are available to consumers.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 */
function AppStateProvider({ children }) {
  const [selectedAccount, setSelectedAccountState] = useState(() => {
    return getFromLocalStorage(STORAGE_KEYS.SELECTED_ACCOUNT) || null;
  });

  const [stagedChanges, setStagedChangesState] = useState(() => {
    const stored = getFromLocalStorage(APP_STAGED_CHANGES_KEY);
    return Array.isArray(stored) ? stored : [];
  });

  /**
   * Sets the selected account and persists it to localStorage.
   * @param {Object|null} account - The account to select
   */
  const setSelectedAccount = useCallback((account) => {
    setSelectedAccountState(account);
    if (account) {
      setToLocalStorage(STORAGE_KEYS.SELECTED_ACCOUNT, account);
    } else {
      setToLocalStorage(STORAGE_KEYS.SELECTED_ACCOUNT, null);
    }
  }, []);

  /**
   * Clears the selected account from state and localStorage.
   */
  const clearSelectedAccount = useCallback(() => {
    setSelectedAccountState(null);
    setToLocalStorage(STORAGE_KEYS.SELECTED_ACCOUNT, null);
  }, []);

  /**
   * Sets the staged changes array and persists it to localStorage.
   * @param {Array<Object>} changes - The staged changes array
   */
  const setStagedChanges = useCallback((changes) => {
    const validChanges = Array.isArray(changes) ? changes : [];
    setStagedChangesState(validChanges);
    setToLocalStorage(APP_STAGED_CHANGES_KEY, validChanges);
  }, []);

  /**
   * Adds a single staged change to the array and persists to localStorage.
   * @param {Object} change - The staged change to add
   */
  const addStagedChange = useCallback((change) => {
    if (!change || typeof change !== 'object') {
      return;
    }

    setStagedChangesState((prev) => {
      const updated = [...prev, change];
      setToLocalStorage(APP_STAGED_CHANGES_KEY, updated);
      return updated;
    });
  }, []);

  /**
   * Clears all staged changes from state and localStorage.
   */
  const clearStagedChanges = useCallback(() => {
    setStagedChangesState([]);
    setToLocalStorage(APP_STAGED_CHANGES_KEY, []);
  }, []);

  const value = useMemo(() => ({
    selectedAccount,
    stagedChanges,
    setSelectedAccount,
    clearSelectedAccount,
    setStagedChanges,
    addStagedChange,
    clearStagedChanges,
  }), [
    selectedAccount,
    stagedChanges,
    setSelectedAccount,
    clearSelectedAccount,
    setStagedChanges,
    addStagedChange,
    clearStagedChanges,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

AppStateProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * AppProvider component that composes NavigationProvider, SessionProvider,
 * and AppStateProvider into a single wrapper for the application root.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 */
export function AppProvider({ children }) {
  return (
    <SessionProvider>
      <NavigationProvider>
        <AppStateProvider>
          {children}
        </AppStateProvider>
      </NavigationProvider>
    </SessionProvider>
  );
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Custom hook to consume the AppContext.
 * Must be used within an AppProvider.
 * @returns {AppState} The application state and actions
 * @throws {Error} If used outside of an AppProvider
 */
export function useApp() {
  const context = useContext(AppContext);

  if (context === null) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
}

export default AppContext;