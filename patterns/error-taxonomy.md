# Error Taxonomy

A practical taxonomy for handling integration errors consistently across APIs, webhooks, and async workers.

## HTTP Error Matrix

| Class | Meaning | Retry? | Typical Action |
|------|---------|--------|----------------|
| **2xx** | Success | No | Continue flow; log success metrics |
| **400** | Bad request | No | Fix payload/schema; alert if persistent |
| **401/403** | Auth/permission issue | No (until fixed) | Rotate token/permissions; alert immediately |
| **404** | Resource missing | Usually no | Verify resource lifecycle; reconcile if needed |
| **409** | Conflict (state/version/idempotency) | Sometimes | Resolve conflict policy; retry if safe |
| **422** | Validation failed | No | Correct data or mapping rules |
| **429** | Rate limited | Yes | Retry with `Retry-After`, throttle clients |
| **5xx** | Provider/server failure | Yes | Exponential backoff + jitter, dead-letter after max attempts |

## Integration-Specific Categories

- **Transport errors**: DNS, timeout, TLS, connection reset.
- **Protocol errors**: Malformed JSON, missing required headers, invalid signature.
- **Semantic errors**: Valid request format but invalid business meaning.
- **State errors**: Out-of-order events, stale version, deleted resource.
- **Capacity errors**: Queue saturation, worker backlog, provider rate limiting.

## Recommended Handling Policy

1. Classify every failure into a category above.
2. Attach a stable error code for observability (e.g., `INT_AUTH_401`, `INT_RATE_429`).
3. Decide retry policy by class, not ad-hoc per endpoint.
4. Route non-retryable failures to human/ops queue with context.
5. Periodically review top error classes and remove recurring root causes.
