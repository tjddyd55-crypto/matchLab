# 실무자 미팅 시연 시나리오

MVP 범위는 `docs/mvp-scope.md`를 기준으로 하며, 본 문서는 **시연 순서·계정·URL·피드백 수집**을 한곳에 모은다.

## 1. 시연 순서 (리허설 권장 — 역할별)

아래 순서로 로그인을 바꿔 가며 한 바퀴 돌리면, 미팅 때 흐름이 끊기지 않기 쉽다.

1. **`/login` → admin** — `/admin` 개요, 최근 위젯, `/admin/events` … `/admin/audit-logs` 목록까지 훑기.
2. **`/login` → organizer** — `/organizer` 홈 → **내 대회**에서 시드 대회 상세 진입 → 신청자 관리·대진표·**심판 관리**(`/organizer/events/{eventId}/judges`)·**경기 운영**(`/organizer/events/{eventId}/operation`)·결과·라이브(읽기) 순. 심판 계정 3개 생성 → 경기 1개에 심판 배정 → `/judge/login`으로 채점·전송 → 운영 Drawer **심판 채점 집계** 확인 → **진행 시작 → 경기 종료 → 결과 입력** 후 공개 `/events/{slug}/results` 반영 확인. (선택: 행사 상세에서 **결과 입력 스태프 링크** 발급 후 시크릿 창에서 `/staff/result/…/matches` 확인.)
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

### 1.4a 주최자 대회 생성·준비 체크리스트

1. **organizer** — `/organizer/events/new`에서 대회명·일시·장소·신청 기간만 입력해 생성.
2. 생성 후 관리 홈(`/organizer/events/{eventId}?welcome=1`)에서 **다음 작업**·**준비 체크리스트** 확인.
3. 포스터 없을 때 **권장** 표시 → 포스터 등록 후 완료 확인.
4. 부문 없을 때 **필요** 표시 → 체급표로 부문 생성 후 완료 확인.
5. 신청서·참가비·공개 페이지 링크가 체크리스트에서 바로가기 되는지 확인.
6. `EventManagementNav` 운영 순서(관리 홈 → 기본 설정 → 부문 → …) 확인.

### 1.4b 스태프 모바일 결과 입력

1. **organizer** — `/organizer/events/{eventId}` 또는 **경기 운영** 상단에서 스태프 링크 복사(없으면 행사 상세에서 생성).
2. **시크릿 창·모바일 폭** — `/staff/result/{token}/matches` 접속(접속 코드 있으면 입력).
3. 요약 카드·필터·경기 카드(선수 A/B·체육관·상태) 확인.
4. **결과 입력** Sheet → 승자·승리 방식 → 임시 저장 또는 **결과 확정**(링크 권한에 따라).
5. **organizer** — `/operation`·공개 `/events/{slug}/results`·선수 전적 반영 확인.
6. 신청서·연락처·계체 실측 등 민감정보 미노출 확인.

### 1.4 주최자 경기 운영 보드

1. **organizer** — `/organizer/events/{eventId}` → **경기 운영** (`/operation`) 진입. 요약 카드(전체·예정·진행 중·완료)와 경기 목록 확인.
2. **진행 시작** — 예정 경기에서 클릭 → 상태 **진행 중** 반영.
3. **경기 종료** — 진행 중 경기에서 클릭 → 상태 **종료** 반영.
4. **결과 입력** — 종료 경기에서 Drawer 열기 → 기존 `OrganizerMatchOpsPanel`로 확정 → 목록 **결과 입력 완료** 반영.
5. **결과 보기** — 확정된 경기에서 Drawer로 정정·무효 흐름 확인(선택).
6. **필터·검색** — 예정/결과 미입력 필터, 선수명·체육관·부문 검색 동작 확인.
7. **spectator** — `/events/{slug}/results` 공개 결과 페이지에 확정 결과 반영 확인.

### 1.3a 공개 대회 신뢰 정보

1. **spectator** — `/events/sample-open-2026` Hero·행사 안내 탭에서 **신청 마감 D-day** 뱃지 확인.
2. **참가비·입금 안내** — 행사 안내 탭 요약·입금 안내 섹션에 참가비·입금 문구 표시. **계좌번호·크레딧·ledger 미노출**.
3. **지도 링크** — 장소 옆 **지도에서 보기** 클릭 시 Google Maps 새 탭(`rel=noopener noreferrer`).
4. **대진표/결과 뱃지** — 탭 위·요약 카드·목록 카드에 「대진표 공개/준비 중」「결과 공개/준비 중/없음」 표시.
5. PC·모바일(390px)에서 요약 박스·뱃지 줄바꿈 확인.

