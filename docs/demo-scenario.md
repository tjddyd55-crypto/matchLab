# 실무자 미팅 시연 시나리오

MVP 범위는 `docs/mvp-scope.md`를 기준으로 하며, 본 문서는 **시연 순서·계정·URL·피드백 수집**을 한곳에 모은다.

## 1. 시연 순서 (리허설 권장 — 역할별)

아래 순서로 로그인을 바꿔 가며 한 바퀴 돌리면, 미팅 때 흐름이 끊기지 않기 쉽다.

1. **`/login` → admin** — `/admin` 개요, 최근 위젯, `/admin/events` … `/admin/audit-logs` 목록까지 훑기.
2. **`/login` → organizer** — `/organizer` 홈 → **내 대회**에서 시드 대회 상세 진입 → 신청자 관리·대진표·경기 운영·결과·라이브(읽기) 순. (선택: 행사 상세에서 **결과 입력 스태프 링크** 발급 후 시크릿 창에서 `/staff/result/…/matches` 확인.)
3. **`/login` → gym** — `/gym` 현장 모드·바로가기 → 선수·초대 링크·대회 신청·신청 내역·전적.
4. **`/login` → fighter** — `/fighter` 현장 모드 → `/fighter/events`, `/fighter/records`.
5. **로그아웃 후 spectator** — `/`, `/events`, 시드 슬러그 **`/events/sample-open-2026`** 및 하위 `brackets` / `results` / `live`. 배포 URL 사용 시 **`NEXT_PUBLIC_APP_URL`** 을 Railway 공개 도메인으로 맞춰 QR·절대 링크가 올바른지 확인한다(`docs/deploy-railway.md`).
6. **(선택)** 공식 신청서 E2E — 아래 **§1.1** 순서.

### 1.1 공식 신청서 E2E 테스트 순서

1. **admin** — `/admin/application-form-templates/new`에서 **실제 PDF 업로드** → 업로드 직후 좌표는 **비어 있음** → PDF 위 「+ 텍스트」 등으로 필드 박스 추가·드래그·리사이즈 → source 연결 → 저장.
2. **admin** — (선택) 「고급 설정」에서 fieldsJson 직접 수정 후 「JSON을 화면에 반영」 또는 「예시 좌표 불러오기」(자동 적용 없음).
3. **organizer** — `/organizer/events/{eventId}`에서 공식 신청서 템플릿 연결 저장.
4. **gym** — `/gym/events/{eventId}/apply`에서 선수·부문 선택 → 「선수별 신청서 생성」(PDF) 또는 **선수 일괄 신청** + 자체 폼 답변 작성(custom).
5. **선수** — 「서명 페이지 열기」 또는 `/application-sign/[token]`에서 서명 완료.
6. **보호자**(미성년·학생) — `/guardian-consent/[id]?scope=application`에서 동의·서명.
7. **gym** — 문서 상태 `completed` 확인 → (선택) 완료 PDF 생성 대기 → 「신청 묶음 제출」.
8. **organizer** — `/organizer/events/{eventId}/application-batches` → 문서 상세 → **완료 PDF 열기** 또는 `.../print` 출력.

> `fieldsJson` 좌표는 **top-left pt** 기준입니다. 실제 PDF에 맞게 x/y를 조정한 뒤 overlay 결과를 확인하세요.

### 1.1b 자체 폼형 신청서 E2E

1. **admin** — `/admin/application-form-templates/new` → **「자체 폼 신청서」** 선택 → PDF 없이 폼 빌더로 text/textarea/select 항목 추가·필수 설정·미리보기 확인 후 저장.
2. **organizer** — 테스트 대회에 해당 템플릿 연결.
3. **gym** — `/gym/events/{eventId}/apply` → **선수 일괄 신청** → 선택 선수별 신청서 항목 작성(필수 누락 시 제출 실패) → 일괄 제출.
4. **organizer** — `/organizer/events/{eventId}/applications` → 신청자 상세 Drawer에서 **신청서 답변** 확인 → **인쇄용 보기**(`/applications/{applicationId}/print`) 출력(공개 화면에는 미노출).
5. **회귀** — PDF 템플릿 생성·좌표 편집·`GymOfficialApplicationWorkspace` 흐름이 기존과 동일한지 확인.

### 1.2 체급표 템플릿 · 부문 생성

1. **organizer** — `/organizer/division-templates/new` → 「무에타이 예시 불러오기」→ 일부 체급 수정 → 저장. (편집 화면은 **넓은 레이아웃**·빠른 입력 textarea·부별 표를 확인.)
2. **organizer** — `/organizer/events/{eventId}` → 「체급표로 부문 생성」→ 템플릿 선택·미리보기 → 「동일 부문 건너뛰기」로 적용.
3. **spectator** — `/events/{slug}` 공개 상세에서 생성된 부문 목록 확인.
4. **gym** — `/gym/events/{eventId}/apply`에서 **선수 일괄 신청**(체크·행별 부문 select·공통 동의) 또는 개별 신청으로 부문 신청.

### 1.3 포스터 · 갤러리 · 공개 공고 UI

