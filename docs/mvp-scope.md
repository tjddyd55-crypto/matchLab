# MVP 범위 및 수용 기준

본 문서는 1차 MVP의 **포함·제외·수용 기준(완료 정의)** 을 고정한다. 기술 스택은 사용자 지정안을 따른다.

## 1. MVP 목표 한 줄

주최자·체육관·선수·관람자가 **신청부터 대진·결과·전적**까지 종이/엑셀 없이 폐쇄 루프를 돌 수 있다.

## 2. 포함 기능 (Must-have)

### 인증·계정

- [ ] 주최자 회원가입/로그인(Supabase Auth) — **UI는 플레이스홀더**, 세션·`User.authUserId` 매핑은 `dev-start.md` 기준으로 수동 검증.
- [ ] 체육관 회원가입/로그인 — 동일.
- [x] 선수 계정 구조(`Fighter.userId` 연결, 시드·`/fighter` 조회 플로우).
- [x] **전 역할 아이디 로그인** — `/login` 「아이디」; `User.loginId` + Supabase synthetic email (UI 비노출).
- [x] **레거시 이메일 로그인** 하위 호환 (`@demo.local` 등, UI 기본은 아이디).
- [x] 체육관 **선수 로그인 계정 발급** — 직접 등록·기존 선수·비밀번호 재발급(`/gym/fighters`, `fighter-account.service`).
- [x] 등록 링크 제출 시 **아이디·비밀번호** 입력 → pending 계정 → 체육관 승인 후 `Fighter`·active 소속·계정 연결.
- [x] `mustChangePassword` — 체육관 발급·재발급 시 true; 등록 링크 자가 설정 비밀번호는 false 가능.
- [x] **선수 개인 프로필 고도화** — `/fighter/profile` (사진 업로드·표시 이름·자기소개·SNS·공개 설정), 공개 `/fighters/[slug]` (`FighterProfile.isPublic`). 체육관 `/gym/fighters` 프로필 상태 뱃지·주최자 `/organizer/public-fighters` 공개 프로필 링크 연동.
- [ ] **SMS 비밀번호 찾기** — MVP 제외; `User.phone`·보호자 연락처 구조만 유지(TODO).

### 대회

- [x] 주최자: 대회 생성·기본 정보 수정·상태 전이(`draft`→`open` 등, `event.service` / `/organizer/events`).
- [x] **대회 준비 체크리스트·가이드** — `/organizer/events/[eventId]` 관리 홈 6단계 체크리스트·다음 작업 안내·`EventManagementNav` 운영 순서 정리·생성 후 `?welcome=1` 다음 단계 (`organizer-event-setup.ts`).
- [x] 주최자: 디비전(EventDivision) 생성·수정·삭제(신청·대진표 연결 시 삭제 제한).
- [x] 주최자: 참가비·입금 계좌(`EventPaymentSetting` upsert) — **계좌번호는 공개 DTO·공고에 미포함**.
- [x] 주최자: 촬영·영상·라이브 스트리밍 플래그 및 안내 문구(`RecordingStreamingNotice` 등 공개 상세 반영).
- [x] 공개 노출: `draft`·`cancelled` 는 목록·slug 상세에서 제외, `open` 이후 상태는 정책에 따라 노출.
- [x] 공개 페이지: 목록·상세(slug)·디비전·촬영/스트리밍 안내(계좌번호 제외).
- [x] **공개 메인·대회 목록 포스터형 카드** — `/`, `/events` (`PublicEventCard`, `EventPosterImage`, 신청 상태 필터).
- [x] **대회 상세 랜딩형** — `/events/[slug]` 포스터 Hero·신청 CTA·대진표/결과/라이브 링크 (`PublicEventDetailHero`).
- [x] **공개 페이지 신뢰 정보** — 신청 D-day(`PublicEventDeadlineBadge`)·참가비/입금 안내(계좌번호 제외)·장소 지도 링크(`buildMapSearchUrl`)·대진표/결과 공개 뱃지(`PublicEventTrustBadges`)·행사 안내 탭 요약(`PublicEventInfoSummaryCard`). 목록·메인 카드에 D-day·공개 상태 간략 표시.
- [x] **대회 상세 공유** — Facebook 공유·링크 복사·OG/Twitter 메타데이터 (`EventShareButtons`, `generateMetadata`). 포스터 없을 때 `/og-event-default` 동적 fallback(대회명·날짜·장소·MatchLab 브랜딩). 카카오/인스타/Web Share API는 후속 TODO.
- [x] 공개 대회 UI **PC/모바일 분리** — `*Desktop` / `*Mobile` + `md` 브레이크포인트 (`FightersTableDesktop` 패턴).

