import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sendOTP,
  verifyOTP,
  getVerificationState,
  resetVerificationState,
} from '@/services/VerificationService';
import { createSession, getSession, clearSession } from '@/services/SessionService';
import { getAuditLogs } from '@/services/AuditService';

describe('VerificationService', () => {
  beforeEach(() => {
    localStorage.clear();
    // Create a valid session before each test
    createSession('USR-001', 'jsmith');
  });

  describe('getVerificationState', () => {
    it('returns initial state with zero attempts and resends', () => {
      const state = getVerificationState();

      expect(state.attempts).toBe(0);
      expect(state.resends).toBe(0);
      expect(state.maxAttempts).toBe(3);
      expect(state.maxResends).toBe(3);
      expect(state.isOnCooldown).toBe(false);
      expect(state.cooldownRemaining).toBe(0);
      expect(state.lastSentAt).toBeNull();
      expect(state.expiresAt).toBeNull();
    });

    it('reflects updated state after sending OTP', async () => {
      await sendOTP('email');

      const state = getVerificationState();

      expect(state.resends).toBe(1);
      expect(state.lastSentAt).not.toBeNull();
      expect(state.expiresAt).not.toBeNull();
      expect(state.isOnCooldown).toBe(true);
      expect(state.cooldownRemaining).toBeGreaterThan(0);
    });

    it('reflects updated state after failed verification attempt', async () => {
      await sendOTP('email');
      await verifyOTP('000000');

      const state = getVerificationState();

      expect(state.attempts).toBe(1);
    });
  });

  describe('sendOTP', () => {
    it('successfully sends OTP via email', async () => {
      const result = await sendOTP('email');

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();
      expect(result.cooldown).toBeDefined();
      expect(result.resendsRemaining).toBeDefined();
      expect(result.resendsRemaining).toBe(2);
    });

    it('successfully sends OTP via sms', async () => {
      const result = await sendOTP('sms');

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();
      expect(result.resendsRemaining).toBe(2);
    });

    it('returns error when no session exists', async () => {
      clearSession();

      const result = await sendOTP('email');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('session');
    });

    it('enforces cooldown between resend requests', async () => {
      const firstResult = await sendOTP('email');
      expect(firstResult.success).toBe(true);

      const secondResult = await sendOTP('email');
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBeDefined();
      expect(secondResult.error).toContain('wait');
      expect(secondResult.cooldown).toBeGreaterThan(0);
    });

    it('enforces maximum resend limit', async () => {
      // Send 3 OTPs (max resends), bypassing cooldown by manipulating localStorage
      for (let i = 0; i < 3; i++) {
        // Clear cooldown by setting lastSentAt to a time in the past
        const resendsRecord = {
          resends: i,
          lastSentAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        };
        localStorage.setItem('scm_otp_resends', JSON.stringify(resendsRecord));

        const result = await sendOTP('email');
        expect(result.success).toBe(true);
      }

      // Clear cooldown for the 4th attempt
      const resendsRecord = JSON.parse(localStorage.getItem('scm_otp_resends'));
      resendsRecord.lastSentAt = new Date(Date.now() - 120000).toISOString();
      localStorage.setItem('scm_otp_resends', JSON.stringify(resendsRecord));

      // 4th attempt should fail
      const result = await sendOTP('email');
      expect(result.success).toBe(false);
      expect(result.resendsRemaining).toBe(0);
    });

    it('sets OTP expiry timestamp', async () => {
      const result = await sendOTP('email');

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();

      const expiresAt = new Date(result.expiresAt);
      const now = new Date();

      // Expiry should be in the future (approximately 300 seconds from now)
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      expect(expiresAt.getTime() - now.getTime()).toBeLessThanOrEqual(301000);
      expect(expiresAt.getTime() - now.getTime()).toBeGreaterThanOrEqual(298000);
    });

    it('decrements resends remaining with each send', async () => {
      const first = await sendOTP('email');
      expect(first.resendsRemaining).toBe(2);

      // Bypass cooldown
      const record1 = JSON.parse(localStorage.getItem('scm_otp_resends'));
      record1.lastSentAt = new Date(Date.now() - 120000).toISOString();
      localStorage.setItem('scm_otp_resends', JSON.stringify(record1));

      const second = await sendOTP('email');
      expect(second.resendsRemaining).toBe(1);

      // Bypass cooldown
      const record2 = JSON.parse(localStorage.getItem('scm_otp_resends'));
      record2.lastSentAt = new Date(Date.now() - 120000).toISOString();
      localStorage.setItem('scm_otp_resends', JSON.stringify(record2));

      const third = await sendOTP('email');
      expect(third.resendsRemaining).toBe(0);
    });

    it('logs audit event on successful OTP send', async () => {
      await sendOTP('email');

      const logs = getAuditLogs();
      const otpSentLogs = logs.filter((log) => log.eventType === 'OTP_SENT');

      expect(otpSentLogs.length).toBeGreaterThanOrEqual(1);

      const lastLog = otpSentLogs[otpSentLogs.length - 1];
      expect(lastLog.outcome).toBe('success');
      expect(lastLog.userId).toBe('USR-001');
    });

    it('logs audit event when resend limit is reached', async () => {
      // Exhaust resends
      for (let i = 0; i < 3; i++) {
        const resendsRecord = {
          resends: i,
          lastSentAt: new Date(Date.now() - 120000).toISOString(),
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        };
        localStorage.setItem('scm_otp_resends', JSON.stringify(resendsRecord));
        await sendOTP('email');
      }

      // Clear cooldown
      const record = JSON.parse(localStorage.getItem('scm_otp_resends'));
      record.lastSentAt = new Date(Date.now() - 120000).toISOString();
      localStorage.setItem('scm_otp_resends', JSON.stringify(record));

      // Attempt beyond limit
      await sendOTP('email');

      const logs = getAuditLogs();
      const otpSentFailureLogs = logs.filter(
        (log) => log.eventType === 'OTP_SENT' && log.outcome === 'failure'
      );

      expect(otpSentFailureLogs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('verifyOTP', () => {
    it('successfully verifies with the demo code 123456', async () => {
      await sendOTP('email');

      const result = await verifyOTP('123456');

      expect(result.success).toBe(true);
    });

    it('marks session as verified on successful verification', async () => {
      await sendOTP('email');
      await verifyOTP('123456');

      const session = getSession();
      expect(session).not.toBeNull();
      expect(session.isVerified).toBe(true);
    });

    it('returns error for incorrect OTP code', async () => {
      await sendOTP('email');

      const result = await verifyOTP('000000');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attemptsRemaining).toBeDefined();
      expect(result.attemptsRemaining).toBe(2);
    });

    it('returns error for empty OTP code', async () => {
      const result = await verifyOTP('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('6-digit');
    });

    it('returns error for non-numeric OTP code', async () => {
      const result = await verifyOTP('abcdef');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('6-digit');
    });

    it('returns error for OTP code with wrong length', async () => {
      const result = await verifyOTP('12345');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('6-digit');
    });

    it('returns error when no session exists', async () => {
      clearSession();

      const result = await verifyOTP('123456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.sessionTerminated).toBe(true);
    });

    it('tracks failed verification attempts', async () => {
      await sendOTP('email');

      await verifyOTP('000000');
      const state1 = getVerificationState();
      expect(state1.attempts).toBe(1);

      await verifyOTP('111111');
      const state2 = getVerificationState();
      expect(state2.attempts).toBe(2);
    });

    it('decrements attempts remaining with each failure', async () => {
      await sendOTP('email');

      const result1 = await verifyOTP('000000');
      expect(result1.attemptsRemaining).toBe(2);

      const result2 = await verifyOTP('111111');
      expect(result2.attemptsRemaining).toBe(1);
    });

    it('terminates session after 3 failed verification attempts', async () => {
      await sendOTP('email');

      await verifyOTP('000000');
      await verifyOTP('111111');
      const result3 = await verifyOTP('222222');

      expect(result3.success).toBe(false);
      expect(result3.sessionTerminated).toBe(true);
      expect(result3.attemptsRemaining).toBe(0);

      // Session should be cleared
      const session = getSession();
      expect(session).toBeNull();
    });

    it('resets attempt counter on successful verification', async () => {
      await sendOTP('email');

      // Fail once
      await verifyOTP('000000');
      const stateBefore = getVerificationState();
      expect(stateBefore.attempts).toBe(1);

      // Succeed
      await verifyOTP('123456');
      const stateAfter = getVerificationState();
      expect(stateAfter.attempts).toBe(0);
    });

    it('returns error when OTP has expired', async () => {
      await sendOTP('email');

      // Manually set the OTP expiry to the past
      const resendsRecord = JSON.parse(localStorage.getItem('scm_otp_resends'));
      resendsRecord.expiresAt = new Date(Date.now() - 1000).toISOString();
      localStorage.setItem('scm_otp_resends', JSON.stringify(resendsRecord));

      const result = await verifyOTP('123456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('expired');
    });

    it('returns error when max attempts already exhausted', async () => {
      await sendOTP('email');

      // Manually set attempts to max
      const attemptsRecord = {
        attempts: 3,
        lastAttemptAt: new Date().toISOString(),
      };
      localStorage.setItem('scm_otp_attempts', JSON.stringify(attemptsRecord));

      const result = await verifyOTP('123456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('exceeded');
      expect(result.attemptsRemaining).toBe(0);
    });

    it('logs audit event on successful verification', async () => {
      await sendOTP('email');
      await verifyOTP('123456');

      const logs = getAuditLogs();
      const otpVerifiedLogs = logs.filter(
        (log) => log.eventType === 'OTP_VERIFIED'
      );

      expect(otpVerifiedLogs.length).toBeGreaterThanOrEqual(1);

      const lastLog = otpVerifiedLogs[otpVerifiedLogs.length - 1];
      expect(lastLog.outcome).toBe('success');
      expect(lastLog.userId).toBe('USR-001');
    });

    it('logs audit event on failed verification', async () => {
      await sendOTP('email');
      await verifyOTP('000000');

      const logs = getAuditLogs();
      const otpFailedLogs = logs.filter(
        (log) => log.eventType === 'OTP_FAILED'
      );

      expect(otpFailedLogs.length).toBeGreaterThanOrEqual(1);

      const lastLog = otpFailedLogs[otpFailedLogs.length - 1];
      expect(lastLog.outcome).toBe('failure');
    });
  });

  describe('resetVerificationState', () => {
    it('resets attempts and resend counters', async () => {
      await sendOTP('email');
      await verifyOTP('000000');

      const stateBefore = getVerificationState();
      expect(stateBefore.attempts).toBe(1);
      expect(stateBefore.resends).toBe(1);

      const result = resetVerificationState();
      expect(result).toBe(true);

      const stateAfter = getVerificationState();
      expect(stateAfter.attempts).toBe(0);
      expect(stateAfter.resends).toBe(0);
      expect(stateAfter.lastSentAt).toBeNull();
      expect(stateAfter.expiresAt).toBeNull();
    });

    it('clears cooldown state', async () => {
      await sendOTP('email');

      const stateBefore = getVerificationState();
      expect(stateBefore.isOnCooldown).toBe(true);

      resetVerificationState();

      const stateAfter = getVerificationState();
      expect(stateAfter.isOnCooldown).toBe(false);
      expect(stateAfter.cooldownRemaining).toBe(0);
    });

    it('allows sending OTP again after reset', async () => {
      // Exhaust resends
      for (let i = 0; i < 3; i++) {
        const resendsRecord = {
          resends: i,
          lastSentAt: new Date(Date.now() - 120000).toISOString(),
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        };
        localStorage.setItem('scm_otp_resends', JSON.stringify(resendsRecord));
        await sendOTP('email');
      }

      // Verify resends are exhausted
      const record = JSON.parse(localStorage.getItem('scm_otp_resends'));
      record.lastSentAt = new Date(Date.now() - 120000).toISOString();
      localStorage.setItem('scm_otp_resends', JSON.stringify(record));

      const exhaustedResult = await sendOTP('email');
      expect(exhaustedResult.success).toBe(false);

      // Reset and try again
      resetVerificationState();

      const result = await sendOTP('email');
      expect(result.success).toBe(true);
      expect(result.resendsRemaining).toBe(2);
    });
  });

  describe('OTP expiry', () => {
    it('sets expiry approximately 300 seconds in the future', async () => {
      const result = await sendOTP('email');

      expect(result.success).toBe(true);

      const state = getVerificationState();
      expect(state.expiresAt).not.toBeNull();

      const expiresAt = new Date(state.expiresAt);
      const now = new Date();
      const diffSeconds = (expiresAt.getTime() - now.getTime()) / 1000;

      expect(diffSeconds).toBeGreaterThan(295);
      expect(diffSeconds).toBeLessThanOrEqual(301);
    });

    it('rejects valid demo code when OTP is expired', async () => {
      await sendOTP('email');

      // Set expiry to the past
      const resendsRecord = JSON.parse(localStorage.getItem('scm_otp_resends'));
      resendsRecord.expiresAt = new Date(Date.now() - 5000).toISOString();
      localStorage.setItem('scm_otp_resends', JSON.stringify(resendsRecord));

      const result = await verifyOTP('123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('session termination flow', () => {
    it('clears session after exhausting all verification attempts', async () => {
      await sendOTP('email');

      // Verify session exists before
      expect(getSession()).not.toBeNull();

      // Exhaust all 3 attempts
      await verifyOTP('000000');
      await verifyOTP('111111');
      const finalResult = await verifyOTP('222222');

      expect(finalResult.success).toBe(false);
      expect(finalResult.sessionTerminated).toBe(true);

      // Session should be cleared
      expect(getSession()).toBeNull();
    });

    it('prevents further verification after session termination', async () => {
      await sendOTP('email');

      // Exhaust all attempts
      await verifyOTP('000000');
      await verifyOTP('111111');
      await verifyOTP('222222');

      // Try to verify again — no session
      const result = await verifyOTP('123456');

      expect(result.success).toBe(false);
      expect(result.sessionTerminated).toBe(true);
    });

    it('logs failure audit event on session termination', async () => {
      await sendOTP('email');

      await verifyOTP('000000');
      await verifyOTP('111111');
      await verifyOTP('222222');

      const logs = getAuditLogs();
      const otpFailedLogs = logs.filter(
        (log) => log.eventType === 'OTP_FAILED'
      );

      // Should have at least 3 failure logs
      expect(otpFailedLogs.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('cooldown behavior', () => {
    it('reports cooldown remaining after sending OTP', async () => {
      await sendOTP('email');

      const state = getVerificationState();

      expect(state.isOnCooldown).toBe(true);
      expect(state.cooldownRemaining).toBeGreaterThan(0);
      expect(state.cooldownRemaining).toBeLessThanOrEqual(60);
    });

    it('allows resend after cooldown period expires', async () => {
      await sendOTP('email');

      // Simulate cooldown expiry by setting lastSentAt to the past
      const resendsRecord = JSON.parse(localStorage.getItem('scm_otp_resends'));
      resendsRecord.lastSentAt = new Date(Date.now() - 61000).toISOString();
      localStorage.setItem('scm_otp_resends', JSON.stringify(resendsRecord));

      const state = getVerificationState();
      expect(state.isOnCooldown).toBe(false);

      const result = await sendOTP('email');
      expect(result.success).toBe(true);
    });

    it('blocks resend during cooldown period', async () => {
      const firstResult = await sendOTP('email');
      expect(firstResult.success).toBe(true);

      // Immediately try again — should be blocked by cooldown
      const secondResult = await sendOTP('email');
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('wait');
    });
  });

  describe('end-to-end verification flow', () => {
    it('completes full flow: send OTP, verify with demo code', async () => {
      const sendResult = await sendOTP('email');
      expect(sendResult.success).toBe(true);

      const verifyResult = await verifyOTP('123456');
      expect(verifyResult.success).toBe(true);

      const session = getSession();
      expect(session).not.toBeNull();
      expect(session.isVerified).toBe(true);
    });

    it('handles retry flow: fail once, then succeed', async () => {
      await sendOTP('email');

      const failResult = await verifyOTP('000000');
      expect(failResult.success).toBe(false);
      expect(failResult.attemptsRemaining).toBe(2);

      const successResult = await verifyOTP('123456');
      expect(successResult.success).toBe(true);

      const session = getSession();
      expect(session.isVerified).toBe(true);
    });

    it('handles resend flow: send, resend after cooldown, then verify', async () => {
      const firstSend = await sendOTP('email');
      expect(firstSend.success).toBe(true);

      // Bypass cooldown
      const record = JSON.parse(localStorage.getItem('scm_otp_resends'));
      record.lastSentAt = new Date(Date.now() - 120000).toISOString();
      localStorage.setItem('scm_otp_resends', JSON.stringify(record));

      const resend = await sendOTP('email');
      expect(resend.success).toBe(true);
      expect(resend.resendsRemaining).toBe(1);

      const verifyResult = await verifyOTP('123456');
      expect(verifyResult.success).toBe(true);
    });
  });
});