### 1.3b 대회 상세 공유

1. **spectator** — `/events/sample-open-2026` Hero에서 **공유하기** 섹션 확인(PC: CTA 아래, Mobile: CTA 아래 2열).
2. **Facebook 공유** — 새 창/탭에서 Facebook sharer 열림 확인.
3. **링크 복사** — 「대회 링크를 복사했습니다.」 안내 확인.
4. PC/모바일 모두 **Facebook 공유 · 링크 복사** 두 버튼만 표시되는지 확인.
5. **OG** — 페이지 소스·메타 태그에 `og:title` / `og:description` / `og:image`(공개 https URL) 확인. signed URL·storage path 없음.
6. **OG fallback** — 포스터 없는 대회에서 `/og-event-default?title=…&date=…&location=…` 미리보기(대회명·날짜·장소·MatchLab 브랜딩) 확인.

### 1.4 현장 확인·계체·출전 확정 (주최자 / 체육관)

1. **organizer** — `/organizer/events/{eventId}/check-in` → 승인 신청자 목록·요약 카드 확인.
2. **organizer** — 선수 **현장 확인** 처리 → 몸무게 입력 → 자동 pass/fail 또는 **수동 승인** 확인.
3. **organizer** — `/organizer/events/{eventId}/brackets/{bracketId}` → 후보 목록 **출전 미확정 경고**·「출전 확정만 보기」 필터 확인.
4. **gym** — `/gym/events/{eventId}/field-status` → **자기 체육관 선수만** 표시, 수정 버튼 없음.
5. **spectator** — `/events/sample-open-2026` 및 `brackets` / `results` → **실제 몸무게·현장 상태 미노출** 확인.

### 1.4c 인앱 알림

1. **gym** — 대회 일괄 신청 제출.
2. **organizer** — Header 알림 벨 또는 `/notifications`에서 「새 신청이 접수되었습니다」 확인 → 신청자 관리 링크.
3. **organizer** — 신청 승인.
4. **gym** / **fighter** — 「신청이 승인되었습니다」 알림, href 각각 `/gym/events/{eventId}/status`, `/fighter/events`.
5. **organizer** — 현장 확인·계체 변경 → **gym**·**fighter** 현장/계체 알림.
6. **organizer** — 자동 대진 생성·대진표 공개 → **gym**·**fighter** 대진 알림.
7. **organizer** — 결과 입력·확정 → **gym**·**fighter** 경기/결과 알림.
8. 알림 **읽음**·**모두 읽음** 처리, 다른 사용자 알림 접근 차단 확인.

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

1. **gym** — `/gym/fighters` → 데모 선수 10명 이상 표시 (`npm run setup:demo-org-gym-fighters` — FTR-BKT-GYM-*).
2. **gym1** ~ **gym7** — 각각 `/login` 후 `/gym/fighters`에서 **FTR-BKT-GYMn-*** 선수 10명 확인.
3. **organizer1** ~ **organizer3** — `/login` 후 `/organizer` 진입(기존 `organizer` 유지).
4. **gym** — 「선수 직접 등록」→ 새 선수 저장 → 목록 즉시 표시.
5. **gym** — 등록 선수 「수정」→ 체중·메모 변경 저장.
6. **gym** — `/gym/invite-links` → 링크 생성·복사 (`NEXT_PUBLIC_APP_URL` 도메인 확인).
7. **비로그인** — `/fighter-registration/{token}` 제출 → **gym** `/gym/fighters?tab=requests` 승인.
8. **gym** — `/gym/events/{eventId}/apply` → 직접 등록·승인 선수 선택 가능.
9. **gym** — 선수 「소속 해제」→ 목록에서 제외, 주최자 공개 OFF 유지.
10. **organizer** — `/gym/fighters` 접근 불가(홈 리다이렉트).

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

