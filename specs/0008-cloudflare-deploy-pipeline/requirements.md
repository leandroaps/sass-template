# Requirements — Cloudflare Deploy Pipeline (Git Flow + DB Backup)

- **Status:** Draft
- **Spec ID:** 0008
- **Author:**
- **Last updated:** 2026-07-23

## 1. Summary

Ships the app to Cloudflare Containers behind a Git Flow branching model: `main` is
locked down and always reflects production, `dev` is the integration branch and
deploys to a separate staging environment. Every push to either branch runs the
existing CI gate, then deploys the already-built Docker image to that branch's
Cloudflare Containers service, running migrations first. A scheduled job takes
`pg_dump` backups of the production database to Cloudflare R2 as a safety net on top
of the managed Postgres provider's own backups.

## 2. Goals

- Two independently deployable environments — staging (from `dev`) and production
  (from `main`) — each a separate Cloudflare Containers service with its own secrets
  and domain.
- `main` is protected: no direct pushes, no force-push/delete, PRs require the
  existing CI checks to pass plus at least one approving review before merge.
- `dev` is protected against force-push/deletion and requires CI to pass on PRs, but
  stays lighter-weight than `main` to keep feature-branch integration fast.
- Deploys run database migrations against the target environment before the new
  container starts serving traffic, and abort if migrations fail.
- Production deploys require an explicit manual approval step, on top of branch
  protection, as a second safety gate.
- A scheduled job backs up the production database to Cloudflare R2 on a recurring
  schedule, independent of and in addition to the managed Postgres provider's own
  backups, with a documented (manual) restore procedure.
- Staging and production never share credentials (Cloudflare API token, database
  URL, auth secret, etc.).

## 3. Non-goals

- Migrating the app's runtime to Cloudflare Workers/edge (`@opennextjs/cloudflare` or
  `next-on-pages`). Explicitly rejected for this spec — the app's current
  architecture (Node.js standalone build, `postgres` driver over raw TCP, Docker) is
  kept as-is; Cloudflare Containers runs the existing image unchanged.
- Provisioning the Cloudflare account, custom domains, or the managed Postgres
  instance — per the user, these already exist. This spec only wires CI/CD and
  backups on top of them.
- Automated backup restore / disaster-recovery drills — restore is a documented
  manual runbook for v1, not a one-click workflow.
- Blue-green or canary deployment strategies — a straightforward rolling replace per
  environment is enough at this template's scale.
- Automatically re-applying branch protection settings on every CI run — it's
  one-time repo configuration, provided as an idempotent script the user runs once
  (or re-runs after a manual change) with their own admin credentials.
- Automatically resetting/refreshing the staging Neon branch from production data
  on a schedule — staging starts as a one-time branch of production and is expected
  to drift; re-syncing it is a manual operation if/when needed.

## 4. User stories & acceptance criteria

Use EARS notation (see specs/README.md). Number every requirement so tasks can
reference it.

### R1 — Two independently deployed environments

> As Lead/DevOps, I want `dev` and `main` to each deploy to their own Cloudflare Containers service, so staging and production never collide.

- **R1.1** WHEN a push lands on `dev` and CI passes, the system SHALL deploy the
  resulting image to the staging Cloudflare Containers service.
- **R1.2** WHEN a push lands on `main` and CI passes, the system SHALL deploy the
  resulting image to the production Cloudflare Containers service.
- **R1.3** the staging and production deploy pipelines SHALL be independent —
  a staging deploy failure SHALL NOT block or affect a production deploy, and vice
  versa.

### R2 — `main` is protected (Git Flow production gate)

> As Lead/DevOps, I want `main` locked down, so production only changes through a reviewed, tested pull request.

- **R2.1** IF someone attempts to push directly to `main`, THEN GitHub SHALL reject
  the push.
- **R2.2** IF someone attempts to force-push to or delete `main`, THEN GitHub SHALL
  reject it.
- **R2.3** WHEN a pull request targets `main`, the system SHALL require the
  existing `quality` and `e2e` CI jobs to pass before the PR can be merged.
- **R2.4** WHEN a pull request targets `main`, the system SHALL require at least one
  approving review before merge.

### R3 — `dev` is protected as the integration branch

> As Lead/DevOps, I want `dev` protected against destructive operations while staying lighter-weight than `main`, so feature integration doesn't lose work but also isn't bottlenecked on review.

- **R3.1** IF someone attempts to force-push to or delete `dev`, THEN GitHub SHALL
  reject it.
- **R3.2** WHEN a pull request targets `dev`, the system SHALL require the existing
  `quality` and `e2e` CI jobs to pass before merge.
- **R3.3** `dev` branch protection SHALL NOT require an approving review (see Open
  Questions — revisit if this proves too loose).

### R4 — Migrations run before traffic shifts, and block a broken deploy

> As Lead/DevOps, I want migrations applied as an explicit deploy step, so multiple Cloudflare Containers instances never race to migrate on boot, and a bad migration never reaches production.

- **R4.1** WHEN a deploy runs for either environment, the system SHALL apply pending
  migrations against that environment's database before deploying the new container
  revision.
- **R4.2** IF the migration step fails, THEN the system SHALL abort the deploy
  without updating the running container.
- **R4.3** both Cloudflare Containers services SHALL run with `SKIP_MIGRATIONS=true`
  so the Docker entrypoint's own migration step never runs concurrently with the
  explicit CI migration step.

### R5 — Scheduled production database backup

