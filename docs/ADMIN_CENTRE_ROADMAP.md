# Admin Centre — implementation roadmap (5 platform features)

Sequenced plan to deliver the Admin Centre gap list in verified batches, mirroring how the Sales &
Ads Centre maturation was built. Ordered **safest → most security-sensitive**, so the risky work
(impersonation, erasure) lands last with the most context in place.

## Architecture recap (why this is different from Sales/Ads)
The Admin Centre (`rehabsync-admin_control`) is a **thin super-admin console that proxies the main
platform API** — it has no database of its own. So each feature is mostly **new endpoints in the
platform API** (`rehabsync/apps/api`, NestJS) surfaced by **console screens + proxy routes**.

Established facts this plan builds on:
- **Super-admin auth**: `platform_admins` + `platform_admin_sessions` (opaque token, sha256-hashed,
  DB-backed, TTL). `platform_admins.role` **already exists** (defaults to `support`, has a role index);
  login today rejects anything but `super_admin`.
- **Tenant-user auth**: Supabase access token (`sb-access-token` cookie) or a better-auth credential
  session; identity (role, tenantId) is read fresh from `users` on every request.
- **Billing**: `packages/billing` (Stripe client, checkout, metering, plans, webhooks) — Stripe is
  already integrated; invoice webhooks are partially handled.
- **Compliance**: `apps/api/src/modules/compliance` **already** has `export.service` (job-based
  patient/clinic exports → gather → package → upload), `offboarding.service`, `retention.service`,
  `lifecycle.controller`. DSAR is largely a *surfacing + erasure* job, not a from-scratch build.
- **Admin API** already exposes: tenants CRUD, plans, `metrics/{overview,mrr,ai}`, `platform/health`,
  `funnel`, `storage`, `audit-log`, tenant notes/invoices/entitlements.

Every mutating endpoint must write an `audit_log` row (the module + `audit-labels.ts` already exist).

---

## Batch A — Tenant health scoring  ·  low-risk, self-contained  ·  **START HERE**
A transparent 0–100 health score per tenant (mirrors the Sales lead-score pattern: score + factor
breakdown, no black box).

- **Platform API** (`admin.controller`/`admin.service`):
  - `GET /api/v1/admin/tenants/health` — score for the tenant list (batch).
  - `GET /api/v1/admin/tenants/:id/health` — one tenant + factor breakdown.
  - Signals from existing data: subscription status/plan tier, trial/pilot state, active-user count,
    last-activity recency, storage headroom, entitlement coverage, open `admin_requests`, recent audit
    activity. Pure scorer in a `tenant-health.ts` service (unit-tested), clamped 0–100.
- **Console**: health badge/column on the Tenants list; a "Health" card with the factor breakdown on
  `admin/tenants/[id]`.
- **Verify**: unit test the scorer (fixed signals → fixed score + factors); console build.

## Batch B — Scoped admin roles (RBAC)  ·  medium
Let non-super-admin platform staff log in with least-privilege access.

- **DB**: no new table — reuse `platform_admins.role`. Define roles: `super_admin` (all), `support`
  (tenants/support read + limited actions), `billing` (billing/subscriptions), `read_only`.
- **Platform API**: an `@AdminRoles(...)` guard on admin endpoints (default-deny; `super_admin` always
  passes). Allow non-super-admin login in `platform-auth` but return the role so the console can scope
  the UI. Role CRUD already has a home (`admins` section). Audit every role change.
- **Console**: role picker in `PlatformAdminsManager`; hide/disable nav + actions the role can't use.
- **Security flags**: default-deny; a lower role can never grant itself a higher one; only `super_admin`
  edits roles; block removing the last `super_admin`.
- **Verify**: guard unit tests (each role × endpoint matrix); console renders scoped nav.

## Batch C — GDPR DSAR (subject access + erasure)  ·  medium  ·  ⚠ compliance-sensitive
Leverages the existing compliance module.