### 체육관·선수 등록

- [x] 체육관 대시보드 기본(`/gym` 및 하위 네비).
- [x] **선수 직접 등록** (`/gym/fighters/new`, `createFighterDirectlyForGym`) — 서명·동의·신청서 PDF 없음; 옵션으로 로그인 계정 동시 발급.
- [x] **등록 선수 수정** (`/gym/fighters/[fighterId]/edit`, `updateGymFighter`) — 전적·신청 snapshot은 자동 변경 안 함.
- [x] **소속 해제** (`FighterGymHistory` end, `currentGymId` 정리) — Fighter 삭제·과거 신청 유지.
- [x] `/gym/fighters` — 활성 소속 목록·검색·직접 등록/링크/요청 탭·주최자 공개 토글.
- [x] 선수 등록 URL 발급(`/gym/invite-links`, `GymInviteLink`, `NEXT_PUBLIC_APP_URL` 기준).
- [x] 공개 폼: 선수 정보 제출(`/fighter-registration/[token]`).
- [x] 등록 요청 승인/반려 — 승인 시 GuardianConsent 게이트 없음, 기존 선수 1명이면 소속 연결.
- [x] **선수 등록 단계에는 서명/보호자 동의 없음** — 대회 신청 단계에서만 처리.
- [x] 보호자 이름/연락처는 정보로만 저장 가능(등록 완료 조건 아님).
- [x] 체육관 승인 후 **선수 고유번호(`fighterCode`)** 발급.
- [x] 중복 후보: 이름+생년월일+성별(+휴대폰) — 500 대신 안내·기존 선수 연결 선택.
- [x] 대회 신청(`/gym/events/[eventId]/apply`) — 활성 소속 선수만, 0명 시 등록 CTA.
- [x] **선수 일괄 신청** — 선수 목록·행별 부문 select·공통 동의·`createBulkEventApplicationsAction`(부분 성공/건너뜀/실패 요약).

### 공식 신청서 PDF (대회 신청 단계)

- [x] 관리자: `ApplicationFormTemplate` CRUD — **실제 PDF 업로드** + **PDF 좌표 시각 편집 UI**(기본) + `fieldsJson` 자동 저장. JSON·repeatGroups 등은 **고급 설정**(접힘).
- [x] 주최자: 대회에 템플릿 연결(좌표 편집 불가).
- [x] 체육관: 등록 선수 선택 → 선수별 `ApplicationDocument` 생성 → 자동 매핑 미리보기.
- [x] 선수 본인 서명(`/application-sign/[token]`, `FighterConsent`).
- [x] 미성년/학생: 보호자 동의(`/guardian-consent/[id]?scope=application`).
- [x] 체육관 일괄 제출(`EventApplicationBatch`).
- [x] 주최자: 제출 묶음·선수별 완료본 조회·출력 HTML(`documentSnapshotJson` 기준).
- [x] **PDF overlay 1차** — `pdf-lib`로 텍스트·서명 이미지 overlay → `generatedPdfPath` (Storage `application-documents`). 실패 시 snapshot + HTML fallback.

### 자체 폼형 신청서 운영 UI

- [x] `ApplicationFormTemplate.manualFieldsJson` — `{ formMode: "custom", fields: [...] }` 로 항목 정의(text/textarea/number/date/select/checkbox/radio).
- [x] **PDF 없이** 자체 폼 템플릿 생성 — `originalPdfPath` / `originalPdfFileName` optional (custom 모드).
- [x] 관리자 템플릿 편집 — 신청서 방식 선택(PDF / 자체 폼 / 없음) + **시각 폼 빌더**(항목 추가·수정·삭제·복제·순서·source·미리보기). 고급 JSON은 접힘 유지.
- [x] 대회당 신청서 방식: **없음** / **PDF**(`fieldsJson` 있음) / **자체 폼**(`formMode=custom`) — 동시 혼용은 TODO.
- [x] 체육관 일괄 신청(`GymBulkApplicationForm`) — 선수별 답변 작성·필수 검증·`applicationAgreementSnapshot.customForm` 저장.
- [x] 주최자 신청자 상세 Drawer — 자체 폼 답변 label/value 표시 + **인쇄용 보기**(`/organizer/events/.../applications/.../print`, 공개 화면 미노출).

