# Schema Versioning

Managing backward and forward compatibility for APIs and webhook payloads.

## API Versioning

### Options

- **URL path**: `/v1/orders`, `/v2/orders`. Clear and cache-friendly.
- **Header**: `Accept-Version: 1` or `X-API-Version: 1`. Keeps URL stable.
- **Query**: `?version=1`. Less common for REST; can be ambiguous with other params.

Choose one and use it consistently. Path versioning is widely used and easy to reason about.

### Deprecation

- Announce deprecation in advance (e.g., 6–12 months).
- Support at least the current and previous major version during transition.
- Return `Deprecation` or `Sunset` headers; document in changelog and status page.
- Provide migration guide and, if possible, compatibility layer or adapter.

## Webhook Payload Versioning

- **Version field**: Include `schema_version`, `event_version`, or `version` in every payload so consumers can branch.
- **Additive changes**: New optional fields are backward compatible; old clients ignore them.
- **Breaking changes**: New required field, renamed/removed field, or type change = new version. Emit under new version and document migration.
- **Multiple versions**: During transition, some providers send both old and new version or let subscriber choose; document behavior.

## Backward Compatibility Rules

- **Do**: Add optional fields; add new endpoints; broaden validation (accept more).
- **Avoid**: Removing or renaming fields; adding required fields without default; changing type or format of existing fields; narrowing validation (reject previously valid input).

When breaking change is necessary, introduce a new version and deprecate the old one.

## Documentation

- Changelog for every release with compatibility notes.
- Schema registry or published JSON Schema with version tags.
- Examples for each version where behavior differs.
