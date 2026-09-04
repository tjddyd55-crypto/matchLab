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