### 대회 신청·입금

- [x] 체육관: 공개 대회에서 소속 **활성** 선수 선택 후 디비전 선택 신청 (`application.service` / `/gym/events`).
- [x] 참가비 계좌 안내(`EventPaymentSetting`) — **계좌번호는 공개 상세가 아니라 로그인 체육관 신청 완료·내역 UI에서만 표시**.
- [x] 신청 시 `applicationAgreementSnapshot` 및 스트리밍 동의(대회 플래그에 따라 필수).
- [x] 보호자/선수 서명은 **대회 신청 `ApplicationDocument` 단계**에서 처리(등록 단계 consent 재사용 안 함).
- [x] 주최자: 신청자별 **입금 상태 수동 반영**(`payment.service` + `EventApplication.paymentStatus` 동기화).
- [x] 주최자: 신청 **승인/반려**(MVP: 대기만 반려), 디비전·체육관 등 **클라이언트 필터**(추후 서버 검색 확장 가능).

### 주최자 전용 공개 선수 목록

- [x] 체육관: 소속 선수별 **주최자에게 공개** 토글 (`FighterGymHistory.isPublicToOrganizers`)
- [x] 주최자: `/organizer/public-fighters` — 로그인 주최자 전용(공개 라우트·public DTO 금지)
- [x] 개인정보 최소 노출 — 연령부·체급·전적·체육관·지역만, 생년월일·휴대폰·보호자·서명 미노출
- [ ] 선수 개인 연락처 공개 — 별도 동의 필드 TODO

### 주최자 크레딧 (참가 승인 과금)

- [x] `OrganizerCreditWallet` / `OrganizerCreditLedger` / `OrganizerCreditPayment` — 잔액은 ledger 거래로만 변경.
- [x] 주최자: `/organizer/credits` — 잔액·충전 상품·결제 주문·ledger (체육관/선수/공개 미노출).
- [x] 관리자: `/admin/credits` — 주최자 **수동 충전** (`manual_charge`).
- [x] `EventApplication` **approved** 시 선수 1명당 **100C** 차감 (기본, `credit-policy.ts`).
- [x] 승인 취소(approved→rejected) 시 차감분 **환불** (`refund_participant`), 중복 차감·환불 방지.
- [x] 잔액 부족 시 승인 실패.
- [ ] **PG 연동 TODO** — Toss Payments 결제창·승인 API·성공/취소 webhook·영수증 (MVP: 주문 생성 + 시연용 결제 확인).

- [x] 체육관: 행사별 **선수 참가비 안내** 저장(`GymEventFeeSetting`, 공개 행사 DTO에는 계좌번호 미포함 유지).

### 대진표

- [x] Bracket 단위 `single_elimination` 및 `match_list` 지원(동일 Event 혼합 가능).
- [x] 스냅샷에 사진·체육관·전적·체급 등 표시 데이터 포함(서버 생성 JSON).
- [x] 공개 대진표 페이지(`/events/[slug]/brackets`).
- [x] 대진표·매치 편집 시 **`BracketChangeLog`** 필수(`BracketChangeType`).
- [x] Supabase Realtime으로 변경 반영 → 클라이언트 `invalidateQueries` 및 필요 시 `router.refresh()` (`features/realtime`, 공개 페이지 브리지).
- [x] 인앱 `Notification` 생성·조회·읽음(API `/api/notifications`, `/notifications`, Header 벨·배지).
- [x] 알림 발생: 신청 접수(주최자), 승인/반려(체육관·선수), 입금(체육관), 현장/계체(체육관·선수), 자동 대진/공개(주최자·체육관·선수), 경기·결과(체육관·선수) — **best-effort** 생성(원래 액션 실패 방지).
- [ ] SMS·카카오 알림톡·이메일·웹푸시 (후속 TODO).
- [x] 선수·체육관 **현장 모드** 홈(`/fighter`, `/gym`) — 진행 예정 경기·요약.

### 경기 운영·결과

