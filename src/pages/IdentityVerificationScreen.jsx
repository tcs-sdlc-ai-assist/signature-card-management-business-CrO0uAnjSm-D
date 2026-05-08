import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useSession } from '@/context/SessionContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageLayout from '@/components/PageLayout';
import Button from '@/components/Button';
import Alert from '@/components/Alert';
import { sendOTP, verifyOTP, getVerificationState, resetVerificationState } from '@/services/VerificationService';
import { logEvent, AUDIT_EVENT_TYPES, AUDIT_OUTCOMES } from '@/services/AuditService';
import { RATE_LIMIT_CONFIG, OTP_CONFIG } from '@/utils/constants';
import messages from '@/data/messages.json';

/**
 * Formats seconds into a human-readable MM:SS string.
 * @param {number} seconds - The number of seconds
 * @returns {string} Formatted time string (e.g., "4:30")
 */
function formatTime(seconds) {
  if (!seconds || typeof seconds !== 'number' || seconds <= 0) {
    return '0:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * DeliveryMethodCard component for displaying an OTP delivery method option.
 *
 * @param {Object} props
 * @param {string} props.method - The delivery method ('email' or 'sms')
 * @param {string} props.label - The display label
 * @param {string} props.maskedContact - The masked contact info
 * @param {boolean} props.selected - Whether this method is currently selected
 * @param {Function} props.onSelect - Callback invoked when the method is selected
 * @param {boolean} props.disabled - Whether the option is disabled
 * @returns {React.ReactElement}
 */
function DeliveryMethodCard({ method, label, maskedContact, selected, onSelect, disabled }) {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect(method);
    }
  }, [method, onSelect, disabled]);

  const handleKeyDown = useCallback((event) => {
    if (disabled) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(method);
    }
  }, [method, onSelect, disabled]);

  const cardClasses = [
    'flex items-center gap-3 rounded border p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2',
    selected ? 'border-primary-blue bg-blue-50 shadow-md ring-1 ring-primary-blue' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
  ].filter(Boolean).join(' ');

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cardClasses}
    >
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300">
        {selected && (
          <div className="h-2.5 w-2.5 rounded-full bg-primary-blue" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-body">{label}</p>
        <p className="text-xs text-gray-500">{maskedContact}</p>
      </div>
      {method === 'email' && (
        <svg
          className="h-5 w-5 flex-shrink-0 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
      )}
      {method === 'sms' && (
        <svg
          className="h-5 w-5 flex-shrink-0 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      )}
    </div>
  );
}

/**
 * OTPInput component for entering a 6-digit one-time passcode.
 *
 * @param {Object} props
 * @param {string} props.value - The current OTP value
 * @param {Function} props.onChange - Callback invoked when the OTP value changes
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} [props.error] - Validation error message
 * @param {boolean} [props.autoFocus=false] - Whether to auto-focus the input
 * @returns {React.ReactElement}
 */
function OTPInput({ value, onChange, disabled, error, autoFocus = false }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const hasError = typeof error === 'string' && error.length > 0;

  const handleChange = useCallback((event) => {
    const newValue = event.target.value.replace(/\D/g, '').slice(0, 6);
    if (typeof onChange === 'function') {
      onChange(newValue);
    }
  }, [onChange]);

  const inputClasses = [
    'w-full rounded border bg-white px-4 py-3 text-center text-2xl font-medium tracking-[0.5em] text-body outline-none transition-colors duration-200',
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
      : 'border-gray-300 focus:border-primary-blue focus:ring-1 focus:ring-primary-blue',
    disabled ? 'cursor-not-allowed bg-gray-50 opacity-60' : '',
  ].filter(Boolean).join(' ');

  return (
    <div>
      <label
        htmlFor="otp-input"
        className="mb-2 block text-sm font-medium text-body"
      >
        One-Time Passcode
      </label>
      <input
        ref={inputRef}
        id="otp-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="------"
        autoComplete="one-time-code"
        aria-label="Enter 6-digit one-time passcode"
        aria-invalid={hasError}
        aria-describedby={hasError ? 'otp-error' : undefined}
        className={inputClasses}
      />
      {hasError && (
        <p
          id="otp-error"
          className="invaliderr"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * IdentityVerificationScreenContent component containing the OTP verification logic.
 * Separated from the ErrorBoundary wrapper for clean error handling.
 *
 * @returns {React.ReactElement}
 */
function IdentityVerificationScreenContent() {
  const { goToStep, completeStep, resetNavigation } = useNavigation();
  const { currentUser, verify, logout } = useSession();

  const [deliveryMethod, setDeliveryMethod] = useState('email');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [otpExpiryRemaining, setOtpExpiryRemaining] = useState(0);
  const [resendsUsed, setResendsUsed] = useState(0);
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  const cooldownTimerRef = useRef(null);
  const expiryTimerRef = useRef(null);

  const userId = currentUser ? currentUser.userId : 'unknown';

  const maskedEmail = useMemo(() => {
    if (currentUser && currentUser.username) {
      const atIndex = currentUser.username.indexOf('@');
      if (atIndex > 3) {
        return currentUser.username.substring(0, 3) + '***' + currentUser.username.substring(atIndex);
      }
      return currentUser.username;
    }
    return '***@***.com';
  }, [currentUser]);

  const maskedPhone = '******4567';

  const maxResends = RATE_LIMIT_CONFIG.MAX_OTP_RESENDS;
  const maxAttempts = RATE_LIMIT_CONFIG.MAX_OTP_ATTEMPTS;

  /**
   * Starts the cooldown timer.
   * @param {number} seconds - The cooldown duration in seconds
   */
  const startCooldownTimer = useCallback((seconds) => {
    if (cooldownTimerRef.current !== null) {
      clearInterval(cooldownTimerRef.current);
    }

    setCooldownRemaining(seconds);

    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /**
   * Starts the OTP expiry timer.
   * @param {number} seconds - The expiry duration in seconds
   */
  const startExpiryTimer = useCallback((seconds) => {
    if (expiryTimerRef.current !== null) {
      clearInterval(expiryTimerRef.current);
    }

    setOtpExpiryRemaining(seconds);

    expiryTimerRef.current = setInterval(() => {
      setOtpExpiryRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(expiryTimerRef.current);
          expiryTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /**
   * Cleanup timers on unmount.
   */
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        clearInterval(cooldownTimerRef.current);
      }
      if (expiryTimerRef.current !== null) {
        clearInterval(expiryTimerRef.current);
      }
    };
  }, []);

  /**
   * Sync verification state on mount.
   */
  useEffect(() => {
    const state = getVerificationState();
    setAttemptsUsed(state.attempts);
    setResendsUsed(state.resends);

    if (state.isOnCooldown) {
      startCooldownTimer(state.cooldownRemaining);
    }

    if (state.expiresAt) {
      const expiresAt = new Date(state.expiresAt);
      const now = new Date();
      const remainingMs = expiresAt.getTime() - now.getTime();

      if (remainingMs > 0) {
        setOtpSent(true);
        startExpiryTimer(Math.ceil(remainingMs / 1000));
      }
    }
  }, [startCooldownTimer, startExpiryTimer]);

  /**
   * Handles sending the OTP code.
   */
  const handleSendOTP = useCallback(async () => {
    setServerError(null);
    setOtpError(null);
    setSuccessMessage(null);
    setSendingOtp(true);

    try {
      const result = await sendOTP(deliveryMethod);

      if (result.success) {
        setOtpSent(true);
        setOtpValue('');
        setResendsUsed((prev) => prev + 1);

        if (result.cooldown) {
          startCooldownTimer(result.cooldown);
        }

        if (result.expiresAt) {
          const expiresAt = new Date(result.expiresAt);
          const now = new Date();
          const remainingMs = expiresAt.getTime() - now.getTime();

          if (remainingMs > 0) {
            startExpiryTimer(Math.ceil(remainingMs / 1000));
          }
        } else {
          startExpiryTimer(OTP_CONFIG.EXPIRY_SECONDS);
        }

        setSuccessMessage(
          resendsUsed === 0
            ? 'A one-time passcode has been sent to your registered contact method.'
            : 'A new one-time passcode has been sent to your registered contact method.'
        );

        setSendingOtp(false);
      } else {
        setServerError(result.error || 'Unable to send the passcode. Please try again.');
        setSendingOtp(false);
      }
    } catch (error) {
      setServerError('An unexpected error occurred. Please try again.');
      setSendingOtp(false);

      logEvent(
        userId,
        AUDIT_EVENT_TYPES.OTP_SENT,
        { deliveryMethod, reason: 'Unexpected error' },
        AUDIT_OUTCOMES.FAILURE
      );
    }
  }, [deliveryMethod, userId, resendsUsed, startCooldownTimer, startExpiryTimer]);

  /**
   * Handles resending the OTP code.
   */
  const handleResendOTP = useCallback(async () => {
    if (cooldownRemaining > 0) {
      return;
    }

    if (resendsUsed >= maxResends) {
      setServerError(messages.resend.exhausted.message);
      return;
    }

    await handleSendOTP();
  }, [cooldownRemaining, resendsUsed, maxResends, handleSendOTP]);

  /**
   * Handles verifying the OTP code.
   */
  const handleVerifyOTP = useCallback(async () => {
    setServerError(null);
    setOtpError(null);
    setSuccessMessage(null);

    if (!otpValue || otpValue.trim() === '') {
      setOtpError('Please enter a valid 6-digit one-time passcode.');
      return;
    }

    if (otpValue.length !== 6) {
      setOtpError('Please enter a valid 6-digit one-time passcode.');
      return;
    }

    if (otpExpiryRemaining <= 0 && otpSent) {
      setOtpError(messages.errors.expiredOtp.message);
      return;
    }

    setLoading(true);

    try {
      const result = await verifyOTP(otpValue);

      if (result.success) {
        verify();

        logEvent(
          userId,
          AUDIT_EVENT_TYPES.OTP_VERIFIED,
          { method: deliveryMethod },
          AUDIT_OUTCOMES.SUCCESS
        );

        setLoading(false);
        setSuccessMessage(messages.success.otpVerified.message);

        // Clear timers
        if (cooldownTimerRef.current !== null) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
        if (expiryTimerRef.current !== null) {
          clearInterval(expiryTimerRef.current);
          expiryTimerRef.current = null;
        }

        completeStep('verify');
        goToStep('tokenValidation');
      } else {
        setLoading(false);

        if (result.sessionTerminated) {
          setServerError(result.error || messages.errors.otpAttemptsExhausted.message);

          logEvent(
            userId,
            AUDIT_EVENT_TYPES.OTP_FAILED,
            { reason: 'Session terminated due to exhausted attempts' },
            AUDIT_OUTCOMES.FAILURE
          );

          setTimeout(() => {
            logout();
            resetNavigation();
          }, 3000);

          return;
        }

        setAttemptsUsed((prev) => prev + 1);
        setOtpError(result.error || messages.errors.invalidOtp.message);
        setOtpValue('');
      }
    } catch (error) {
      setLoading(false);
      setServerError('An unexpected error occurred. Please try again.');

      logEvent(
        userId,
        AUDIT_EVENT_TYPES.OTP_FAILED,
        { reason: 'Unexpected error' },
        AUDIT_OUTCOMES.FAILURE
      );
    }
  }, [otpValue, otpExpiryRemaining, otpSent, userId, deliveryMethod, verify, completeStep, goToStep, logout, resetNavigation]);

  /**
   * Handles form submission.
   * @param {React.FormEvent<HTMLFormElement>} event - The form event
   */
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    handleVerifyOTP();
  }, [handleVerifyOTP]);

  /**
   * Handles delivery method selection.
   * @param {string} method - The selected delivery method
   */
  const handleMethodSelect = useCallback((method) => {
    setDeliveryMethod(method);
  }, []);

  /**
   * Handles OTP input change.
   * @param {string} value - The new OTP value
   */
  const handleOtpChange = useCallback((value) => {
    setOtpValue(value);
    if (otpError) {
      setOtpError(null);
    }
  }, [otpError]);

  /**
   * Dismisses the server error alert.
   */
  const handleDismissServerError = useCallback(() => {
    setServerError(null);
  }, []);

  /**
   * Dismisses the success message alert.
   */
  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const isResendDisabled = cooldownRemaining > 0 || resendsUsed >= maxResends || sendingOtp || loading;
  const isVerifyDisabled = loading || otpValue.length !== 6;
  const isOtpExpired = otpSent && otpExpiryRemaining <= 0;
  const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);

  return (
    <PageLayout
      title="Verify Your Identity"
      subtitle="For your security, we need to verify your identity before proceeding."
      showProgress={true}
      visibleSteps={['welcome', 'login', 'verify', 'tokenValidation', 'accountSelection']}
      showSessionTimeout={true}
      ariaLabel="Identity verification page"
    >
      <div className="mx-auto max-w-md">
        {serverError && (
          <div className="mb-6">
            <Alert
              message={serverError}
              variant="critical"
              dismissible={true}
              onDismiss={handleDismissServerError}
              ariaLabel="Verification error alert"
            />
          </div>
        )}

        {successMessage && (
          <div className="mb-6">
            <Alert
              message={successMessage}
              variant="success"
              dismissible={true}
              onDismiss={handleDismissSuccess}
              ariaLabel="Verification success alert"
            />
          </div>
        )}

        {!otpSent && (
          <div className="space-y-6">
            <div>
              <p className="mb-4 text-sm text-gray-600">
                Select how you would like to receive your one-time passcode:
              </p>
              <div
                className="space-y-3"
                role="radiogroup"
                aria-label="OTP delivery method"
              >
                <DeliveryMethodCard
                  method="email"
                  label="Email"
                  maskedContact={maskedEmail}
                  selected={deliveryMethod === 'email'}
                  onSelect={handleMethodSelect}
                  disabled={sendingOtp}
                />
                <DeliveryMethodCard
                  method="sms"
                  label="Text Message (SMS)"
                  maskedContact={maskedPhone}
                  selected={deliveryMethod === 'sms'}
                  onSelect={handleMethodSelect}
                  disabled={sendingOtp}
                />
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleSendOTP}
              loading={sendingOtp}
              disabled={sendingOtp}
              ariaLabel="Send Code"
              className="w-full"
            >
              Send Code
            </Button>
          </div>
        )}

        {otpSent && (
          <div className="space-y-6">
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-label="OTP verification form"
              className="space-y-5"
            >
              <OTPInput
                value={otpValue}
                onChange={handleOtpChange}
                disabled={loading || isOtpExpired}
                error={otpError}
                autoFocus={true}
              />

              {otpExpiryRemaining > 0 && (
                <div className="text-center">
                  <p className="text-sm text-gray-500" aria-live="polite" aria-atomic="true">
                    Code expires in{' '}
                    <span className="font-medium text-body">
                      {formatTime(otpExpiryRemaining)}
                    </span>
                  </p>
                </div>
              )}

              {isOtpExpired && (
                <div className="text-center">
                  <Alert
                    message={messages.errors.expiredOtp.message}
                    variant="warning"
                    ariaLabel="OTP expired alert"
                  />
                </div>
              )}

              {attemptsRemaining > 0 && attemptsRemaining < maxAttempts && (
                <p className="text-center text-xs text-gray-500" aria-live="polite">
                  {attemptsRemaining} verification attempt{attemptsRemaining !== 1 ? 's' : ''} remaining.
                </p>
              )}

              <Button
                variant="primary"
                type="submit"
                loading={loading}
                disabled={isVerifyDisabled || isOtpExpired}
                ariaLabel="Verify Code"
                className="w-full"
              >
                Verify Code
              </Button>
            </form>

            <div className="border-t border-gray-200 pt-4 text-center">
              <p className="mb-2 text-sm text-gray-500">
                Didn&apos;t receive the code?
              </p>
              {cooldownRemaining > 0 ? (
                <p className="text-sm text-gray-400" aria-live="polite" aria-atomic="true">
                  Resend available in {formatTime(cooldownRemaining)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isResendDisabled}
                  aria-label="Resend Code"
                  className={[
                    'text-sm font-medium transition-colors duration-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2',
                    isResendDisabled
                      ? 'cursor-not-allowed text-gray-400'
                      : 'text-primary-blue underline hover:text-blue-800',
                  ].join(' ')}
                >
                  Resend Code
                </button>
              )}
              {resendsUsed > 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  {Math.max(0, maxResends - resendsUsed)} resend{Math.max(0, maxResends - resendsUsed) !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtpValue('');
                  setOtpError(null);
                  setServerError(null);
                  setSuccessMessage(null);
                }}
                className="text-sm text-gray-500 underline transition-colors duration-200 hover:text-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2"
                aria-label="Change delivery method"
              >
                Change delivery method
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

/**
 * IdentityVerificationScreen page component (Step 3 of the workflow).
 * Provides OTP-based identity verification with delivery method selection,
 * 6-digit code input, attempt tracking, resend with cooldown, expiry timer,
 * and audit logging. Wrapped in an ErrorBoundary for resilient error handling.
 *
 * @returns {React.ReactElement}
 */
function IdentityVerificationScreen() {
  return (
    <ErrorBoundary>
      <IdentityVerificationScreenContent />
    </ErrorBoundary>
  );
}

export default IdentityVerificationScreen;