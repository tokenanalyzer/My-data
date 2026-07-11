# Scraping architecture and delivery plan

## Current state

- Flutter owns the Material UI, Firebase authentication gate, theme state, and an unconnected `ApiService` client.
- The active Flutter search form validates input and displays a local confirmation only; it does not start a scrape.
- The adjacent Node backend contains scraper workers and MongoDB models, but its application entrypoint imports route modules that are absent (`auth`, `scraper`, `data`, and `health`). It cannot provide a reliable client contract yet.
- A legacy React Native screen references `/api/scraper/start`, `/api/scraper/status/:jobId`, and `/api/data`; these endpoints are not implemented by the current backend and are not treated as a production contract.

## Contract boundary

The Flutter client remains transport-only. It must never scrape directly, store provider credentials, or embed a Google Maps key. A production backend must own source access, rate limits, deduplication, job execution, and exports.

Before Phase 4 connects the search button, the backend must publish and test these authenticated endpoints:

1. `POST /api/scrapes` — validates a source and query, then returns a durable job identifier.
2. `GET /api/scrapes/{id}` — returns job status, progress, and a safe failure code.
3. `GET /api/scrapes/{id}/results?page=&pageSize=` — returns a stable paginated result envelope.
4. `POST /api/scrapes/{id}/exports` — queues CSV/XLSX creation and returns a download resource when ready.

## Phases

1. **Foundation (complete):** document the client/server boundary and verify the existing Flutter HTTP client with deterministic tests; do not activate scraping against the incomplete backend.
2. **Google Maps:** backend-owned, policy-compliant provider using a protected API key and normalized business results.
3. **IndiaMART:** backend job adapter with source-specific rate limiting, retries, and data normalization.
4. **Scrape and results UX:** submit jobs from Flutter, poll or stream progress, and show paginated results.
5. **Exports:** server-side CSV/XLSX generation and app download/share flow.
6. **History and background jobs:** user-scoped persisted searches and resumable job status.
7. **Production hardening:** authorization enforcement, structured logging, metrics, cache policy, retry policy, and performance profiling.
