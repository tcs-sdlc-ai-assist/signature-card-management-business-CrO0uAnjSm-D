import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { STEPS, STORAGE_KEYS } from '@/utils/constants';
import { getFromLocalStorage, setToLocalStorage } from '@/utils/helpers';
import { getSession, updateCurrentStep } from '@/services/SessionService';

/**
 * Maps workflow step names to their corresponding route paths.
 * @type {Object<string, string>}
 */
const STEP_ROUTES = {
  welcome: '/',
  login: '/login',
  verify: '/verify',
  tokenValidation: '/validate-token',
  accountSelection: '/select-account',
  signerManagement: '/manage-signers',
  addEditSigner: '/add-signer',
  confirmSigners: '/confirm-signers',
  reviewSigners: '/review-signers',
  submission: '/submission-confirmation',
};

/**
 * @typedef {Object} NavigationState
 * @property {string} currentStep - The current workflow step
 * @property {string[]} completedSteps - Array of completed step names
 * @property {boolean} canNavigateBack - Whether backward navigation is allowed
 * @property {boolean} canNavigateForward - Whether forward navigation is allowed
 * @property {Function} goToStep - Navigate to a specific step
 * @property {Function} goBack - Navigate to the previous step
 * @property {Function} goForward - Navigate to the next step
 * @property {Function} resetNavigation - Reset navigation to the initial state
 * @property {Function} completeStep - Mark a step as completed
 * @property {number} currentStepIndex - The index of the current step in the STEPS array
 * @property {number} totalSteps - The total number of steps
 */

const NAVIGATION_STATE_KEY = 'scm_navigation_state';

/**
 * @type {React.Context<NavigationState|null>}
 */
const NavigationContext = createContext(null);

/**
 * Retrieves persisted navigation state from localStorage.
 * @returns {{ currentStep: string, completedSteps: string[] } | null}
 */
function getPersistedNavigationState() {
  const stored = getFromLocalStorage(NAVIGATION_STATE_KEY);
  if (!stored || typeof stored !== 'object') {
    return null;
  }
  return stored;
}

/**
 * Persists navigation state to localStorage.
 * @param {string} currentStep - The current step
 * @param {string[]} completedSteps - Array of completed step names
 */
function persistNavigationState(currentStep, completedSteps) {
  setToLocalStorage(NAVIGATION_STATE_KEY, {
    currentStep,
    completedSteps,
  });
}

/**
 * Determines the initial step from session or persisted state.
 * @returns {{ currentStep: string, completedSteps: string[] }}
 */
function getInitialState() {
  const session = getSession();
  const persisted = getPersistedNavigationState();

  let currentStep = STEPS[0];
  let completedSteps = [];

  if (persisted && persisted.currentStep && STEPS.includes(persisted.currentStep)) {
    currentStep = persisted.currentStep;
    completedSteps = Array.isArray(persisted.completedSteps)
      ? persisted.completedSteps.filter((s) => STEPS.includes(s))
      : [];
  } else if (session && session.currentStep && STEPS.includes(session.currentStep)) {
    currentStep = session.currentStep;
  }

  return { currentStep, completedSteps };
}

/**
 * NavigationProvider component that manages workflow navigation state.
 * Enforces step ordering rules: no forward skipping, backward allowed to completed steps.
 * Persists navigation state in session and localStorage.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 */
