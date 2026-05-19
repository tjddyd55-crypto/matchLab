# 실무자 미팅 시연 시나리오

MVP 범위는 `docs/mvp-scope.md`를 기준으로 하며, 본 문서는 **시연 순서·계정·URL·피드백 수집**을 한곳에 모은다.

## 1. 시연 순서 (리허설 권장 — 역할별)

아래 순서로 로그인을 바꿔 가며 한 바퀴 돌리면, 미팅 때 흐름이 끊기지 않기 쉽다.

1. **`/login` → admin** — `/admin` 개요, 최근 위젯, `/admin/events` … `/admin/audit-logs` 목록까지 훑기.
2. **`/login` → organizer** — `/organizer` 홈 → **내 대회**에서 시드 대회 상세 진입 → 신청자 관리·대진표·경기 운영·결과·라이브(읽기) 순. (선택: 행사 상세에서 **결과 입력 스태프 링크** 발급 후 시크릿 창에서 `/staff/result/…/matches` 확인.)
3. **`/login` → gym** — `/gym` 현장 모드·바로가기 → 선수·초대 링크·대회 신청·신청 내역·전적.
4. **`/login` → fighter** — `/fighter` 현장 모드 → `/fighter/events`, `/fighter/records`.
5. **로그아웃 후 spectator** — `/`, `/events`, 시드 슬러그 **`/events/sample-open-2026`** 및 하위 `brackets` / `results` / `live`. 배포 URL 사용 시 **`NEXT_PUBLIC_APP_URL`** 을 Railway 공개 도메인으로 맞춰 QR·절대 링크가 올바른지 확인한다(`docs/deploy-railway.md`).
6. **(선택)** 공식 신청서 플로우 — admin `/admin/application-form-templates` → 주최자 대회 템플릿 연결 → gym `/gym/events/{id}/apply` → 선수 `/application-sign/[token]` → 보호자 `/guardian-consent/[id]?scope=application` → 주최자 `.../application-batches`·출력.

## 2. 역할별 로그인 계정 (미팅 권장: `@demo.local`)

**권장:** `npm run setup:demo-users` 로 Supabase Auth와 DB `User`·프로필을 한 번에 맞춘다(`docs/dev-start.md` 참고). 비밀번호 기본값은 **`1234`** 이며, 환경 변수 **`DEMO_PASSWORD`** 로 덮어쓸 수 있다.

| 역할 | 이메일 | 비밀번호(기본) | 진입 화면 |
|------|--------|----------------|-----------|
| 관리자 | `admin@demo.local` | `1234` (`DEMO_PASSWORD` 미설정 시) | `/admin` |
| 주최자 | `organizer@demo.local` | 동일 | `/organizer` |
| 체육관 | `gym@demo.local` | 동일 | `/gym` |
| 선수 | `fighter@demo.local` | 동일 | `/fighter` |

**주의 (Supabase 비밀번호 정책):** 프로젝트 설정에 따라 **`1234`가 거절**될 수 있다. 이 경우 **정책을 낮추지 말고**, 예를 들어 `DEMO_PASSWORD=123456` 또는 `DEMO_PASSWORD=Demo1234!` 로 `.env`에 지정한 뒤 **`npm run setup:demo-users`를 다시 실행**한다. 스크립트가 정책 오류를 감지하면 콘솔에 동일 안내를 출력한다. **실서비스에서는 짧은 비밀번호를 사용하지 말 것.**

**수동 경로(레거시 시드):** `prisma/seed.ts`의 `@example.com` 계정과 `DEV_AUTH_USER_IDS`를 쓰는 방법은 `docs/dev-start.md`의 SQL 예시를 따른다. 미팅에서는 **`@demo.local` 자동화**와 **시드 데이터** 중 한 가지로 통일하는 것이 안전하다.

`/login`에서 이메일·비밀번호로 로그인한다. 성공 시 `User.role`에 따라 `/admin`, `/organizer`, `/gym`, `/fighter`로 이동한다.

### 로그인·authUserId 리허설 체크리스트 (미팅 전)

- [ ] `npm run setup:demo-users` 성공(또는 수동으로 Supabase+DB 매핑 완료)
- [ ] 네 계정 모두 로그인 가능한 비밀번호를 알고 있는가?
- [ ] 각 계정으로 로그인 후 해당 역할 홈(`/admin`, `/organizer`, `/gym`, `/fighter`)으로 들어가지는가?
- [ ] `User.authUserId`가 Supabase `user.id`와 일치하는가? (불일치 시 로그인 폼에 프로필 미연결 안내)
- [ ] 로그아웃 후 `/gym` 등 대시보드 URL을 직접 열면 `/login`으로 돌아가는가?
- [ ] 시드 대회 **공개 슬러그**가 `sample-open-2026`인지 확인(주최자 홈 바로가기·본 문서 URL과 동일).

## 2.1 테스트용 선수 20명 (선택)

링크로 한 명씩 등록하기 어려울 때:

```bash
npm run setup:demo-users   # 선행
npm run seed:demo-fighters # FTR-2026-TEST001~020, 데모 체육관 소속
```

