# 데이터베이스 설계

PostgreSQL + Prisma. 도메인 무결성, 감사 가능성, 전적 원천 데이터 분리를 우선한다.

## 1. 설계 원칙

1. **선수 식별자**: 모든 신청·매치·결과·전적 연결은 `Fighter.id` 및 `fighterCode` 기준. 이름 비사용.
2. **전적 원천**: `MatchResult`만 원천. `Fighter.recordWin/Loss/Draw`는 **확정된 결과에서 파생된 캐시**.
3. **결과 확정 시점만 반영**: 신청·대진표 배치만으로 전적·MatchResult 생성 안 함.
4. **변경 이력**: 결과 수정은 `MatchResultChangeLog`. 대진표 수정은 `BracketChangeLog`. 다른 상태 변경은 필요 시 `AuditLog` 또는 도메인별 이력.
5. **개인정보**: 공개 조회용 뷰·API에서는 스키마 레벨이 아닌 **애플리케이션 레벨에서 필드 제외**(민감 컬럼은 내부 전용 쿼리만 사용).

## 2. 열거형(Enum) 권장

Prisma `enum` 또는 코드 상수와 동기화되는 문자열 제한 컬럼으로 통일한다.

- `UserRole`: `admin`, `organizer`, `gym`, `fighter`
- `GymStatus`, `FighterStatus`, `OrganizerType`, `OrganizerStatus` 등 도메인별 상태
- `EventStatus`: `draft`, `open`, `closed`, `bracket_ready`, `ongoing`, `finished`, `cancelled`
- `ApplicationStatus`: `pending`, `approved`, `rejected`, `cancelled`
- `CheckInStatus`: `pending`, `checked_in`, `no_show`, `withdrawn`, `disqualified` — **신청 승인과 별개**, 대회 당일 현장 확인
- `WeighInStatus`: `pending`, `pass`, `fail`, `manual_pass`, `manual_fail` — 계체 결과(현장 확인과 별개)
- `PaymentStatus`: `unpaid`, `pending_check`, `paid`, `refunded`, `waived`
- `CreditLedgerType`: `payment_charge`, `manual_charge`, `debit_participant`, `refund_participant`, `adjustment`
- `CreditPaymentStatus`: `pending`, `paid`, `failed`, `cancelled`, `refunded`
- `BracketType`: `single_elimination`, `match_list`
- `BracketStatus`, `BracketMatchStatus`, `MatchResultType`, `MatchResultRecordStatus` 등
- `InviteLinkType`, `ConsentStatus`, `LivePlatform`, `StreamType`, `LiveStreamStatus`

문자열 리터럴을 컴포넌트에 산재시키지 않고 `lib/enums.ts` / Prisma enum 과 단일 출처 유지.

## 3. 핵심 엔티티 관계 (개념)

```
User ──┬── Organizer ── Event ──┬── EventDivision
       │                         ├── EventPaymentSetting
       │                         ├── EventLiveStream
       │                         ├── EventApplication ──┬── EventApplicationPayment
       │                         ├── Bracket ── BracketMatch
       │                         └── (GuardianConsent.eventId)
       │
       ├── Gym ──┬── Fighter (currentGymId)
       │         ├── FighterGymHistory
       │         ├── GymInviteLink
       │         └── FighterRegistrationSubmission
       │
       └── Fighter (userId optional)

MatchResult (eventId, bracketId, matchId, fighterId, …)
MatchResultChangeLog → MatchResult

BracketChangeLog → Bracket / BracketMatch / Event
AuditLog (전역 액션)
Notification
```

## 4. 테이블별 요약

### User

| 필드 | 설명 |
|------|------|
| id | 내부 PK(cuid) |
| authUserId | Supabase Auth `user.id`(UUID) 와 매핑, `@unique`, 시드·마이그레이션 전 사용자는 null 가능 |
| email, phone, name | 표시·레거시 로그인(이메일 형식 입력 시). 기본 로그인은 `loginId` |
| loginId | nullable, `@unique`, **전역 유일** (4~20자, `a-z0-9_-`, lowercase 저장). 관리자·주최자·체육관·선수 공통. 신규 Auth는 `{loginId}@internal.matchlab.local` synthetic email — **공개·DTO·UI에 노출 금지** |
| mustChangePassword | 체육관 발급·재발급 임시 비밀번호 시 true → 첫 로그인 후 `/fighter/change-password` |
| passwordIssuedAt, passwordResetAt | 비밀번호 원문은 저장하지 않음. 발급·재발급 시각만 감사 |
| role | 플랫폼 역할(MVP 단일 역할) |
| createdAt, updatedAt | 감사 |