export function NavigationProvider({ children }) {
  const navigate = useNavigate();
  const initialState = useMemo(() => getInitialState(), []);

  const [currentStep, setCurrentStep] = useState(initialState.currentStep);
  const [completedSteps, setCompletedSteps] = useState(initialState.completedSteps);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const totalSteps = STEPS.length;

  useEffect(() => {
    persistNavigationState(currentStep, completedSteps);
    updateCurrentStep(currentStep);
  }, [currentStep, completedSteps]);

  /**
   * Marks a step as completed if it is not already.
   * @param {string} step - The step name to mark as completed
   */
  const completeStep = useCallback((step) => {
    if (!step || typeof step !== 'string' || !STEPS.includes(step)) {
      return;
    }

    setCompletedSteps((prev) => {
      if (prev.includes(step)) {
        return prev;
      }
      return [...prev, step];
    });
  }, []);

  /**
   * Navigates to a specific step, enforcing ordering rules.
   * Forward navigation is only allowed to the next uncompleted step or a completed step.
   * Backward navigation is allowed to any completed step or any step before the current one.
   * @param {string} step - The step name to navigate to
   * @returns {boolean} True if navigation was successful
   */
  const goToStep = useCallback((step) => {
    if (!step || typeof step !== 'string') {
      return false;
    }

    const trimmedStep = step.trim();

    if (!STEPS.includes(trimmedStep)) {
      return false;
    }

    if (trimmedStep === currentStep) {
      return true;
    }

    const targetIndex = STEPS.indexOf(trimmedStep);
    const currentIndex = STEPS.indexOf(currentStep);

    if (targetIndex < currentIndex) {
      setCurrentStep(trimmedStep);
      if (STEP_ROUTES[trimmedStep]) {
        navigate(STEP_ROUTES[trimmedStep]);
      }
      return true;
    }

    if (targetIndex === currentIndex + 1) {
      setCurrentStep(trimmedStep);
      if (STEP_ROUTES[trimmedStep]) {
        navigate(STEP_ROUTES[trimmedStep]);
      }
      return true;
    }

    if (completedSteps.includes(trimmedStep)) {
      setCurrentStep(trimmedStep);
      if (STEP_ROUTES[trimmedStep]) {
        navigate(STEP_ROUTES[trimmedStep]);
      }
      return true;
    }

    const allPriorCompleted = STEPS.slice(currentIndex, targetIndex).every(
      (s) => completedSteps.includes(s) || s === currentStep
    );

    if (allPriorCompleted) {
      setCurrentStep(trimmedStep);
      if (STEP_ROUTES[trimmedStep]) {
        navigate(STEP_ROUTES[trimmedStep]);
      }
      return true;
    }

    return false;
  }, [currentStep, completedSteps, navigate]);

  /**
   * Navigates to the previous step in the workflow.
   * @returns {boolean} True if navigation was successful
   */
  const goBack = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);

    if (currentIndex <= 0) {
      return false;
    }

    const previousStep = STEPS[currentIndex - 1];
    setCurrentStep(previousStep);
    if (STEP_ROUTES[previousStep]) {
      navigate(STEP_ROUTES[previousStep]);
    }
    return true;
  }, [currentStep, navigate]);

  /**
   * Navigates to the next step in the workflow.
   * Only allowed if the current step is completed or is the immediate next step.
   * @returns {boolean} True if navigation was successful
   */
  const goForward = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);

    if (currentIndex >= STEPS.length - 1) {
      return false;
    }

    const nextStep = STEPS[currentIndex + 1];
    setCurrentStep(nextStep);
    if (STEP_ROUTES[nextStep]) {
      navigate(STEP_ROUTES[nextStep]);
    }
    return true;
  }, [currentStep, navigate]);

  /**
   * Resets navigation to a specific step and clears any completed steps after it.
   */
  const resetToStep = useCallback((stepName) => {
    if (!STEPS.includes(stepName)) return;
    
    const targetIndex = STEPS.indexOf(stepName);
    setCurrentStep(stepName);
    
    // Keep only steps completed BEFORE the target step
    setCompletedSteps((prev) => {
      const newCompleted = prev.filter(s => STEPS.indexOf(s) < targetIndex);
      persistNavigationState(stepName, newCompleted);
      return newCompleted;
    });
    
    updateCurrentStep(stepName);
    if (STEP_ROUTES[stepName]) {
      navigate(STEP_ROUTES[stepName]);
    }
  }, [navigate]);

  /**
   * Resets navigation to the initial welcome step and clears completed steps.
   */
  const resetNavigation = useCallback(() => {
    resetToStep(STEPS[0]);
  }, [resetToStep]);

  const canNavigateBack = currentStepIndex > 0;
  const canNavigateForward = currentStepIndex < STEPS.length - 1;

  const value = useMemo(() => ({
    currentStep,
    completedSteps,
    canNavigateBack,
    canNavigateForward,
    goToStep,
    goBack,
    goForward,
    resetNavigation,
    resetToStep,
    completeStep,
    currentStepIndex,
    totalSteps,
  }), [
    currentStep,
    completedSteps,
    canNavigateBack,
    canNavigateForward,
    goToStep,
    goBack,
    goForward,
    resetNavigation,
    resetToStep,
    completeStep,
    currentStepIndex,
    totalSteps,
  ]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

NavigationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Custom hook to consume the NavigationContext.
 * Must be used within a NavigationProvider.
 * @returns {NavigationState} The navigation state and actions
 * @throws {Error} If used outside of a NavigationProvider
 */
export function useNavigation() {
  const context = useContext(NavigationContext);

  if (context === null) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }

  return context;
}

export default NavigationContext;