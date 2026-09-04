# Repository Cleanup — Phase A (2026-09-04)

## 목표

기능 개발 없이 `scripts/` 및 저장소 부산물을 정리하여 운영·복구 스크립트를 보호하고, 임시 파일을 제거한다.

## 수행 내역

### 삭제 (SAFE_DELETE)

- `scripts/_tmp-*` **108개** — untracked 일회성 조사·QA·prod read smoke
- `scripts/_debug-*` **9개** — untracked 디버그
- **합계 117개** (Git에 없었음 → 복구는 불가, 내용은 대부분 재생성 가능한 agent 스크립트)

### Archive (REVIEW_REQUIRED, 삭제 안 함)

→ `scripts/archive/review-2026-09/`

| 하위 | 파일 수 (약) | 패턴 |
|------|-------------|------|
| `prod-ops/` | 10 | `_prod-*` |
| `qa/` | 9 | `_qa-*` |
| `e2e-untracked/` | 18 | untracked `e2e-*` |
| `verify-untracked/` | 3 | 신규 verify (미등록) |

### 구조 추가

- `scripts/README.md` — 전체 가이드
- `scripts/ops/README.md` — 운영 스크립트 맵
- `scripts/ops/recovery/export-event-division-recovery-candidates-full.mts` — recovery full export 이관

### .gitignore

- `/test-results/`
- `/outputs/`
- `/tmp/`

### 미수행 (의도적)

- tracked 300개 파일 대량 이동 (package.json 220 참조 깨짐 방지)
- `package.json` alias script 제거 (호환성)
- 비즈니스 로직 / schema 변경
- production DB write

### 기존 작업 중 변경과 분리

Phase A는 **scripts 정리 + docs + gitignore**만 스테이징 권장.  
`src/`의 field-status QR 제거, gym members WIP 등은 **별도 커밋** 유지.

## CRITICAL 보존 확인

다음 tracked 스크립트는 **삭제·이동하지 않음**:

- `db-migrate-deploy-gate.mts`
- `backfill-match-weight-from-memo.mts` (이미 `--apply` + yamanote guard)
- `export-event-division-recovery-candidates.mts`
- `repair-*.ts`, `backup-yamanote-preflight.mts`
- `scripts/sql/*-additive.sql`
- `scripts/lib/repair-gym-affiliation.ts`

## 다음 Phase B 제안

| 우선순위 | 항목 |
|----------|------|
| P0 | `archive/review-2026-09/prod-ops` 파일별 KEEP/DELETE 판정 |
| P0 | untracked verify 3개 → 등록 또는 삭제 |
| P1 | tracked `e2e-*` vs archive 중복 통합 |
| P1 | `package.json` verify alias 문서화 또는 그룹화 |
| P2 | CRITICAL ops를 `git mv`로 `ops/` 통합 (경로 일괄 업데이트) |
