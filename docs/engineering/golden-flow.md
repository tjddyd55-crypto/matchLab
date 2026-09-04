# Golden Flow Regression Testing

MATCHON 대회 운영의 핵심 흐름(신청 → 현장 계체 → 경기 결과)이 코드 변경 후에도 깨지지 않도록 보호하는 regression 테스트입니다.

## 목적

- **Golden Flow**: 실제 대회 운영에서 가장 중요한 최소 경로(smoke)를 자동 검증
- **Static verify**(`verify:*`)는 구현 계약·구조 검증, **Golden Flow**는 서비스/브라우저 수준의 업무 결과 검증

## 테스트 대상 (Phase C)

| 흐름 | 검증 |
|------|------|
| GF-APPLICATION | 승인된 신청자 2명 seed, organizer 신청 목록 표시 |
| GF-WEIGHIN | 서비스: 몸무게 저장·계체 통과. 브라우저: 계체 통과 상태·대진 현황 표시 |
| GF-BRACKET | seed 대진·매치 존재, 경기 운영 화면에서 매치 조회 |
| GF-RESULT | 서비스: 승자 확정·DB 지속성 PASS. 브라우저: 경기 운영 UI·결과 입력 폼 노출 검증 |

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

| 환경 | Organizer | 비밀번호 |
|------|-----------|----------|
| Local dev | `organizer` (setup:demo-users) | `DEMO_PASSWORD` |
| CI services | `golden-organizer` (DB only) | — |
| Browser E2E | seed context의 `organizerLoginId` | `DEMO_PASSWORD` / `GOLDEN_PASSWORD` |

비밀번호를 코드에 하드코딩하지 않습니다.

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

### 4. Browser smoke

`test:golden`은 내부적으로 `seed:golden --prep-onsite`를 실행한 뒤 Playwright를 수행합니다.

결과 확정 mutation은 `verify:golden-flow-services`가 담당합니다. 브라우저 smoke는 신청·현장·경기 운영 UI 노출을 검증합니다.

3회 연속 (flaky 검증):

```bash
for i in 1 2 3; do npm run seed:golden && npm run test:golden || break; done
```

## CI

Workflow: `.github/workflows/golden-flow.yml`

| Job | Trigger | 내용 |
|-----|---------|------|
| `golden-services` | push main, PR | postgres + `db push` (empty CI DB) + seed --ci + verify services |
| `golden-browser` | `workflow_dispatch` only | secrets + Playwright (optional) |

Fast CI(`ci.yml`)와 **분리**되어 있습니다. Golden browser는 안정화 전까지 required gate가 아닙니다.

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
npm run test:golden
```
