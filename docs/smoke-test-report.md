# Railway 프로덕션 스모크 테스트 보고서

## 1. 테스트 일시

- **일시:** 2026-05-19 (KST 기준 세션)
- **배포 URL:** https://app-production-79ad.up.railway.app
- **대상 커밋(테스트 시점):** `2bd1bab` (수정 전) → 수정 후 재배포 필요
- **로컬 사전 검증:** `npm run db:generate` / `npm run build` / `npm run lint` 성공

## 2. 사용 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@demo.local | (Railway DEMO_PASSWORD) |
| 주최자 | organizer@demo.local | 동일 |
| 체육관 | gym@demo.local | 동일 |
| 선수 | fighter@demo.local | 동일 |

> 비밀번호 실값은 문서·로그에 기록하지 않습니다.

## 3. 공개 페이지 결과 (curl)

| 경로 | HTTP | 결과 | 비고 |
|------|------|------|------|
| `/` | 200 | OK | |
| `/events` | 200 | OK | |
| `/events/sample-open-2026` | 200 | OK | 시드 대회 |
| `/events/sample-open-2026/brackets` | 200 | OK | |
| `/events/sample-open-2026/results` | 200 | OK | |
| `/events/sample-open-2026/live` | 200 | OK | |
| `/login` | 200 | OK | |
| `/register` | 200 | OK | |
| `/guardian-consent/invalid-test-token` | 200 | OK | 오류 안내 UI (500 아님) |
| `/fighter-registration/invalid-test-token` | 200 | OK | 오류 안내 UI |
| `/staff/result/invalid-test-token/matches` | 404 | OK | 기대된 404 |
| `/admin/application-form-templates` | 404 | N/A | **라우트 미구현** |
| `/organizer/events/invalid-id/application-batches` | 404 | N/A | **라우트 미구현** |

## 4. 미로그인 보호 라우트 (307 → `/login`)

| 역할 | 경로 | 결과 |
|------|------|------|
| admin | `/admin`, `/admin/events`, … `/admin/audit-logs` | OK (307) |
| organizer | `/organizer`, `/organizer/events`, `/organizer/division-templates`, … | OK (307) |
| gym | `/gym`, `/gym/events`, `/gym/fighters`, … | OK (307) |
| fighter | `/fighter`, `/fighter/events`, `/fighter/records` | OK (307) |
| 공통 | `/notifications` | OK (307) |

## 5. 관리자 (브라우저 로그인 후)

| 경로 | 결과 | 비고 |
|------|------|------|
| `/admin` | OK | 대시보드·통계 |
| `/admin/events` | OK | |
| `/admin/organizers` | OK | |
| `/admin/gyms` | OK | |
| `/admin/fighters` | OK | |
| `/admin/applications` | OK | |
| `/admin/results` | OK | |
| `/admin/audit-logs` | OK | |
| `/admin/application-form-templates` | 404 | 라우트 없음 — `/organizer/division-templates` 사용 |
| `/notifications` | **FAIL→수정** | Realtime 채널명 충돌 (벨+페이지) |
| `/organizer/division-templates` | OK | admin 전체 템플릿 조회 (2bd1bab 이후) |

## 6. 주최자 (브라우저 로그인 후)

| 경로 | 결과 | 비고 |
|------|------|------|
| `/organizer` | OK | |
| `/organizer/events` | OK | 데모 계정에 소유 대회 없음 → EmptyState |
| `/organizer/events/new` | OK | |
| `/organizer/division-templates` | OK | |
| `/notifications` | **FAIL→수정** | Realtime 동일 이슈 |
| `/organizer/events/{seedEventId}/*` | **FAIL→수정** | 시드 대회 소유자가 `organizer@example.com` — demo 계정은 FORBIDDEN → **500** (수정: 404) |

**시드 대회 ID:** `cmpba6v1l000eqcux4kfmg49y` (`sample-open-2026`)

## 7. 체육관