1. **organizer** — `/organizer/events/new`에서 **포스터 파일 선택** 후 대회 생성(생성 직후 자동 업로드) 또는 `/organizer/events/{eventId}` 기본 정보에서 **포스터 업로드**·교체.
2. **organizer** — 동일 상세의 **상세 이미지(갤러리)** 에 JPEG/PNG/WebP 추가 → 새로고침 후 목록 유지 확인.
3. **spectator** — `/` 메인 **대회 공고** 카드에 포스터·신청 상태 배지 확인.
4. **spectator** — `/events` 목록 포스터 그리드·필터(신청 가능/마감 등) 확인.
5. **spectator** — `/events/sample-open-2026` 상세에서 포스터 Hero·「대회 신청하기」CTA·대진표/결과 링크 확인.
6. 포스터 없는 대회 — placeholder·갤러리 첫 장 fallback 확인(public URL만, storage path 미노출).
7. **organizer** — `/organizer/events` 목록에서 **대회 상태**·**신청 상태** 배지 확인.

### 1.3b 대회 상세 공유

1. **spectator** — `/events/sample-open-2026` Hero에서 **공유하기** 섹션 확인(PC: CTA 아래, Mobile: CTA 아래 전체폭).
2. **링크 복사** — 「대회 링크를 복사했습니다.」 안내 확인.
3. **Facebook 공유** — 새 창/탭에서 Facebook sharer 열림 확인.
4. **모바일 폭** — `navigator.share` 지원 시 「공유하기」 버튼 우선 표시 확인.
5. **OG** — 페이지 소스·메타 태그에 `og:title` / `og:description` / `og:image`(공개 https URL) 확인. signed URL·storage path 없음.

### 1.4 현장 확인·계체·출전 확정 (주최자 / 체육관)

1. **organizer** — `/organizer/events/{eventId}/check-in` → 승인 신청자 목록·요약 카드 확인.
2. **organizer** — 선수 **현장 확인** 처리 → 몸무게 입력 → 자동 pass/fail 또는 **수동 승인** 확인.
3. **organizer** — `/organizer/events/{eventId}/brackets/{bracketId}` → 후보 목록 **출전 미확정 경고**·「출전 확정만 보기」 필터 확인.
4. **gym** — `/gym/events/{eventId}/field-status` → **자기 체육관 선수만** 표시, 수정 버튼 없음.
5. **spectator** — `/events/sample-open-2026` 및 `brackets` / `results` → **실제 몸무게·현장 상태 미노출** 확인.

### 1.4b 체육관·선수 신청 현황·내 경기

1. **gym** — `/login` (`gym` / `123456!!`) → `/gym/events` → 대회 카드 **신청 현황** → `/gym/events/{eventId}/status`.
2. **gym** — 요약 카드 클릭·선수명 검색·필터(승인/미배정 등) 동작 확인.
3. **gym** — **자기 체육관 선수 신청만** 표시, 타 체육관 신청 목록·주최자 전용 버튼 없음.
4. **gym** — 대진 생성된 대회에서 **우리 체육관 경기**·미배정 선수·공개 대진표 링크 확인.
5. **fighter** — `/login` (`fighter` / `123456!!`) → `/fighter/events` (**내 대회·경기**).
6. **fighter** — 신청·현장·계체·대진·결과 조회만, 수정·입금·현장 확인 액션 없음.
7. **spectator** — 공개 화면에 신청서 답변·연락처·계체 실측·크레딧 미노출 재확인.
8. **organizer** — `/organizer/events/{eventId}/applications`·대진표 화면 **회귀 없음** 확인.

> schema 변경(`CheckInStatus` / `WeighInStatus` 등) 반영 후 **`npm run db:push`** 필요. **`db:seed`는 실행하지 않음.**

### 1.7 체육관 선수 DB (직접 등록·요청·수정)

1. **gym** — `/gym/fighters` → 데모 선수 1명 이상 표시 (`setup-demo-users` active 소속).
2. **gym** — 「선수 직접 등록」→ 새 선수 저장 → 목록 즉시 표시.
3. **gym** — 등록 선수 「수정」→ 체중·메모 변경 저장.
4. **gym** — `/gym/invite-links` → 링크 생성·복사 (`NEXT_PUBLIC_APP_URL` 도메인 확인).
5. **비로그인** — `/fighter-registration/{token}` 제출 → **gym** `/gym/fighters?tab=requests` 승인.
6. **gym** — `/gym/events/{eventId}/apply` → 직접 등록·승인 선수 선택 가능.
7. **gym** — 선수 「소속 해제」→ 목록에서 제외, 주최자 공개 OFF 유지.
8. **organizer** — `/gym/fighters` 접근 불가(홈 리다이렉트).

> `Fighter.primarySport`, `FighterGymHistory.gymInternalMemo` 추가 시 **`npm run db:push`**. **`db:seed` 금지.**

### 1.8 선수 로그인 계정·프로필

