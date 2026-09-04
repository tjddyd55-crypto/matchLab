# MATCHON 운영 Runbook (최소)

장애 발생 시 **먼저 확인할 곳**과 **배포·DB·장애 대응** 절차만 정리한다.  
상세 SSOT: [`deployment-environments.md`](../deployment-environments.md), [`deploy-railway.md`](../deploy-railway.md), [`database.md`](../database.md).

---

## 1. 현재 운영 구조 (요약)

| 항목 | SSOT |
|------|------|
| **앱 호스팅** | Railway Web Service (Next.js) |
| **DB** | Railway PostgreSQL (환경별 분리) |
| **Auth / Storage** | Supabase (Auth + Storage bucket) |
| **브랜치** | `develop` → Railway `development`, `main` → Railway `production` |
| **Production URL** | `https://app-production-79ad.up.railway.app` (변경 금지) |
| **Development URL** | `https://app-preview-member-gym-b.up.railway.app` |
| **DB 별칭** | `yamanote` = Development, `yamabiko` = Production (host fingerprint) |
| **환경 변수** | Railway Web Service Variables (secret 원문은 문서·로그에 남기지 않음) |
| **필수 env** | `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` 등 — [`deploy-railway.md`](../deploy-railway.md) 체크리스트 |

### CI (GitHub Actions)

| Workflow | Trigger | 역할 |
|----------|---------|------|
| `ci.yml` | `main` push, PR | typecheck, lint, build, core verify |
| `golden-flow.yml` | `main` push, PR(services), `main`(browser) | Golden Flow regression |

Production 배포는 **Railway `main` 연결**이 SSOT이다. GitHub Actions는 배포 gate가 아니다.

---

## 2. 배포

### 2.1 정상 흐름 (`main` → Production)

```text
main push
  → Railway build (npm ci → npm run build)
  → preDeploy: npm run db:migrate:gate
       (prisma migrate status → prisma migrate deploy)
  → start: npm start (next start)
```

설정 SSOT: [`railway.toml`](../../railway.toml) (repo, 배포 시 읽힘) + [`.railway/railway.ts`](../../.railway/railway.ts) (Railway IaC, `railway config apply`).

레거시 `railway.json`은 Railpack 배포에서 **실행되지 않음** (2026-09 MessagingProviderConfig P2021 사례). Railway 서비스에 `preDeployCommand`가 dashboard/API로 설정되어 있어야 한다. 레포 변경 후 `railway config plan` → `railway config apply` 또는 Railway MCP/대시보드로 동기화한다.

### 2.1.1 Migration drift (yamabiko, 문서화만)

yamabiko `_prisma_migrations`에 repo에 없는 `20260828120000_event_application_structural_audit`가 존재한다. **이번 자동화에서는 삭제·resolve하지 않는다.** `prisma migrate deploy`는 pending repo migration만 적용한다.

### 2.2 실패 시 확인 위치

1. **Railway** → 해당 환경 → Web Service → **Deployments** → 실패한 release 로그
2. **Pre-deploy 실패** → `db:migrate:gate` / `prisma migrate` 출력 확인
3. **Build 실패** → `npm run build` (Prisma generate + Next build) 로그
4. **Runtime 500** → Web Service **Logs**, Prisma `P2021`(테이블 없음) 등

로컬 read-only 점검 (대상 DB `DATABASE_URL` 설정 후):

```bash
npm run verify:prisma-migration-deploy-config
npm run db:migrate:status
npm run verify:production-migration-status
```

### 2.3 Rollback

| 방법 | 설명 |
|------|------|
| **Railway redeploy** | Deployments에서 **이전 성공 release**를 Redeploy (권장) |
| **Git revert** | `main`에 revert commit → 자동 재배포 |
| **DB rollback** | 자동화 없음. migration은 **forward-only** (`migrate deploy`). 스키마 롤백은 별도 계획·백업 복원 필요 |

`db:migrate:gate` 실패 시 **새 release는 serving 되지 않음** — 이전 release가 계속 동작하는 경우가 많다.

### 2.4 Production에서 금지 (자동화·수동 공통)

- `npm run db:push` / `prisma db push`
- `npm run db:migrate` / `prisma migrate dev`
- `prisma migrate reset`
- `npm run db:seed` (운영 데이터 덮어쓰기 위험)
- Golden Flow seed/test (`scripts/golden/*`) — production DB guard

