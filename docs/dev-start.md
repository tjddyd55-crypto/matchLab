# 로컬 개발 시작 가이드



## 요구 사항



- Node.js 20+

- PostgreSQL 인스턴스 (로컬 또는 호스트)

- Supabase 프로젝트(Auth · Storage · **Realtime publication/RLS는 운영 전 설정** — 코드는 `features/realtime` 참고)



## 설치



```bash

npm install

```



## 환경 변수



저장소 루트에 `.env` 파일을 만들고 `.env.example` 값을 채웁니다.



| 변수 | 용도 |

|------|------|

| `DATABASE_URL` | Prisma / Postgres 연결 문자열 |

| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |

| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저·서버 anon 클라이언트 |

| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용(스토리지 signed URL 등)**민감** — 클라이언트 번들 금지 |

| `SUPABASE_CONSENT_SIGNATURE_BUCKET` | 보호자 동의 **손사인** 이미지 저장용 private bucket 이름 (기본값 예: `consent-signatures`) |

| `SUPABASE_EVENT_IMAGE_BUCKET` | 대회 포스터·갤러리 이미지 bucket (기본 `event-images`). **Public bucket** 필수 — 공개 `/`, `/events`, `/events/[slug]`는 `posterUrl`·`imageUrl`(공개 URL)만 사용, private path·signed URL 미노출. 표시·비율·여백 이슈는 [`docs/event-poster-display.md`](./event-poster-display.md) 참고 |

| `SUPABASE_PROFILE_IMAGE_BUCKET` | 선수 프로필 사진 bucket (기본 `profile-images`). **Public bucket 권장**(공개 `/fighters/[slug]` 이미지 표시). `/fighter/profile`에서 파일 업로드 → signed URL → `profileImageUrl` 저장 |

| `SUPABASE_APPLICATION_FORM_BUCKET` | 공식 신청서 **템플릿 PDF** 원본 (private, 기본 `application-forms`) |

| `SUPABASE_APPLICATION_DOCUMENT_BUCKET` | overlay **완료 PDF** (`application-documents/{eventId}/…`, private) |

| `NEXT_PUBLIC_APP_URL` | 링크 생성·OAuth 리다이렉트 베이스 URL |

| `DEMO_PASSWORD` | (선택) `npm run setup:demo-users` 시 Supabase Auth 비밀번호. 미설정 시 `1234` — 정책에 따라 거절되면 `123456` 또는 `Demo1234!` 등으로 지정 |

### Railway 첫 배포 후 DB 초기화

GitHub → Railway 배포가 성공해도 **Postgres는 빈 DB**입니다. `public.Event` 없음 등으로 **`/`·`/events`가 500**일 수 있습니다. **배포 직후 한 번** `db:push` → `db:seed` → `setup:demo-users` 순서를 실행해야 합니다. Railway CLI·대시보드 Shell·환경 변수 체크리스트·트러블슈팅은 **[deploy-railway.md](./deploy-railway.md)** 의 **「4. 첫 배포 후 DB 초기화」** 이하를 따르세요.

### Storage · 보호자 동의 서명 (`api-contract.md` §10)

- Supabase 대시보드 **Storage**에서 bucket **`consent-signatures`(또는 위 환경 변수 값)** 을 만들고 **Public(bucket 공개)** 을 끕니다.
- 업로드·조회는 **anon 클라이언트 정책만으로 열지 말고**, 서버에서 `SUPABASE_SERVICE_ROLE_KEY` 로 검증 후 **short-lived signed URL** 만 발급합니다(MVP 권장: 업로드 URL 약 5분).
- 로컬 MVP에서는 CRM 손사인 UI를 **이 레포 안으로 복사·로컬화**한 `SignaturePad`를 사용합니다. 장기적으로는 전자서명 단독 서비스로 옮길 수 있도록 **`consent.service`/`completeGuardianConsentAction` 경계**를 유지합니다.

### Storage · 공식 신청서 PDF

- Supabase **Storage**에 private bucket **`application-forms`**(템플릿 원본 PDF), **`application-documents`**(완료 overlay PDF)를 생성합니다.
- 환경 변수: `SUPABASE_APPLICATION_FORM_BUCKET`, `SUPABASE_APPLICATION_DOCUMENT_BUCKET` (기본값과 동일하면 생략 가능).
- admin 템플릿 폼에서 PDF 업로드 → signed upload URL → `originalPdfPath` 저장. 조회는 서버에서 **short-lived signed URL** 만 발급(DB·공개 DTO에 path/URL 저장 금지).



## 인증·`User` 매핑 (`roles-permissions.md`)



### 설계 요약



- **내부 PK**: `User.id`는 Prisma `cuid()`.

- **Supabase Auth UID**: `User.authUserId`에 UUID 문자열을 **고유(`@unique`)** 로 저장한다 (옵션 B).

- 런타임에서 `getCurrentActor()`는 `supabase.auth.getUser()` → `user.id`로 `User.authUserId` 조회 후 `ActorContext`를 만든다.

- 세션은 있으나 매칭 `User`가 없으면 `null`(온보딩·프로필 연결 필요).

### 실무 데모 계정 자동화 (`npm run setup:demo-users`)

미팅용 **`@demo.local`** 계정 4명을 Supabase Auth에 만들거나 재사용하고, DB `User.authUserId`·`Organizer`·`Gym`·`Fighter`·`FighterGymHistory`를 맞춘다. **service role 키는 이 스크립트에서만 사용**한다(클라이언트 번들 금지).

