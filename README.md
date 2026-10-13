# SMS Security Test Harness

A **local-only simulator** for authorized testing of SMS workflows. It models consent gating, opt-out handling, number validation, per-number rate limits, OTP issuance, and simulated delivery reports.

It never contacts real phone numbers or SMS providers and contains no bulk-send, provider transport, target discovery, or abuse functionality.

## Run

```bash
npm install
npm test
```

See `index.js` for the harness API and `index.test.js` for examples.
