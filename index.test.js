import { describe, expect, it } from 'vitest';
import { SmsTestHarness } from './index.js';

describe('SmsTestHarness (local simulation only)', () => {
  it('requires consent before simulated delivery', () => {
    const lab = new SmsTestHarness();
    expect(lab.send({ to: '+15551234567', body: 'hello' }).reason).toBe('no_consent');
    lab.setConsent('+15551234567');
    expect(lab.send({ to: '+15551234567', body: 'hello' }).accepted).toBe(true);
  });

  it('blocks opted-out recipients', () => {
    const lab = new SmsTestHarness();
    lab.setConsent('+15551234567');
    lab.optOut('+15551234567');
    expect(lab.send({ to: '+15551234567', body: 'hello' }).reason).toBe('opted_out');
  });

  it('enforces a per-number test rate limit', () => {
    let now = 1_000;
    const lab = new SmsTestHarness({ clock: () => now, maxPerWindow: 2, windowMs: 10_000 });
    lab.setConsent('+15551234567');
    expect(lab.send({ to: '+15551234567', body: 'one' }).accepted).toBe(true);
    expect(lab.send({ to: '+15551234567', body: 'two' }).accepted).toBe(true);
    expect(lab.send({ to: '+15551234567', body: 'three' }).reason).toBe('rate_limited');
    now += 10_001;
    expect(lab.send({ to: '+15551234567', body: 'after window' }).accepted).toBe(true);
  });

  it('simulates OTP issuance without sending a real SMS', () => {
    const lab = new SmsTestHarness();
    lab.setConsent('+15551234567');
    const result = lab.issueOtp('+15551234567', { code: '654321' });
    expect(result.simulated).toBe(true);
    expect(result.otp.code).toBe('654321');
    expect(result.message.status).toBe('simulated');
  });

  it('rejects malformed numbers and empty messages', () => {
    const lab = new SmsTestHarness();
    expect(lab.send({ to: '123', body: 'hello' }).reason).toBe('invalid_phone');
    expect(lab.send({ to: '+15551234567', body: '' }).reason).toBe('empty_body');
  });
});