- **Platform API** (`compliance.controller` + a thin admin wrapper):
  - `POST /api/v1/admin/tenants/:id/dsar/export` — subject access export for a user/patient, reusing
    `export.service` + `export-builders` (already enumerate the tables); returns a signed download.
  - `POST /api/v1/admin/tenants/:id/dsar/erase` — right-to-erasure via `offboarding.service` /
    `retention.service`, behind a typed confirmation; writes an audit + a retention record.
  - `GET …/dsar/jobs` — status/history of export & erase jobs.
- **Console**: a DSAR panel (under `data-retention` and/or tenant detail): find subject → Export →
  Erase (double-confirm, type the subject id).
- **Security flags**: erasure is **irreversible** — require typed confirmation, `super_admin`, full
  audit, and a retention/erasure receipt. Export must be **exhaustive** (reuse the existing builders so
  no table is missed). Respect patient-data guardrails (this touches clinical data).
- **Verify**: export builder covers the subject's tables (spec exists); erase is gated + audited (e2e).

## Batch D — Self-serve billing / dunning (Stripe)  ·  medium  ·  ⚠ payments
- **Platform API** (`packages/billing` + admin endpoints):
  - Handle `invoice.payment_failed` / `payment_action_required` in `webhooks.ts`; track a tenant
    billing status (`active` | `past_due` | `grace` | `suspended`) with a grace window.
  - `GET /api/v1/admin/tenants/:id/billing` (status, dunning stage, invoices),
    `POST …/billing/retry` (retry the latest invoice),
    `POST …/billing/portal` (Stripe Billing Portal link for self-serve card update).
- **Console**: billing section — dunning badges, retry, "open customer portal", invoice history.
- **Security flags**: verify Stripe webhook signatures; never expose secret keys to the console; test in
  Stripe **test mode**; idempotent webhook handling.
- **Verify**: webhook handler unit tests (failed → past_due → grace → suspended); portal link issuance
  mocked.

## Batch E — Log-in-as-tenant impersonation  ·  ⭐ highest-risk  ·  **LAST**  ·  ⚠⚠ security + clinical
Mint a short-lived, fully-audited session as a tenant user for support/debugging.

- **Platform API**:
  - `POST /api/v1/admin/tenants/:id/users/:userId/impersonate` — requires a **reason/ticket**; mints a
    **short-TTL** (≤30 min) scoped tenant session for that user (via Supabase admin session generation
    or a dedicated impersonation grant), returns a one-time hand-off link/cookie for the tenant app.
    Writes an `impersonation` audit row (actor, subject, reason, expiry).
  - `POST /api/v1/admin/impersonation/stop` — revoke immediately.
- **Tenant app** (`rehabsync/apps/web`): a persistent **"Acting as <user> — impersonating"** banner +
  Stop button; every action performed under impersonation is audited as such.
- **Security flags (blocking)**: mandatory reason/ticket; time-boxed + revocable; **cannot impersonate
  another super-admin**; full audit trail; visible banner at all times; consider a **read-only** mode
  for clinical data; must honour the same patient-data access guardrails as normal clinicians. Design
  doc + review **before** coding.
- **Verify**: impersonation issues a scoped, expiring session; audit row written; banner shows; stop
  revokes; e2e that an expired/again-used grant is rejected.

---

## Verification & workflow (per batch)
- Platform API: `pnpm --filter @rs/api typecheck` + unit/e2e tests (the api has a Jest setup).
- Console: `pnpm --filter <admin console> typecheck` + build; proxy routes typed.
- Land each batch behind the existing audit + guards; push after green. **Batches C & E get an extra
  security/compliance review pass before merge.**

## Cross-cutting polish (parallel, low-risk)
Saved views, list **pagination**, and **mobile responsiveness** applied across the console list screens
(client-side); no platform-API changes required. Can be interleaved between batches as quick wins.

## Suggested order
**A → B → D → C → E** (health, then roles, then billing, then DSAR, then impersonation) — value early,
the two most sensitive features (erasure, impersonation) last with full context and a review gate.
