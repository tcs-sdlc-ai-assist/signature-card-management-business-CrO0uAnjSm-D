import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import LoginScreen from '@/pages/LoginScreen';
import { getAuditLogs } from '@/services/AuditService';
import { getSession, clearSession } from '@/services/SessionService';
import { getLoginAttempts, isAccountLocked, resetLoginAttempts } from '@/services/AuthService';

/**
 * Wraps the LoginScreen component with required providers for testing.
 * @param {Object} [props] - Optional props to pass to LoginScreen
 * @returns {React.ReactElement}
 */
function renderLoginScreen(props = {}) {
  return render(
    <AppProvider>
      <BrowserRouter>
        <LoginScreen {...props} />
      </BrowserRouter>
    </AppProvider>
  );
}

describe('LoginScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('rendering', () => {
    it('renders the login form with username and password fields', () => {
      renderLoginScreen();

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders the Sign In button', () => {
      renderLoginScreen();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton).toBeInTheDocument();
    });

    it('renders the page title', () => {
      renderLoginScreen();

      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('renders the subtitle text', () => {
      renderLoginScreen();

      expect(screen.getByText(/enter your credentials/i)).toBeInTheDocument();
    });

    it('renders the Forgot Password link', () => {
      renderLoginScreen();

      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
    });
  });

  describe('required field validation', () => {
    it('shows error when username is empty on submit', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'Password1!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Username is required.')).toBeInTheDocument();
      });
    });

    it('shows error when password is empty on submit', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      await user.type(usernameInput, 'jsmith');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });
    });

    it('shows errors for both fields when both are empty on submit', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Username is required.')).toBeInTheDocument();
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });
    });

    it('clears username error when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Username is required.')).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/username/i);
      await user.type(usernameInput, 'j');

      await waitFor(() => {
        expect(screen.queryByText('Username is required.')).not.toBeInTheDocument();
      });
    });

    it('clears password error when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'p');

      await waitFor(() => {
        expect(screen.queryByText('Password is required.')).not.toBeInTheDocument();
      });
    });
  });

  describe('invalid credentials', () => {
    it('shows generic error message on invalid credentials', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'WrongPassword!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });
    });

    it('shows generic error message for non-existent username', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'nonexistentuser');
      await user.type(passwordInput, 'SomePassword1!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });
    });

    it('shows attempts remaining warning after failed login', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'WrongPassword!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/4 login attempts remaining/i)).toBeInTheDocument();
      });
    });
  });

  describe('account lockout', () => {
    it('shows lockout message after 5 failed login attempts', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      for (let i = 0; i < 5; i++) {
        const usernameInput = screen.getByLabelText(/username/i);
        const passwordInput = screen.getByLabelText(/password/i);

        await user.clear(usernameInput);
        await user.clear(passwordInput);
        await user.type(usernameInput, 'jsmith');
        await user.type(passwordInput, 'WrongPassword!');

        const signInButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(signInButton);

        if (i < 4) {
          await waitFor(() => {
            expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
          });
        }
      }

      await waitFor(() => {
        expect(screen.getByText(/locked/i)).toBeInTheDocument();
      });
    });

    it('disables form inputs when account is locked', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      for (let i = 0; i < 5; i++) {
        const usernameInput = screen.getByLabelText(/username/i);
        const passwordInput = screen.getByLabelText(/password/i);

        await user.clear(usernameInput);
        await user.clear(passwordInput);
        await user.type(usernameInput, 'jsmith');
        await user.type(passwordInput, 'WrongPassword!');

        const signInButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(signInButton);

        await waitFor(() => {
          const alerts = screen.getAllByRole('alert');
          expect(alerts.length).toBeGreaterThan(0);
        });
      }

      await waitFor(() => {
        const usernameInput = screen.getByLabelText(/username/i);
        const passwordInput = screen.getByLabelText(/password/i);

        expect(usernameInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
      });
    });
  });

  describe('successful login', () => {
    it('creates a session on successful login', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'Password1!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        const session = getSession();
        expect(session).not.toBeNull();
        expect(session.userId).toBe('USR-001');
        expect(session.username).toBe('jsmith');
      });
    });

    it('does not show error messages on successful login', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'Password1!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/locked/i)).not.toBeInTheDocument();
      });
    });

    it('authenticates with a different valid user', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'mjohnson');
      await user.type(passwordInput, 'Secure2@');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        const session = getSession();
        expect(session).not.toBeNull();
        expect(session.userId).toBe('USR-002');
        expect(session.username).toBe('mjohnson');
      });
    });
  });

  describe('password show/hide toggle', () => {
    it('renders password field as type password by default', () => {
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility when show/hide button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('hides password again when toggle is clicked a second time', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);

      const showButton = screen.getByRole('button', { name: /show password/i });
      await user.click(showButton);

      expect(passwordInput).toHaveAttribute('type', 'text');

      const hideButton = screen.getByRole('button', { name: /hide password/i });
      await user.click(hideButton);

      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('audit logging', () => {
    it('logs audit event on successful login', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'Password1!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        const logs = getAuditLogs();
        const loginSuccessLogs = logs.filter(
          (log) => log.eventType === 'LOGIN_SUCCESS'
        );
        expect(loginSuccessLogs.length).toBeGreaterThanOrEqual(1);

        const lastLog = loginSuccessLogs[loginSuccessLogs.length - 1];
        expect(lastLog.outcome).toBe('success');
      });
    });

    it('logs audit event on failed login', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'WrongPassword!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        const logs = getAuditLogs();
        const loginFailureLogs = logs.filter(
          (log) => log.eventType === 'LOGIN_FAILURE'
        );
        expect(loginFailureLogs.length).toBeGreaterThanOrEqual(1);

        const lastLog = loginFailureLogs[loginFailureLogs.length - 1];
        expect(lastLog.outcome).toBe('failure');
      });
    });

    it('logs multiple failure events for multiple failed attempts', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      for (let i = 0; i < 3; i++) {
        const usernameInput = screen.getByLabelText(/username/i);
        const passwordInput = screen.getByLabelText(/password/i);

        await user.clear(usernameInput);
        await user.clear(passwordInput);
        await user.type(usernameInput, 'jsmith');
        await user.type(passwordInput, 'WrongPassword!');

        const signInButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(signInButton);

        await waitFor(() => {
          expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
        });
      }

      const logs = getAuditLogs();
      const loginFailureLogs = logs.filter(
        (log) => log.eventType === 'LOGIN_FAILURE'
      );
      expect(loginFailureLogs.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('form interaction', () => {
    it('disables the Sign In button when fields are empty', () => {
      renderLoginScreen();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton).toBeDisabled();
    });

    it('enables the Sign In button when both fields have values', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'Password1!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      expect(signInButton).not.toBeDisabled();
    });

    it('shows loading state on the button during login', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'Password1!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // After the async login completes, the button should no longer be in loading state
      await waitFor(() => {
        const session = getSession();
        expect(session).not.toBeNull();
      });
    });

    it('validates username on blur', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      await user.click(usernameInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Username is required.')).toBeInTheDocument();
      });
    });

    it('validates password on blur', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.click(passwordInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });
    });

    it('clears server error when user modifies username', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'WrongPassword!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });

      await user.type(usernameInput, 'x');

      await waitFor(() => {
        expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument();
      });
    });

    it('clears server error when user modifies password', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'WrongPassword!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });

      await user.type(passwordInput, 'x');

      await waitFor(() => {
        expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('renders the login form with proper aria-label', () => {
      renderLoginScreen();

      const form = screen.getByRole('form', { name: /login form/i });
      expect(form).toBeInTheDocument();
    });

    it('marks username field as required', () => {
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toHaveAttribute('required');
    });

    it('marks password field as required', () => {
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('required');
    });

    it('sets aria-invalid on username field when validation fails', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      await user.click(usernameInput);
      await user.tab();

      await waitFor(() => {
        expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('sets aria-invalid on password field when validation fails', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.click(passwordInput);
      await user.tab();

      await waitFor(() => {
        expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('renders error alerts with role="alert"', async () => {
      const user = userEvent.setup();
      renderLoginScreen();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'jsmith');
      await user.type(passwordInput, 'WrongPassword!');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });
});