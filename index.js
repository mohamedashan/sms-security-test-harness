/**
 * Safe SMS test harness.
 * This module never contacts a real SMS provider. It simulates delivery in memory
 * so applications can test OTP flows, opt-outs, consent, and abuse controls.
 */

export class SmsTestHarness {
  constructor({ clock = () => Date.now(), maxPerWindow = 3, windowMs = 60_000 } = {}) {
    this.clock = clock;
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
    this.messages = [];
    this.consents = new Map();
    this.optedOut = new Set();
    this.attempts = new Map();
  }

  setConsent(phone, allowed = true) {
    this.consents.set(normalizePhone(phone), Boolean(allowed));
    return { phone: normalizePhone(phone), consent: Boolean(allowed) };
  }

  optOut(phone) {
    const normalized = normalizePhone(phone);
    this.optedOut.add(normalized);
    return { phone: normalized, optedOut: true };
  }

  resetOptOut(phone) {
    this.optedOut.delete(normalizePhone(phone));
  }

  send({ to, body, purpose = 'test' }) {
    const phone = normalizePhone(to);
    const text = String(body || '').trim();
    if (!/^\+?[1-9]\d{7,14}$/.test(phone)) return reject('invalid_phone', 'Use an E.164-like test number.');
    if (!text) return reject('empty_body', 'Message body is required.');
    if (!this.consents.get(phone)) return reject('no_consent', 'Recipient has not granted test consent.');
    if (this.optedOut.has(phone)) return reject('opted_out', 'Recipient has opted out.');

    const now = this.clock();
    const recent = (this.attempts.get(phone) || []).filter(timestamp => now - timestamp < this.windowMs);
    if (recent.length >= this.maxPerWindow) return reject('rate_limited', `Limit is ${this.maxPerWindow} messages per test window.`);
    this.attempts.set(phone, [...recent, now]);

    const message = { id: `test_${this.messages.length + 1}`, to: phone, body: text, purpose, status: 'simulated', createdAt: new Date(now).toISOString() };
    this.messages.push(message);
    return { accepted: true, simulated: true, message };
  }

  issueOtp(to, { code = '123456', ttlMs = 300_000 } = {}) {
    const result = this.send({ to, body: `[TEST OTP] Your verification code is ${code}.`, purpose: 'otp' });
    if (!result.accepted) return result;
    return { ...result, otp: { code: String(code), expiresAt: new Date(this.clock() + ttlMs).toISOString() } };
  }

  report() {
    return {
      simulatedMessages: this.messages.length,
      delivered: this.messages.filter(message => message.status === 'simulated').length,
      blocked: this.messages.length === 0 ? 0 : 0,
      optedOutRecipients: this.optedOut.size,
      consentedRecipients: [...this.consents.values()].filter(Boolean).length
    };
  }
}

export function normalizePhone(phone) { return String(phone || '').replace(/[\s()-]/g, ''); }
function reject(reason, detail) { return { accepted: false, simulated: true, reason, detail }; }