**비밀번호**: DB·Prisma에 평문 저장하지 않음. Supabase Auth `updateUser`/`signUp`만 사용.

### Gym

체육관 법인/단위. `ownerUserId` 로 소유자 연결.

### Fighter

| 필드 | 설명 |
|------|------|
| fighterCode | 대외 고유번호(표시·조회) |
| userId | nullable, `@unique` — 선수 로그인 `User` 1:1. null이면 계정 미발급 |
| currentGymId | 현재 소속 |
| primarySport | 체육관 등록 참고용 주 종목 |
| recordWin/Loss/Draw | **캐시**, MatchResult 확정 시만 갱신 — 체육관 UI에서 수동 수정 금지 |
| schoolName / grade / guardian* | 보호자 동의 정책 판단용(등록 단계 필수 아님) |

프로필 수정 시 **이미 제출된 `ApplicationDocument` snapshot** 은 유지. 이후 신청·조회에는 수정값 사용.

### FighterProfile

선수 **공개 개인 프로필**(체육관이 편집하지 않음). `fighterId` PK.

| 필드 | 설명 |
|------|------|
| slug | 공개 URL `/fighters/[slug]`, unique |
| displayName, bio | 선수가 수정 가능 |
| profileImageUrl | 공개 표시용 URL |
| profileImagePath | Storage 객체 경로 — **공개 DTO·페이지에 미노출** |
| snsInstagram, snsYoutube, snsTiktok | 선수 입력 — `https://` URL만 허용, `javascript:`·`data:` 금지 |
| isPublic, publicEnabledAt | true일 때만 공개 페이지 노출 (`Fighter.active` + active gym affiliation 필요) |

읽기 전용 표시(편집 UI): 소속 체육관·지역·성별·연령부·체급·주종목·전적 — `Fighter`·active `FighterGymHistory`·`MatchResult` 캐시에서 파생.

프로필 저장 시 `Fighter.profileImageUrl` 캐시를 동기화(체육관·주최자 목록 썸네일). 공개 페이지·편집 UI는 `FighterProfile.profileImageUrl` 우선.

`FighterGymHistory.isPublicToOrganizers` 와 **혼동 금지**:
- **isPublicToOrganizers** — 체육관이 켜는 주최자 매칭 풀(`/organizer/public-fighters`)
- **FighterProfile.isPublic** — 선수가 켜는 일반 공개 프로필(`/fighters/[slug]`)

### FighterGymHistory

소속 이력. `status=active`·`endDate=null` 이 현재 소속. 해제 시 `ended`·`endDate`·주최자 공개 OFF.

| 필드 | 설명 |
|------|------|
| gymInternalMemo | 체육관 내부 메모 (`publicMemo`와 별도) |
| isPublicToOrganizers | 주최자 매칭 목록 (기본 false, 직접 등록 시 자동 ON 안 함) |

`/gym/fighters` 기본 목록: `activeFighterAffiliatedWithGymWhere` (활성 소속·`Fighter.active`).

**데모 데이터 repair 정책** (`npm run setup:demo-org-gym-fighters`):

- `fighterCode`(`FTR-BKT-GYM*-*`) 기준 upsert — 중복 생성 없음
- `FighterGymHistory` — `status=active`, `endDate=null` 행이 없으면 생성; 데모 선수는 잘못된 `gymId`면 **update**로 교정(삭제·ended 처리 없음)
- `repairGymFighterAffiliations` — active history 기준으로 `Fighter.currentGymId` 동기화
- 검증 summary는 `activeFighterAffiliatedWithGymWhere`와 동일 조건으로 `/gym/fighters` count 출력
- `db:seed` / truncate / hard delete / 기존 신청·결과 삭제 **금지**

### Organizer / Event

