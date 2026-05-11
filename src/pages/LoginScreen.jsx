import { useState, useCallback, useEffect } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import Alert from '@/components/Alert';
import { isAccountLocked, getLoginAttempts, resetLoginAttempts } from '@/services/AuthService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';
import { RATE_LIMIT_CONFIG } from '@/utils/constants';
import messages from '@/data/messages.json';

/**
 * Validates the login form fields.
 * @param {string} username - The username value
 * @param {string} password - The password value
 * @returns {{ valid: boolean, errors: Object<string, string> }}
 */
function validateLoginForm(username, password) {
  const errors = {};

  if (!username || typeof username !== 'string' || username.trim() === '') {
    errors.username = 'Username is required.';
  }

  if (!password || typeof password !== 'string' || password.trim() === '') {
    errors.password = 'Password is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * LoginScreenContent component containing the login form logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function LoginScreenContent() {
  const { goToStep, completeStep } = useNavigation();
  const { login } = useSession();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  /**
   * Unlocks the account by resetting login attempts.
   * Only for demo/testing purposes.
   */
  const handleUnlock = useCallback(() => {
    const targetUser = username.trim() || 'maria.gonzalez@acmecorp.com';
    resetLoginAttempts(targetUser);
    setIsLocked(false);
    setAttemptsRemaining(RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS);
    setServerError(null);
    
    logEvent(
      targetUser,
      AUDIT_EVENT_TYPES.OTP_VERIFIED, // Using closest event type for 'reset' action
      { action: 'manual_unlock', username: targetUser },
      AUDIT_OUTCOMES.SUCCESS
    );
  }, [username]);


  /**
   * Validates a single field and returns the error message or null.
   * @param {string} fieldName - The field name to validate
   * @param {string} value - The field value
   * @returns {string|null}
   */
  const validateField = useCallback((fieldName, value) => {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      if (fieldName === 'username') {
        return 'Username is required.';
      }
      if (fieldName === 'password') {
        return 'Password is required.';
      }
    }
    return null;
  }, []);

  /**
   * Handles username input change.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event
   */
  const handleUsernameChange = useCallback((event) => {
    const { value } = event.target;
    setUsername(value);
    setServerError(null);

    if (touched.username || formSubmitted) {
      const fieldError = validateField('username', value);
      setErrors((prev) => {
        const updated = { ...prev };
        if (fieldError) {
          updated.username = fieldError;
        } else {
          delete updated.username;
        }
        return updated;
      });
    }
  }, [touched, formSubmitted, validateField]);

  /**
   * Handles password input change.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event
   */
  const handlePasswordChange = useCallback((event) => {
    const { value } = event.target;
    setPassword(value);
    setServerError(null);

    if (touched.password || formSubmitted) {
      const fieldError = validateField('password', value);
      setErrors((prev) => {
        const updated = { ...prev };
        if (fieldError) {
          updated.password = fieldError;
        } else {
          delete updated.password;
        }
        return updated;
      });
    }
  }, [touched, formSubmitted, validateField]);

  /**
   * Handles blur event on form fields.
   * @param {React.FocusEvent<HTMLInputElement>} event - The blur event
   */
  const handleBlur = useCallback((event) => {
    const { name, value } = event.target;

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    const fieldError = validateField(name, value);
    setErrors((prev) => {
      const updated = { ...prev };
      if (fieldError) {
        updated[name] = fieldError;
      } else {
        delete updated[name];
      }
      return updated;
    });
  }, [validateField]);

  /**
   * Handles form submission. Validates fields, calls AuthService.login,
   * and handles success/failure responses.
   * @param {React.FormEvent<HTMLFormElement>} event - The form event
   */
  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setFormSubmitted(true);
    setServerError(null);

    setTouched({
      username: true,
      password: true,
    });

    const validation = validateLoginForm(username, password);

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const result = await login(username, password);

      if (result.success) {
        logEvent(
          username,
          AUDIT_EVENT_TYPES.LOGIN_SUCCESS,
          { username: username.trim() },
          AUDIT_OUTCOMES.SUCCESS
        );

        setLoading(false);
        completeStep('login');
        goToStep('verify');
      } else {
        setLoading(false);

        if (result.locked) {
          setIsLocked(true);
          setAttemptsRemaining(0);
          setServerError(null);
        } else {
          setIsLocked(false);

          if (result.attemptsRemaining !== undefined && result.attemptsRemaining !== null) {
            setAttemptsRemaining(result.attemptsRemaining);
          }

          setServerError(result.error || messages.errors.invalidCredentials.message);
        }
      }
    } catch (error) {
      setLoading(false);
      setServerError(messages.errors.serverError.message);

      logEvent(
        username,
        AUDIT_EVENT_TYPES.LOGIN_FAILURE,
        { username: username.trim(), reason: 'Unexpected error' },
        AUDIT_OUTCOMES.FAILURE
      );
    }
  }, [username, password, login, completeStep, goToStep]);

  /**
   * Determines whether the submit button should be disabled.
   */
  const isSubmitDisabled = loading || isLocked ||
    !username || username.trim() === '' ||
    !password || password.trim() === '';

  /**
   * Builds the attempts remaining warning message.
   * @returns {string|null}
   */
  const getAttemptsWarningMessage = useCallback(() => {
    if (attemptsRemaining === null || attemptsRemaining === undefined) {
      return null;
    }

    if (attemptsRemaining <= 0) {
      return null;
    }

    const key = String(attemptsRemaining);
    if (messages.login.attemptsRemaining && messages.login.attemptsRemaining[key]) {
      return messages.login.attemptsRemaining[key];
    }

    return `You have ${attemptsRemaining} login attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`;
  }, [attemptsRemaining]);

  const attemptsWarning = getAttemptsWarningMessage();

  return (
    <PageLayout
      title="Sign In"
      subtitle="Enter your credentials to access your account."
      showProgress={true}
      visibleSteps={['welcome', 'login', 'verify', 'tokenValidation', 'accountSelection']}
      showSessionTimeout={false}
      ariaLabel="Login page"
    >
      <div className="mx-auto max-w-md">
        {isLocked && (
          <div className="mb-6">
            <Alert
              message={
                <div>
                  {messages.errors.accountLocked.message}
                  <button 
                    type="button"
                    onClick={handleUnlock}
                    className="block mt-2 text-sm font-bold underline hover:no-underline text-red-800 transition-colors duration-200"
                    aria-label="Reset account for demo"
                  >
                    Reset Account (Demo Only)
                  </button>
                </div>
              }
              title={messages.errors.accountLocked.title}
              variant="critical"
              ariaLabel="Account locked alert"
            />
          </div>
        )}

        {serverError && !isLocked && (
          <div className="mb-6">
            <Alert
              message={serverError}
              title={messages.errors.invalidCredentials.title}
              variant="critical"
              dismissible={true}
              onDismiss={() => setServerError(null)}
              ariaLabel="Login error alert"
            />
          </div>
        )}

        {attemptsWarning && !isLocked && (
          <div className="mb-6">
            <Alert
              message={attemptsWarning}
              variant="warning"
              ariaLabel="Login attempts warning"
            />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label="Login form"
          className="space-y-5"
        >
          <FormField
            label="Username"
            name="username"
            value={username}
            onChange={handleUsernameChange}
            onBlur={handleBlur}
            error={touched.username || formSubmitted ? errors.username : undefined}
            required={true}
            type="text"
            autoComplete="username"
            disabled={isLocked || loading}
          />

          <FormField
            label="Password"
            name="password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={handleBlur}
            error={touched.password || formSubmitted ? errors.password : undefined}
            required={true}
            type="password"
            showPasswordToggle={true}
            autoComplete="current-password"
            disabled={isLocked || loading}
          />

          <div className="pt-2">
            <Button
              variant="primary"
              type="submit"
              loading={loading}
              disabled={isSubmitDisabled}
              ariaLabel="Sign In"
              className="w-full"
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center flex flex-col gap-2">
          <button
            type="button"
            className="text-sm text-primary-blue underline transition-colors duration-200 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 rounded"
            aria-label="Forgot password"
            onClick={() => {
              // Placeholder — no action in MVP
            }}
          >
            Forgot Password?
          </button>
          <div className="mt-2 p-3 rounded bg-blue-50 border border-blue-100 text-xs text-gray-700" aria-label="Test credentials">
            <div className="font-semibold mb-1 text-primary-blue">Test Login Credentials (for demo/testing):</div>
            <div>Email: <span className="font-mono">maria.gonzalez@acmecorp.com</span></div>
            <div>Password: <span className="font-mono">Password@123</span></div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

/**
 * LoginScreen page component (Step 2 of the workflow).
 * Provides a secure login form with username and password fields,
 * floating labels, show/hide password toggle, form validation,
 * rate-limited login attempts, lockout messaging, and audit logging.
 * Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function LoginScreen() {
  return (
    <ErrorBoundary>
      <LoginScreenContent />
    </ErrorBoundary>
  );
}

export default LoginScreen;