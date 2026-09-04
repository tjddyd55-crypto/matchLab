# Golden Flow Regression Testing

MATCHON 대회 운영의 핵심 흐름(신청 → 현장 계체 → 경기 결과)이 코드 변경 후에도 깨지지 않도록 보호하는 regression 테스트입니다.

## 목적

- **Golden Flow**: 실제 대회 운영에서 가장 중요한 최소 경로(smoke)를 자동 검증
- **Static verify**(`verify:*`)는 구현 계약·구조 검증, **Golden Flow**는 서비스/브라우저 수준의 업무 결과 검증

## 테스트 대상 (Phase C)

| 흐름 | 검증 |
|------|------|
| GF-APPLICATION | 승인된 신청자 2명 seed, organizer 신청 목록 표시 |
| GF-CHECKIN | **N/A** — 현장 product는 weigh-in-first(별도 체크인 mutation 없음) |
| GF-WEIGHIN | 브라우저: 체중 저장 + 계체 통과 Server Action, reload persistence, DB read-only 검증 |
| GF-BRACKET | seed 대진·매치 존재, 경기 운영 화면에서 매치 조회 |
| GF-RESULT | 브라우저: 승자 선택 + 결과 확정 Server Action, reload persistence, DB read-only 검증 |

## 제외 범위 (별도 Phase)

- 전 화면 E2E, 모바일 matrix, 결제/문자 실발송, production DB, pixel-perfect UI

## Seed 구조

마커: `MATCHON_GOLDEN_FLOW`

```text
scripts/golden/
  guard.ts              # production guard
  constants.ts          # slug, fighter codes, context path
  seed-golden-flow.mts  # cleanup → seed → context.json
```

생성 엔티티:

- QA Event (`publicSlug: golden-flow-qa`)
- 1 division (-60kg), 1 court, 1 match_list bracket, 1 match (홍/청 2명)
- Fighter: `FTR-GOLDEN-RED`, `FTR-GOLDEN-BLUE`
- Context: `test-results/golden-flow/context.json` (gitignore)

Idempotent: 매 실행 시 기존 golden 데이터 cleanup 후 재생성. 운영 상태(계체·결과)는 reset.

## Production guard

`scripts/golden/guard.ts`:

- `yamabiko` / production URL → **즉시 종료**
- 허용: `yamanote`, `localhost`, CI postgres (`matchon_ci`)
- `NODE_ENV=production` + non-localhost → 종료
- `REFUSE_GOLDEN_FLOW_ON_PRODUCTION=1` 시 Railway non-yamanote 차단

## 계정 / Role

| 환경 | Organizer | 인증 |
|------|-----------|------|
| Local dev | `organizer` (setup:demo-users) | Supabase + `DEMO_PASSWORD` |
| CI services | `golden-organizer` (DB only) | — |
| CI browser | `golden-organizer` (seed `--ci`) | **CI test session** (아래) |
| Local browser | seed context `organizerLoginId` | `DEMO_PASSWORD` / `GOLDEN_PASSWORD` |

비밀번호를 코드에 하드코딩하지 않습니다.

## CI Browser Auth (self-contained)

GitHub Actions `golden-browser` job은 **외부 Supabase·DEMO_PASSWORD secret 없이** 실행됩니다.

```text
GOLDEN_FLOW_CI=1
MATCHON_GOLDEN_TEST_AUTH=1
MATCHON_GOLDEN_TEST_AUTH_SECRET=<workflow 고정값>
```

흐름:

```text
seed:golden --ci  →  golden-organizer User/Organizer 생성
POST /api/internal/golden-flow/test-session  →  httpOnly session cookie
getCurrentActor()  →  golden session → DB ActorContext (OrganizerGuard 통과)
Playwright UI mutation (계체/결과)
```

Production guard (`src/lib/auth/golden-test-auth-policy.ts`):