1. `.env`에 `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 설정(`.env.example` 참고).
2. (선택) `DEMO_PASSWORD` — 기본 **`123456!!`**. Railway 등 운영 환경 값을 `.env`에 맞춘다.
3. `npm run db:push` 또는 `npm run db:migrate`로 스키마 반영.
4. `npm run setup:demo-users` 실행.
5. `npm run dev` 후 `/login`에서 **아이디**(`admin`, `organizer`, `gym`, `fighter`, `fighterdemo`)로 로그인해 역할별 홈 이동을 확인한다.

**체육관·선수 신청 현황·내 경기 확인 경로 (schema 변경 없음):**

| 역할 | loginId | 비밀번호(기본) | 확인 URL |
|------|---------|----------------|----------|
| 체육관 | `gym` | `123456!!` | `/gym/events` → 대회 **신청 현황** → `/gym/events/{eventId}/status` |
| 체육관 | `gym` | `123456!!` | `/gym/events/{eventId}/field-status` (현장/계체 읽기 전용) |
| 선수 | `fighter` | `123456!!` | `/fighter/events` (내 대회·내 경기, 조회만) |

**인앱 알림 테스트 순서 (schema 변경 없음):**

1. `gym` 로그인 → 대회 일괄 신청 → 로그아웃.
2. `organizer` 로그인 → Header 벨 또는 `/notifications`에서 신청 접수 알림 확인.
3. 신청 승인 → `gym`·`fighter` 각각 알림 확인.
4. `/organizer/events/{eventId}/check-in`에서 현장/계체 변경 → gym·fighter 알림.
5. 자동 대진 생성·대진표 공개 → gym·fighter 알림.
6. 결과 입력·확정 → gym·fighter 알림, href 이동·읽음 처리 확인.

**주최자 경기 운영 보드 테스트 (schema 변경 없음):**

1. `organizer` / `123456!!` 로그인 → `/organizer/events` → 시드 대회 상세 → **경기 운영** (`/organizer/events/{eventId}/operation`).
2. 자동 대진 생성 후 경기 목록·요약 카드(전체/예정/진행 중/완료) 확인.
3. **진행 시작** → **경기 종료** → **결과 입력**(Drawer에서 기존 `OrganizerMatchOpsPanel` 확정) 순서 확인.
4. 결과 입력 후 목록 상태·`/organizer/events/{eventId}/results`·공개 `/events/{slug}/results` 반영 확인.
5. `gym`·`fighter`·비로그인으로 `/operation` 접근 차단(404) 확인.

**심판 라운드별 채점 테스트 (`db:push` 필요 — Judge* 테이블 additive):**

1. `organizer` / `123456!!` 로그인 → `/organizer/events/{eventId}/judges` → 심판 계정 3개 생성(로그인 ID·임시 비밀번호 확인).
2. 경기 1개 선택 → 심판 3명 배정(순서·주심 지정).
3. 시크릿 창 `/judge/login` — 심판1 로그인 → 이름 입력 → 배정 경기만 목록 표시 확인.
4. `/judge/matches/{matchId}/score` — 라운드별 홍/청 점수·감점·다운 입력 → 임시 저장 → 전송.
5. 심판2·3도 전송 → `/organizer/events/{eventId}/operation` → 경기 Drawer **심판 채점 집계**(제출 3/3·추천 결과) 확인.
6. 동일 Drawer 또는 스태프 링크에서 **기존 결과 확정** → 공개 결과·전적·알림 회귀.
7. 심판 화면에 신청서·연락처·다른 심판 점수 미노출 확인.

**스태프 모바일 결과 입력 테스트 (schema 변경 없음):**

1. `organizer` 로그인 → `/organizer/events/{eventId}` → **결과 입력 링크 (스태프)** 섹션에서 링크 생성(임시 입력·확정 권한 설정).
2. 생성된 URL `/staff/result/{token}/matches` 를 시크릿 창 또는 DevTools 모바일 폭에서 열기.
3. 접속 코드가 있으면 입력 후 경기 카드·결과 입력 Sheet 동작 확인.
4. 확정 후 `/organizer/events/{eventId}/operation`·공개 결과·알림 회귀 확인.
5. 스태프 화면에 신청서·연락처·fieldMemo 미노출 확인.

**데모 loginId (기본 비밀번호 `DEMO_PASSWORD` 또는 `123456!!`):**

| loginId | 역할 | 레거시 이메일(하위 호환) |
|---------|------|-------------------------|
| `admin` | 관리자 | `admin@demo.local` |
| `organizer` | 주최자 | `organizer@demo.local` |
| `gym` | 체육관 | `gym@demo.local` |
| `fighter` | 선수 | `fighter@demo.local` |
| `fighterdemo` | 추가 선수 | (내부 auth email만) |

선수 `fighterCode`: `FTR-2026-DEMO001` / `FTR-2026-DEMO002`(fighterdemo).

`setup:demo-users` 실행 시 데모 체육관 `FighterGymHistory(active)` → `Fighter.currentGymId` 동기화와 `sample-open-2026` 신청 마감(연말)·`open` 보정도 수행한다.

### 로그인 정책 (아이디 + 비밀번호)

- **기본 UI**: `/login` — 라벨 「아이디」, placeholder 「아이디를 입력하세요」.
- **앱 DB**: `User.loginId` 전역 unique, 4~20자, 영문 소문자·숫자·`_`·`-` (`src/lib/validators/login-id.validator.ts`).
- **비밀번호**: 8자 이상, 공백 금지 (`src/lib/validators/password.validator.ts`). 원문 DB 저장 금지.
- **Supabase Auth**: 신규·선수 계정은 `{loginId}@internal.matchlab.local` synthetic email. **화면·공개 DTO에 노출 금지**.
- **로그인 해석**: `authService.resolveAuthEmailForLogin` — trim → 이메일이면 그대로 → 아니면 `User.loginId` 조회 → 없으면 `{loginId}@demo.local` / `{loginId}@internal.matchlab.local` 이메일 조회(운영 DB에 loginId 미기입 시 하위 호환).
- **이메일 로그인**: `@demo.local` 등 기존 `User.email` 그대로 허용.
- `npm run build` 시 Prisma 초기화에 **`DATABASE_URL` 필요**(미설정 시 page data 수집 단계 실패 가능).

**아이디 로그인만 실패할 때 (이메일 로그인은 됨):**

1. Railway 배포 커밋이 `52aab16`(아이디 로그인) 이후인지 확인 후 redeploy.
2. production DB에서 `User.loginId` 확인 — 비어 있으면 `npm run repair:demo-login-ids` 또는 `npm run setup:demo-users` (**`db:seed` 금지**).
3. 확인 쿼리 예: `SELECT "email", "loginId", "role" FROM "User" WHERE "loginId" IN ('admin','organizer','gym','fighter','fighterdemo');`

### SMS 비밀번호 찾기 (TODO)

- MVP: 체육관 **임시 비밀번호 재발급**만 (`/gym/fighters` → 비밀번호 재발급).
- 추후: 미성년 → 보호자 휴대폰, 성인 → 선수 휴대폰 SMS 인증(5~10분 만료, 재발송 제한). `User.phone`·`Fighter.guardianPhone` 필드 유지.

### Railway schema 반영 (이번 작업)

`User.loginId`, `mustChangePassword`, `FighterProfile`, `FighterRegistrationSubmission.loginId`/`pendingUserId` 추가 후 **`npm run db:push`** 필요. **`db:seed` 실행 금지.**

### 선수 프로필 사진 (`profile-images` bucket)

- Supabase Storage **`profile-images`** (public bucket 권장). 환경변수 `SUPABASE_PROFILE_IMAGE_BUCKET`.
- 업로드 API: `POST /api/uploads/profile-image` — fighter 본인 또는 admin. 경로 `fighters/{fighterId}/avatar/{uuid}.ext`.
- 클라이언트: `/fighter/profile` → `FighterProfileImageUpload` (JPG/PNG/WebP, 최대 8MB, 권장 800×800).
- 테스트: `fighter` / `123456!!` 또는 `fighterdemo` 계정으로 `/fighter/profile` 접속 후 업로드·저장.

### 주최자 공개 선수

- `/organizer/public-fighters` — **organizer/admin 로그인 전용**. public API·공개 페이지 DTO에 포함 금지.
- **주최자 공개 풀**: `FighterGymHistory.isPublicToOrganizers` (체육관 소속 단위).
- **일반 공개 프로필**: `FighterProfile.isPublic=true` 인 경우에만 `/fighters/[slug]` 링크 표시.
- schema 반영 후 **`npm run db:push`**. **`db:seed` 금지.**

### 주최자 크레딧 (`credit-policy.ts`)

- **1크레딧 = 10원** (`CREDIT_UNIT_KRW`). 기본 참가 승인 차감: **100C/명** (= 1,000원).
- 충전 상품 예: 100,000원 → 10,000C (`/organizer/credits`).
- **PG 연동 TODO**: Toss Payments 결제창·승인·webhook — MVP는 `OrganizerCreditPayment` 주문 + 시연용 결제 확인(`ALLOW_DEV_CREDIT_PAYMENT_CONFIRM=true` 비프로덕션, 또는 admin).
- schema 추가 후 **`npm run db:push`** 필요. **`db:seed` 금지.**

### 체육관 선수 DB (`/gym/fighters`)

- **직접 등록**: `/gym/fighters/new` — 서명·`GuardianConsent`·신청서 PDF 없음.
- **등록 요청**: `/gym/invite-links` → `/fighter-registration/[token]` → `/gym/fighters?tab=requests` 승인.
- **수정·소속 해제**: `/gym/fighters/[fighterId]/edit`.
- `Fighter.primarySport`, `FighterGymHistory.gymInternalMemo` 추가 시 **`npm run db:push`**. **`db:seed` 금지.**
- `npm run setup:demo-users` — 데모 gym·fighter·active `FighterGymHistory` upsert(삭제 없음).

### 테스트용 주최자·체육관·선수 복구 (`npm run setup:demo-org-gym-fighters`)

**`db:seed` 없이** 체육관별 선수 10명·추가 주최자 계정을 idempotent upsert합니다. 운영 DB에서 `/gym/fighters`에 선수가 안 보일 때 우선 실행하세요.

**생성·복구 대상:**

| 구분 | loginId | 비밀번호(기본) |
|------|---------|----------------|
| 주최자(기존) | `organizer` | `123456!!` |
| 주최자(추가) | `organizer1` ~ `organizer3` | `123456!!` |
| 체육관 | `gym`, `gym1` ~ `gym7` | `123456!!` |

- 체육관별 **FTR-BKT-*** 선수 10명(총 80명) — `Fighter.currentGymId` + `FighterGymHistory(active)` 동기화
- Supabase Auth + Prisma `User` / `Gym` / `Organizer` 연결
- **계좌번호·크레딧 ledger·기존 신청/결과 삭제 없음**

**전제:** `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. (선택) `DEMO_PASSWORD`.

