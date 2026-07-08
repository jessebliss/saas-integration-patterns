# Circuit Breaker Pattern

Protect your platform and partner APIs from cascading failures when a downstream integration becomes unhealthy.

## States

| State | Behavior |
|-------|----------|
| `closed` | Normal traffic; failures are counted |
| `open` | Fast-fail requests without calling downstream |
| `half_open` | Limited probe traffic to test recovery |

## Transition rules

1. **Closed → Open** when failure rate exceeds threshold in rolling window.
2. **Open → Half-open** after cooldown timer expires.
3. **Half-open → Closed** when probe requests succeed consecutively.
4. **Half-open → Open** on probe failure.

## Recommended defaults

- Window: 60 seconds
- Failure threshold: 50% with minimum 20 requests
- Cooldown: 30 seconds
- Half-open probe limit: 3 requests

## Integration-specific guidance

- Use per-integration breakers (not one global breaker).
- Emit `circuit_state` metric and alert on sustained `open`.
- Queue or dead-letter work while open; do not drop events silently.

See `examples/circuit-breaker-state.json` for a sample breaker snapshot.
