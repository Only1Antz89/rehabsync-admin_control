# Admin Centre — deployment & integration runbook

Standalone Next.js app at **https://admincentre.rehabsync.app** — the super-admin console as a
thin client over the main RehabSync API. No database, no cron jobs, no secrets beyond the API URL.

## 1. Prerequisites (main repo)

Merge PR #172 on `Only1Antz89/RehabSync` and redeploy the API — it ships the platform-admin
management endpoints (`/api/v1/admin/platform-admins*`) this console's "Platform Admins" page
uses, plus the host-aware session cookie that makes login work on every host.

## 2. Vercel project

1. Import `Only1Antz89/rehabsync-admin_control`, framework Next.js, root `/`.
2. Attach domain `admincentre.rehabsync.app`; DNS: CNAME `admincentre` → `cname.vercel-dns.com`.
   (Attach it to THIS project — not the main web app. The main app also answers on
   `admin.rehabsync.app`, which can stay as a fallback during the transition.)

## 3. Environment variables (see `.env.example`)

| Variable | Notes |
|---|---|
| `REHABSYNC_API_URL` | `https://api.rehabsync.app` — the console's single upstream. **Required.** If unset it defaults to `localhost:4000`, which serverless can't reach, and every request (including login) fails. |
| `REHABSYNC_NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://admincentre.rehabsync.app` |

> **Login returns 502 "Could not reach the RehabSync admin API…"?** That's the console telling you
> the upstream is wrong or down. Confirm `REHABSYNC_API_URL` points at the **deployed** main API
> (the NestJS `apps/api`, not the web app), and that the API itself is live and can reach its
> database. The console holds no credentials of its own — it can only be as healthy as that API.

## 4. First account

If no platform admin exists yet (or a password is lost), from a clone of the **main** repo:

```bash
REHABSYNC_DATABASE_URL=<pooler-url> pnpm admin:create -- \
  --email anthony@intaillium.com --name "Anthony Osei" --password '<strong-password>'
```

(or set `REHABSYNC_INITIAL_SUPER_ADMIN_PASSWORD` on the API — it self-seeds both Anthony emails
on the next login attempt). Day-to-day account management then lives at `/admin/admins`.

## 5. Post-deploy smoke test

1. `https://admincentre.rehabsync.app/` → lands on the login screen (branded "RehabSync Admin Centre").
2. Sign in as a super-admin → Overview loads; Tenants / CRM / Platform Admins pages render.
3. Sidebar "Internal tools" links open the Sales Centre and Ads Centre **without a second login**
   (the `.rehabsync.app` session cookie carries over).
4. Non-super-admin (support role) accounts are rejected from the console.

## 6. Upgrading the console

The `(admin)` + `api/admin` source trees are copied verbatim from the main repo's `apps/web`.
To pick up console changes made there: re-copy those trees (plus any new `src/lib` helpers they
import), run `pnpm typecheck && pnpm build`, and push — the main platform deploy is untouched.