- [x] 주최자: **경기 운영 보드 MVP** (`/organizer/events/[eventId]/operation`) — 요약 카드·경기 목록·진행 시작/종료·결과 입력 Drawer(`OrganizerMatchOpsPanel` 재사용)·필터·검색·PC 테이블/모바일 카드. 기존 `/matches`는 `/operation`으로 리다이렉트.
- [x] 주최자: 브래킷·경기 목록에서 순서·매트·선수 배치 편집 및 **`BracketChangeLog`** 기록.
- [x] 주최자: 경기 상태 변경(`BracketMatchStatus`) — 확정 전 단계에서 **`MatchResult` 미생성**.
- [x] 결과 임시 입력(승자·결방식·메모) — **`BracketMatch` 필드만 갱신**, **`MatchResult` 미생성**.
- [x] 결과 확정 시 **`MatchResult` 2행 생성**(양 선수 각 1행, `confirmed`).
- [x] 확정 트랜잭션에서 **`Fighter` 전적 캐시 재계산**(집계는 `confirmed`+`corrected` 기준 승·패·무, **`no_contest`는 승패무 미반영 MVP**).
- [x] 단판(`single_elimination`) 확정 시 승자 **다음 매치 슬롯 반영** 및 **`BracketChangeLog`**.
- [x] 결과 정정·무효 시 **`MatchResultChangeLog` 필수** — 무효(MVP) 시 **`BracketMatch` 결과 필드 초기화**.
- [x] 주최자: **체급표 템플릿** 관리(`/organizer/division-templates`) — 종목·연령·성별·체급 구조화 입력, 빠른 붙여넣기, 무에타이/킥복싱/복싱 예시 불러오기.
- [x] 주최자: 대회 상세에서 체급표 선택·미리보기 후 **EventDivision 자동 생성**(추가/중복 스킵/초기화 옵션).
- [x] 주최자: 행사 **포스터·갤러리** 이미지 — URL 직접 입력 대신 **업로드 UI**(signed URL + FormData PUT), 공개 Storage 버킷·`NEXT_PUBLIC_SUPABASE_URL` 기준 `posterUrl`/`imageUrl`.
- [x] 주최자: `/organizer/events` 목록 — **대회 상태**(`open`→「공개」 등)와 **신청 상태**(기간 기준) 배지 분리.
- [x] 주최자: 체급표 템플릿 편집 — **넓은 레이아웃**(max-width 확대·표·빠른 입력 영역).
- [x] 주최자: **관람 공개 시간 창**·토큰·공개 대진표 QR 안내(`NEXT_PUBLIC_APP_URL` 기준 링크).
- [x] 주최자: **결과 입력 스태프 링크** 발급·폐기(토큰 URL `/staff/result/[token]/matches`, 로그인 없음).
- [x] **스태프 모바일 결과 입력 MVP** — `/staff/result/[token]/matches` 카드 목록·요약·필터·Bottom Sheet 결과 입력(`StaffMatchResultForm` → 기존 staff 액션). 민감정보 미노출. 경기 운영 보드에서 링크 복사 안내.
- [x] **심판 라운드별 채점 MVP** — `JudgeAccessCredential`·`JudgeMatchAssignment`·`JudgeScorecard`·`JudgeRoundScore`(MatchResult와 분리). 주최자 `/organizer/events/[eventId]/judges`에서 계정·배정, 심판 `/judge/login` → 라운드별 홍/청 점수·감점·다운·메모·전송. 운영 Drawer에서 제출 집계·다수결 추천(참고용). **최종 확정은 기존 `confirmMatchResults` 흐름 유지**.
- [x] **심판 수 정책** — 1~5명 허용, 3·5명 권장. 짝수 심판 동점 시 자동 확정 없음, 주최자/주심 최종 확정.
- [x] 주최자: **현장 확인·계체** (`/organizer/events/[eventId]/check-in`) — 승인 신청자 대상 `CheckInStatus` / `WeighInStatus` 기록, **선수명·체육관·부문·체급 검색**, 몸무게·메모 저장 피드백, 단계별 액션(현장/계체/출전/대진 처리).
- [x] 체육관: **현장 상태 조회** (`/gym/events/[eventId]/field-status`, 읽기 전용).
- [x] 체육관: **신청 현황 조회** (`/gym/events/[eventId]/status`) — 소속 선수만, 신청·입금·신청서·현장·계체·대진·경기·결과 요약, 요약 카드 필터·검색·상세 Drawer(주최자 `fieldMemo`·계체 실측 미노출).
- [x] 체육관: **자기 선수 경기 확인** — 동일 화면 「우리 체육관 경기」·미배정 선수, 공개 대진표 링크.
- [x] 선수: **내 대회·내 경기 조회** (`/fighter/events`) — 본인 `fighterId` 연결 신청·현장·대진·결과 **조회만**, 입금은 「체육관/주최자 확인 중」 수준 표시.
- [x] 대진표 후보: 출전 미확정 **경고**·「출전 확정만 보기」필터 — 기존 배치 **자동 삭제 없음**.
- [x] **실제 계체 몸무게·현장 메모** — 공개 페이지(`/events/*`) 미노출.
- [x] **자동 대진 생성** (`/organizer/events/[eventId]/brackets`) — **신청자 기준**(pending·approved)으로 생성. 현장·계체·출전 확정은 생성 조건에서 제외.
- [x] **경기 순서 관리** — 주최자 대진표·경기 운영·공개 대진표에 `제N경기` 표시, ▲▼·직접 입력 순서 변경(결과 확정 경기 제외).
- [x] **주최자 UI 용어** — 「브라켓」→「대진표 그룹」/「대진 방식」.
- [x] **홀수 인원 미매칭/대기 목록** — 주최자 화면·(토글 시) 공개 페이지 「추가 매칭 대기 명단」. 미매칭 사유(홀수·상대 없음 등) 표시.
- [x] **대진표·미매칭 공개 토글** — `Bracket.isPublic` + `Event.publicUnmatchedListEnabled`. 공개 대진표 VS 카드(홍코너/청코너·체육관).
- [x] **계체 탈락 후 대진 패 처리** — 현장·계체 화면에서 배정 경기 안내·주최자 선택(패배/실격/기권/그래도 진행). 공식 결과는 기존 `recordMatchOutcomeDraft` → `confirmMatchResults` 재사용.
- [x] **테스트용 체육관·선수 더미 데이터** — `npm run setup:bracket-demo-data`(gym1~7, 80명 선수, approved 신청, 크레딧 ledger 미발생).