```bash
npm run setup:demo-org-gym-fighters
```

Railway production Shell 예 (PowerShell):

```powershell
$env:DATABASE_URL = "<Railway Postgres DATABASE_PUBLIC_URL>"
$env:NEXT_PUBLIC_SUPABASE_URL = "<Supabase URL>"
$env:SUPABASE_SERVICE_ROLE_KEY = "<Supabase service role key>"
$env:DEMO_PASSWORD = "123456!!"
npm run setup:demo-org-gym-fighters
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
Remove-Item Env:DEMO_PASSWORD -ErrorAction SilentlyContinue
```

- `DATABASE_URL`에는 **`DATABASE_PUBLIC_URL`** 사용 (`postgres.railway.internal` 금지)
- 로그인 실검증까지 하려면 **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** 도 함께 export (스크립트가 `signInWithPassword`로 organizer1~3·gym1·gym7 확인)
- 기존 Auth 계정이 있어도 **`DEMO_PASSWORD`로 비밀번호 강제 동기화** (`loginId`·`authUserId`·`Gym.ownerUserId` 불일치도 repair)
- 대회 신청·자동 대진까지 필요하면 이어서 `npm run setup:bracket-demo-data`

### 체육관·선수 소속 복구 (`npm run repair:demo-gym`)

**`db:seed` 없이** 체육관 화면에 선수가 안 보이거나 신청이 막힐 때(이력은 있는데 `currentGymId` 불일치 등) 실행한다. **gym1~gym7·organizer1~3·80명 선수**까지 한 번에 맞추려면 `setup:demo-org-gym-fighters`를 우선 실행하세요.

