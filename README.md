# RehabSync Admin Centre

The platform super-admin console at **https://admincentre.rehabsync.app**, spun out of the main
repo's `apps/web` `(admin)` section for independent deploys and upgrades.

## Architecture

This app is a **thin client over the main RehabSync API** (`/api/v1/admin/*`):

- Every page fetches through server-side proxy routes (`src/app/api/admin/*`) that forward the
  `rs_platform_session` cookie to the API. **No database credentials live here.**
- Auth is owned by the main API (`platform_admins` + sessions). The login proxy adapts the
  cookie's Domain attribute to the serving host, so previews and the production domain both work.
- Console source under `src/app/(admin)` is copied verbatim from the main repo — when the main
  repo's console changes, re-copy the `(admin)` + `api/admin` trees to pick up the upgrade.

## Development

```bash
pnpm install
cp .env.example .env   # point REHABSYNC_API_URL at a running main API
pnpm dev
```

`pnpm typecheck` · `pnpm lint` · `pnpm build`

## Deployment

See `DEPLOYMENT.md`.