### 전적·조회

- [x] 선수별 전적 조회(확정·정정 결과 기준, `/fighter/records`).
- [x] 체육관 소속 선수 전적 조회(현재 소속 기준, `/gym/records`).
- [x] 관람자: 공개 결과 페이지(`/events/[slug]/results`, **`MatchResult.confirmed`만**).

### 라이브

- [x] 주최자: YouTube 등 **watch/embed URL** 표시(매트별 가능) — **DB·시드·주최자 읽기 전용 화면**; 일괄 편집 upsert는 후속.
- [x] 공개 라이브 페이지: 임베드 iframe + 외부 시청 링크(`/events/[slug]/live`, 공개 스트림만).
- [x] `liveStreamingEnabled` 시 신청·동의서에 스트리밍 동의 항목 반영.

### 관리자 (조회 MVP)

- [x] `UserRole.admin` 전용 `/admin` 레이아웃·사이드바·하단 네비(일부)·상단 `AdminNavStrip`.
- [x] 관리자 홈: 통계 카드·최근 대회·최근 신청·최근 MatchResult·최근 `AuditLog`.
- [x] 전체 목록 조회: 대회·주최자·체육관·선수·신청·결과·감사 로그(`admin.repository` → `admin.service` → 페이지, Prisma는 repository만).
- [x] 민감 필드 비노출: 선수 전화·생년월일·보호자·체육관 전화/주소·감사 로그 JSON 본문·서명 경로 등.
- [ ] 관리자 전용 **역할 변경·계정 정지·데이터 강제 수정·입금/정산 조작** UI (이번 단계 제외).

### 비기능

- [x] 역할별 라우트 보호: `(dashboard)/*/layout` + 서비스 계층 `require*`·`docs/roles-permissions.md` 계약(시연 전 라우트 스모크 권장).
- [x] 공개 응답·공개 페이지 **개인정보 비포함 DTO** 및 마스킹(`public` DTO, 보호자 공개 뷰, 공개 결과 등).
- [ ] enum/상수 하드코딩 금지 원칙 — 지속적 리팩터링 과제(신규 코드는 `enums`·라벨 헬퍼 우선).

