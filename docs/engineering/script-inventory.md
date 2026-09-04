# Script Inventory

MATCHON `scripts/` 분류 기준과 현재 상태. Phase A (2026-09-04) 기준.

## 분류 기준

| 그룹 | 설명 | Phase A 조치 |
|------|------|----------------|
| **CRITICAL_KEEP** | migration, recovery, backfill, repair, billing, backup | 루트 유지 + `ops/README.md`에 문서화 |
| **ACTIVE_KEEP** | verify, e2e, seed, setup, audit | 유지. `package.json` 220개 파일 참조 무결 |
| **MOVE_OR_RENAME** | 필요하나 위치/이름 불량 | `ops/`, `archive/`로 점진 이관 |
| **SAFE_DELETE** | untracked `_tmp-*`, `_debug-*` 일회성 | **117개 삭제** (2026-09-04) |
| **REVIEW_REQUIRED** | `_prod-*`, `_qa-*`, untracked e2e | `archive/review-2026-09/` 보관 (삭제 안 함) |

## 규모 (Phase A 이후)

| 항목 | 수 |
|------|-----|
| Git tracked `scripts/` | 300 |
| `package.json` scripts 키 | 564 |
| `package.json` → `scripts/` 고유 파일 참조 | 220 (missing **0**) |
| tracked `verify-*` | 212 |
| tracked `e2e-*` | 34 |

## 운영 스크립트 위치

| 역할 | Canonical path | npm |
|------|----------------|-----|
| Deploy migration gate | `scripts/db-migrate-deploy-gate.mts` | `db:migrate:gate` |
| Match weight backfill | `scripts/backfill-match-weight-from-memo.mts` | — (`--apply`) |
| Division recovery export | `scripts/export-event-division-recovery-candidates.mts` | — |
| Division recovery (full) | `scripts/ops/recovery/export-event-division-recovery-candidates-full.mts` | — |
| Demo repair | `scripts/repair-*.ts` | `repair:*` |
| yamanote backup | `scripts/backup-yamanote-preflight.mts` | — |

## Production 실행 주의

1. **절대** yamabiko URL에서 `--apply` backfill/migrate/repair 실행하지 않는다 (명시 승인·dry-run 제외).
2. `_prod-*` archive 파일은 과거 hotfix 흔적일 수 있음 — 내용 확인 후 재실행.
3. `prisma migrate deploy`는 `db:migrate:gate` / Railway deploy 경로만 사용.
4. Recovery export는 **read-only**이나 대상 event·PII 주의.

## 새 스크립트 추가 시

1. 임시: `_tmp-` / `_debug-` + **커밋 금지** (또는 즉시 `archive/`)
2. 재사용 verify: `verify-<domain>-<topic>.ts` + `package.json` alias
3. 운영 write: yamanote/yamabiko guard + dry-run 기본 + `--apply`
4. Phase 종료 시 `docs/engineering/repository-cleanup-*.md` 인벤토리 갱신

## Archive

`scripts/archive/review-2026-09/` — Phase A에서 루트에서 제거한 untracked 40+ 파일. README 참고.

## Alias scripts

`package.json`에 동일 파일을 가리키는 `verify:*` alias가 50+ 그룹 존재 (의도적 호환). Phase A에서 **제거하지 않음**.