```bash
npm run repair:demo-gym
```

### 신청서 모드 테스트 순서

1. **PDF 좌표형** — `/admin/application-form-templates`에서 **PDF 신청서** 선택 → PDF 업로드·좌표 편집 → 주최자가 대회에 연결 → 체육관 `GymOfficialApplicationWorkspace` 흐름.
2. **자체 폼형** — **자체 폼 신청서** 선택 → 폼 빌더로 항목 구성(PDF 불필요) → 주최자 연결 → 체육관 일괄 신청에서 선수별 답변 작성 → 주최자 인쇄용 보기.
3. **없음** — 템플릿 미연결 또는 템플릿에서 **신청서 없음** 모드 — 부문별 일괄/개별 신청만.

**DB**: 자체 폼 PDF-less 지원을 위해 `ApplicationFormTemplate.originalPdfPath`/`originalPdfFileName`이 optional입니다. Railway 등 배포 DB에는 **`npm run db:push`** 로 스키마 반영이 필요합니다(`db:seed` 금지).

### 대회 상세 공유·OG 메타데이터

1. `/events/{slug}` — `generateMetadata`로 `title` / `description` / `openGraph` / `twitter` 설정.
2. `og:image` 우선순위: `coverImageUrl` → `posterUrl` → 갤러리 첫 장 → `/og-event-default?title=…&date=…&location=…` (공개 https만). fallback은 1200×630 `ImageResponse` — 대회명·날짜·장소·MatchLab 브랜딩.
3. 공유 UI: **Facebook 공유** · **링크 복사** 두 버튼만 (`EventShareButtons`). Web Share API·카카오·인스타는 후속 TODO.
4. 로컬 확인: 브라우저 개발자 도구 → Elements → `<meta property="og:*">` 검사. 포스터 없는 대회는 `/og-event-default` 직접 열어 fallback 이미지 확인.
5. **공개 페이지 수동 확인**: `/events/sample-open-2026` — D-day·참가비/입금 안내·지도 링크·대진표/결과 뱃지·행사 안내 요약 박스. `/events` 목록 카드·메인 카드에 D-day·공개 상태 간략 표시. 계좌번호·크레딧·ledger 미노출 재확인.
6. Facebook Sharing Debugger는 배포 URL 기준 후속 TODO.
7. 인스타 공유 후속 TODO: 공유용 이미지 다운로드·스토리 공유 가이드(웹 직접 게시 URL 제외).

### 대진표 자동 매칭 테스트 데이터 (`npm run setup:bracket-demo-data`)

대진표 **자동 1차 매칭** 실무 테스트용으로 체육관 `gym1`~`gym7`·각 10명 선수(총 80명)·테스트 대회 `approved` `EventApplication`을 **idempotent upsert**합니다.

