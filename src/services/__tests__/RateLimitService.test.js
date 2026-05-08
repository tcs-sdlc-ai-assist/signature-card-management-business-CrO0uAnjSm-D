import { describe, it, expect, beforeEach } from 'vitest';
import {
  canUnlock,
  canResend,
  incrementUnlock,
  incrementResend,
  getRemainingAttempts,
  getAttemptMessage,
  getAttemptCount,
  resetRateLimit,
  clearAllRateLimits,
} from '@/services/RateLimitService';

describe('RateLimitService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('canUnlock', () => {
    it('returns true when no unlock attempts have been made', () => {
      expect(canUnlock('SGN-001')).toBe(true);
    });

    it('returns true when under the daily limit', () => {
      incrementUnlock('SGN-001');
      expect(canUnlock('SGN-001')).toBe(true);

      incrementUnlock('SGN-001');
      expect(canUnlock('SGN-001')).toBe(true);
    });

    it('returns false after 3 unlock attempts', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      expect(canUnlock('SGN-001')).toBe(false);
    });

    it('returns false for empty signer ID', () => {
      expect(canUnlock('')).toBe(false);
    });

    it('returns false for null signer ID', () => {
      expect(canUnlock(null)).toBe(false);
    });

    it('returns false for undefined signer ID', () => {
      expect(canUnlock(undefined)).toBe(false);
    });

    it('tracks unlock attempts independently per signer', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      expect(canUnlock('SGN-001')).toBe(false);
      expect(canUnlock('SGN-002')).toBe(true);
    });
  });

  describe('canResend', () => {
    it('returns true when no resend attempts have been made', () => {
      expect(canResend('SGN-001')).toBe(true);
    });

    it('returns true when under the daily limit', () => {
      incrementResend('SGN-001');
      expect(canResend('SGN-001')).toBe(true);

      incrementResend('SGN-001');
      expect(canResend('SGN-001')).toBe(true);
    });

    it('returns false after 3 resend attempts', () => {
      incrementResend('SGN-001');
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      expect(canResend('SGN-001')).toBe(false);
    });

    it('returns false for empty signer ID', () => {
      expect(canResend('')).toBe(false);
    });

    it('returns false for null signer ID', () => {
      expect(canResend(null)).toBe(false);
    });

    it('returns false for undefined signer ID', () => {
      expect(canResend(undefined)).toBe(false);
    });

    it('tracks resend attempts independently per signer', () => {
      incrementResend('SGN-001');
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      expect(canResend('SGN-001')).toBe(false);
      expect(canResend('SGN-002')).toBe(true);
    });
  });

  describe('incrementUnlock', () => {
    it('increments the unlock counter', () => {
      const result = incrementUnlock('SGN-001');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.remaining).toBe(2);
    });

    it('increments the counter on each call', () => {
      const result1 = incrementUnlock('SGN-001');
      expect(result1.count).toBe(1);
      expect(result1.remaining).toBe(2);

      const result2 = incrementUnlock('SGN-001');
      expect(result2.count).toBe(2);
      expect(result2.remaining).toBe(1);

      const result3 = incrementUnlock('SGN-001');
      expect(result3.count).toBe(3);
      expect(result3.remaining).toBe(0);
    });

    it('returns failure when max attempts reached', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      const result = incrementUnlock('SGN-001');

      expect(result.success).toBe(false);
      expect(result.count).toBe(3);
      expect(result.remaining).toBe(0);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Maximum unlock attempts');
    });

    it('returns error for empty signer ID', () => {
      const result = incrementUnlock('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Signer ID is required');
    });

    it('returns error for null signer ID', () => {
      const result = incrementUnlock(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for undefined signer ID', () => {
      const result = incrementUnlock(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('tracks unlock attempts independently from resend attempts', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      expect(getAttemptCount('SGN-001', 'unlock')).toBe(2);
      expect(getAttemptCount('SGN-001', 'resend')).toBe(0);
    });
  });

  describe('incrementResend', () => {
    it('increments the resend counter', () => {
      const result = incrementResend('SGN-001');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.remaining).toBe(2);
    });

    it('increments the counter on each call', () => {
      const result1 = incrementResend('SGN-001');
      expect(result1.count).toBe(1);
      expect(result1.remaining).toBe(2);

      const result2 = incrementResend('SGN-001');
      expect(result2.count).toBe(2);
      expect(result2.remaining).toBe(1);

      const result3 = incrementResend('SGN-001');
      expect(result3.count).toBe(3);
      expect(result3.remaining).toBe(0);
    });

    it('returns failure when max attempts reached', () => {
      incrementResend('SGN-001');
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      const result = incrementResend('SGN-001');

      expect(result.success).toBe(false);
      expect(result.count).toBe(3);
      expect(result.remaining).toBe(0);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Maximum resend attempts');
    });

    it('returns error for empty signer ID', () => {
      const result = incrementResend('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Signer ID is required');
    });

    it('returns error for null signer ID', () => {
      const result = incrementResend(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('tracks resend attempts independently from unlock attempts', () => {
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      expect(getAttemptCount('SGN-001', 'resend')).toBe(2);
      expect(getAttemptCount('SGN-001', 'unlock')).toBe(0);
    });
  });

  describe('getRemainingAttempts', () => {
    it('returns max attempts when no attempts have been made for unlock', () => {
      const remaining = getRemainingAttempts('SGN-001', 'unlock');

      expect(remaining).toBe(3);
    });

    it('returns max attempts when no attempts have been made for resend', () => {
      const remaining = getRemainingAttempts('SGN-001', 'resend');

      expect(remaining).toBe(3);
    });

    it('decrements remaining after each unlock attempt', () => {
      incrementUnlock('SGN-001');
      expect(getRemainingAttempts('SGN-001', 'unlock')).toBe(2);

      incrementUnlock('SGN-001');
      expect(getRemainingAttempts('SGN-001', 'unlock')).toBe(1);

      incrementUnlock('SGN-001');
      expect(getRemainingAttempts('SGN-001', 'unlock')).toBe(0);
    });

    it('decrements remaining after each resend attempt', () => {
      incrementResend('SGN-001');
      expect(getRemainingAttempts('SGN-001', 'resend')).toBe(2);

      incrementResend('SGN-001');
      expect(getRemainingAttempts('SGN-001', 'resend')).toBe(1);

      incrementResend('SGN-001');
      expect(getRemainingAttempts('SGN-001', 'resend')).toBe(0);
    });

    it('returns 0 for empty signer ID', () => {
      expect(getRemainingAttempts('', 'unlock')).toBe(0);
    });

    it('returns 0 for null signer ID', () => {
      expect(getRemainingAttempts(null, 'unlock')).toBe(0);
    });

    it('returns 0 for invalid action type', () => {
      expect(getRemainingAttempts('SGN-001', 'invalid')).toBe(0);
    });

    it('returns 0 for null action type', () => {
      expect(getRemainingAttempts('SGN-001', null)).toBe(0);
    });
  });

  describe('getAttemptMessage', () => {
    it('returns attempt 1 message for unlock when no attempts have been made', () => {
      const message = getAttemptMessage('SGN-001', 'unlock');

      expect(message.title).toBeDefined();
      expect(message.title).toContain('1');
      expect(message.message).toBeDefined();
      expect(message.message.length).toBeGreaterThan(0);
      expect(message.severity).toBe('warning');
    });

    it('returns attempt 2 message for unlock after 1 attempt', () => {
      incrementUnlock('SGN-001');

      const message = getAttemptMessage('SGN-001', 'unlock');

      expect(message.title).toBeDefined();
      expect(message.title).toContain('2');
      expect(message.message).toBeDefined();
      expect(message.severity).toBe('warning');
    });

    it('returns final attempt message for unlock after 2 attempts', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      const message = getAttemptMessage('SGN-001', 'unlock');

      expect(message.title).toBeDefined();
      expect(message.title.toLowerCase()).toContain('final');
      expect(message.message).toBeDefined();
      expect(message.severity).toBe('critical');
    });

    it('returns exhausted message for unlock after 3 attempts', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      const message = getAttemptMessage('SGN-001', 'unlock');

      expect(message.title).toBeDefined();
      expect(message.title.toLowerCase()).toContain('unavailable');
      expect(message.message).toBeDefined();
      expect(message.severity).toBe('critical');
    });

    it('returns attempt 1 message for resend when no attempts have been made', () => {
      const message = getAttemptMessage('SGN-001', 'resend');

      expect(message.title).toBeDefined();
      expect(message.title).toContain('1');
      expect(message.message).toBeDefined();
      expect(message.message.length).toBeGreaterThan(0);
    });

    it('returns attempt 2 message for resend after 1 attempt', () => {
      incrementResend('SGN-001');

      const message = getAttemptMessage('SGN-001', 'resend');

      expect(message.title).toBeDefined();
      expect(message.title).toContain('2');
      expect(message.message).toBeDefined();
    });

    it('returns final attempt message for resend after 2 attempts', () => {
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      const message = getAttemptMessage('SGN-001', 'resend');

      expect(message.title).toBeDefined();
      expect(message.title.toLowerCase()).toContain('final');
      expect(message.message).toBeDefined();
    });

    it('returns exhausted message for resend after 3 attempts', () => {
      incrementResend('SGN-001');
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      const message = getAttemptMessage('SGN-001', 'resend');

      expect(message.title).toBeDefined();
      expect(message.title.toLowerCase()).toContain('limit');
      expect(message.message).toBeDefined();
      expect(message.severity).toBe('critical');
    });

    it('returns empty message for empty signer ID', () => {
      const message = getAttemptMessage('', 'unlock');

      expect(message.title).toBe('');
      expect(message.message).toBe('');
      expect(message.severity).toBe('warning');
    });

    it('returns empty message for null signer ID', () => {
      const message = getAttemptMessage(null, 'unlock');

      expect(message.title).toBe('');
      expect(message.message).toBe('');
    });

    it('returns empty message for invalid action type', () => {
      const message = getAttemptMessage('SGN-001', 'invalid');

      expect(message.title).toBe('');
      expect(message.message).toBe('');
    });

    it('returns empty message for null action type', () => {
      const message = getAttemptMessage('SGN-001', null);

      expect(message.title).toBe('');
      expect(message.message).toBe('');
    });
  });

  describe('getAttemptCount', () => {
    it('returns 0 when no attempts have been made', () => {
      expect(getAttemptCount('SGN-001', 'unlock')).toBe(0);
      expect(getAttemptCount('SGN-001', 'resend')).toBe(0);
    });

    it('returns correct count after unlock attempts', () => {
      incrementUnlock('SGN-001');
      expect(getAttemptCount('SGN-001', 'unlock')).toBe(1);

      incrementUnlock('SGN-001');
      expect(getAttemptCount('SGN-001', 'unlock')).toBe(2);

      incrementUnlock('SGN-001');
      expect(getAttemptCount('SGN-001', 'unlock')).toBe(3);
    });

    it('returns correct count after resend attempts', () => {
      incrementResend('SGN-001');
      expect(getAttemptCount('SGN-001', 'resend')).toBe(1);

      incrementResend('SGN-001');
      expect(getAttemptCount('SGN-001', 'resend')).toBe(2);
    });

    it('returns 0 for empty signer ID', () => {
      expect(getAttemptCount('', 'unlock')).toBe(0);
    });

    it('returns 0 for null signer ID', () => {
      expect(getAttemptCount(null, 'unlock')).toBe(0);
    });

    it('returns 0 for invalid action type', () => {
      expect(getAttemptCount('SGN-001', 'invalid')).toBe(0);
    });

    it('returns 0 for null action type', () => {
      expect(getAttemptCount('SGN-001', null)).toBe(0);
    });
  });

  describe('daily reset at midnight', () => {
    it('resets unlock counter when the calendar day changes', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      expect(canUnlock('SGN-001')).toBe(false);

      // Simulate a day change by manipulating the stored resetDate
      const rateLimitData = JSON.parse(localStorage.getItem('scm_rate_limits'));
      if (rateLimitData && rateLimitData['SGN-001'] && rateLimitData['SGN-001'].unlock) {
        rateLimitData['SGN-001'].unlock.resetDate = '2020-01-01';
        localStorage.setItem('scm_rate_limits', JSON.stringify(rateLimitData));
      }

      // After the day change, the counter should be reset
      expect(canUnlock('SGN-001')).toBe(true);
      expect(getAttemptCount('SGN-001', 'unlock')).toBe(0);
      expect(getRemainingAttempts('SGN-001', 'unlock')).toBe(3);
    });

    it('resets resend counter when the calendar day changes', () => {
      incrementResend('SGN-001');
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      expect(canResend('SGN-001')).toBe(false);

      // Simulate a day change by manipulating the stored resetDate
      const rateLimitData = JSON.parse(localStorage.getItem('scm_rate_limits'));
      if (rateLimitData && rateLimitData['SGN-001'] && rateLimitData['SGN-001'].resend) {
        rateLimitData['SGN-001'].resend.resetDate = '2020-01-01';
        localStorage.setItem('scm_rate_limits', JSON.stringify(rateLimitData));
      }

      // After the day change, the counter should be reset
      expect(canResend('SGN-001')).toBe(true);
      expect(getAttemptCount('SGN-001', 'resend')).toBe(0);
      expect(getRemainingAttempts('SGN-001', 'resend')).toBe(3);
    });

    it('allows incrementing again after daily reset for unlock', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      expect(incrementUnlock('SGN-001').success).toBe(false);

      // Simulate a day change
      const rateLimitData = JSON.parse(localStorage.getItem('scm_rate_limits'));
      if (rateLimitData && rateLimitData['SGN-001'] && rateLimitData['SGN-001'].unlock) {
        rateLimitData['SGN-001'].unlock.resetDate = '2020-01-01';
        localStorage.setItem('scm_rate_limits', JSON.stringify(rateLimitData));
      }

      const result = incrementUnlock('SGN-001');
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.remaining).toBe(2);
    });

    it('allows incrementing again after daily reset for resend', () => {
      incrementResend('SGN-001');
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      expect(incrementResend('SGN-001').success).toBe(false);

      // Simulate a day change
      const rateLimitData = JSON.parse(localStorage.getItem('scm_rate_limits'));
      if (rateLimitData && rateLimitData['SGN-001'] && rateLimitData['SGN-001'].resend) {
        rateLimitData['SGN-001'].resend.resetDate = '2020-01-01';
        localStorage.setItem('scm_rate_limits', JSON.stringify(rateLimitData));
      }

      const result = incrementResend('SGN-001');
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.remaining).toBe(2);
    });
  });

  describe('resetRateLimit', () => {
    it('resets unlock attempts for a specific signer', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      expect(getAttemptCount('SGN-001', 'unlock')).toBe(2);

      const result = resetRateLimit('SGN-001', 'unlock');
      expect(result).toBe(true);

      expect(getAttemptCount('SGN-001', 'unlock')).toBe(0);
      expect(canUnlock('SGN-001')).toBe(true);
    });

    it('resets resend attempts for a specific signer', () => {
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      expect(getAttemptCount('SGN-001', 'resend')).toBe(2);

      const result = resetRateLimit('SGN-001', 'resend');
      expect(result).toBe(true);

      expect(getAttemptCount('SGN-001', 'resend')).toBe(0);
      expect(canResend('SGN-001')).toBe(true);
    });

    it('resets both unlock and resend when no action type specified', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementResend('SGN-001');
      incrementResend('SGN-001');

      const result = resetRateLimit('SGN-001');
      expect(result).toBe(true);

      expect(getAttemptCount('SGN-001', 'unlock')).toBe(0);
      expect(getAttemptCount('SGN-001', 'resend')).toBe(0);
    });

    it('does not affect other signers when resetting', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-002');

      resetRateLimit('SGN-001', 'unlock');

      expect(getAttemptCount('SGN-001', 'unlock')).toBe(0);
      expect(getAttemptCount('SGN-002', 'unlock')).toBe(1);
    });

    it('returns false for empty signer ID', () => {
      expect(resetRateLimit('')).toBe(false);
    });

    it('returns false for null signer ID', () => {
      expect(resetRateLimit(null)).toBe(false);
    });

    it('returns true when resetting a signer with no existing records', () => {
      expect(resetRateLimit('SGN-NONEXISTENT')).toBe(true);
    });
  });

  describe('clearAllRateLimits', () => {
    it('clears all rate limit data', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-002');
      incrementResend('SGN-001');
      incrementResend('SGN-003');

      const result = clearAllRateLimits();
      expect(result).toBe(true);

      expect(getAttemptCount('SGN-001', 'unlock')).toBe(0);
      expect(getAttemptCount('SGN-002', 'unlock')).toBe(0);
      expect(getAttemptCount('SGN-001', 'resend')).toBe(0);
      expect(getAttemptCount('SGN-003', 'resend')).toBe(0);

      expect(canUnlock('SGN-001')).toBe(true);
      expect(canResend('SGN-001')).toBe(true);
    });
  });

  describe('independent tracking per signer and action type', () => {
    it('tracks unlock and resend independently for the same signer', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      incrementResend('SGN-001');

      expect(canUnlock('SGN-001')).toBe(false);
      expect(canResend('SGN-001')).toBe(true);
      expect(getAttemptCount('SGN-001', 'unlock')).toBe(3);
      expect(getAttemptCount('SGN-001', 'resend')).toBe(1);
    });

    it('tracks attempts independently across different signers', () => {
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');
      incrementUnlock('SGN-001');

      incrementUnlock('SGN-002');

      expect(canUnlock('SGN-001')).toBe(false);
      expect(canUnlock('SGN-002')).toBe(true);
      expect(getRemainingAttempts('SGN-001', 'unlock')).toBe(0);
      expect(getRemainingAttempts('SGN-002', 'unlock')).toBe(2);
    });
  });

  describe('end-to-end rate limiting flow', () => {
    it('supports a complete unlock rate limiting flow', () => {
      // Initial state
      expect(canUnlock('SGN-006')).toBe(true);
      expect(getRemainingAttempts('SGN-006', 'unlock')).toBe(3);
      expect(getAttemptCount('SGN-006', 'unlock')).toBe(0);

      // First attempt
      const msg1 = getAttemptMessage('SGN-006', 'unlock');
      expect(msg1.title).toContain('1');

      const result1 = incrementUnlock('SGN-006');
      expect(result1.success).toBe(true);
      expect(result1.count).toBe(1);
      expect(result1.remaining).toBe(2);
      expect(canUnlock('SGN-006')).toBe(true);

      // Second attempt
      const msg2 = getAttemptMessage('SGN-006', 'unlock');
      expect(msg2.title).toContain('2');

      const result2 = incrementUnlock('SGN-006');
      expect(result2.success).toBe(true);
      expect(result2.count).toBe(2);
      expect(result2.remaining).toBe(1);
      expect(canUnlock('SGN-006')).toBe(true);

      // Third (final) attempt
      const msg3 = getAttemptMessage('SGN-006', 'unlock');
      expect(msg3.severity).toBe('critical');

      const result3 = incrementUnlock('SGN-006');
      expect(result3.success).toBe(true);
      expect(result3.count).toBe(3);
      expect(result3.remaining).toBe(0);
      expect(canUnlock('SGN-006')).toBe(false);

      // Exhausted
      const msgExhausted = getAttemptMessage('SGN-006', 'unlock');
      expect(msgExhausted.severity).toBe('critical');
      expect(msgExhausted.title.toLowerCase()).toContain('unavailable');

      const result4 = incrementUnlock('SGN-006');
      expect(result4.success).toBe(false);
      expect(result4.error).toBeDefined();
    });

    it('supports a complete resend rate limiting flow', () => {
      // Initial state
      expect(canResend('SGN-005')).toBe(true);
      expect(getRemainingAttempts('SGN-005', 'resend')).toBe(3);

      // First attempt
      const msg1 = getAttemptMessage('SGN-005', 'resend');
      expect(msg1.title).toContain('1');

      const result1 = incrementResend('SGN-005');
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(2);

      // Second attempt
      const result2 = incrementResend('SGN-005');
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(1);

      // Third attempt
      const result3 = incrementResend('SGN-005');
      expect(result3.success).toBe(true);
      expect(result3.remaining).toBe(0);
      expect(canResend('SGN-005')).toBe(false);

      // Exhausted
      const result4 = incrementResend('SGN-005');
      expect(result4.success).toBe(false);

      const msgExhausted = getAttemptMessage('SGN-005', 'resend');
      expect(msgExhausted.severity).toBe('critical');
    });

    it('supports reset and retry flow', () => {
      // Exhaust unlock attempts
      incrementUnlock('SGN-006');
      incrementUnlock('SGN-006');
      incrementUnlock('SGN-006');
      expect(canUnlock('SGN-006')).toBe(false);

      // Reset
      resetRateLimit('SGN-006', 'unlock');
      expect(canUnlock('SGN-006')).toBe(true);
      expect(getAttemptCount('SGN-006', 'unlock')).toBe(0);
      expect(getRemainingAttempts('SGN-006', 'unlock')).toBe(3);

      // Can increment again
      const result = incrementUnlock('SGN-006');
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });
  });
});