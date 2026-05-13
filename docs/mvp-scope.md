# MVP 범위 및 수용 기준

본 문서는 1차 MVP의 **포함·제외·수용 기준(완료 정의)** 을 고정한다. 기술 스택은 사용자 지정안을 따른다.

## 1. MVP 목표 한 줄

주최자·체육관·선수·관람자가 **신청부터 대진·결과·전적**까지 종이/엑셀 없이 폐쇄 루프를 돌 수 있다.

## 2. 포함 기능 (Must-have)

### 인증·계정

- [ ] 주최자 회원가입/로그인(Supabase Auth).
- [ ] 체육관 회원가입/로그인.
- [ ] 선수 계정 구조(`Fighter.userId` 연결 가능, 조회 중심).

### 대회

- [ ] 주최자: 대회 공고 생성·편집·상태 관리(`draft` → `open` 등).
- [ ] 공개 페이지: 목록·상세(slug)·디비전·촬영/스트리밍 안내.

### 체육관·선수 등록

- [ ] 체육관 대시보드 기본.
- [ ] 선수 등록(내부) 및 **선수 등록 URL** 발급(`GymInviteLink`).
- [ ] 공개 폼: 선수 정보 제출(`FighterRegistrationSubmission`).
- [ ] 미성년/학생 플로우: 보호자 동의서 + **손사인**(`SignaturePad` → Storage).
- [ ] 체육관 승인 후 **선수 고유번호(`fighterCode`)** 발급.
- [ ] 동일 인물 조회: **생년월일 + 성별 + 휴대폰** (주민번호 미수집).

### 대회 신청·입금

- [ ] 체육관: 공개 대회에서 소속 선수 선택 후 디비전 선택 신청.
- [ ] 참가비 계좌 안내(`EventPaymentSetting`).
- [ ] 주최자: 신청자별 **입금 상태 수동 반영**.
- [ ] 주최자: 신청 **승인/반려**, 체급(디비전)별 분류·필터.

### 대진표

- [ ] Bracket 단위 `single_elimination` 및 `match_list` 지원(동일 Event 혼합 가능).
- [ ] 스냅샷에 사진·체육관·전적·체급 등 표시 데이터 포함.
- [ ] 공개 대진표 페이지.
- [ ] Supabase Realtime으로 변경 반영 → 클라이언트 invalidate/refetch.

### 경기 운영·결과

- [ ] 순서·매트·상태 변경.
- [ ] 결과 입력 → 확정 시 **`MatchResult` 생성**(양 선수 각 1행).
- [ ] `Fighter` 전적 캐시 갱신.
- [ ] 결과 수정 시 **`MatchResultChangeLog`** 필수.
- [ ] 대진표 구조 변경 시 **`BracketChangeLog`** 필수.

### 전적·조회

- [ ] 선수별 전적 조회(확정 결과 기준).
- [ ] 체육관 소속 선수 전적 조회.
- [ ] 관람자: 공개 결과 페이지.

### 라이브

- [ ] 주최자: YouTube Live **watch/embed URL** 등록(매트별 가능).
- [ ] 공개 라이브 페이지 iframe 재생.
- [ ] `liveStreamingEnabled` 시 신청·동의서에 스트리밍 동의 항목 반영.

### 비기능

- [ ] 역할별 라우트 보호 및 `permissions` 계약 준수.
- [ ] 공개 응답 개인정보 마스킹 규칙 준수.
- [ ] enum/상수 하드코딩 금지 원칙 준수.

## 3. 의도적 제외 (Out of scope)

다음은 MVP에서 구현하지 않으며, 아키텍처만 확장 가능하게 둔다.

- 카드 결제 / 가상계좌 자동 입금 / 정산
- 자체 스트리밍 서버
- YouTube OAuth·API 자동 방송 생성
- 스트림 키 저장
- 자동 랭킹 산정
- 카카오 알림톡·문자
- QR 체크인
- 티켓 판매
- 심판 배정
- 영상 다시보기(VOD)

## 4. 완료 정의(샘플 시나리오)

1. 주최자 A가 대회 생성·공개하고 디비전·계좌 정보를 등록한다.
2. 체육관 B가 링크로 선수 C를 등록 요청하고 보호자 동의·서명까지 완료한다.
3. B가 C를 승인하여 `fighterCode` 가 발급된다.
4. B가 대회에 C를 신청하고 입금 안내를 확인한다.
5. A가 입금을 확인하고 신청을 승인한다.
6. A가 토너먼트 bracket과 별도 매치 리스트 bracket을 만들고 공개한다.
7. 관람자가 실시간으로 대진표를 본다.
8. A가 경기 결과를 확정한다 → `MatchResult` 2건 생성, 전적 캐시 갱신.
9. A가 결과를 수정한다 → `MatchResultChangeLog` 가 남고 전적이 일관되게 반영된다.
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
