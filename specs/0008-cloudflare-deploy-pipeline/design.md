# Design — Cloudflare Deploy Pipeline (Git Flow + DB Backup)

- **Status:** Draft
- **Spec ID:** 0008
- **Implements:** requirements.md

## 1. Overview

```text
feature/*  --PR-->  dev  --(auto)-->  staging  (Cloudflare Containers)
                     |
                     |  periodic PR, dev -> main
                     v
                    main  --(auto, gated by approval)-->  production  (Cloudflare Containers)

                    main's Postgres  --(nightly, independent)-->  Cloudflare R2 backups
```

A feature branch merges into `dev` via PR once CI passes. Every push to `dev` (i.e.
every merge) triggers a staging deploy automatically. When `dev` is ready to ship,
a PR from `dev` into `main` requires CI to pass and one approving review; merging it
triggers a production deploy, which itself pauses for a manual approval click in
GitHub before it runs. A separate, schedule-driven workflow backs up the production
database to R2 nightly, unrelated to deploys.

The database side of this mirrors the branch model: one Neon project, two branches.
Production points at the project's default branch; staging points at a separate
Neon branch created once, manually, ahead of implementation. Each branch has its own
pooled connection string, which becomes that environment's `DATABASE_URL` secret —
so the two environments still never share a database credential (R7.1) even though
they share a Neon project.

No application code changes. This spec only adds/modifies CI/CD workflows, a
Cloudflare Containers config, and backup scripts.

## 2. Architecture

Components touched:

```text
.github/workflows/
├── ci.yml                    (existing — extend push trigger to include dev)
├── deploy-staging.yml        (new)
├── deploy-production.yml     (new)
└── db-backup.yml             (new)

wrangler.jsonc                 (new — Cloudflare Containers config, two services)
scripts/
├── backup-db.sh               (new — pg_dump | gzip | upload to R2)
└── setup-branch-protection.sh (new — one-time gh api script, run manually)
```

Two Cloudflare Containers services, each pulling the same Dockerfile output but
configured with different env vars and secrets:

- `saas-template-staging` — deployed from `dev`
- `saas-template-production` — deployed from `main`

Two matching GitHub Environments (`staging`, `production`) hold each service's
secrets. `production` additionally has a required-reviewers rule configured in repo
settings (GitHub UI, one-time) — this is what implements R6's manual approval gate;
no workflow YAML can create this setting itself, it's checked by GitHub before the
job that references `environment: production` is allowed to run.

**Why `workflow_run` instead of a direct `push` trigger on the deploy workflows:**
a workflow triggered directly by `push`/`pull_request` on an arbitrary branch runs
with that branch's workflow file and could, in a compromised or careless PR, expose
deploy secrets. Triggering `deploy-staging.yml`/`deploy-production.yml` via
`workflow_run` (fires only after `ci.yml` completes, filtered to `conclusion ==
'success'` and the right branch) keeps deploy credentials reachable only from a
workflow run whose triggering event already passed the full CI gate on a protected
branch.

## 3. Data model

No changes. No new tables, columns, or migrations — this spec is CI/CD and
operations only.

## 4. Workflows & triggers

| Workflow                | Trigger                                                                                            | Purpose                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                | `push` to `main`/`dev`, all PRs                                                                    | lint/typecheck/e2e, then build+push the Docker image to GHCR tagged by branch+sha (existing job, trigger extended to include `dev`) |
| `deploy-staging.yml`    | `workflow_run`: `ci.yml` completed successfully, branch `dev`                                      | migrate staging DB, then `wrangler deploy` the branch's image to `saas-template-staging`                                            |
| `deploy-production.yml` | `workflow_run`: `ci.yml` completed successfully, branch `main`; job uses `environment: production` | migrate production DB, then `wrangler deploy` the branch's image to `saas-template-production`; pauses for manual approval per R6   |
| `db-backup.yml`         | `schedule` (daily cron) + `workflow_dispatch`                                                      | `pg_dump` production DB, gzip, upload to R2                                                                                         |