| 경로 | 결과 | 비고 |
|------|------|------|
| `/gym` | OK | |
| `/gym/events` | OK | |
| `/gym/fighters` | OK | |
| `/gym/invite-links` | OK | URL `railway.app` (localhost 없음) |
| `/gym/applications` | OK | |
| `/gym/records` | OK | |
| `/notifications` | **FAIL→수정** | Realtime |

## 8. 선수

| 경로 | 결과 | 비고 |
|------|------|------|
| `/fighter` | OK | |
| `/fighter/events` | OK | |
| `/fighter/records` | OK | |
| `/notifications` | **FAIL→수정** | Realtime |

## 9. 결과 입력자 �ink

| 항목 | 결과 |
|------|------|
| 무효 토큰 `/staff/result/invalid-test-token/matches` | 404 OK |
| 유효 토큰 E2E | 이번 세션에서 수동 미실행 (주최자 대회 상세 500 이슈로 선행 차단) |

## 10. 공식 신청서 / ApplicationFormTemplate

| 경로 | 결과 |
|------|------|
| `/admin/application-form-templates` | **404 — 미구현** |
| `/organizer/events/.../application-batches` | **404 — 미구현** |

**참고:** 코드베이스에는 `ApplicationFormTemplate` 모델·라우트가 없으며, 체급표는 **`DivisionTemplate`** (`/organizer/division-templates`) 로 제공됩니다.

## 11. 동의·등록 링크 (무효 토큰)

| 경로 | 결과 |
|------|------|
| `/guardian-consent/invalid-test-token` | OK (안내 UI, 500 아님) |
| `/fighter-registration/invalid-test-token` | OK |
| `/fighter-consent/...` | **라우트 없음** (404 예상) |

## 12. 발견한 500 / 치명 오류

| # | 증상 | 원인 | 조치 |
|---|------|------|------|
| 1 | `/notifications` 전 역할 | `NotificationBell` + `NotificationsPageClient`가 동일 Realtime 채널명 공유 → subscribe 후 `.on()` | `useSupabaseRealtime`에 `useId()` 기반 고유 채널 |
| 2 | 주최자 시드 대회 하위 경로 | `PermissionError(FORBIDDEN)` 미처리 → 500 | `requireOrganizerForEventPage` / `resolveOrganizerEventPageError` |
| 3 | admin 행사 상세 (과거) | `listTemplates` admin organizerId 필수 | `2bd1bab`에서 수정됨 |

## 13. 이번 세션 수정 내용

- `src/features/realtime/useSupabaseRealtime.ts` — Realtime 채널 인스턴스 분리
- `src/lib/permissions.ts` — `requireOrganizerForEventPage`, `resolveOrganizerEventPageError`
- 주최자 대회 하위 `page.tsx` 7곳 — FORBIDDEN → 404
- `scripts/setup-demo-users.ts` — `sample-open-2026` → 데모 주최자 Organizer 연결 (재실행 시)

## 14. 남은 문제 / 실무자 확인

1. **`/admin/application-form-templates`** — 메뉴·문서와 실제 라우트 불일치. 체급표는 `/organizer/division-templates`.
2. **데모 주최자 ↔ 시드 대회 소유** — DB에 `organizer@example.com` 소유로 남아 있을 수 있음. **`npm run setup:demo-users` 재실행** 시 `sample-open-2026`이 demo 주최자에 연결됨 (seed 재실행 불필요).
3. **Supabase Realtime publication** — 알림 구독이 DB 설정 없으면 클라이언트 콘솔 경고 가능 (페이지 크래시는 채널 수정으로 완화).
4. **Application batch / PDF 신청서** — MVP 범위外, 라우트 미구현.

## 15. Railway 재배포 후 db:push

- **불필요** (스키마 변경 없음, 앱 코드·문서·setup 스크립트만 수정)

## 16. 요약 통계 (테스트 시점)

| 항목 | 수 |
|------|-----|
| 총 점검 라우트·흐름 | ~65 |
| 200/정상 | ~52 |
| redirect 정상 (307) | 22 |
| 404 정상 처리 | 5 |
| 500 (수정 전) | 8+ (`/notifications`×4, organizer event×7) |
| 수정 후 기대 500 | 0 (재배포·setup-demo-users 재실행 후 재검증 권장) |
