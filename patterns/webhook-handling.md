# Webhook Handling

Patterns for receiving and processing webhooks from SaaS providers reliably.

## Receiving the Request

1. **Verify signature** using the provider’s secret (e.g., HMAC of body). Reject with 401/403 if invalid.
2. **Parse body** once; pass parsed payload to queue or handler. Do not re-read body.
3. **Extract idempotency key**: Use `event_id`, `delivery_id`, or similar from payload or header.
4. **Respond quickly**: Return 2xx within a few seconds. Processing happens asynchronously.

## Idempotency

- Before processing, check if `event_id` (or equivalent) was already processed.
- If yes: return success from API and skip or no-op in worker (return same logical result).
- If no: enqueue and process; store `event_id` as processed after successful handling.
- TTL: Keep processed IDs for at least the provider’s retry window (e.g., 24–72 hours).

## Retries and Status Codes

- **2xx**: Provider considers delivery successful; they will not retry.
- **4xx**: Client error; provider may not retry. Use for bad signature, bad payload, or duplicate (if you want to signal “already handled”).
- **5xx / timeout**: Transient; provider will retry. Use only when you did not accept the payload (e.g., queue full, internal error).

## Idempotent Processing

- Worker should check again by `event_id` before applying side effects (DB write, API call).
- Use a single transaction or conditional write so duplicate worker runs do not create duplicate records.
- For updates, use “last write wins” or version field to avoid overwriting newer data.

## Security

- HTTPS only.
- Validate signature on every request.
- Do not expose internal errors in response body; log them server-side.
- Optional: IP allowlist if provider documents it.

## Example Flow

```
Request → Verify signature → Parse → Check event_id
    → If seen: 200 OK, exit
    → If new: Enqueue payload → 200 OK
Worker: Dequeue → Check event_id again → Process → Mark event_id processed
```
