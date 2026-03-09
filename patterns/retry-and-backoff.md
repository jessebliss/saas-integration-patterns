# Retry and Backoff

Consistent retry behavior for API clients and webhook receivers.

## Client-Side Retries

### When to Retry

- **5xx** server errors (transient).
- **429** Too Many Requests (rate limit).
- **408** Request Timeout.
- **Network errors**: connection reset, timeout, DNS failure.
- **Do not retry**: 4xx (except 429) for normal requests—indicates bad request or auth.

### Backoff Strategy

- **Exponential backoff**: Wait 1s, 2s, 4s, … (or 2^n) before retry.
- **Jitter**: Add random jitter (e.g., 0–25% of delay) to avoid thundering herd.
- **Cap**: Maximum delay (e.g., 30s or 60s).
- **Max attempts**: Stop after N attempts (e.g., 5); then fail or send to dead-letter.

### Headers

- **Retry-After**: If provider sends it (429 or 503), use it for the next retry delay when present.
- **Idempotency-Key**: Always send the same key on retries for create/update so server can safely dedupe.

## Server-Side (Webhook Receiver)

- **Quick 2xx**: Return 2xx only after you have durably accepted the payload (e.g., written to queue). Then provider will not retry.
- **5xx on failure**: If you cannot accept (queue full, DB down), return 5xx so provider retries.
- **Avoid long processing in request**: Do not do heavy work before responding; defer to async worker.

## Configuration

Make retry policy configurable:

- Enabled / disabled.
- Max attempts.
- Initial delay and multiplier.
- Max delay.
- Retryable status codes (and optionally non-retryable ones).

Document the policy in API docs and integration guides.
