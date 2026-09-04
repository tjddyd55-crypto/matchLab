# Untracked scripts archived 2026-09-04 (Phase A)

이 폴더의 파일은 **루트 `scripts/`에 방치된 untracked 일회성 스크립트**를 보관한 것이다.

| 하위 폴더 | 내용 | Phase A 조치 |
|-----------|------|----------------|
| `prod-ops/` | `_prod-*` production 조사·migrate·smoke | **삭제 안 함** — REVIEW 후 ops 이관 또는 삭제 |
| `qa/` | `_qa-*` dev QA 일회성 | REVIEW |
| `e2e-untracked/` | package.json 미등록 e2e 복제/스모크 | tracked `e2e-*`와 중복 여부 확인 후 정리 |
| `verify-untracked/` | 신규 verify (미등록) | 필요 시 루트로 복귀 + `package.json` 등록 |

**주의:** `prod-ops/` 내 migration/backfill 성격 파일은 production 이력이 있을 수 있음. 파일 내용·실행 일자 확인 후 판단.

복구 예: `git`에 없던 파일이므로 이 archive에서 `scripts/`로 copy.

---

## Phase B 최종 판정 (2026-09-04)

### prod-ops (10) — **ARCHIVE_KEEP** (전부)

| 파일 | 판정 | 이유 |
|------|------|------|
| `_prod-default-sport-seed-baseline.ts` | ARCHIVE_KEEP | prod seed baseline read-only |
| `_prod-default-sport-seed-smoke.ts` | ARCHIVE_KEEP | seed smoke 이력 |
| `_prod-kickboxing-display-name-normalize.ts` | ARCHIVE_KEEP | display name 정규화 이력 (write 가능) |
| `_prod-kickboxing-template-migrate.mts` | ARCHIVE_KEEP | template migrate 이력 |
| `_prod-kickboxing-template-smoke.mts` | ARCHIVE_KEEP | smoke |
| `_prod-member-template-code-baseline.ts` | ARCHIVE_KEEP | baseline |
| `_prod-multi-sport-baseline.ts` | ARCHIVE_KEEP | multi-sport baseline |
| `_prod-multi-sport-gym-smoke.ts` | ARCHIVE_KEEP | gym smoke |
| `_prod-multi-sport-resolve-check.ts` | ARCHIVE_KEEP | resolve 검증 |
| `_prod-multi-sport-smoke.ts` | ARCHIVE_KEEP | smoke |

→ `scripts/ops/` 이관은 **별도 ops Phase**. 당장 삭제하지 않음.

### qa (9) — **ARCHIVE_KEEP** (전부)

일회성 dev QA·migrate 스크립트. 재실행 가치 낮음이나 hotfix 맥락 보존.

### e2e-untracked (18) — **ARCHIVE_KEEP** 17 / **DELETE** 0

tracked `e2e-*`와 시나리오 중복 다수. 정식 편입은 시나리오 차별화 검토 후 Phase C.

| 유형 | 판정 |
|------|------|
| preview/prod smoke 복제 | ARCHIVE_KEEP |
| admin-org-status, billing, bracket PDF 등 | ARCHIVE_KEEP (이력) |
| unique 시나리오 후보 | `e2e-schedule-event-link-preview-qa.mts` — 편입 검토 (WIP 의존) |

### verify-untracked (3)

| 파일 | 판정 | 메모 |
|------|------|------|
| `verify-event-schedule-link.ts` | **PROMOTED (보류)** | association schedule WIP 완료 후 `verify:association-schedule` canonical로 편입 검토 |
| `verify-gym-member-fighter-integration.ts` | ARCHIVE_KEEP | gym member WIP와 연동, 편입은 feature 완료 후 |
| `verify-my-match-public-qa.mts` | ARCHIVE_KEEP | my-match QR 제거 WIP와 충돌 가능, 재검토 |

**요약:** OPS_KEEP 0 · ARCHIVE_KEEP 37 · DELETE 0 · PROMOTED 0 (보류 1)