- `Event.publicSlug`: 공개 URL. 제목 기반 ASCII 슬러그 + 충돌 시 랜덤 suffix(`allocateUniquePublicSlug`).
- `Event.status` 기본값 `draft`. `draft`→`open` 시 제목·일정·장소·신청 기간·부문 1개 이상·`EventPaymentSetting` 존재를 서비스에서 검증.
- `photoRecordingEnabled`, `videoRecordingEnabled`, `liveStreamingEnabled`, `streamingConsentRequired`, `streamingNoticeText`: 대회 단위 촬영·스트리밍 정책. **`liveStreamingEnabled` 가 true이면 신청 동의(`streamingConsentRequired`) 를 기본적으로 요구**하는 흐름을 권장(생성·수정 서비스에서 플래그에 맞춰 보정).

### EventDivision

종목·룰·성별·연령·체급·스킬 등 신청·대진표 분류 단위.

### EventApplication

| 필드 | 설명 |
|------|------|
| fighterId, gymId, divisionId | 참조 |
| fighterSnapshot, gymSnapshot | JSON — 서버가 신청 시점 표시 정보를 생성·저장 |
| applicationAgreementSnapshot | JSON(선택) — 신청 시 체크박스·스트리밍 동의 등 **스냅샷**(전자서명 원본 아님) |
| appliedByUserId, appliedAt | 신청을 수행한 체육관 사용자·시각 |
| applicationProfileImageUrl | 신청 시점 프로필 이미지(선택) |
| memo | 체육관·주최자 메모 |
| fieldMemo | 현장 확인·계체 운영 메모(신청 `memo`와 분리) |
| checkInStatus | `CheckInStatus` — 기본 `pending` |
| weighInStatus | `WeighInStatus` — 기본 `pending` |
| weighInWeightKg | 계체 실측 몸무게(kg, `Float`) — **공개 API·공개 페이지 미노출** |
| status | `ApplicationStatus` |
| paymentStatus | `PaymentStatus` — **`EventApplicationPayment` 와 트랜잭션으로 동기화되는 캐시** |

### EventPaymentSetting / EventApplicationPayment

MVP: 계좌 안내 + 수동 입금 확인. **`EventApplicationPayment` 가 입금 이벤트의 진실 원천**이며, `EventApplication.paymentStatus` 는 목록·필터 속도용 캐시이다. 공개 대회 상세 DTO에는 **`accountNumber` 를 포함하지 않는다** — 로그인한 체육관 신청 완료·내역 화면에서만 노출.

### GymInviteLink / FighterRegistrationSubmission

- 링크별 `token`, 만료, 최대 사용 횟수.
- 제출 데이터: 조회용 생년월일+성별+전화 조합 인덱스 설계 검토(복합 유니크는 비즈니스 규칙과 충돌 시 애플리케이션에서 검증).
- **등록 링크 + 계정**: 제출 시 `loginId`·`pendingUserId`(선수 `User` + Auth, `role=fighter`) 저장. **승인 전** `Fighter`·active 소속 없음 — 로그인 시 `/fighter/pending`만. **승인** 시 `Fighter` 생성·`FighterGymHistory` active·`Fighter.userId` 연결. **반려** 시 `/fighter/rejected`; Auth 비활성/삭제는 구조에 맞게 안전 처리.
- 등록 단계 **서명·보호자 동의 없음**(대회 신청 단계만).

### GuardianConsent

- `fighterId` / `registrationSubmissionId` / `eventId` / `eventApplicationId` nullable 조합으로 단계별 연결.
- **등록 단계**: `registrationSubmissionId` 연결 (MVP 이후 등록 단계 동의는 사용하지 않음 — DB만 유지).
- **대회 신청 단계**: `eventId` + `fighterId` 로 `ApplicationDocument` 와 연결, `/guardian-consent/[id]?scope=application`.
- **서명 이미지 URL**: Storage 경로만 저장, 공개 금지.
- `ipAddress`, `userAgent`: 내부 증빙용 — **공개 API 미포함**.

### ApplicationFormTemplate

