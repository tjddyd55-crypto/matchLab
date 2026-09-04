# MATCHON Backup & Recovery (최소)

백업·복구·데이터 수복 스크립트만 정리한다.  
**이 문서의 restore/apply 명령은 운영 승인 후에만 실행**한다. 문서 작성·검증 단계에서는 실행하지 않는다.

---

## 1. Backup — 현재 방식

### 1.1 Production DB (`yamabiko`)

| 항목 | 내용 |
|------|------|
| **주 백업** | Railway PostgreSQL 플러그인 **자동 백업** (Railway 대시보드 → Postgres 서비스 → Backups) |
| **레포 스크립트** | Production `pg_dump` 자동화 **없음** |
| **확인** | Railway Backups 탭에서 최근 snapshot 존재·크기 확인 |
| **복원** | Railway **Restore to new instance** 또는 지원되는 restore UI (기존 인스턴스 직접 덮어쓰기 전 팀 승인) |

복원 전 확인:

1. 복원 대상 시점(snapshot 시간)이 맞는지
2. 복원 후 `DATABASE_URL`이 앱 Web Service에 올바르게 연결되는지
3. `npm run db:migrate:status` — schema drift 없음
4. Supabase Auth는 DB와 **별도** — DB만 복원해도 Auth 불일치 가능

### 1.2 Development DB (`yamanote`)

| 항목 | 내용 |
|------|------|
| **스크립트** | `npx tsx scripts/backup-yamanote-preflight.mts` |
| **npm alias** | 없음 (위 명령 직접 사용) |
| **출력** | `.local-backups/yamanote-pre-insurance-pii-{timestamp}.json` |
| **내용** | 스키마 메타·테이블 row count·`EventApplication` 컬럼 목록 (**full dump 아님**) |
| **guard** | `yamanote` host만 허용, `yamabiko` 거부 |

용도: migration/스키마 변경 **전** development 상태 스냅샷·용량 확인.

### 1.3 Supabase / Storage

- Auth 사용자·비밀번호: Supabase 프로젝트 백업/복구 정책 (Railway DB와 분리)
- Storage bucket (`event-images`, `profile-images`, private 신청서 PDF 등): Supabase Storage — bucket별 정책·수동 export는 Supabase 콘솔

---

## 2. Recovery / Repair / Backfill 스크립트

기본 원칙 (`scripts/ops/README.md`):

1. `DATABASE_URL` host 확인 (`yamanote` / `yamabiko`)
2. **`--apply` 없으면 write 없음** (스크립트별 예외는 표 참고)
3. production write는 **명시 승인 후**
4. recovery export는 **read-only**이나 PII·전체 이름 포함 버전 주의

### 2.1 표 — 주요 도구

| 스크립트 | 언제 사용 | dry-run / read-only | production guard | 실행 command | rollback |
|----------|-----------|---------------------|------------------|--------------|----------|
| `scripts/db-migrate-deploy-gate.mts` | Railway **배포 시** migration 적용 | N/A (deploy만) | `migrate deploy` only | `npm run db:migrate:gate` | 이전 Railway release redeploy; DB는 forward migration |
| `scripts/verify-production-migration-status.mts` | 배포 전·후 pending migration 점검 | **read-only** | env `DATABASE_URL`만 읽음 | `npm run verify:production-migration-status` | 해당 없음 |
| `scripts/export-event-division-recovery-candidates.mts` | EventApplication **division 불일치** 후보 조사 | **read-only** (로컬 xlsx만 쓰기) | yamabiko host 검증, `READ ONLY` TX | `npx tsx scripts/export-event-division-recovery-candidates.mts` | DB 변경 없음 |
| `scripts/ops/recovery/export-event-division-recovery-candidates-full.mts` | 위와 동일, **실명** 포함 export | **read-only** | 동일 | `npx tsx scripts/ops/recovery/export-event-division-recovery-candidates-full.mts` | DB 변경 없음 |
| `scripts/backfill-match-weight-from-memo.mts` | `organizerMemo`의 kg → `matchWeightKg` 이관 | 기본 dry-run, `--apply` 시 write | **yamanote only** (yamabiko 거부) | `npx tsx scripts/backfill-match-weight-from-memo.mts` / `--apply` | 수동 SQL/백업 복원; memo 원문은 변경 안 함 |
| `scripts/backfill-gym-members-from-fighters.ts` | Fighter → GymMember 연결 backfill | `DRY_RUN=1` 기본 권장 | env 확인 필수, 승인 후 | `DRY_RUN=1 npx tsx scripts/backfill-gym-members-from-fighters.ts` / `npm run backfill:gym-members-from-fighters` | additive·idempotent 설계, 수동 정리 필요 시 DB 백업 |
| `scripts/repair-demo-login-ids.ts` | 데모 계정 `User.loginId` 누락 복구 | 없음 (즉시 update) | **대상 DB 주의** — 데모 email만 | `npm run repair:demo-login-ids` | loginId 재수정 |
| `scripts/repair-gym-fighter-affiliations.ts` | 체육관–선수 소속 불일치 복구 | 없음 | `DATABASE_URL` 확인 | `npm run repair:demo-gym` | `repairGymFighterAffiliations` 역연산 없음 — 백업 |
| `scripts/repair-gym-owner-auth-email-alignment.ts` | 회원사 owner `User.email` ↔ Auth email 불일치 | 기본 dry-run, `--apply` 시 update | 승인 후 | `npx tsx scripts/repair-gym-owner-auth-email-alignment.ts` / `--apply` | 수동 revert |
| `scripts/backup-yamanote-preflight.mts` | dev 스키마 변경 전 스냅샷 | read-only DB | **yamanote only** | `npx tsx scripts/backup-yamanote-preflight.mts` | 해당 없음 |