1. **gym** — `/gym/fighters/new` → 「선수 로그인 계정도 같이 만들기」→ 아이디·초기 비밀번호(자동 생성 가능) → 저장 후 **1회성** 로그인 정보 카드 확인.
2. 로그아웃 → 발급 아이디·비밀번호로 `/login` 로그인 → `mustChangePassword` 시 `/fighter/change-password` → `/fighter` 대시보드.
3. **fighter** — `/fighter/profile` → 사진·표시 이름·자기소개·SNS·**공개 ON** → `/fighters/{slug}` 공개 페이지(민감정보·내부 path 미노출).
4. **gym** — `/gym/invite-links` → 링크 → 비로그인 폼에서 선수 정보 + **아이디·비밀번호** 제출 → 승인 전 해당 아이디 로그인 시 **승인 대기** 화면만.
5. **gym** — 등록 요청 **승인** → 동일 아이디로 `/fighter` 정상 진입.
6. **gym** — `/gym/fighters`에서 **비밀번호 재발급** → 새 임시 비밀번호 1회 표시 → 선수 재로그인·변경 안내.
7. (선택) `fighterdemo` / `123456!!` — `setup:demo-users` 후 일반 아이디 로그인; `fighter@demo.local` 이메일 로그인도 병행 가능.
8. **gym** — 타 체육관 선수 계정 발급·재발급 **불가** 확인.

> `User.loginId`, `FighterProfile`, `FighterRegistrationSubmission.pendingUserId` 반영 후 **`npm run db:push`**. **`db:seed` 금지.**

### 1.6 주최자 공개 선수

1. **gym** — `/gym/fighters` → 선수 1명 「주최자에게 공개」 ON
2. **organizer** — `/organizer/public-fighters` → 해당 선수 표시·필터·상세 모달
3. **gym** — 공개 OFF → organizer 목록에서 즉시 사라짐(새로고침)
4. **spectator** — `/events` 등 비로그인 화면에 선수 DB 미노출

### 1.5 주최자 크레딧 · 승인 차감

1. **admin** — `/admin/credits` → 데모 주최자 선택 → **10,000C** 수동 충전 → ledger `manual_charge` 확인.
2. **organizer** — `/organizer/credits` → 잔액 10,000C·원화 환산·승인 가능 인원 안내 확인.
3. **organizer** — (선택) 충전 상품 → 결제 주문 생성 → 시연 환경에서 「결제 성공 처리」(`ALLOW_DEV_CREDIT_PAYMENT_CONFIRM` 또는 admin).
4. **organizer** — `/organizer/events/{eventId}/applications` → 승인 대기 1명 **승인** → 잔액 **100C** 차감.
5. **organizer** — 동일 신청 재승인 시도 없음(이미 approved) · 다른 pending 1명 추가 승인 시 누적 차감.
6. **organizer** — 승인된 신청 **반려** → **100C** 환불 (`refund_participant`).
7. **organizer** — 잔액 0 또는 100C 미만 상태에서 승인 → 「크레딧이 부족…」 실패.
8. **gym / fighter / spectator** — 크레딧 잔액·ledger **미노출** 확인.

> 크레딧 schema 반영 후 **`npm run db:push`** 필요. **`db:seed` 금지.**

## 2. 역할별 로그인 계정 (미팅 권장: **아이디**)

**권장:** `npm run setup:demo-users` 로 Supabase Auth와 DB `User.loginId`·프로필을 맞춘다. 비밀번호는 **`DEMO_PASSWORD`**(미설정 시 **`123456!!`**).

| 역할 | **loginId** (기본 로그인) | 비밀번호 | 진입 화면 |
|------|-------------------------|----------|-----------|
| 관리자 | `admin` | `123456!!` / `DEMO_PASSWORD` | `/admin` |
| 주최자 | `organizer` | 동일 | `/organizer` |
| 체육관 | `gym` | 동일 | `/gym` |
| 선수 | `fighter` | 동일 | `/fighter` |
| 추가 선수 | `fighterdemo` | 동일 | `/fighter` |

**레거시 이메일**(하위 호환, 동일 비밀번호): `admin@demo.local`, `organizer@demo.local`, `gym@demo.local`, `fighter@demo.local`.

`/login` — **아이디** + 비밀번호. 이메일 입력은 레거시 호환용이며 UI 기본 안내는 아이디입니다.

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

### 대진표 자동 매칭 리허설 (선택)

1. `npm run setup:bracket-demo-data` — gym1~7·80명 선수·승인 신청 upsert(크레딧 ledger 없음).
2. **organizer** `/login` → 테스트 대회(`/organizer/events/{eventId}`) → **신청자**에서 더미 승인자 확인.
3. **대진표** (`/organizer/events/{eventId}/brackets`) → **자동 대진 생성** 클릭.
4. division별 2명씩 매칭·홀수 division **미매칭/대기 선수** 패널 확인.
5. 개별 브래킷 상세에서 **수동 수정**(`MatchListEditor`) 가능 여부 확인.
6. **spectator** `/events/sample-open-2026/brackets` — 공개 대진표에 경기 표시 확인.

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

- `/login` — 아이디·비밀번호 로그인
- `/fighters/[slug]` — 선수 공개 프로필(`FighterProfile.isPublic`)
- `/fighter/profile`, `/fighter/change-password` — 선수 전용
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
