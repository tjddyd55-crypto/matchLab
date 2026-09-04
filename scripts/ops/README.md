# Operations Scripts (`scripts/ops/`)

Production·staging 데이터에 영향을 줄 수 있는 스크립트. **기본은 dry-run / read-only.**

운영 절차 SSOT: [`docs/operations/runbook.md`](../../docs/operations/runbook.md), [`docs/operations/backup-recovery.md`](../../docs/operations/backup-recovery.md).

## 실행 전 체크리스트

1. `DATABASE_URL` host 확인 (yamanote = dev, yamabiko = production)
2. `--apply` / `--confirm` 없이는 write 하지 않는지 확인
3. 대상 row count 로그 확인
4. production write는 **명시적 승인 후**만

## Recovery

| 파일 | 설명 |
|------|------|
| `recovery/export-event-division-recovery-candidates-full.mts` | EventDivision recovery 후보 전체 export (untracked → ops 이관) |
| `../export-event-division-recovery-candidates.mts` | 동일 계열 (tracked, 루트) |

## Backfill (canonical @ repo root)

| 파일 | npm | 비고 |
|------|-----|------|
| `../backfill-match-weight-from-memo.mts` | — | `--apply` 필요, yamanote only |
| `../backfill-gym-members-from-fighters.ts` | — | 멤버 backfill |

## Migration

| 파일 | npm | 비고 |
|------|-----|------|
| `../db-migrate-deploy-gate.mts` | `npm run db:migrate:gate` | Railway deploy only |

## Repair

| 파일 | npm |
|------|-----|
| `../repair-demo-login-ids.ts` | `repair:demo-login-ids` |
| `../repair-gym-fighter-affiliations.ts` | `repair:demo-gym` |
| `../repair-gym-owner-auth-email-alignment.ts` | — |
| `lib/repair-gym-affiliation.ts` | (import helper) |

## Maintenance / Backup

| 파일 | 비고 |
|------|------|
| `../backup-yamanote-preflight.mts` | yamanote backup preflight |

## Archive (검토 대기)

`scripts/archive/review-2026-09/` — `_prod-*`, `_qa-*`, untracked e2e. 삭제 전 운영 이력 확인.