### 2.2 Application / Match 도메인 (앱 내 복구)

코드 기반 복구 (스크립트 아님):

| 동작 | 경로 | 비고 |
|------|------|------|
| 주최측 취소 복원 | 주최자 신청 UI → restore action | `restoreOrganizerCancelledApplicationAction` |
| 체육관 취소 복원 | 동일 | `restoreGymCancelledApplicationAction` |
| 취소된 경기 상태 | verify만 존재 | `npm run verify:cancelled-match-status-recovery` |

### 2.3 Archive (과거 hotfix 흔적)

`scripts/archive/review-2026-09/prod-ops/` — `_prod-*` 일회성 스크립트. **재실행 전 내용·실행 일자 확인**. SSOT 아님.

---

## 3. 복구 시나리오 (요약)

### 3.1 Division 잘못 매핑 (신청)

```text
1. recovery export (read-only) → xlsx로 후보 확인
2. 원인 분석 (division rebuild, manual edit, import)
3. 수정은 UI/서비스 경로 또는 승인된 SQL — export 스크립트는 UPDATE 안 함
4. 필요 시 주최자 신청 수정 UI로 정정
```

### 3.2 Migration 실패로 배포 중단

```text
1. Railway pre-deploy 로그 확인
2. npm run verify:production-migration-status
3. migration SQL 수정이 필요하면 새 forward migration (dev에서 검증 후 main)
4. 성공 시 재배포 — 실패 release는 자동으로 serving 안 됨
```

### 3.3 Production DB 전체 복구

```text
1. Railway Postgres backup에서 restore 시점 선택
2. 새 인스턴스 또는 restore 절차 (Railway 문서·지원)
3. Web Service DATABASE_URL 연결 확인
4. npm run db:migrate:status
5. 앱 smoke (/login, 대표 organizer flow)
6. Supabase Auth/Storage는 별도 점검
```

**문서화 단계에서 실제 restore는 실행하지 않는다.**

---

## 4. 명령 존재 검증 (문서 ↔ 레포)

문서에 등재한 npm scripts는 `package.json`에 존재함:

- `db:migrate:gate`, `db:migrate:status`, `db:migrate:deploy`
- `verify:production-migration-status`, `verify:prisma-migration-deploy-config`, `verify:deployment-environments`
- `repair:demo-login-ids`, `repair:demo-gym`
- `backfill:gym-members-from-fighters`
- `verify:cancelled-match-status-recovery`, `verify:billing-checkout`

npm alias 없는 스크립트는 `npx tsx scripts/...` 경로로만 기재.

---

## 5. Gaps (자동화 없음)

| 항목 | 현재 |
|------|------|
| Production scheduled `pg_dump` to 외부 저장소 | 없음 (Railway backup에 의존) |
| 원클릭 DB restore runbook 자동화 | 없음 |
| division recovery **apply** 스크립트 | 없음 (export만) |
| Staging 전용 환경 | `development` Railway가 QA 역할 |
| 통합 on-call paging | 없음 |

---

## 6. 관련 문서

- [`runbook.md`](./runbook.md) — 배포·장애 1차 대응
- [`../deploy-railway.md`](../deploy-railway.md)
- [`../engineering/script-inventory.md`](../engineering/script-inventory.md)
