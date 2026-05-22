# Rate Limit Handling

SaaS providers enforce per-account or per-app limits. Integration clients should treat rate limits as expected behavior, not exceptional failures.

## Client behavior

1. Read `Retry-After` when present and sleep at least that duration.
2. Apply exponential backoff with jitter for repeated `429` responses.
3. Cap retry attempts and route persistent failures to a dead-letter queue.
4. Prefer bulk endpoints when available to reduce request volume.

## Server behavior (your webhook/API)

- Return `429` with `Retry-After` when downstream capacity is saturated.
- Keep webhook acknowledgment fast; queue heavy work asynchronously.
- Emit metrics: `rate_limit_hits`, `retry_count`, `dlq_depth`.

## Operational playbook

| Signal | Likely cause | Action |
|--------|--------------|--------|
| Sustained `429` from provider | Sync job too aggressive | Lower concurrency, widen sync window |
| Spike in client retries | Missing backoff | Enforce shared retry policy library |
| DLQ growth after limit events | Non-idempotent retries | Verify idempotency keys and dedupe store |

See `examples/rate-limit-response-headers.json` for a sample provider response.