`gym@demo.local`로 `/gym/fighters`·대회 신청·대진표에서 바로 선택할 수 있습니다. 상세는 `docs/dev-start.md` 참고.

## 3. 시연 데이터 설명 (`npm run db:seed` 후)

- **대회**: `2026 샘플 오픈 대회`, 공개 슬러그 **`sample-open-2026`**, 상태 `open`.
- **부문**: 라이트급(U14 -55kg)·미들급(U16 -60kg) 등 2개.
- **입금 설정**: 금액·은행·**테스트용 계좌번호**(실제 계좌 아님) — 공개 상세에는 계좌번호 미포함.
- **신청**: 승인·대기·입금 상태가 섞인 `EventApplication` 행.
- **대진표**: `single_elimination`(일부 종료 매치) + `match_list` 공개 브래킷.
- **결과**: 준결승 매치 기준 확정 `MatchResult` 2행, 선수 전적 캐시 반영.
- **라이브**: 공개 플래그·watch/embed URL이 있는 `EventLiveStream` 1건(외부 YouTube 예시). **URL은 시드/DB 반영** — 주최자 UI에서 편집·저장하는 폼은 아직 없음(`liveStreamService.upsertStreams` TODO).
- **알림**: 주최자·체육관 사용자 각 1건 예시.
- **감사 로그**: 시드 삽입·이벤트 상태 변경 예시.
- **브래킷 변경 로그**: 경기 상태 변경 예시 1건.
- **선수 등록**: 초대 토큰 `seed-token-fighter-reg` — **등록 단계 서명/동의 없음**(체육관 DB 등록만).
- **공식 신청서**: admin이 템플릿 세팅 후 주최자가 대회에 연결 — 대회 신청 단계에서 선수/보호자 서명.

## 4. 주요 화면 URL

### 공통

- `/login` — 이메일·비밀번호 로그인
- `/register` — 자가가입 안내(MVP 미개방)

### 공개 (spectator)

- `/` — 랜딩
- `/events` — 대회 목록(검색 필드는 UI만, 목록은 서버 전체)
- `/events/sample-open-2026` — 공고 상세
- `/events/sample-open-2026/brackets` — 대진표
- `/events/sample-open-2026/results` — 공식 결과
- `/events/sample-open-2026/live` — 라이브(임베드·외부 링크)
- `/fighter-registration/seed-token-fighter-reg` — 선수 공개 등록(시드 토큰, **서명 없음**)
- `/application-sign/[token]` — 대회 신청서 선수 본인 서명
- `/guardian-consent/[consentId]?scope=application` — 대회 신청 보호자 동의

### 주최자 (`/organizer/...`)

- `/organizer`, `/organizer/events`, `/organizer/events/new`
- `/organizer/events/{eventId}` — 대회 편집·부문·입금·스트리밍 설정
- `.../applications`, `.../application-batches`, `.../application-documents/[id]/print`, `.../brackets`, `.../matches`, `.../results`, `.../live`

### 체육관 (`/gym/...`)

- `/gym`, `/gym/fighters`, `/gym/invite-links`, `/gym/events`, `/gym/applications`, `/gym/records`
- `/gym/events/{eventId}/apply` — 오픈 대회 신청

### 선수 (`/fighter/...`)

- `/fighter`, `/fighter/events`, `/fighter/records`

### 관리자

- `/admin`, `/admin/events`, `/admin/organizers`, `/admin/gyms`, `/admin/fighters`, `/admin/applications`, `/admin/results`, `/admin/audit-logs`, `/admin/application-form-templates`

`{eventId}`는 시드 실행 후 콘솔 로그 또는 관리자/주최자 목록에서 확인한다.

## 5. 피드백 질문 (미팅 메모용)

- 대회 생성 시 입력 항목이 충분한가? 빠진 필드는 없는가?
- 체급·디비전 분류가 현장 방식과 맞는가?
- 보호자 동의 문구·필수 체크 항목이 충분한가?
- 대진표 방식(`single_elimination` / `match_list`)이 실제 대회에 맞는가?
- 경기 상태값·결과 확정 플로우가 현장 운영과 맞는가?
- 입금 확인 방식(수동 반영·상태값)이 실무에 맞는가? 자동 연동 요구는 있는가?
- 공개 페이지에 **더 숨기거나**, 반대로 **보여 주고 싶은** 정보가 있는가?
- 관리자 화면에서 더 보고 싶은 지표·필터가 있는가?
- 라이브 안내를 URL 링크·임베드 외에 현장에서 어떻게 배포하는지(카톡·현수막 등)와 맞출 필요가 있는가?

## 6. 알려진 제한 (시연 시 말할 포인트)

- 로그인·로그아웃은 `/login` 및 대시보드 헤더에서 동작한다. **자가 회원가입은 `/register` 안내만**(MVP).
- **라이브 송출 URL 입력·저장 UI**: 미구현. 시연용 링크는 **시드 또는 DB 수동 입력**. 코드 기준 다음 단계는 `liveStreamService.upsertStreams`(TODO).
- 카드 결제·OAuth·알림톡·QR 등은 `mvp-scope.md` 의도적 제외.
