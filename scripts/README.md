# MATCHON Scripts

운영·검증·시드 스크립트 모음. **파일명만 보고 삭제하지 말고** `package.json` / 문서 / `docs/engineering/script-inventory.md`를 함께 확인한다.

## 디렉터리

| 경로 | 용도 |
|------|------|
| `scripts/ops/` | DB write·recovery·backfill·migration 등 **운영급** (보수적 관리) |
| `scripts/archive/` | 일회성·검토 대기 스크립트 (삭제 전 보관) |
| `scripts/lib/` | 스크립트 공유 유틸 |
| `scripts/sql/` | additive SQL (수동 적용 전 검토) |
| `scripts/verify-*.ts` | 정적/단위 검증 (npm `verify:*`) |
| `scripts/e2e-*.mts` | 브라우저·DB QA (수동 `npx tsx`) |

## 운영 스크립트 (canonical — 루트 유지)

`package.json` 호환을 위해 아래는 **루트 `scripts/`에 유지**한다. `ops/` README에 동일 경로를 문서화한다.

- `db-migrate-deploy-gate.mts` — Railway deploy migration gate
- `backfill-match-weight-from-memo.mts` — `--apply` 전 dry-run
- `export-event-division-recovery-candidates.mts` — recovery export (tracked)
- `repair-*.ts`, `seed-*.ts`, `setup-*.ts` — dev/demo/repair
- `backup-yamanote-preflight.mts` — backup preflight

## 새 스크립트 추가 규칙

1. 임시 조사는 `_tmp-` / `_debug-` 접두사 + **커밋하지 않음** (또는 `archive/`로 이동)
2. Production DB write는 yamabiko/yamanote fingerprint 검증 + 기본 dry-run
3. 완료된 일회성은 `archive/review-YYYY-MM/`로 이동 후 인벤토리 갱신
4. 재사용 검증은 `verify-*` + `package.json`에 `verify:` 등록 검토

상세: [docs/engineering/script-inventory.md](../docs/engineering/script-inventory.md)