0. `npm run setup:demo-org-gym-fighters` — gym·gym1~7·organizer1~3·체육관별 선수 10명(80명) 복구. `/gym/fighters` 선수 미표시 시 **먼저** 실행.
1. `npm run setup:bracket-demo-data` — 승인 `EventApplication` upsert(크레딧 ledger 없음). 선수·소속은 0단계에서 보장.
2. **organizer** `/login` → 테스트 대회(`/organizer/events/{eventId}`) → **신청자**에서 더미 승인자 확인.
3. **대진표** (`/organizer/events/{eventId}/brackets`) → **현장·계체 미완료 상태**에서 **자동 대진 생성**(신청자 기준) → 약 38경기·미매칭 약 4명 요약 확인.
4. **공개 설정** — 「대진표 전체 공개」·「미매칭 리스트 공개」 토글.
5. division별 2명씩 매칭·홀수 division **미매칭/대기 선수** 패널 확인.
6. **대진표 그룹** 상세 — 홍코너 VS 청코너 카드형 `MatchListEditor`에서 선수명·체육관·부문 확인, 선수 변경 select·「경기 운영 열기」 동작 확인.
7. **spectator** `/events/sample-open-2026?tab=brackets` — VS 카드(홍코너/청코너·체육관)·미매칭 명단 확인. 관리 화면과 동일한 좌·중앙·우 구조인지 비교.
8. **organizer** 현장·계체(`/check-in`) — 선수명 검색 → 몸무게 입력 후 「저장됨」 확인 → 계체 실패 선수 배정 경기 안내 → 패/실격/기권 또는 「그래도 진행」.
9. **organizer** 대진표 그룹 상세 — 승인 후보 카드·「문제 있는 선수만 보기」 필터 확인. 경기 순서 ▲▼·직접 입력 → 「순서 저장됨」 → 새로고침 후 공개·운영 화면 순서 일치 확인.

## 3. 시연 데이터 설명 (`npm run db:seed` 후)

- **대회**: `2026 샘플 오픈 대회`, 공개 슬러그 **`sample-open-2026`**, 상태 `open`.
- **부문**: 라이트급(U14 -55kg)·미들급(U16 -60kg) 등 2개.
- **입금 설정**: 금액·은행·**테스트용 계좌번호**(실제 계좌 아님) — 공개 상세에는 계좌번호 미포함.
- **신청**: 승인·대기·입금 상태가 섞인 `EventApplication` 행.
- **대진표**: `single_elimination`(일부 종료 매치) + `match_list` 공개 대진표 그룹.
- **결과**: 준결승 매치 기준 확정 `MatchResult` 2행, 선수 전적 캐시 반영.
- **라이브**: 공개 플래그·watch/embed URL이 있는 `EventLiveStream` 1건(외부 YouTube 예시). **URL은 시드/DB 반영** — 주최자 UI에서 편집·저장하는 폼은 아직 없음(`liveStreamService.upsertStreams` TODO).
- **알림**: 주최자·체육관 사용자 각 1건 예시.
- **감사 로그**: 시드 삽입·이벤트 상태 변경 예시.
- **대진표 변경 로그**: 경기 상태 변경 예시 1건.
- **선수 등록**: 초대 토큰 `seed-token-fighter-reg` — **등록 단계 서명/동의 없음**(체육관 DB 등록만).
- **공식 신청서**: admin이 템플릿 세팅 후 주최자가 대회에 연결 — 대회 신청 단계에서 선수/보호자 서명.

## 4. 주요 화면 URL

### 공통

- `/login` — 아이디·비밀번호 로그인
- `/fighters/[slug]` — 선수 공개 프로필(`FighterProfile.isPublic`)
- `/fighter/profile`, `/fighter/change-password` — 선수 전용

### 선수 프로필 시연 (fighter / 123456!!)

1. `/fighter/profile` — 프로필 사진 업로드(JPG/PNG/WebP, 최대 8MB), 표시 이름·자기소개·SNS(https://) 저장
2. **공개 프로필 ON** → 저장 후 공개 프로필 링크 확인 → `/fighters/[slug]` 접속
3. 공개 페이지에서 휴대폰·생년월일·보호자·계체 실측·크레딧 미노출 확인
4. **gym / 123456!!** → `/gym/fighters` 프로필 상태 뱃지(미작성/공개 ON/OFF) 확인
5. **organizer / 123456!!** → `/organizer/public-fighters` — 주최자 공개 풀과 일반 공개 프로필 링크 구분 확인
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
- `.../applications`, `.../application-batches`, `.../application-documents/[id]/print`, `.../brackets`, `.../operation`(경기 운영), `.../results`, `.../live`

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