- 주최측 **공식 신청서 PDF 원본** + 좌표 JSON(`fieldsJson`, `repeatGroupsJson`).
- `originalPdfPath` / `originalPdfFileName`: **nullable**. PDF 모드에서만 필수. 원본 PDF **private Storage** 경로·표시용 파일명 (`SUPABASE_APPLICATION_FORM_BUCKET`, 기본 `application-forms`). **공개 URL·DB signed URL 저장 금지.**
- `source` 매핑 예(PDF): `fighter.name`, `event.title`, `application.division`, `athlete.signatureImage`, `manual.*`.
- **자체 폼형**: `manualFieldsJson`에 `{ "formMode": "custom", "fields": [...] }` 저장. 필드 구조: `id`, `label`, `type`, `required`, `readonly`, `source`, `displayOrder`, `options`(select/radio), `placeholder`, `helpText`. `fieldsJson`이 비어 있고 `formMode=custom`이면 PDF 좌표 대신 항목 기반 신청서로 해석.
- 답변 저장: `EventApplication.applicationAgreementSnapshot.customForm` — `{ templateId, templateTitle, capturedAt, answers: [{ id, label, type, value, readonly }] }` (주최자 전용, 공개 DTO 제외).
- **Railway `db:push`**: `originalPdfPath`/`originalPdfFileName` optional 변경 반영 시 필요.
- `fieldsJson` 좌표: **페이지 좌상단(top-left) pt** — 렌더 시 pdf-lib bottom-left로 변환(`docs/dev-start.md` 참고).
- 관리자/운영팀만 좌표 세팅 — 주최자는 선택·다운로드만.

### EventApplicationBatch

- 체육관이 한 대회에 **일괄 제출**하는 신청 묶음.
- `documentNo`, `status`(draft → submitted → …), `totalFighterCount`, 입금 예정 금액 캐시.

### ApplicationDocument

- 선수 1명당 공식 신청서 작성 문서.
- `formValuesJson`: 자동 매핑·수동 입력값.
- `documentSnapshotJson`: **제출/완료 시점 고정 스냅샷**(선수 정보 변경 후에도 불변).
- `athleteConsentId` / `guardianConsentId`: 대회 신청 단계 서명·동의 연결.
- `generatedPdfPath`: 완료 시 **pdf-lib overlay** 결과 PDF (`SUPABASE_APPLICATION_DOCUMENT_BUCKET`, private). 없으면 snapshot + HTML 출력 fallback.
- `FighterConsent.signatureImagePath` / `GuardianConsent.signatureImagePath`: private Storage 경로 — **공개 DTO·snapshot 미포함**.

**상태 전이 (MVP):**

| from | to | 조건 |
|------|-----|------|
| `draft` / `waiting_athlete_signature` | `waiting_athlete_signature` | 문서 생성, 선수 서명 대기 |
| `waiting_athlete_signature` | `waiting_guardian_signature` | 선수 서명 완료, 보호자 동의 필요 |
| `waiting_athlete_signature` | `completed` | 선수 서명 완료, 보호자 불필요 |
| `waiting_guardian_signature` | `completed` | 보호자 동의 완료 |
| `completed` | `submitted` | 체육관 batch 제출 |

### EventApplicationBatch 제출 정책

- 체육관 `draft` batch에 선수별 `ApplicationDocument`를 모은 뒤 일괄 `submitted`.
- batch 내 **모든 문서가 `completed`** 여야 제출 가능.
- 제출 시 `documentNo`, `totalFighterCount`, 입금 예정액 캐시 저장.

### FighterConsent

- 선수 **본인 서명** — 대회 신청 `ApplicationDocument` 단위.
- `token` 공개 링크(`/application-sign/[token]`), `signatureImagePath` private storage.

### Event.applicationFormTemplateId

- 대회에 연결된 공식 신청서 템플릿(주최자 선택, admin 전체 템플릿 연결 가능).

### EventApplication (확장)

- `applicationBatchId`, `applicationDocumentId`: 공식 신청서 플로우와 기존 선수별 신청 연결.
- **현장 확인·계체(MVP)**: 별도 `EventApplicationCheckIn` 테이블 없이 `EventApplication`에 `checkInStatus` / `weighInStatus` / `weighInWeightKg` / `fieldMemo` 를 둔다. 단위는 **선수 × 대회 × 부문 신청 1건**(`@@unique([eventId, fighterId, divisionId])`)과 동일.
- **출전 확정**: DB 컬럼이 아니라 `src/lib/field-eligibility.ts`에서 계산 — `checked_in` + (`pass` \| `manual_pass`).
- **공개 노출 금지**: `weighInWeightKg`, `checkInStatus`, `weighInStatus`, `fieldMemo` 는 주최자·체육관 대시보드 전용. 공개 DTO(`lib/dto/public`)에는 포함하지 않는다.
- **TODO(향후)**: 감사 추적(`checkedInAt` / `checkedInByUserId` / `weighedAt` / `weighedByUserId`)·QR 체크인·선수 셀프 조회가 필요하면 `EventApplicationFieldStatus` 등 별도 테이블로 분리 검토.

