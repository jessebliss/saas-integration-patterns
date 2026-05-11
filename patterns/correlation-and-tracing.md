# Correlation and Tracing

End-to-end traceability across HTTP, webhooks, queues, and workers so incidents are debuggable and SLAs are measurable.

## Correlation ID

- **Generate** at the outermost ingress (API gateway or first handler): a unique string per logical request (e.g., UUID).
- **Propagate** in logs and outbound calls:
  - HTTP header: `X-Correlation-ID` or `traceparent` (W3C Trace Context).
  - Message envelope: `correlation_id` on every queue message derived from the webhook or API call.
- **Return** optionally in API responses (header or body) for support tickets.

## What to log together

- `correlation_id`, `integration_id`, `tenant_id` (if multi-tenant)
- `event_id` / `idempotency_key` where applicable
- HTTP status, latency, retry attempt number
- Queue message ID and dead-letter reason

## Trace context (optional)

When using OpenTelemetry or similar:

- Start a span at webhook receipt; child spans for enqueue, worker processing, and outbound SaaS API calls.
- Attach the same trace ID to logs via structured logging.

## Dashboards

- P95 latency by integration and by hop (ingress → queue → worker → provider).
- Error rate segmented by `error.code` (see `patterns/error-taxonomy.md`).
- Top N correlation IDs for a spike investigation (sampled).

## Privacy

- Do not put PII in correlation IDs or span names; keep payloads in restricted log tiers.