## 3. 의도적 제외 (Out of scope)

다음은 MVP에서 구현하지 않으며, 아키텍처만 확장 가능하게 둔다.

- 카드 결제 / 가상계좌 자동 입금 / 정산
- 자체 스트리밍 서버
- YouTube OAuth·API 자동 방송 생성
- 스트림 키 저장
- 자동 랭킹 산정
- 자동 bye 승급(홀수 인원 부전승) — TODO
- 카카오 알림톡·문자·이메일·웹푸시 (인앱 알림은 MVP 완료)
- QR 체크인 (MVP는 주최자 수동 현장 확인·계체 화면만 — QR/선수 셀프 조회는 후속)
- 티켓 판매
- 심판 배정
- 영상 다시보기(VOD)

## 4. 완료 정의(샘플 시나리오)

1. 주최자 A가 대회 생성·공개하고 디비전·계좌 정보를 등록한다.
2. 관리자가 주최측 공식 신청서 PDF 템플릿을 등록하고 A가 대회에 연결한다.
3. 체육관 B가 링크로 선수 C를 **등록 요청**(서명 없음)하고 B가 승인하여 `fighterCode` 가 발급된다.
4. B가 대회 신청 화면에서 C를 선택하고 공식 신청서 문서를 생성한다.
5. C가 선수 본인 서명 링크로 서명하고, 필요 시 보호자가 동의한다.
6. B가 완료된 선수별 신청서를 묶어 주최자에 제출한다.
7. B가 (기존 플로우) 디비전별 입금 신청도 진행할 수 있다.
8. A가 입금을 확인하고 신청을 승인한다.
9. A가 대진표를 만들고 공개·결과를 확정한다.
10. 공개 페이지에서 개인정보·서명이 노출되지 않는다.

## 5. 품질 게이트

- 핵심 플로우 E2E 또는 통합 테스트 최소 세트(신청→승인→bracket→확정).
- 린트·타입체크·마이그레이션 재현 가능한 seed.
- **상태 전이 테스트**(허용 전이만 통과·금지 전이는 거부 또는 명시적 admin 플로우만)

  - `EventStatus`
  - `ApplicationStatus`
  - `PaymentStatus` (`EventApplication` 캐시와 `EventApplicationPayment` 진실 행 동기화 포함)
  - `BracketStatus`
  - `BracketMatchStatus`
  - `MatchResult.status` (전적 캐시·로그와 연계)
  - **GuardianConsent** 상태 필드 (**스키마: `consentStatus`** — 요구·테스트 명세에서 “GuardianConsent.status” 로 부르는 것과 동일 대상)
  - `GymInviteLink.status`

- **Query Key / Realtime invalidate 준수 테스트** (`query-keys.md` 매핑)

  - `MatchResult` **확정** 시: 해당 이벤트 **results**, 관련 **matches**, 관련 **fighter results**(공개/내부), **`record-summary`** 쿼리가 무효화되는지 확인
  - `BracketMatch` **변경** 시: 이벤트·브라켓 **brackets**, **matches**, **공개 대진표(public bracket)** 관련 키가 무효화되는지 확인
  - **Payment** 상태 변경 시: **applications**(이벤트)·**gym applications**·**organizer 대시보드 집계(카운트)** 에 매달린 쿼리가 무효화되는지 확인

## 6. 개발 순서 (문서 단계 이후)

사용자 지정 순서를 따른다.

1. ~~문서~~ (architecture, database, roles-permissions, ui-ux, mvp-scope — 본 단계)
2. 프로젝트 기본 세팅(Next.js, TS, Tailwind, shadcn, Prisma, Supabase, 레이아웃)
3. DB 모델·seed
4. 인증·권한
5. 공개 대회
6. 체육관 선수 등록·동의·서명
7. 대회 신청·입금 안내
8. 주최자 신청 관리
9. 대진표(듀얼 타입)
10. 경기 운영·실시간
11. 전적 관리
12. 라이브 URL
13. 폴리시(PC/Mobile 분리, 빈/로딩/에러, 권한, 마스킹)

각 단계 완료 시 본 문서의 체크박스를 갱신하여 진척을 추적한다.