### Bracket / BracketMatch

- **Bracket 단위**로 `type` 선택 — 동일 Event 내 토너먼트·매치리스트 혼합 가능.
- `fighterRedSnapshot`, `fighterBlueSnapshot`: 사진·체육관명·전적 요약·부문 라벨 등 **표시 전용 JSON**(클라이언트 입력 신뢰 금지 — 서버에서 승인 신청·Fighter 캐시 기준 생성).
- 예시 페이로드(키만 참고):

```json
{
  "fighterId": "…",
  "fighterCode": "F-001",
  "name": "홍길동",
  "gymName": "OO 체육관",
  "profileImageUrl": "https://…",
  "recordSummary": "1승 0패 0무",
  "divisionName": "복싱 · 라이트급 · 남 · 신인"
}
```

- `nextMatchId`, `nextMatchSlot`: 싱글 엘리미네이션 진출.
- `globalMatchOrder`, `matNumber`: 순서·매트 운영.

**자동 대진 생성 (MVP)**:

- 승인 `EventApplication` + `divisionId` + `Fighter.status=active` 기준으로 division별 2명 페어링.
- 기존 `BracketMatch`는 **덮어쓰지 않음** — 미배치 선수만 `match_list` 브래킷에 **append**.
- division별 `match_list` 브래킷이 없으면 자동 생성(`bracket-auto-match.service.ts`).
- **결과 입력된 match 보호**: 확정·정정 `MatchResult` 2행 이상인 경기가 있으면 이벤트 전체 초기화 후 재생성 불가.
- 데모 approved 신청: `npm run setup:bracket-demo-data` — `creditChargedAt`/`creditChargeLedgerId` 없이 직접 upsert(승인 서비스·ledger 우회).

### BracketChangeLog

애플리케이션에서는 브래킷·매치 **쓰기 트랜잭션**과 함께 `BracketChangeType`(예: `bracket_created`, `fighter_assigned`, `bracket_reset`, `mat_changed`)으로 분류 삽입한다(`bracket.service.ts`).

| 필드 | 설명 |
|------|------|
| eventId, bracketId, matchId | 범위 |
| changedByUserId | 작업자 |
| bracketType, changeType | 분류용 enum |
| beforeData, afterData | JSON |
| reason | 필수 입력 권장(운영 품질) |
| createdAt | 시각 |

### MatchResult

한 경기당 **선수별 행 2건**(A 승 / B 패 등).

| 필드 | 설명 |
|------|------|
| fighterId, opponentFighterId | 상대 참조 |
| gymId, opponentGymId | 스냅샷과 정합 |
| result | win / loss / draw / no_contest |
| fighterSnapshot, opponentSnapshot, divisionSnapshot, eventTitleSnapshot | 공개·기록용 |
| status | pending → confirmed → corrected / voided |
| confirmedByUserId, confirmedAt | 확정 책임 |

### MatchResultChangeLog

결과 수정 시 이전/이후 값·사유·작업자.

### EventLiveStream

MVP: `watchUrl`, `embedUrl`, 플랫폼 enum. **스트림 키 필드 없음.**

### Notification / AuditLog

알림·교차 도메인 감사. 세분화된 도메인 로그(Bracket/MatchResult)와 역할 분담.

- **`EventStatus` 변경**: MVP에서는 `AuditAction.event_status_changed` 로 `AuditLog`에 이전/이후 상태 JSON을 남긴다(`event.service` `changeEventStatus` 트랜잭션). 상태 **뒤로 가는 보정 전이**는 관리자 전용 별도 플로우로 확장 예정.

**Notification (인앱 MVP)**

