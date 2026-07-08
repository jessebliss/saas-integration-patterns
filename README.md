# SaaS Integration Patterns

A reference for integrating SaaS platforms using APIs, webhooks, and event-driven workflows. This repository documents common patterns, reliability considerations, and example payloads—oriented toward technical product and platform design.

---

## Overview

SaaS integrations move data and events between systems (e.g., CRM ↔ support, billing ↔ provisioning, marketplace ↔ fulfillment). Poor integration design leads to duplicate records, missed events, and fragile, hard-to-operate pipelines. This doc focuses on **patterns that improve reliability, observability, and maintainability**.

### Core Concepts

- **REST synchronization**: Poll or push data on a schedule or on demand; often used for bulk sync and config.
- **Webhook-based events**: Provider sends HTTP callbacks when events occur; low latency, requires idempotency and retry handling.
- **Batch reconciliation**: Periodic full or delta sync to correct drift and fill gaps.
- **Message queue workflows**: Decouple producers and consumers; support retries, ordering, and backpressure.

---

## REST Synchronization Patterns

### Pull (client polls provider)

```
┌─────────────┐                    ┌─────────────┐
│   Your     │   GET /resources    │   SaaS      │
│   System   │ ──────────────────▶ │   Provider  │
│            │ ◀────────────────── │             │
│            │   200 + list/page   │             │
└─────────────┘                    └─────────────┘
```

- **Use when**: You need to sync entities (users, accounts, products) on a schedule or after a trigger.
- **Design**: Use cursor- or page-based pagination; respect `Retry-After` and rate limits; store last sync token for incremental sync when supported.
- **Idempotency**: Upsert by provider’s stable ID so repeated syncs do not create duplicates.

### Push (provider calls you)

- **Use when**: Provider supports webhooks or outbound REST calls to your endpoint.
- **Design**: Validate signature; respond 2xx quickly; process asynchronously; idempotent by event ID.

---

## Webhook-Based Event Systems

```
┌─────────────┐                    ┌─────────────┐
│   SaaS      │   POST /webhook    │   Your      │
│   Provider  │ ──────────────────▶ │   Endpoint │
│             │   (event payload)   │             │
│             │ ◀────────────────── │  200 OK    │
│             │   (quick ack)       │             │
└─────────────┘                    └──────┬──────┘
                                         │
                                         ▼
                                 ┌──────────────┐
                                 │ Queue /      │
                                 │ Async        │
                                 │ Processing   │
                                 └──────────────┘
```

- **Acknowledge quickly**: Return 2xx within a few seconds so the provider does not retry unnecessarily.
- **Process async**: Enqueue the payload; process in a worker. Do not do heavy work in the request handler.
- **Idempotency**: Use `event_id` (or equivalent) as idempotency key; ignore or dedupe duplicates.
- **Signature verification**: Validate `X-Webhook-Signature` (or similar) before processing.
- **Retries**: Providers often retry with backoff; your endpoint must be idempotent and handle out-of-order delivery when applicable.

See `examples/webhook-payload-example.json` for a sample payload and `patterns/webhook-handling.md` for handling details.

---

## Batch Reconciliation

Even with webhooks, events can be missed (endpoint down, network issues, provider bugs). Periodic reconciliation corrects drift.

```
┌─────────────────────────────────────────────────────────────┐
│  RECONCILIATION FLOW                                         │
│                                                              │
│  1. Fetch full list (or delta since last_run) from provider  │
│  2. Compare with local state by provider ID                  │
│  3. Detect: missing locally, missing remotely, out-of-date   │
│  4. Apply updates / create / archive per policy               │
│  5. Store new last_run / cursor                              │
└─────────────────────────────────────────────────────────────┘
```

- **Frequency**: Balance freshness vs. API cost and rate limits (e.g., nightly or hourly).
- **Scope**: Full sync vs. delta (if provider supports filtered or timestamp-based queries).
- **Conflict resolution**: Define rules when local and remote both changed (e.g., last-write-wins, or flag for human review).

---

## Message Queue Workflows

For high volume or multi-step flows, use a queue between ingestion and processing:

```
  Provider          Your API           Queue           Workers
     │                  │                 │                │
     │  webhook/API     │                 │                │
     │ ────────────────▶│                 │                │
     │                  │  enqueue        │                │
     │                  │ ───────────────▶│                │
     │                  │  200            │   poll / push  │
     │◀─────────────────│                 │ ──────────────▶│
     │                  │                 │                │ process
     │                  │                 │                │ idempotent
```