**전제:** `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `npm run setup:demo-users`(기존 `gym` 계정).

```bash
npm run setup:bracket-demo-data
```

- 대상 대회 우선순위: `DEMO_BRACKET_EVENT_ID` → `DEMO_BRACKET_EVENT_SLUG` → `sample-open-2026`
- **`db:seed` 금지** — 운영·스테이징 DB에서 wipe 없음
- **크레딧 ledger 미발생** — `approveEventApplication` 경유 없이 `EventApplication` 직접 upsert
- Railway production Shell에서는 `DATABASE_PUBLIC_URL`을 `DATABASE_URL`로 export한 뒤 실행 (`docs/deploy-railway.md` 참고)
- 두 번 실행해도 동일 수량 유지(fighterCode·loginId 기준 upsert)

**자동 대진 테스트 순서 (로컬):**

1. `npm run setup:bracket-demo-data` (또는 시드 대회에 신청자 80명 확인)
2. organizer `/login` → `2026 샘플 오픈 대회` → `/organizer/events/{eventId}/brackets`
3. **자동 대진 생성** (출전 확정 옵션 없이) → 생성 요약·미매칭 패널 확인
4. **공개 설정** → 대진표·미매칭 리스트 공개 ON
5. `/events/sample-open-2026?tab=brackets` — VS 카드·미매칭 명단 확인
6. `/organizer/events/{eventId}/check-in` — 선수 검색·몸무게/메모 저장 피드백·계체 실패 후 대진 패 처리 확인
7. 대회 관리 **좌측 사이드 메뉴**(PC)로 신청자·현장·계체·대진표·경기 운영 이동 — `EventManagementLayout`·콘텐츠 `max-w-[96rem]`·시작선 일관성 확인. 모바일은 「대회 메뉴」 접힘 확인.
8. 대진표 그룹 상세 — compact VS 카드·하단 운영 control·홍/청 대칭 스타일·**선수 사진 미노출**(텍스트만) 확인. 현장·계체(`/check-in`) compact action row·저장 피드백 확인
9. 공개 대진표 `/events/sample-open-2026?tab=brackets` — 선수 사진 없음 확인. `/fighters/{slug}`·`/fighter/profile` 사진 기능 회귀 없음 확인

### 테스트용 선수 20명 추가 (`npm run seed:demo-fighters`)

대회 신청·대진표 실무 테스트용으로 **데모 체육관 소속 가상 선수 20명**을 DB에만 추가합니다. Supabase Auth 계정은 만들지 않으며(`userId` null), **기존 `db:seed` 전체를 다시 돌리지 않아도** 됩니다.

**전제:** `npm run setup:demo-users`로 `gym@demo.local` / 데모 체육관이 있어야 합니다.

```bash
npm run seed:demo-fighters
```

- **코드 범위:** `FTR-2026-TEST001` ~ `FTR-2026-TEST020` (`fighterCode` 기준 upsert)
- **동작:** 기존 선수·신청·대진 데이터는 삭제하지 않음. `currentGymId`·`FighterGymHistory(active)` 보장.
- **Railway:** 로컬 PowerShell에서 Postgres **`DATABASE_PUBLIC_URL`**을 `DATABASE_URL`로 임시 설정한 뒤 위 명령 실행(Supabase env 불필요). 실행 후 `Remove-Item Env:DATABASE_URL`로 정리.

### Supabase 대시보드에서 할 일 (수동 경로 — 시드 `@example.com` 등)

데모 자동화를 쓰지 않을 때만 아래를 따른다.



1. Supabase 대시보드 **Authentication → Providers**에서 이메일 로그인을 활성화한다.
2. **Authentication → Users → Add user**에서 시드와 동일한 이메일로 사용자를 만든다(비밀번호는 팀 내 규칙으로 통일 권장). 생성 직후 사용자 행을 열어 **`user.id`(UUID)**를 복사한다.
3. Postgres에서 해당 이메일의 `User.authUserId`를 위 UUID로 맞춘다(아래 SQL 예시는 `이메일 로그인·로그아웃` 절 참고). 또는 `prisma/seed.ts`의 `DEV_AUTH_USER_IDS`를 실제 UUID에 맞게 바꾼 뒤 `npm run db:seed`로 재삽입한다.
4. `/login`에서 로그인해 역할별 대시보드로 이동하는지 확인한다.

### 시드 테스트 계정·`authUserId`



`prisma/seed.ts`의 `DEV_AUTH_USER_IDS`와 `User` 행이 아래처럼 연결된다.



| 역할 | 이메일 | `authUserId`(Supabase `user.id`와 동일하게 설정) |

|------|--------|---------------------------------------------------|

| admin | `admin@example.com` | `550e8400-e29b-41d4-a716-446655440001` |

| organizer | `organizer@example.com` | `550e8400-e29b-41d4-a716-446655440002` |

| gym | `gym@example.com` | `550e8400-e29b-41d4-a716-446655440003` |

| fighter | `fighter1@example.com` | `550e8400-e29b-41d4-a716-446655440004` |



Supabase에서 사용자 생성 시 UUID를 직접 지정할 수 없다면, 생성 후 DB에서 해당 행의 `authUserId`를 실제 `user.id`로 수정하거나, 시드 값을 프로젝트에 맞게 바꾼 뒤 재시드한다.

### 이메일 로그인·로그아웃 (MVP)

- **Server Actions**: `src/features/auth/actions.ts` — `signInWithPasswordAction`, `signOutAction`. **anon 키**만 사용하며 service role로 로그인 처리하지 않는다.
- **성공 후**: `authService.getActorByAuthUserId(supabaseUser.id)`로 `ActorContext`를 조회한다. **행이 없으면** Supabase 세션을 `signOut`한 뒤, 로그인 폼에 고정 안내 문구를 표시한다(“앱 사용자 프로필이 연결되지 않았습니다…”).
- **역할별 이동**: `dashboardPathForRole` — `admin`→`/admin`, `organizer`→`/organizer`, `gym`→`/gym`, `fighter`→`/fighter`.
- **로그아웃**: 대시보드 헤더의 로그아웃 버튼 → `signOutAction` → `/login`.
- **시연 비밀번호**: Supabase Auth에 사용자를 만들 때 설정한 비밀번호를 사용한다. 문서에 고정 비밀번호를 적지 않는 것을 권장한다(팀 내 공유 문서 또는 비밀 관리 도구).

#### `authUserId` 불일치 해결 (SQL 예시)

Postgres에서 시드 이메일 행의 `authUserId`를 Supabase 대시보드 **Authentication → Users**에서 확인한 UUID로 맞춘다(테이블·컬럼명은 Prisma 기본 매핑 기준).

```sql
UPDATE "User"
SET "authUserId" = '00000000-0000-0000-0000-000000000000'
WHERE email = 'admin@example.com';
```

`prisma/seed.ts`의 `DEV_AUTH_USER_IDS`와 **실제** Supabase `user.id`가 다르면, 위와 같이 DB를 수정하거나 시드 상수를 바꾼 뒤 `npm run db:seed`를 다시 실행한다.

### 라우트·미들웨어 (`architecture.md`)



- **`src/middleware.ts`**: Supabase 세션 쿠키 갱신만 수행. **DB 조회·역할 판별 없음**.

- **`(dashboard)/*/layout.tsx`**: `requireActor()` 후 `redirectUnlessDashboardRole`으로 역할별 진입 제한.

- **`/login`**: 이메일·비밀번호 폼 + 위 Server Action. 이미 세션+DB 매핑이 있으면 역할별 대시보드로 redirect.
- **`/register`**: MVP 자가가입 미개방 — 사전 발급 안내만 표시.

- **세부 권한**(대회 소유·체육관 소유 등): Route Handler / Server Action 진입부에서 `permissions.ts`의 `require*`·`can*` + repository 조회.



환경 변수에 Supabase URL/anon 키가 없으면 `getCurrentActor()`는 `null`을 반환하고, 미들웨어는 통과만 한다(Supabase 없이 빌드·일부 화면 확인용).



## 데이터베이스



Prisma 스키마에 **전체 도메인 모델·enum**이 정의되어 있습니다.



### Prisma 7 · PostgreSQL 어댑터



런타임 클라이언트는 `src/lib/prisma.ts`에서 **`@prisma/adapter-pg` + `pg` Pool** 로 생성합니다.  

`DATABASE_URL`이 비어 있거나 인증에 실패하면 앱·시드 실행 시 오류가 납니다.



### 마이그레이션 · 시드 권장 순서



```bash

npm run db:generate

npm run db:migrate   # 또는 npm run db:push (프로토타입)

npm run db:seed

```



- 시드(`prisma/seed.ts`)는 `import "dotenv/config"` 로 `.env`를 읽고, **개발용 테이블 데이터를 wipe 후 재삽입**합니다. 운영 DB에서는 실행하지 마세요.

- **실행 조건**: 유효한 **`DATABASE_URL`**(Postgres 접속 가능)이 `.env`에 있어야 합니다. 인증 실패 시 `P1000` 등 Prisma 오류가 납니다.

- **`db:migrate`(또는 `db:push`)로 테이블이 생긴 뒤** 시드를 실행해야 합니다.

- 스키마에 `User.authUserId`가 추가된 경우, 기존 DB에는 `db:push` 또는 마이그레이션으로 컬럼을 반영합니다.



### 미팅 전 리허설 체크리스트

- [ ] `.env`에 `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 설정
- [ ] `npm run db:migrate` 또는 `db:push` 성공
- [ ] **`npm run setup:demo-users` 성공**(`@demo.local` 로그인용) — 또는 시드 `@example.com` + 수동 Auth 매핑
- [ ] (선택) 시연용 DB 데이터: `npm run db:seed` 성공
- [ ] 역할별 로그인·로그아웃·보호 URL 재접속 (`docs/demo-scenario.md` §1·§2)
- [ ] 공개 URL `sample-open-2026` 상세·대진표·결과·라이브 확인(시드 기준 슬러그)



## 개발 서버



```bash

npm run dev

```



## 선수 등록·초대 링크 (MVP)

- **공개 URL**: `{NEXT_PUBLIC_APP_URL}/fighter-registration/{token}` (세션 불필요)
- **토큰**: `GymInviteLink.token` — 공개 폼에는 체육관 이름만 마스킹해 표시 (`maskGymPublicLabel`)
- **제출**: `FighterRegistrationSubmission` 생성 후에만 존재하며, 즉시 `Fighter`가 되지 않음
- **중복 검토**: 생년월일(UTC 일 단위 정규화) + 성별 + 휴대폰(숫자 정규화)으로 기존 `Fighter` 후보 조회 → 의심 시 `duplicate_review`
- **승인**: 관장 대시보드 `/gym/fighters?tab=requests` — 트랜잭션 내 `Fighter` + `FighterGymHistory` 생성 및 요청 `approved`
- **반려**: `Fighter` 미생성, 요청 `rejected`
- **fighterCode**: `FTR-{연도}-{6자리}` — 동시성 충돌·재시도는 TODO (`fighter.repository.generateNextFighterCodeForYear`)
- **비수집**: 주민등록번호·주민번호 일부 필드 없음 (`fighter-registration.validator.ts`)
- **보호자 동의·손사인**: 정책상 필요 시 제출 직후 `GuardianConsent` draft 생성 → 공개 URL `{NEXT_PUBLIC_APP_URL}/guardian-consent/{consentId}?token=…`. 서명은 **private bucket 객체 경로**만 DB(`signatureImagePath`)에 저장하고, 업로드는 `POST /api/uploads/consent-signature` 가 검증 후 issued signed URL 사용 (`upload.service.ts`).
- **승인 게이트**: 동의가 필요한 제출은 **`GuardianConsent.consentStatus === completed`** 전까지 체육관 승인 불가(UI 차단 + `fighter.service` 서버 검증).

## 대회 신청·참가비 입금 (MVP)

- **신청 주체**: 체육관(`UserRole.gym`) 계정 — `/gym/events`, `/gym/events/[eventId]/apply`, `/gym/applications`.
- **검증**: `Event.status === open` 및 신청 기간, 디비전 소속, 소속 활성 선수, `(eventId, fighterId, divisionId)` 중복, 보호자 동의·스트리밍 동의(`application.service`).
- **스냅샷**: `fighterSnapshot`·`gymSnapshot`·`applicationAgreementSnapshot` 은 **서버 생성**(클라이언트 이름 신뢰 금지).
- **결제**: 신청 생성 시 `EventApplicationPayment` 동시 생성 — 입금 상태 변경은 `payment.service` 가 Payment 행과 `EventApplication.paymentStatus` 를 **동일 트랜잭션**에서 맞춘다(`status-machine.md` §3).
- **계좌번호**: 공개 Event 상세·Public DTO 에 **`accountNumber` 미포함**. 체육관 로그인 후 신청 완료 화면·내역 다이얼로그에서만 `findEventPaymentSettingFull` 로 노출. 주최자 관리 화면(`/organizer/events/[eventId]`)에서는 입금 설정 폼에만 표시.
- **주최자 신청 관리**: `/organizer/events/[eventId]/applications` — 승인/반려, 입금 확인·확인 필요·환불·면제(Server Actions → `payment.service`). React Query 도입 시 `docs/query-keys.md` §3.3 키 무효화.

## 주최자 대회 생성·관리 (MVP)

- **라우트**: `/organizer/events`(목록), `/organizer/events/new`(생성), `/organizer/events/[eventId]`(관리 홈·준비 체크리스트·기본 설정·부문·신청서·참가비), `/organizer/events/[eventId]/operation`(경기 운영 보드).
- **대회 관리 레이아웃**: `EventManagementLayout` — PC 좌측 sticky 사이드 메뉴(`event-management-nav-items.ts`), 모바일 「대회 메뉴」 접힘·가로 스크롤. 하위 페이지 콘텐츠 폭 `max-w-[96rem]` 통일.
- **주최자 dashboard 레이아웃**: `organizer/layout.tsx`의 `OrganizerDashboardContent` — 홈·대회·공개 선수·크레딧·체급표 템플릿 등 큰 메뉴 페이지 콘텐츠 시작선·폭 통일. 알림(`/notifications`)은 organizer/admin일 때 동일 폭 적용.

**주최자 큰 메뉴 layout 수동 확인 (schema 변경 없음):**

1. `organizer` / `123456!!` 로그인.
2. 홈 → 대회 → 공개 선수 → 크레딧 → 체급표 템플릿 → 알림 순으로 이동.
3. 각 페이지 오른쪽 content 시작선·최대 폭이 동일한지 확인.
4. 대회 상세 진입 후 내부 좌측 메뉴 + content가 과도하게 좁아지지 않는지 확인.

**신청자 페이지 수동 확인 (schema 변경 없음):**

1. `organizer` / `123456!!` → `2026 샘플 오픈 대회` 관리 홈.
2. 좌측 **신청자** 메뉴 → `/organizer/events/{eventId}/applications` 정상 로드.
3. 신청자 목록·크레딧 안내·필터·상세 Drawer·승인/반려/입금 action 회귀 확인.
4. PC 폭(1366/1440/1920)에서 **페이지 전체 가로 스크롤이 없는지** 확인(md+ grid list, 모바일 카드).

**주소·지도·스태프/심판 UX 수동 확인 (schema 변경 없음):**

1. 기본 설정 → **주소 검색**으로 도로명 선택(직접 입력 불가) → 장소명·상세 주소 저장 → **기본 정보 저장** 클릭 시 500 없이 성공 메시지.
2. 저장 후 새로고침 → 우편번호·도로명·지번·상세·장소명 유지 확인.
3. 공식 신청서 템플릿 연결 저장 → pending 해제·완료 메시지.

**FormData field name 체크리스트 (기본 정보 저장):**

| 화면 라벨 | submit `name` | action 읽기 | 비고 |
|-----------|---------------|-------------|------|
| 장소명 | `locationName` | `locationName` | 직접 입력 |
| 우편번호 | `postalCode` | `postalCode` | hidden |
| 도로명 주소 | `roadAddress` | `roadAddress` | hidden |
| 지번 주소 | `jibunAddress` | `jibunAddress` | hidden |
| 상세 주소 | `detailAddress` | `detailAddress` | 직접 입력 |
| (표시용 location) | — | — | **서버에서 `composeEventVenueDisplay`로 재계산** |

**Zod validator composition 규칙 (module evaluation 500 방지):**

- `superRefine`/`refine`이 붙은 schema에 **`.partial()` 금지** — import 시 `Error: .partial() cannot be used on object schemas containing refinements` 발생
- **base object schema**(refine 없음) → create는 `base.superRefine(...)`, update는 `base.partial().extend(...).superRefine(...)` 또는 별도 update base object
- 대상 파일: `src/lib/validators/event.validator.ts`, `src/lib/validators/application-form-template.validator.ts`
- 배포 전 확인: `npx tsx -e "import '@/lib/validators/event.validator'"` 및 `/organizer/events/{eventId}#setup-basic` 페이지 로드

4. 스태프 링크 생성·심판 계정 생성 → 오류 없이 목록 갱신.
5. 공개 `/events/{slug}` — **Hero·참가 신청/입금 안내에는 지도 버튼 없음**. 행사 안내 탭 **오시는 길** 섹션에만 지도 embed + 「네이버 지도에서 보기」 1개.

### 네이버 지도 (공개 행사 안내 · 오시는 길 전용)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID` | **필수(프론트)** 네이버클라우드 Maps JavaScript API **Client ID** |
| `NAVER_MAP_NCP_KEY_SECRET` | **선택(서버)** Client Secret — `NEXT_PUBLIC_` 금지, 현재 지도 embed 미사용 |

**네이버클라우드 설정:**

1. [네이버클라우드 콘솔](https://console.ncloud.com/) → Application → Maps → **Dynamic Map** · **Geocoding** 사용 설정
2. **Web 서비스 URL** 등록: `http://localhost:3000`, `http://127.0.0.1:3000`, Railway production domain, 운영 도메인
3. Railway Variables에 `NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID=<Client ID>` 추가 후 **앱 redeploy** (NEXT_PUBLIC은 빌드 시 번들에 포함)
4. 로컬 `.env` 변경 후 `npm run dev` 재시작
5. 미설정·geocode 실패 시 **placeholder + 오시는 길 하단 링크**만 표시(페이지 깨짐 없음)

**지도 UI 위치:**

- Hero 카드: 장소 **텍스트만** (지도 버튼 없음)
- 참가 신청·입금 안내: 지도 버튼 없음
- 행사 안내 탭 → **오시는 길**: 지도 preview + 「네이버 지도에서 보기」 버튼 1개

**수동 확인 순서 (schema 변경 없음):**

1. `/events/sample-open-2026` Hero에 지도 버튼 없음
2. 행사 안내 → 오시는 길에 지도 + 버튼 1개
3. API key 설정·redeploy 후 실제 지도·marker 표시
4. API key 제거 local에서 placeholder fallback

**지도 미표시 진단 (6항목 — env 이름이 아닌 동작 기준):**

| # | 확인 항목 | 정상 | fallback만 보일 때 |
|---|-----------|------|-------------------|
| 1 | PR #47 이후 main **redeploy** | Railway 최신 커밋(`98dcf0e` 이후 fix 포함) 배포됨 | 구버전 번들 — **Redeploy** |
| 2 | `NEXT_PUBLIC_*` **build-time** 반영 | 빌드 로그·번들에 key 존재 | env 추가만 하고 rebuild 안 함 → `canEmbedMap=false`, **script 요청 없음** |
| 3 | naver **script network** | DevTools Network에 `maps.js?ncpKeyId=...&submodules=geocoder` **200** | 요청 없음=키 미번들 / **4xx·authFailure**=Client ID·Web URL 등록 |
| 4 | **onJSContentLoaded** 대기 | callback 또는 `jsContentLoaded` 후 geocode 호출 | `script.onload` 직후 geocode → geocoder 미준비로 실패 (PR #47 main 버그) |
| 5 | public DTO **road/jibun** | organizer 주소 저장 후 API 응답에 필드 존재 | `sample-open-2026` seed는 `location`만 — geocode는 장소명(`올림픽공원 체조경기장`)으로 시도 |
| 6 | **geocode fallback** 순서 | road → road+detail → jibun → name+road → name → location | 앞 쿼리 실패 시 다음 순서 자동 시도; 전부 실패 시 placeholder |

개발 모드에서 지도 컨테이너 `data-map-status` 값으로 단계 확인: `script-loading` → `script-loaded` → `geocode-running` → `map-ready` (실패 시 `geocode-failed` / `script-failed` / `missing-key`).

**대회 생성 UX 테스트 (schema 변경 없음):**

1. `organizer` / `123456!!` → `/organizer/events/new` → 최소 정보로 대회 생성.
2. 리다이렉트된 관리 홈에서 **다음 작업**·6단계 **준비 체크리스트** 확인.
3. 부문 생성 전/후 체크리스트 상태 변화, 공개 페이지·신청서·참가비 바로가기 확인.
4. 모바일 폭에서 체크리스트 카드·버튼 전체폭 표시 확인.
- **레이어**: Server Actions `src/features/events/actions.ts` → `event.service` → `event.repository`(Prisma는 repository만). 페이지(`page.tsx`)는 서비스만 호출.
- **`publicSlug`**: 대회 생성 시 `allocateUniquePublicSlug`로 고유값 할당. 초안(`draft`) 상태에서는 공개 상세가 `notFound`와 동일하게 동작(저장소에서 `draft`·`cancelled` 제외 조회).
- **`EventStatus` 전이**: `docs/status-machine.md` 권장 전이만 허용. `draft`→`open` 시 필수 필드·부문·입금 설정 검증. 전이 성공 시 `AuditLog.event_status_changed`.
- **관리자**: `listOrganizerEvents`에서 전체 대회 목록 조회 가능. 대회 생성 시 폼에 **대상 `organizerId`(cuid)** 입력 필요.

## 관리자 대시보드 (조회 MVP)

- **라우트**: `/admin`(홈·통계·최근 위젯), `/admin/events`, `/admin/organizers`, `/admin/gyms`, `/admin/fighters`, `/admin/applications`, `/admin/results`, `/admin/audit-logs`.
- **목적**: 실무 미팅에서 **플랫폼 전체 구조·운영 현황**을 한눈에 보여 주는 **읽기 전용** 화면.
- **구현**: `src/lib/repositories/admin.repository.ts` → `src/lib/services/admin.service.ts` → `src/lib/dto/admin.ts` → `src/app/(dashboard)/admin/**/page.tsx`. Prisma는 repository에서만 호출.
- **접속**: 시드 **`admin@example.com`** 및 상단 인증 표의 `authUserId` 매칭.
- **제외**: 역할 변경·계정 정지·대회/전적/입금 강제 수정·보호자·서명 경로·IP/UA 노출.

## Supabase 설정 체크리스트



- [ ] Auth: 이메일 로그인 제공자

- [ ] Storage: **`consent-signatures`** 등 **private** 버킷(프로필·신청 이미지·서명) — **공개 ACL 금지**, 객체 접근은 signed URL 만

- [ ] 서버 환경에 **`SUPABASE_SERVICE_ROLE_KEY`** 설정 — 클라이언트 번들·브라우저 노출 금지

- [ ] Realtime: **`supabase_realtime` publication** 에 다음 테이블 포함(Prisma 기본 테이블명·실제 DB 확인 필수):  
  `EventApplication`, `EventApplicationPayment`, `Bracket`, `BracketMatch`, `MatchResult`, `EventLiveStream`, `Notification`  
  클라이언트는 `postgres_changes` 로 구독하며, **UI 동기화만** 담당하고 권한은 서버가 검증한다.

- [ ] RLS 정책: Realtime 을 켤 경우 **공개·역할별 구독·감사 로그** 설계 후 적용. **MVP는 서버 검증 + 제한적 클라이언트 구독**으로 두었으며, **운영 배포 전 RLS·publication 반드시 재점검**.



## 아직 구현되지 않은 것 (TODO)

- **Railway schema 변경 후** `npm run db:push` 필요 (로컬에서 `DATABASE_PUBLIC_URL` 세션 설정). **Storage bucket만 추가 시 schema 변경 없음** — Supabase에서 `application-forms`, `application-documents` private bucket 생성.
- **현장 확인·계체 schema** (`EventApplication.checkInStatus`, `weighInStatus`, `weighInWeightKg`, `fieldMemo`) 반영 후에도 동일 — **`db:seed` 없이 `db:push`만** 실행.
- 카카오 알림톡·SMS·웹푸시(인앱 `Notification` / Realtime 훅은 `features/realtime` 및 `Public*RealtimeBridge` 참고)

### 공식 신청서 PDF 좌표 편집

- admin `/admin/application-form-templates/*` — **시각 좌표 편집이 기본**. PDF 업로드 후 좌표는 비어 있으며, 운영팀이 PDF 위에서 직접 박스를 추가한다.
- **예시 fieldsJson은 자동 적용되지 않음** — 테스트가 필요할 때만 「고급 설정」→「예시 좌표 불러오기」.
- 참고 레포: `tjddyd55-crypto/insurance` — `PdfCoordinateEditor`, `PdfOverlayCanvas`
- 본 프로젝트: `src/components/domain/application-form-templates/pdf-editor/*`, `src/lib/pdf-editor/pdf-coordinate-math.ts`
- **차이:** 보험 레포는 bottom-left pt 저장, 본 프로젝트는 **top-left pt** 저장 → `application-form-pdf.service.ts` overlay와 호환

### 체급표 템플릿 (DivisionTemplate)

- 예시 데이터: `src/lib/division-template/division-template-examples.ts`
- 빠른 입력 파싱: `src/lib/division-template/division-template-parse.ts` (`/` 구분, `-30kg` / `+44kg` / `63.5kg`)
- **예시는 버튼으로만 불러옴** — 저장 시 자동 적용 없음
- 대회 적용 중복 키: `sportType` · `gender` · `ageGroup` · `weightClass`
- **초기화(replace)**: 신청·대진표 연결 부문이 하나라도 있으면 거부

### 공식 신청서 PDF 좌표계 주의

- `fieldsJson`의 `x`, `y`는 **페이지 좌상단(top-left) 기준 pt** 입니다.
- 서버 PDF overlay(`application-form-pdf.service.ts`)는 **pdf-lib bottom-left** 로 변환해 그립니다.
- 실제 주최측 PDF에 맞게 좌표를 조정할 때는 admin 템플릿 상세의 PDF iframe 미리보기와 완료 PDF 결과를 함께 확인하세요.

- `ensureUserProfileFromSupabaseAuth` 자동 프로필 생성·역할 배정(현재는 호출 시 안내용 에러만)



자세한 원칙은 `docs/architecture.md` 및 관련 문서를 참고합니다.