`ci.yml`'s existing `docker` job condition (`github.ref == 'refs/heads/main' &&
github.event_name == 'push'`) is loosened to also match `refs/heads/dev`, so both
branches get an image pushed to GHCR that the deploy workflows can reference by tag
(`sha-<short-sha>` or `<branch>-latest`).

## 5. Migrations & rollout

- Both Containers services run with `SKIP_MIGRATIONS=true` (per the existing
  `docker-entrypoint.sh` support for exactly this multi-replica scenario, see
  CLAUDE.md) — the entrypoint never runs migrations itself in these environments.
- Each deploy workflow's first real step is `npm run db:migrate` against that
  environment's `DATABASE_URL` (a GitHub Environment secret). If it exits non-zero,
  the job fails before the `wrangler deploy` step runs — the old container keeps
  serving traffic, nothing broken reaches users (R4.2).
- Rollback: Cloudflare Containers retains prior deployed revisions. Rolling back is
  re-running `deploy-*.yml` pinned to a previous image tag (manual `workflow_dispatch`
  input, documented but not automated further in v1). Migrations are forward-only and
  are **not** auto-reverted on rollback — same limitation as most migration tooling;
  a rollback that depends on a schema change being undone needs a hand-written down
  migration, same as today.

## 6. Security & multi-tenancy

- No multi-tenancy surface changes (no new tables/routes).
- Secrets live in per-environment GitHub Environments (`staging`, `production`),
  never in repo-level secrets, so a workflow run only sees the credentials for the
  environment it explicitly declares (`environment: production`/`staging`).
- The Cloudflare API token used by each deploy workflow should be scoped to
  Containers edit permission on that specific service/account, not a full-account
  token — call out explicitly at implementation/setup time since Cloudflare's token
  UI defaults to broader scopes.
- **The Cloudflare account already runs other projects.** A leaked or overscoped
  token here is a blast-radius risk to those projects too, not just this one — this
  is the specific reason the previous bullet is a hard requirement rather than a
  nice-to-have. Same logic applies to naming: service names, the R2 bucket name, and
  any custom domain must be checked against the account's existing usage before
  being claimed, since Cloudflare resource names are unique per account/zone.
- The backup job's database credential should be a read-only role where the
  provider supports creating one (R7.2) — Neon supports standard Postgres role
  grants, so a read-only role is created once, manually, alongside the two branches.
- **`DATABASE_URL` for both environments uses Neon's pooled connection endpoint**
  (the `-pooler` hostname), not the direct one. Cloudflare Containers can run
  multiple instances of a service, each holding its own connection pool via the
  `postgres` driver; against Neon's direct endpoint that risks hitting Neon's
  max-connections ceiling under concurrent instances, especially on lower tiers.
- R2 credentials for the backup job are scoped to just the backup bucket (Cloudflare
  R2 supports per-bucket API tokens).
- The backup workflow pins its `pg_dump` version to match (or exceed) the Neon
  branch's Postgres major version — a mismatched `pg_dump` can fail outright or
  produce a dump that doesn't restore cleanly.
- If Neon's IP allowlist feature is ever enabled on this project, GitHub-hosted
  runners (no fixed egress IP) would be locked out of migrations and backups —
  confirm it stays disabled for this project, or budget for a self-hosted runner
  with a static IP if it's needed later.
- `setup-branch-protection.sh` requires a `gh` token with admin rights on the repo;
  it's run manually by a human with that access, never stored as a workflow secret.

## 7. Testing strategy

Each acceptance criterion is verified manually against the real repo/Cloudflare
account after implementation (no unit-testable surface here):

- **R1**: push a trivial commit through `dev` and separately through `main`; confirm
  each triggers only its own deploy workflow, and `GET /api/health` on each
  environment's domain returns `{ status: "ok", db: "connected" }` afterward.
- **R2/R3**: attempt a direct push and a force-push to both `main` and `dev` against
  a disposable fork/test repo (or read back the applied protection settings via `gh
api repos/:owner/:repo/branches/:branch/protection` and diff against R2/R3's
  requirements) to confirm rejection.
- **R4**: ship a deploy containing a real migration and confirm it's applied before
  the new revision serves traffic; separately, ship a deploy with an intentionally
  broken migration and confirm the deploy job fails before `wrangler deploy` runs and
  the previous revision keeps serving.
- **R5**: manually trigger `db-backup.yml` via `workflow_dispatch`, confirm a new
  timestamped object appears in the R2 bucket; download it and `pg_restore`/`psql`
  it into a scratch database to confirm the dump is valid and complete.
- **R6**: confirm the `deploy-production.yml` run pauses in the Actions UI awaiting
  approval, and that approving it (vs. rejecting it) is what allows/blocks the job.
- **R7**: spot-check that staging and production jobs reference different
  `DATABASE_URL`/`BETTER_AUTH_SECRET`/Cloudflare service values (masked in logs, but
  confirmable via the GitHub Environment secrets list and each service's actual
  config).

## 8. Risks & alternatives considered

- **Cloudflare Workers/edge (`@opennextjs/cloudflare`)** — considered and rejected
  per the user's explicit choice. Would require replacing the `postgres` TCP driver
  (Hyperdrive or an HTTP-based driver), dropping the Docker deploy path entirely, and
  re-verifying Better Auth's compatibility with the Workers runtime — a much larger,
  riskier change than this spec's goal.
- **Running migrations via the Docker entrypoint (today's default)** instead of an
  explicit CI step — rejected because Cloudflare Containers can run multiple
  instances of a service, and concurrent entrypoint-triggered migrations would race.
  CLAUDE.md already documents `SKIP_MIGRATIONS=true` as the intended escape hatch for
  this exact scenario.
- **Custom backup pruning logic** (a script that lists and deletes old R2 objects) vs.
  an **R2 bucket lifecycle rule** — chose the lifecycle rule: it's a one-time bucket
  setting with no custom code to get wrong, no extra IAM permissions needed for the
  workflow, and no risk of a pruning bug deleting recent backups.
- **`push` trigger directly on the deploy workflows** vs. **`workflow_run` gated on
  `ci.yml` success** — chose `workflow_run` so deploy credentials are only reachable
  from a run that followed a fully-passed CI gate on a protected branch, not from any
  workflow file that happens to live on a pushed branch.
- **Automating branch protection via a workflow that re-applies it on every push** vs.
  a **one-time manual script** — chose the manual script: branch protection is repo
  configuration, not a build artifact; re-applying it on every push adds an
  admin-scoped token to routine CI runs for no benefit.
