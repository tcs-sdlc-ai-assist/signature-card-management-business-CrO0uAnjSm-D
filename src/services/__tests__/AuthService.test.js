import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  login,
  logout,
  getLoginAttempts,
  isAccountLocked,
  resetLoginAttempts,
} from '@/services/AuthService';
import { getSession, clearSession } from '@/services/SessionService';
import { getAuditLogs } from '@/services/AuditService';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('successfully authenticates with valid credentials', async () => {
      const result = await login('jsmith', 'Password1!');

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session.userId).toBe('USR-001');
      expect(result.session.username).toBe('jsmith');
    });

    it('creates a session on successful login', async () => {
      const result = await login('jsmith', 'Password1!');

      expect(result.success).toBe(true);

      const session = getSession();
      expect(session).not.toBeNull();
      expect(session.userId).toBe('USR-001');
      expect(session.username).toBe('jsmith');
      expect(session.sessionId).toBeDefined();
      expect(session.expiresAt).toBeDefined();
      expect(session.isVerified).toBe(false);
      expect(session.isTokenValidated).toBe(false);
    });

    it('returns error for invalid username', async () => {
      const result = await login('nonexistentuser', 'Password1!');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('incorrect');
    });

    it('returns error for invalid password', async () => {
      const result = await login('jsmith', 'WrongPassword!');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('incorrect');
    });

    it('returns error when username is empty', async () => {
      const result = await login('', 'Password1!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username is required.');
    });

    it('returns error when password is empty', async () => {
      const result = await login('jsmith', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password is required.');
    });

    it('tracks failed login attempts', async () => {
      await login('jsmith', 'WrongPassword!');
      const attempts = getLoginAttempts('jsmith');

      expect(attempts).toBe(1);
    });

    it('returns attempts remaining on failed login', async () => {
      const result = await login('jsmith', 'WrongPassword!');

      expect(result.success).toBe(false);
      expect(result.attemptsRemaining).toBeDefined();
      expect(typeof result.attemptsRemaining).toBe('number');
      expect(result.attemptsRemaining).toBe(4);
    });

    it('locks account after 5 failed login attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await login('jsmith', 'WrongPassword!');
      }

      const locked = isAccountLocked('jsmith');
      expect(locked).toBe(true);

      const result = await login('jsmith', 'Password1!');
      expect(result.success).toBe(false);
      expect(result.locked).toBe(true);
    });

    it('returns locked flag on the 5th failed attempt', async () => {
      let result;
      for (let i = 0; i < 5; i++) {
        result = await login('jsmith', 'WrongPassword!');
      }

      expect(result.success).toBe(false);
      expect(result.locked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);
    });

    it('resets login attempts on successful login', async () => {
      await login('jsmith', 'WrongPassword!');
      await login('jsmith', 'WrongPassword!');

      expect(getLoginAttempts('jsmith')).toBe(2);

      const result = await login('jsmith', 'Password1!');
      expect(result.success).toBe(true);

      expect(getLoginAttempts('jsmith')).toBe(0);
    });

    it('authenticates different users independently', async () => {
      const result1 = await login('jsmith', 'Password1!');
      expect(result1.success).toBe(true);
      expect(result1.session.userId).toBe('USR-001');

      clearSession();

      const result2 = await login('mjohnson', 'Secure2@');
      expect(result2.success).toBe(true);
      expect(result2.session.userId).toBe('USR-002');
    });

    it('is case-insensitive for username', async () => {
      const result = await login('JSmith', 'Password1!');

      expect(result.success).toBe(true);
      expect(result.session.userId).toBe('USR-001');
    });

    it('logs audit event on successful login', async () => {
      await login('jsmith', 'Password1!');

      const logs = getAuditLogs();
      const loginSuccessLogs = logs.filter(
        (log) => log.eventType === 'LOGIN_SUCCESS'
      );

      expect(loginSuccessLogs.length).toBeGreaterThanOrEqual(1);

      const lastLog = loginSuccessLogs[loginSuccessLogs.length - 1];
      expect(lastLog.userId).toBe('USR-001');
      expect(lastLog.outcome).toBe('success');
    });

    it('logs audit event on failed login', async () => {
      await login('jsmith', 'WrongPassword!');

      const logs = getAuditLogs();
      const loginFailureLogs = logs.filter(
        (log) => log.eventType === 'LOGIN_FAILURE'
      );

      expect(loginFailureLogs.length).toBeGreaterThanOrEqual(1);

      const lastLog = loginFailureLogs[loginFailureLogs.length - 1];
      expect(lastLog.outcome).toBe('failure');
    });

    it('prevents login when account is already locked in user data', async () => {
      // Lock the account via failed attempts
      for (let i = 0; i < 5; i++) {
        await login('jsmith', 'WrongPassword!');
      }

      const result = await login('jsmith', 'Password1!');
      expect(result.success).toBe(false);
      expect(result.locked).toBe(true);
    });
  });

  describe('logout', () => {
    it('clears the session on logout', async () => {
      await login('jsmith', 'Password1!');

      const sessionBefore = getSession();
      expect(sessionBefore).not.toBeNull();

      logout();

      const sessionAfter = getSession();
      expect(sessionAfter).toBeNull();
    });

    it('logs audit event on logout', async () => {
      await login('jsmith', 'Password1!');

      logout();

      const logs = getAuditLogs();
      const logoutLogs = logs.filter(
        (log) => log.eventType === 'LOGOUT'
      );

      expect(logoutLogs.length).toBeGreaterThanOrEqual(1);

      const lastLog = logoutLogs[logoutLogs.length - 1];
      expect(lastLog.userId).toBe('USR-001');
      expect(lastLog.outcome).toBe('info');
    });

    it('handles logout when no session exists', () => {
      expect(() => logout()).not.toThrow();

      const session = getSession();
      expect(session).toBeNull();
    });
  });

  describe('isAccountLocked', () => {
    it('returns false for a user with no failed attempts', () => {
      expect(isAccountLocked('jsmith')).toBe(false);
    });

    it('returns false for invalid username input', () => {
      expect(isAccountLocked('')).toBe(false);
      expect(isAccountLocked(null)).toBe(false);
      expect(isAccountLocked(undefined)).toBe(false);
    });

    it('returns true after max failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await login('jsmith', 'WrongPassword!');
      }

      expect(isAccountLocked('jsmith')).toBe(true);
    });

    it('returns false when fewer than max attempts have been made', async () => {
      for (let i = 0; i < 3; i++) {
        await login('jsmith', 'WrongPassword!');
      }

      expect(isAccountLocked('jsmith')).toBe(false);
    });
  });

  describe('getLoginAttempts', () => {
    it('returns 0 for a user with no failed attempts', () => {
      expect(getLoginAttempts('jsmith')).toBe(0);
    });

    it('returns 0 for invalid input', () => {
      expect(getLoginAttempts('')).toBe(0);
      expect(getLoginAttempts(null)).toBe(0);
      expect(getLoginAttempts(undefined)).toBe(0);
    });

    it('increments with each failed login', async () => {
      await login('jsmith', 'WrongPassword!');
      expect(getLoginAttempts('jsmith')).toBe(1);

      await login('jsmith', 'WrongPassword!');
      expect(getLoginAttempts('jsmith')).toBe(2);

      await login('jsmith', 'WrongPassword!');
      expect(getLoginAttempts('jsmith')).toBe(3);
    });
  });

  describe('resetLoginAttempts', () => {
    it('resets the failed attempt counter', async () => {
      await login('jsmith', 'WrongPassword!');
      await login('jsmith', 'WrongPassword!');

      expect(getLoginAttempts('jsmith')).toBe(2);

      resetLoginAttempts('jsmith');

      expect(getLoginAttempts('jsmith')).toBe(0);
    });

    it('returns true on successful reset', () => {
      expect(resetLoginAttempts('jsmith')).toBe(true);
    });

    it('returns false for invalid input', () => {
      expect(resetLoginAttempts('')).toBe(false);
      expect(resetLoginAttempts(null)).toBe(false);
      expect(resetLoginAttempts(undefined)).toBe(false);
    });

    it('unlocks a locked account after reset', async () => {
      for (let i = 0; i < 5; i++) {
        await login('jsmith', 'WrongPassword!');
      }

      expect(isAccountLocked('jsmith')).toBe(true);

      resetLoginAttempts('jsmith');

      expect(isAccountLocked('jsmith')).toBe(false);
      expect(getLoginAttempts('jsmith')).toBe(0);
    });
  });

  describe('audit trail completeness', () => {
    it('logs both login success and logout events in sequence', async () => {
      await login('jsmith', 'Password1!');
      logout();

      const logs = getAuditLogs();

      const loginLog = logs.find((log) => log.eventType === 'LOGIN_SUCCESS');
      const logoutLog = logs.find((log) => log.eventType === 'LOGOUT');

      expect(loginLog).toBeDefined();
      expect(logoutLog).toBeDefined();

      expect(loginLog.userId).toBe('USR-001');
      expect(logoutLog.userId).toBe('USR-001');
    });

    it('logs failure events for locked account login attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await login('jsmith', 'WrongPassword!');
      }

      // Attempt login on locked account
      await login('jsmith', 'Password1!');

      const logs = getAuditLogs();
      const failureLogs = logs.filter(
        (log) => log.eventType === 'LOGIN_FAILURE'
      );

      // 5 failed attempts + 1 locked attempt = at least 6
      expect(failureLogs.length).toBeGreaterThanOrEqual(6);
    });
  });
});