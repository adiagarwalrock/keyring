# Key Ring Code Map

## Intent map

1. Inspection UI and in-memory lifecycle -> `src/app/page.tsx`.
2. Direct provider allowlist, configuration-required provider catalog, request construction, response sanitization, and outcome classification -> `src/lib/providers.ts`.
3. Browser-only deployment and security headers -> `next.config.ts` + `vercel.json`.

## Contracts

- There are no API routes, server actions, databases, cookies, analytics, or persisted client state.
- Only `PROVIDERS` may define outbound request destinations.
- Raw keys remain in React state until the user clears them or the page refreshes.
