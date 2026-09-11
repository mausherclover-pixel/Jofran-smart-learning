# 14 — DevOps & Deployment

Source: architecture §14, [backend/docker-compose.yml](../backend/docker-compose.yml).
**No infrastructure has actually been provisioned or deployed** — this
document describes local development (real, working) and the intended
production topology (designed, not yet built).

## Local development (real, verified)

```bash
# backend
cd backend
docker compose up -d      # postgres:16-alpine on :5432, redis:7-alpine on :6379
npm install
npm run prisma:migrate
npm run prisma:seed
npm run start:dev         # :4000

# frontend, separate terminal
cd frontend
npm install
npm run dev                # :3000
```

This is the actual sequence used to verify both applications during Steps
2–4 — `docker-compose.yml` uses vanilla Postgres (no `pgvector` needed; see
[08_AI_Architecture.md](08_AI_Architecture.md) for why).

## How this was verified without live infrastructure

Every backend and frontend change in this repository was checked with the
same sequence, run in the actual development sandbox: `npm install` →
`prisma generate` (backend) → `tsc --noEmit` → `jest` (backend's 49-test
suite) → `next build` / `nest build` → a real application boot
(`node dist/main.js`). The boot test confirms
every NestJS module's dependency-injection graph resolves and every route
maps — it necessarily stops at `PrismaClientInitializationError:
Can't reach database server`, since no Postgres/Redis instance runs in that
sandbox. This is a materially stronger check than "the code looks right":
it caught six real bugs across the four build steps (a duplicate `Role`
enum, a `cookie-parser` import misconfiguration, an OAuth strategy crash
on missing credentials, a scope-check logic error, and two dependency
version/CVE issues) before this document was written.

## Intended production topology (AWS, `ap-southeast-1`)

```
Route 53 → CloudFront → S3 (static assets)
         → ALB → ECS Fargate: api-service, ws-service, worker-service
                    ↓
              RDS PostgreSQL (Multi-AZ) · ElastiCache Redis
```

- **Why `ap-southeast-1`**: Timor-Leste has no in-country AWS region;
  Singapore is the nearest.
- **Why ECS Fargate over Kubernetes**: no cluster to operate, fits a small
  team, matches the "boring infrastructure" principle threaded through this
  whole build.
- **Three Fargate services**, not one: `api-service` (REST+GraphQL),
  `ws-service` (WebSocket gateway), `worker-service` (BullMQ processors) —
  so a burst of grading jobs autoscales independently from user-facing
  request latency.

## CI/CD (designed, not implemented)

No `.github/workflows/` or equivalent pipeline exists in this repository.
The intended flow: GitHub Actions builds a Docker image on merge to `main`,
pushes to ECR, and triggers an ECS rolling deploy. `npm run typecheck` +
`npm run build` (both applications) should gate the pipeline before any
image is built — those are exactly the commands used for manual
verification during Steps 2–4, so wiring them into CI is mechanical, not a
new invention.

## Environment variables reference

See [backend/.env.example](../backend/.env.example) and
[frontend/.env.local.example](../frontend/.env.local.example) for the
complete, current list. Notable production-readiness gaps:

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` default to dev placeholder
  strings if unset — **must** be set to real secrets (e.g. via AWS Secrets
  Manager) before any non-local deployment.
- `OPENAI_API_KEY` unset means every AI feature fails at the OpenAI call,
  not at boot — the app starts fine without one, which is convenient for
  local dev of non-AI features but easy to miss in a deployment checklist.

## Monitoring & observability (not implemented)

The architecture document specifies structured JSON logging (pino) and
OpenTelemetry tracing (§16). Neither is wired into the current codebase —
NestJS's default `Logger` is what every service actually uses today. This
is the most consequential gap for a real production deployment: right now,
diagnosing an issue in a deployed environment would rely on ECS's raw
container logs, not a queryable structured log store.

## Backups & disaster recovery

Not configured — no infrastructure exists to configure. The architecture
specifies RDS automated backups (7-day retention) plus a weekly
cross-region snapshot; this is an RDS console/Terraform setting to apply at
first deployment, not application code.