| 필드 | 설명 |
|------|------|
| userId | 수신 사용자 |
| eventId | nullable, 맥락 필터용 |
| type | `NotificationType`(신청·입금·대진·경기·결과 등) |
| title, content | 짧은 안내 문구만 — 휴대폰·생년월일·보호자 연락처·서명 경로 등 민감 정보 금지 |
| href | nullable, 내부·공개 라우트만 (예: `/gym/events/{eventId}/status`, `/fighter/events`, `/organizer/events/{eventId}/applications`) |
| readAt | 읽음 시각 |

**수신자**: `userId` 기준 — 체육관 관장(`Gym.ownerUserId`), 선수(`Fighter.userId`), 주최자(`Organizer.userId`). 역할별 href는 `notification.service`에서 결정.

**발생 이벤트 (MVP)**: 신청 접수·승인/반려·입금·현장/계체·자동 대진·대진 공개·경기 변경·결과 확정/정정/무효.

**정책**: 알림 생성 실패는 `safeNotify`/`tryNotify`로 격리 — 도메인 트랜잭션 성공과 분리(best-effort). 동일 상태 no-op 시 알림 생략.

### 추가 엔티티 (운영자 피드백 MVP 반영)

- **`DivisionTemplate`**: 주최자 체급표 템플릿. `items` JSON 배열에 행 저장(별도 `DivisionTemplateItem` 테이블 없음).
  - 메타: `title`, `sportType`(muaythai/kickboxing/boxing/custom), `description`, `isActive`, `organizerId`
  - 행(`items[]`): `ageGroup`, `gender`, `weightClassName`, `weightLimitText`, `weightLimitKg`, `limitType`, `displayOrder`, `isActive` (+ 레거시 `weightClass` 통합 필드)
  - **EventDivision 매핑**: `sportType`←템플릿, `gender`/`ageGroup`←행, `weightClass`←`weightClassName + weightLimitText`, `ruleType`/`skillLevel` 선택
  - **적용 중복 키**: sportType · gender · ageGroup · weightClass
  - **초기화(replace)**: 신청·대진표 없는 부문만 삭제 후 재생성
- **`EventImage`**: 행사 포스터·갤러리 메타(공개 URL은 Storage 공개 버킷 정책 기준).
- **`GymEventFeeSetting`**: 체육관별 행사 참가비 안내(선수에게 보여 줄 금액·메모 — 공개 행사 DTO에는 계좌번호 미포함 유지).
- **`EventStaffAccessLink`**: 결과 입력 스태프 전용 토큰 링크(권한 플래그·선택적 접속 코드·만료).
- **`Event` 관람 제한 필드** (`spectatorAccessEnabled`, `spectatorAccessStartAt`, `spectatorAccessEndAt`, `spectatorAccessToken`): 공개 관람 페이지 시간 창·토큰 게이트.

## 5. 인덱스·제약 권장

- `Event(publicSlug)` UNIQUE
- `Fighter(fighterCode)` UNIQUE
- `BracketMatch(bracketId, round, matchOrder)` 등 목록 정렬 복합 인덱스
- `MatchResult(matchId, fighterId)` UNIQUE — 동일 매치·동일 선수 중복 방지
- `EventApplication(eventId, fighterId, divisionId)` 비즈니스 규칙에 따라 UNIQUE 또는 부분 유니크

## 5.1 주최자 공개 선수 (FighterGymHistory)

체육관 **소속 단위**로 주최자 매칭 후보 공개 여부를 관리한다(MVP). 추후 `Fighter` 단일 필드 대신 소속 이력 기준이 맞다.

| 필드 | 설명 |
|------|------|
| `isPublicToOrganizers` | 로그인 주최자 목록 노출 여부 (기본 `false`) |
| `publicEnabledAt` / `publicDisabledAt` | 공개 on/off 시각 |
| `publicMemo` | 주최자 공개 목록용 메모(선택 표시) |
| `gymInternalMemo` | 체육관 전용 내부 메모(주최자·공개 목록 미노출) |

조회 조건: `isPublicToOrganizers=true`, active history, `Fighter.status=active`, `Fighter.currentGymId=gymId`, `Gym.status=active`.

## 5.1.1 심판 채점 (Judge* — MatchResult와 분리)

최종 공식 결과는 `MatchResult`만 원천. 심판 채점은 **결과 확정 전 참고 데이터**이며 `confirmMatchResults`와 별도 저장한다.

