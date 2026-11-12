# VESH V1 stabilization patch — 12 November 2026

## Changes in this candidate

- Fixed the Notes rail click handler. The parent no longer discards `notes` panel selection.
- Added contextual handling for a calendar time-only follow-up such as “Start at 12 AM midnight”, using the immediately preceding calendar request.
- Added a clarification step for project rename requests that omit the new name. When the user supplies the new name, the assistant resolves the single VESH/ambient-companion project where possible and routes it through the existing authenticated rename flow.
- Added opt-in public streak sharing:
  - creates an unguessable 192-bit URL token,
  - shares only a streak snapshot and total check-in count,
  - provides a public VESH-branded landing page with a signup CTA,
  - supports copy/native share,
  - supports owner revocation.
- Added the Supabase migration `202611120001_attendance_shares.sql`.
- Changed default Azure TTS voices to female neural voice IDs for Hindi and English; deployments can override via environment variables.
- Updated `.env.example` and README setup/deployment notes.
- Removed duplicate stylesheet import in the root layout.

## Database action required

Apply `supabase/migrations/202611120001_attendance_shares.sql` to the production Supabase project before enabling streak sharing.

## Verification performed

- Parsed all 59 TypeScript/TSX source files with the globally available TypeScript transpiler: 0 syntax diagnostics.
- Ran targeted action-intent checks for notes listing, project rename clarification, project rename, and calendar time follow-up: all passed.

## Verification not completed

- `npm ci` could not complete in this environment (registry package unavailable/cache miss and network timeout).
- `npm test` could not run because Vitest is not installed.
- Full TypeScript typecheck, ESLint and Next production build have not been verified.
- No live Supabase integration, browser E2E, speech provider smoke test, or production deployment was possible here.

Do not mark this candidate as production-launched until the required dependency install, checks, database migration, account/RLS tests and production smoke tests pass.
