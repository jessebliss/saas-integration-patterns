# Backfill and Replay

Patterns for re-processing historical data or replaying failed events without duplicating side effects.

## When to use

- **Backfill**: Initial migration, new field mapping, or fixing a systematic bug across a date range.
- **Replay**: Single event or small batch failed after durable accept (e.g., worker bug); fix and re-run.

## Preconditions

- **Idempotency** everywhere side effects occur (`patterns/idempotency.md`).
- **Stable keys**: `event_id` for webhooks; business keys for REST upserts.
- **Durable accept boundary**: Only replay after the payload is stored (queue or object store).

## Replay strategies

| Strategy | Use when | Notes |
|----------|----------|--------|
| Same `event_id`, re-drive worker | Logic bug fixed | Worker must no-op if already successfully processed |
| Re-enqueue copy with new `replay_id` | Need audit trail of replay | Link `replay_id` → original `event_id` in logs |
| Pull-based backfill | No events exist; only API history | Cursor/time window; compare to local state (`README` reconciliation section) |

## Rate limits and fairness

- Throttle backfill jobs so live traffic keeps priority.
- Use separate queues or concurrency caps for “bulk” vs “real-time”.

## Verification

- Sample compare before/after for a subset of entities.
- Monitor dead-letter and duplicate-detection metrics during backfill.
- Define a rollback plan (stop job, revert mapping version) before starting large replays.