- `MATCHON_GOLDEN_TEST_AUTH=1` **and** `GOLDEN_FLOW_CI=1` **and** non-production runtime
- `RAILWAY_ENVIRONMENT_NAME=production` → **항상 거부**
- arbitrary user impersonation 불가 — `golden-organizer` loginId만 허용
- secret header 불일치 → 404

검증: `npm run verify:golden-test-auth-safety`

## Local vs CI Browser

| | Local | CI |
|---|-------|-----|
| DB | yamanote + setup:demo-users | CI postgres + `seed --ci` |
| Server | `next dev` (Playwright webServer) | `next build` + `next start` |
| Login | `/login` Supabase form | test-session bootstrap |
| Password | `DEMO_PASSWORD` | 불필요 |

Local에서 CI auth를 시뮬레이션하려면 CI postgres + 위 env + `seed --ci` 후 `npx playwright test` 실행.

## Troubleshooting

| 증상 | 확인 |
|------|------|
| `Failed to find Server Action` (dev) | dev HMR 노이즈 — CI `next start`에서는 재현 안 됨 |
| login timeout (local) | dev server 응답, `DEMO_PASSWORD`, Supabase |
| test-session 404 (CI) | `MATCHON_GOLDEN_TEST_AUTH`, `GOLDEN_FLOW_CI`, secret, `seed --ci` |
| golden-organizer not seeded | `db:push` 후 `seed:golden --ci` 순서 |

## Local 실행

### 1. 사전 조건

- Development DB (`yamanote`) + `npm run setup:demo-users`
- `.env`에 `DATABASE_URL`, Supabase, `DEMO_PASSWORD`
- 브라우저 E2E: 로컬 Next `http://127.0.0.1:3000` 실행 중

### 2. Seed

```bash
npm run seed:golden
```

CI postgres:

```bash
npm run seed:golden -- --ci
```

Cleanup only:

```bash
npm run seed:golden:cleanup
```

### 3. Service regression (browser 불필요)

```bash
npm run verify:golden-flow-services
```

### 4. Browser mutation smoke

`test:golden`은 `seed:golden` 후 Playwright로 **실제 UI Server Action mutation**을 검증합니다.

- `--prep-onsite` 사용하지 않음 (계체 완료 상태를 seed로 미리 만들지 않음)
- Playwright `webServer`: local은 `next dev` 재사용, CI는 `next start` (사전 `npm run build`)
- mutation 후 `assert:golden-browser-state`로 DB read-only 검증

검증 흐름:

```text
신청 목록 확인 → 홍/청 계체 통과(체중 저장 + 수동 통과) → 경기 결과 확정 → reload persistence
```

3회 연속 (flaky 검증):

```bash
for i in 1 2 3; do npm run seed:golden && npx playwright test -c playwright.golden.config.ts || break; done
```

## CI

Workflow: `.github/workflows/golden-flow.yml`

| Job | Trigger | 내용 |
|-----|---------|------|
| `golden-services` | push main, PR | postgres + `db push` + seed --ci + verify services |
| `golden-browser` | **push main**, `workflow_dispatch` | self-contained postgres + seed + build + `next start` + Playwright |

Fast CI(`ci.yml`)와 **분리**되어 있습니다. Golden browser는 required PR gate가 아닙니다.

## 실패 artifact

- Playwright: `test-results/golden-flow/artifacts/`, `playwright-report/`
- CI: workflow artifact upload (failure 시)
- Git에 commit하지 않음 (`.gitignore`)

## 테스트 추가 규칙

1. `data-testid`는 필요한 최소 control에만
2. `waitForTimeout` 금지 — `expect`, `waitForURL`, `waitForResponse` 사용
3. production DB/결제/문자 발송 금지
4. 기존 `verify:*` 삭제·대체 금지
5. flaky 테스트는 CI retry로 가리지 말고 원인 수정

## package.json 명령

```bash
npm run seed:golden
npm run seed:golden:cleanup
npm run verify:golden-flow-services
npm run verify:golden-test-auth-safety
npm run test:golden
```
