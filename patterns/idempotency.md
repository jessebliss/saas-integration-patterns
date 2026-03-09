# Idempotency

Ensuring that repeating the same operation does not change the outcome beyond the first application.

## Why It Matters

- **Retries**: Network or server errors cause clients to retry; without idempotency, create requests can create duplicates.
- **Webhooks**: Providers retry on 5xx or timeout; the same event may be delivered multiple times.
- **User behavior**: Double-clicks or back-button resubmission can send the same request twice.

## Client-Provided Idempotency Key

- **Header**: e.g. `Idempotency-Key: <uuid>` or `X-Idempotency-Key`.
- **Semantics**: For a given key, the server executes the operation at most once; subsequent requests with the same key return the same response (and do not re-apply side effects).
- **Scope**: Key is unique per operation type and resource (e.g., per “create order”); key is not a business identifier.
- **TTL**: Keys are stored for a limited time (e.g., 24 hours); after that, the same key may be treated as new (document this).

## Server Behavior

1. Receive request with `Idempotency-Key`.
2. Look up key in store (DB or cache).
3. **If key exists**: Return stored response (same status and body as first time); do not re-run business logic.
4. **If key new**: Run business logic; before committing, store key → response; then commit and return response.
5. Use a single transaction or lock so two concurrent requests with the same key do not both run.

## Event-Based Idempotency (Webhooks)

- Use provider’s `event_id` or `delivery_id` as the idempotency key.
- “Processed” = stored as successfully handled; duplicate deliveries are acknowledged but not processed again.
- Store event_id with a TTL longer than the provider’s retry window.

## Key Storage

- **In-memory**: Lost on restart; only for single-instance or best-effort.
- **DB**: Durable; use unique constraint on key; prune old keys by timestamp.
- **Cache (e.g., Redis)**: Fast; set TTL; ensure atomic check-and-set for key.

## Example Response Replay

First request (201 Created):

```json
{ "id": "ord_123", "status": "created" }
```

Replay for same key: return same 201 and same body. Do not create a second order.