> As Lead/DevOps, I want a recurring backup of the production database independent of the hosting provider, so a provider-side failure or account issue isn't a single point of failure for our data.

- **R5.1** WHEN the backup schedule fires, the system SHALL produce a `pg_dump`
  backup of the production database and upload it to a Cloudflare R2 bucket, named
  with a UTC timestamp.
- **R5.2** the backup job SHALL also be triggerable on demand (manual dispatch), not
  only on schedule.
- **R5.3** IF the `pg_dump` step or the upload step fails, THEN the workflow run
  SHALL fail visibly (non-zero exit) rather than silently skip the backup.
- **R5.4** backup retention SHALL be enforced by an R2 bucket lifecycle rule
  (configured once, outside CI), not by custom pruning logic in the workflow.
- **R5.5** the restore procedure SHALL be documented as a runbook covering: locating
  a backup in R2, restoring it into a target database, and verifying the restore —
  manual for v1, not automated.

### R6 — Production deploy requires manual approval

> As Lead/DevOps, I want a human to explicitly approve every production deploy, so `main` passing CI is necessary but not sufficient to reach production unattended.

- **R6.1** WHEN a deploy to the production environment is triggered, the system
  SHALL require manual approval (a GitHub Environment protection rule) before the
  deploy job runs.

### R7 — Environment credentials never cross-contaminate

> As Lead/DevOps, I want staging and production to hold separate secrets, so a staging misconfiguration or leak can't touch production.

- **R7.1** staging and production SHALL each store their own Cloudflare API
  token/account/service identifiers, `DATABASE_URL`, `BETTER_AUTH_SECRET`, and
  `BASE_URL` in separate GitHub Environments — no secret SHALL be shared between
  them.
- **R7.2** WHERE the database provider supports it, the backup job SHALL use a
  read-only database credential, distinct from the application's read-write
  credential.

## 5. Constraints & assumptions

- Cloudflare account, custom domains, and the managed Postgres instance already
  exist and are out of scope to provision (per the user).
- Cloudflare Containers is used specifically because it runs the existing Dockerfile
  unchanged — no rewrite to the Workers/edge runtime, no change to the `postgres`
  driver or Better Auth setup.
- Cloudflare Containers is a newer/beta product; exact `wrangler` CLI flags and
  config shape may shift between now and implementation — implementation should
  verify against current Cloudflare docs and pin a `wrangler` version.
- R2 bucket creation, its lifecycle (retention) rule, and Cloudflare API token
  scoping are one-time manual setup steps requiring Cloudflare account access this
  spec's author doesn't have — documented as prerequisites, not automated.
- Branch protection is configured via an idempotent script (`gh api`) run manually
  with an admin token — not re-applied by a workflow on every push.
- No `wrangler.jsonc`/`wrangler.toml` exists in the repo yet; this spec introduces
  it.
- Builds on the existing `ci.yml` (`quality` → `e2e` → `docker`) rather than
  replacing it — deploy workflows consume its output image, they don't re-run
  lint/typecheck/e2e themselves.
- **Neon topology: one Neon project, two branches** — production runs on the
  project's default branch, staging runs on a separate Neon branch of the same
  project (created once, manually). This satisfies R7.1 (each environment still
  gets its own `DATABASE_URL`) at lower cost than two fully separate Neon projects,
  at the cost of sharing project-level limits/settings between the two.
- **Both environments' `DATABASE_URL` SHALL use Neon's pooled connection endpoint**
  (the `-pooler` host), not the direct one — Cloudflare Containers can run multiple
  instances of a service, and a direct (non-pooled) connection risks exhausting
  Neon's max-connections limit under concurrent instances.
- **The Cloudflare account already hosts other projects** — the API token used by
  this repo's workflows SHALL be scoped narrowly (Containers edit on this app's two
  services only, R2 edit on this app's backup bucket only), never a broad/reused
  account-wide token. Service names, the R2 bucket name, and any custom domain SHALL
  be checked against the account's existing projects before being claimed, to avoid
  collisions.
- The backup workflow's `pg_dump` version SHALL match (or exceed) the Neon
  project's Postgres major version, pinned explicitly rather than relying on the
  runner's default `pg_dump`.
- IF Neon's IP allowlist feature is enabled on this project, THEN GitHub-hosted
  runners (no fixed egress IP) SHALL be blocked from migrations/backups — must be
  confirmed disabled for this project, or a static-egress-IP path (self-hosted
  runner) added.

## 6. Open questions

- [ ] Number of required approving reviews on `main` — this draft assumes 1.
- [ ] Should `dev` require any approving review, or CI-passing only? This draft
      assumes CI-passing only (R3.3).
- [ ] R2 backup retention window — this draft assumes 30 days.
- [ ] Backup schedule/frequency — this draft assumes daily.
- [ ] Should staging's database also get scheduled backups, or production only?
      This draft assumes production-only (staging data is disposable — it's a Neon
      branch, and can be re-created from production if needed).
- [ ] Custom domain names for the staging/production Cloudflare Containers services
      — needed at implementation time, not blocking spec approval; must not collide
      with domains already used by other projects in the same Cloudflare account.
- [ ] Exact Cloudflare Containers service names and the Cloudflare API token's
      scope/permissions — needed at implementation time; must not collide with
      names already used by other projects in the same Cloudflare account.
- [ ] Should the staging Neon branch be periodically reset/refreshed from
      production data? Out of scope for v1 (see Non-goals) — flagged here in case
      staging data drifts enough to matter later.