- **Benefits**: Decoupling, retries with backoff, dead-letter for failures, backpressure.
- **Ordering**: Use partitioning by entity ID when ordering per entity matters; accept out-of-order across entities.
- **Idempotency**: Still required in workers; queue delivery can be at-least-once.

---

## API Reliability Considerations

### Idempotency

- **Problem**: Duplicate requests (retries, user double-click) can create duplicate records or double charges.
- **Solution**: Client sends `Idempotency-Key` (e.g., UUID) on create/update; server returns same response for same key and does not apply the operation twice.
- **Scope**: Per key, per endpoint, with TTL (e.g., 24 hours). Store key → response for replay.

### Retry Logic

- **Client**: Retry on 5xx and 429; use exponential backoff; cap retries and jitter.
- **Server**: For webhooks, return 2xx only after accepting the payload (e.g., after enqueue); return 5xx for transient failures so provider retries.
- **Document**: Which status codes are retried; max attempts; backoff policy.

### Rate Limits

- **Understand**: Per-account, per-app, per-endpoint; often expressed as requests per minute or per second.
- **Handle**: Honor `Retry-After`; throttle client requests; use bulk endpoints where available.
- **Design**: Queue non-urgent calls; prioritize critical path; consider rate-limit headers in responses.

### Schema Versioning

- **API versioning**: URL path (`/v1/`) or header (`Accept-Version`); support at least one previous version during deprecation.
- **Webhook payloads**: Include `schema_version` or `event_version`; evolve with additive changes when possible; document breaking changes and migration.
- **Backward compatibility**: New optional fields are safe; changing types or required fields is breaking—version and communicate.

### Error Handling Taxonomy

A shared error taxonomy keeps retries, alerts, and triage consistent across integrations.

- Treat **429** and **5xx** as retryable (with policy limits).
- Treat most **4xx** as non-retryable and route to data/config fixes.
- Use stable internal error codes (e.g., `INT_RATE_429`) for dashboards and runbooks.

See `patterns/error-taxonomy.md` and `examples/dead-letter-event.json` for a practical model.

### Observability and replay

- **Tracing**: Propagate a correlation ID across webhook receipt, queues, workers, and outbound API calls. See `patterns/correlation-and-tracing.md`.
- **Backfill / replay**: Re-drive historical work safely with idempotency and rate-limit discipline. See `patterns/backfill-and-replay.md`.

### Integration Monitoring

- **Metrics**: Request count, latency, error rate by endpoint and integration; webhook delivery success and retries.
- **Alerts**: Spike in 5xx, sustained 429, dead-letter growth, reconciliation drift.
- **Logging**: Correlation ID across request → queue → worker; log event_id and idempotency key for debugging.
- **Dashboards**: Per-integration health; sync lag; queue depth.

See `patterns/` for detailed pattern write-ups and `examples/` for sample requests and webhook payloads. For provider throttling behavior, see `patterns/rate-limit-handling.md`. For downstream failure isolation, see `patterns/circuit-breaker.md`.

---

## Repository Structure

```
saas-integration-patterns/
├── README.md                    # This file
├── patterns/
│   ├── webhook-handling.md      # Webhook receipt, verification, idempotency
│   ├── idempotency.md           # Idempotency keys and replay
│   ├── retry-and-backoff.md     # Client and server retry behavior
│   ├── schema-versioning.md     # API and payload versioning
│   ├── error-taxonomy.md        # Retry matrix and failure classes
│   ├── correlation-and-tracing.md # End-to-end correlation and tracing
│   ├── backfill-and-replay.md   # Historical replay without duplicates
│   ├── rate-limit-handling.md   # 429 handling, backoff, and ops playbook
│   └── circuit-breaker.md       # Fast-fail protection for unhealthy integrations
├── examples/
│   ├── webhook-payload-example.json
│   ├── api-request-idempotency.json
│   ├── reconciliation-state-example.json
│   ├── dead-letter-event.json
│   ├── rate-limit-response-headers.json
│   └── circuit-breaker-state.json
└── diagrams/
    └── integration-topologies.md   # ASCII diagrams for common topologies
```

---

## Related Repositories

- **ai-document-ingestion-workflow**: Document pipeline that may consume webhooks (e.g., new document) and call SaaS APIs (e.g., CRM record creation).
- **ai-product-workflow-experiments**: Product thinking on workflows that combine AI and integrations.

---

## Quality Checks

Run local markdown-link validation and tests:

```bash
node tools/validate-markdown-links.mjs
node --test tests/*.test.mjs
```
