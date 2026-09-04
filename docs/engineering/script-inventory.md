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

## Alias scripts (`verify:*`)

`package.json`에 동일 `scripts/` 파일을 가리키는 alias가 **53 그룹** 존재한다. Phase B에서도 **삭제하지 않고** 호환성을 유지한다.

| 개념 | 설명 | 예 |
|------|------|-----|
| **canonical** | 도메인·주제를 가장 잘 드러내는 공식 명령 | `verify:application` |
| **compatibility alias** | 과거 문서·CI·운영 습관용 동의어 | `verify:applications`, `verify:application-workflow` |

정책:

1. 신규 verify 추가 시 **canonical 1개**만 새로 만든다.
2. 기존 alias는 breaking 없이 유지한다 (deprecated 주석은 `package.json` 또는 이 문서에만).
3. CI·문서·runbook은 canonical을 우선 사용한다.
4. alias 그룹 정리(삭제)는 별도 Phase에서 breaking change로 계획한다.
