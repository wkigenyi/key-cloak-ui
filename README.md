# Keycloak Admin UI (ReUI)

Standalone Next.js admin console for Keycloak 26. Operators sign in through the **master** realm and pick a **SACCO workspace** (a Keycloak realm). `app` is the local template and demo realm. Each additional SACCO is its own realm (`realm name` = `saccoId`) so phone usernames and password/MFA policy stay isolated. Self Help apps must use that SACCO’s issuer (`/realms/{saccoId}`), not a shared `app` issuer.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 11.9.0 (`packageManager` in `package.json`)
- Docker
- A ReUI license key in `.env.local` (`REUI_LICENSE_KEY`) for premium blocks

## Setup

1. Copy `.env.example` to `.env.local` and fill in values.
2. Start Keycloak 26.3 with the imported `app` realm:

```bash
docker compose up -d
```

3. Install dependencies and run the app:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local demo login

- Username: `console-admin`
- Password: `admin`
- Issuer: `http://127.0.0.1:8080/realms/master` (`AUTH_KEYCLOAK_ISSUER`)
- Default workspace / template: `app` (`KEYCLOAK_REALM`, cookie `kc-realm`)

Keycloak master console (bootstrap): `admin` / `admin` at [http://localhost:8080](http://localhost:8080).

`pnpm seed:self-help` creates `keycloak-ui` and `console-admin` in **master** (realm role `admin`) so this console can list and create SACCO realms. The confidential client also uses a service account with `admin` so Admin API writes see roles for realms created after login. **Create SACCO** clones `app` (user profile, clients, login/token/brute-force settings) and does not copy users. Sample self-help users stay in `app` for local demo (`saccoId` / legacy `/sacco/demo-sacco` groups). Fresh imports use phone usernames (`+256700000001` …); an existing volume keeps `alice` / `bob` / `carol` and the seed attaches the same attributes.

After seeding, **sign out and sign in again** so the JWT picks up master roles.

OIDC **Clients** (`/admin/clients`) are Keycloak applications in the selected SACCO realm. The public **`self-help`** client is what the member app uses (phone + password). **`keycloak-ui`** is the confidential ops console client and lives on **master** only — Create SACCO does not copy it. **Realms** (`/admin/realms`) lists every SACCO plus `master` / `app`. `master` and `app` cannot be disabled or deleted.

### Production

Self-host Keycloak behind TLS (Postgres, not the local H2 volume) and this console as a separate Next app.

```bash
# Keycloak + Postgres (behind a reverse proxy that terminates TLS)
docker compose -f docker-compose.prod.yml up -d

# This console (set AUTH_* from .env.production.example)
docker build -t keycloak-ui-reui .
docker run --env-file .env.production -p 3000:3000 keycloak-ui-reui
```

Point the proxy at Keycloak `:8080` (`https://auth.bankayo.io`) and this console `:3000` (`https://id.bankayo.io`). Do not expose the Keycloak admin console publicly.

Console env (see `.env.production.example`):

- `AUTH_KEYCLOAK_ISSUER=https://auth.bankayo.io/realms/master`
- `KEYCLOAK_URL=https://auth.bankayo.io`
- `KEYCLOAK_REALM=app` (template / default workspace, not a live SACCO)
- `AUTH_URL` = this console’s public origin

Cut over one SACCO at a time with `KEYCLOAK_CUTOVER` on hooks (see `scripts/cutover-sacco.mjs`). Members get `issuer` + `client_id=self-help`; Supabase fields stay for rollback.

An existing Docker volume will **not** re-import the realm. To pick up sample self-help users and group roles:

```bash
docker compose down -v
docker compose up -d
```

Or keep the volume and patch the running realm:

```bash
pnpm seed:self-help
```

## Migrate from Supabase

Each SACCO in Neon (`customers` where `is_sacco`) has its own Supabase project. The CLI creates a Keycloak realm named after `short_name` (cloned from `app`) and imports members that have `user_metadata.clientId`.

```bash
# From a JSON list (you can paste SACCO rows here)
pnpm migrate:supabase --dry-run --json saccos.json
pnpm migrate:supabase --json saccos.json --sacco=acme

# From Neon
# DATABASE_URL=postgres://... pnpm migrate:supabase --dry-run

# From hooks.bankayo.io
# HOOKS_URL=https://hooks.bankayo.io BANKAYO_API_KEY=... pnpm migrate:supabase --dry-run
```

See [`scripts/saccos.example.json`](scripts/saccos.example.json). Supabase Auth does not return password hashes on the Admin API. To keep existing passwords, pass `--passwords=hashes --hashes-file hashes.json` (map of Supabase user id / email / phone to a `$2a$…` bcrypt hash) or set `pg_url` on a SACCO row so the script can read `auth.users.encrypted_password`. Otherwise users get `UPDATE_PASSWORD`.

## Scripts

- `pnpm dev` — Next.js 16
- `pnpm build` / `pnpm start`
- `pnpm lint`
- `pnpm seed:self-help` — patch a running Keycloak volume with master console access, `self-help` clients, and `app` template demo users
- `pnpm migrate:supabase` — clone a SACCO realm from `app` and import self-help users from that SACCO’s Supabase (`--dry-run`, `--json`, `--sacco=`)
- `pnpm cutover:sacco <short_name>` — verify a realm is ready, then print hooks `KEYCLOAK_CUTOVER` (does not write hooks)