| 모델 | 설명 |
|------|------|
| `JudgeOfficial` | 대회별 심판 인적 정보(선택, MVP는 credential 중심) |
| `JudgeAccessCredential` | 심판 접속 계정. `loginId` + `passwordHash`(scrypt, 평문 금지). `@@unique([eventId, loginId])` |
| `JudgeMatchAssignment` | 경기별 심판 배정. `judgeOrder`, `isHeadJudge`, `credentialId` |
| `JudgeScorecard` | 심판별 채점표. `@@unique([matchId, credentialId])`. `status`: `draft` / `submitted` / `locked` |
| `JudgeRoundScore` | 라운드별 홍/청 점수·다운·감점·메모. `@@unique([scorecardId, roundNumber])` |

enum: `JudgeScorecardStatus`, `JudgeWinnerCorner`, `JudgeDecisionMethod`.

집계: 제출된 scorecard 다수결 → 동률 시 총점 합산 참고 → UI 참고용만(자동 `MatchResult` 반영 없음 MVP).

## 5.2 주최자 크레딧 (OrganizerCredit*)

| 모델 | 설명 |
|------|------|
| `OrganizerCreditWallet` | `organizerId` 1:1, `balance` — **ledger 없이 직접 수정 금지** |
| `OrganizerCreditLedger` | 모든 잔액 변동 원천. `amount` 충전·환불 양수, 차감 음수, `balanceAfter` 필수 |
| `OrganizerCreditPayment` | PG 결제 주문. `orderId` UNIQUE, `paid` 시 `ledgerId` 연결 |

`EventApplication` 차감 추적:

- `creditChargedAt` / `creditChargeLedgerId` / `creditChargeAmount` — **approved 시 1회 차감**
- `creditRefundedAt` / `creditRefundLedgerId` — 승인 취소·반려 시 환불 1회

중복 방지:

- 동일 신청: `creditChargedAt` 또는 `debit_participant` ledger 존재 시 재차감 스킵
- 동일 신청: `creditRefundedAt` 또는 `refund_participant` ledger 존재 시 재환불 스킵
- 동일 결제: `OrganizerCreditPayment.status === paid` 시 재충전 스킵

단위: `src/lib/credits/credit-policy.ts` — 1C = 10원, 기본 승인 100C/명.

## 6. 트랜잭션 경계 (중요 유스케이스)

- **결과 확정 (MVP 구현)**: 단일 트랜잭션에서 `BracketMatch` 운영 종료(`finished`) 및 결과 필드 확정, **`MatchResult` 2행(`confirmed`)**, **`Fighter` 전적 캐시 재계산**, 단판이면 **승자 다음 슬롯 배치** + `BracketChangeLog`. 인앱 **`Notification`** 은 트랜잭션 내 `tryNotify`로 best-effort 생성(실패 시 도메인 롤백 없음).
- **결과 수정·무효 (MVP 구현)**: 조용한 덮어쓰기 금지 — **`MatchResultChangeLog` 필수**. 정정은 행을 `corrected`로 갱신하고, 무효는 `voided` 처리 후 (MVP) **`BracketMatch` 결과 필드 초기화** 및 캐시 재계산.
- **대진표 저장**: Match 변경 + `BracketChangeLog` 삽입.
- **참가 승인 + 크레딧 차감**: 단일 트랜잭션에서 `debit_participant` ledger + wallet 갱신 + `EventApplication.status=approved` + (선택) 알림.
- **결제 충전**: `paid` 처리와 `payment_charge` ledger + wallet 갱신을 동일 트랜잭션.

## 7. Seed 전략

`seed.ts`: 역할별 테스트 사용자, 샘플 주최자·체육관·선수, 소규모 대회·디비전, 선택적 bracket/match. 실제 운영 데이터와 분리.

## 8. 마이그레이션 운영

- 초기 스키마를 크게 나누지 않고 하나의 `schema.prisma`에서 관리하되, 팀 규모 커질 때 도메인별 주석 섹션으로 구획.
- 파기적 변경 전 백필 스크립트 계획 문서화.

본 문서는 Prisma 모델 작성 시 단일 참조로 삼고, 코드 리뷰 시 “스냅샷·로그·전적 캐시” 세 가지를 반드시 확인한다.
