# ORCA CRM — Production Deployment Runbook

## Delivery path

1. Pull requests and pushes to `main` run **ORCA CI**.
2. CI installs locked dependencies, generates Prisma Client, runs the
   production gate, core regression tests, and the production build.
3. Vercel Git Integration deploys the accepted `main` commit.
4. **ORCA Production Smoke** waits for production and verifies that the
   deployed commit SHA matches the successful CI commit.

Git-based Vercel deployment is the deployment engine. Do not add a second
automatic deployment path using a Deploy Hook or a separate CLI workflow.

## Repository configuration

Create the GitHub repository variable:

- `PRODUCTION_URL=https://orca.az-ez.pro`

In Vercel Deployment Checks, require the GitHub check named **ORCA CI** before
promoting a production deployment.

## Secrets

- Application secrets remain in Vercel environment variables.
- CI/CD credentials, if introduced later, remain in GitHub Actions secrets.
- Never commit `.env`, `.env.local`, `.env.production`, tokens, or private keys.
- Rotate production provider keys and secrets during the final 24–48 hours
  before launch.
- External providers that are not activated do not block internal platform
  deployment when their safe fallback is verified.

## Production verification

The deployment health endpoint is:

`/api/health/deployment`

It exposes only service status, environment, deployment commit SHA, and
timestamp. It does not expose configuration or secret values.

A production release is accepted only when:

- ORCA CI passes.
- Vercel reports the deployment as Ready.
- ORCA Production Smoke reports `PRODUCTION_SMOKE_PASS`.
- The production commit equals the CI commit.
- The repository working tree is clean.

## Rollback

Use Vercel Instant Rollback from the deployment dashboard, or execute:

`vercel rollback <previous-production-deployment-url>`

Rollback restores application deployment traffic. It does not reverse database
migrations or external financial transactions. Database changes require a
forward-safe migration or a separately approved recovery procedure.

After rollback:

1. Confirm the previous deployment is serving production.
2. Run the production smoke workflow manually.
3. Record the failed commit, deployment URL, cause, and corrective action.
4. Fix forward through a new pull request; do not rewrite production history.