Development/수동 스키마 반영이 필요하면 [`deploy-railway.md`](../deploy-railway.md)의 `db:push` 절차를 **yamanote에서만** 사용.

---

## 3. DB / Migration

### 3.1 Production migration (자동)

| 명령 | 용도 |
|------|------|
| `npm run db:migrate:gate` | Railway **preDeploy** 전용 (status → deploy) |
| `npm run db:migrate:deploy` | pending migration만 적용 (수동·긴급) |
| `npm run db:migrate:status` | pending 확인 (read-only) |
| `railway config plan` / `apply` | IaC(`.railway/railway.ts`) 변경을 Railway에 반영 |

preDeploy 실패 시 **새 deployment는 serving 되지 않음** (fail-fast). 이전 release가 계속 동작하는 경우가 많다.

### 3.2 Schema 변경 전 확인

1. `prisma/migrations/`에 forward migration 추가 (dev에서 `db:migrate`로 생성)
2. `npm run verify:prisma-migration-deploy-config` PASS
3. Development Railway에 먼저 배포·smoke
4. `main` merge → Production pre-deploy에서 `migrate deploy`
5. destructive change면 backfill/recovery 스크립트·백업 계획 선행 ([`backup-recovery.md`](./backup-recovery.md))

### 3.3 Migration 실패 대응 (첫 확인)

1. Railway pre-deploy 로그에서 실패한 migration 파일명 확인
2. `npm run verify:production-migration-status` (해당 환경 `DATABASE_URL`로)
3. `prisma migrate status` — applied / pending 구분
4. **수동 SQL 수정은 최후 수단** — 팀 승인 후, 백업 확인 후 진행

---

## 4. 장애 대응 — 첫 번째로 볼 곳

| 상황 | 1차 확인 | 2차 확인 |
|------|----------|----------|
| **로그인 장애** | Supabase Auth 상태·프로젝트, `NEXT_PUBLIC_SUPABASE_*` Railway Variables | 앱 로그, `src/lib/auth/actor.ts` 경로, `/login` 응답 |
| **신청 데이터 이상** | 주최자 `/organizer/events/{id}/applications`, `EventApplication` 상태 | `AuditLog`, 신청 수정 이력, Excel export vs UI 필터 |
| **대진 데이터 이상** | `/organizer/events/{id}/brackets`, `BracketChangeLog` | `bracket.service.ts`, 자동대진 로그, recovery export ([`backup-recovery.md`](./backup-recovery.md)) |
| **계체/경기결과 저장 이상** | 현장 UI + Server Action 오류 (브라우저 network) | `field-status` / `match.service`, `MatchResult`·`MatchResultChangeLog` |
| **결제/구독 이상** | `/admin/billing/*`, 주최·체육관 billing 화면 | `verify:billing-checkout`, 내부 renewal API (`/api/internal/billing/renewals/run`) |
| **DB migration 실패** | Railway pre-deploy 로그 | `npm run verify:production-migration-status`, `prisma migrate status` |

### 운영 UI (관리자)

- `/admin/audit-logs` — 교차 도메인 감사
- `/admin/billing/payments`, `/admin/billing/subscriptions` — 결제·구독
- `/admin/messaging/diagnostics` — 메시징 dry-run·설정 확인

### 로그·메시징 안전 (기본)

Development/Production 모두 기본적으로 실문자·알림톡 비활성 — [`deployment-environments.md`](../deployment-environments.md) Messaging 섹션.

---

## 5. 환경 분리 체크

배포·스크립트 실행 전:

```bash
npm run verify:deployment-environments
```

`DATABASE_URL` host가 **대상 환경과 일치**하는지 확인한다 (`yamanote` ≠ `yamabiko`).

---

## 6. 관련 문서

| 문서 | 내용 |
|------|------|
| [`backup-recovery.md`](./backup-recovery.md) | 백업·복구·recovery/repair 스크립트 |
| [`deploy-railway.md`](../deploy-railway.md) | Railway 변수·첫 배포·트러블슈팅 |
| [`engineering/script-inventory.md`](../engineering/script-inventory.md) | scripts 분류 |
| [`scripts/ops/README.md`](../../scripts/ops/README.md) | ops 스크립트 인덱스 |
