# Tasks — Cloudflare Deploy Pipeline (Git Flow + DB Backup)

- **Status:** Draft
- **Spec ID:** 0008
- **Implements:** design.md

Implement top-to-bottom. Each task is small, independently verifiable, and lists the
requirement IDs it satisfies. This spec is CI/CD and operations work, not app-layer
Next.js code — it doesn't map cleanly onto the Backend/Frontend/Test teammate split
from `specs/0001-creation-of-the-teammates/`; see design.md's file list for scope.

- [ ] **T1** Add `wrangler.jsonc` with Cloudflare Containers config for two services
      (`saas-template-staging`, `saas-template-production`), pointing at the existing
      Dockerfile → R1.1, R1.2
- [ ] **T2** Set `SKIP_MIGRATIONS=true` in both Containers services' env config → R4.3
- [ ] **T3** Extend `ci.yml`'s `push.branches` to `[main, dev]`, and loosen the
      `docker` job's branch condition so both branches get an image pushed to GHCR →
      R1.1, R1.2
- [ ] **T4** Write `scripts/setup-branch-protection.sh` (idempotent, uses `gh api`)
      encoding the `main`/`dev` rules from R2/R3 → R2.1, R2.2, R2.3, R2.4, R3.1, R3.2
- [ ] **T5** Run `setup-branch-protection.sh` once against the real repo (manual,
      requires an admin `gh` token) → R2, R3
- [ ] **T6** Create the `staging` and `production` GitHub Environments with their
      respective secrets (Cloudflare API token, account id, service name,
      `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BASE_URL`); add a required-reviewers rule
      to `production` → R6.1, R7.1
- [ ] **T7** Add `.github/workflows/deploy-staging.yml`: `workflow_run` on `ci.yml`
      success for `dev`, run `npm run db:migrate` against staging, then `wrangler
deploy` → R1.1, R4.1, R4.2
- [ ] **T8** Add `.github/workflows/deploy-production.yml`: `workflow_run` on
      `ci.yml` success for `main`, `environment: production`, run `npm run db:migrate`
      against production, then `wrangler deploy` → R1.2, R4.1, R4.2, R6.1
- [ ] **T9** Add `scripts/backup-db.sh` (`pg_dump` → gzip → upload to R2 via the
      AWS CLI's S3-compatible mode or `rclone`) → R5.1, R5.3
- [ ] **T10** Add `.github/workflows/db-backup.yml` (daily `schedule` +
      `workflow_dispatch`, uses a read-only DB credential where available) → R5.1,
      R5.2, R5.3, R7.2
- [ ] **T11** Configure the R2 bucket's lifecycle (retention) rule (manual,
      one-time, in the Cloudflare dashboard or via `wrangler r2 bucket lifecycle`) →
      R5.4
- [ ] **T12** Document the restore runbook (download from R2 → `pg_restore`/`psql`
      into a target DB → verification steps) → R5.5
- [ ] **T13** Run the end-to-end verification pass from design.md's "Testing
      strategy" section against the real Cloudflare account and repo → R1–R7

## Done criteria

- [ ] All tasks checked.
- [ ] Every acceptance criterion in requirements.md verified per design.md's
      Testing strategy.
- [ ] Spec updated to match what was actually built (service names, domains, cron
      schedule, retention window, and any open questions resolved during
      implementation).
