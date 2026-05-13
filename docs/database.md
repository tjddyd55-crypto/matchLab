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
- `PaymentStatus`: `unpaid`, `pending_check`, `paid`, `refunded`, `waived`
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
| id, email, phone, name | 로그인·표시 |
| role | 플랫폼 역할 |
| createdAt, updatedAt | 감사 |

### Gym

체육관 법인/단위. `ownerUserId` 로 소유자 연결.

### Fighter

| 필드 | 설명 |
|------|------|
| fighterCode | 대외 고유번호(표시·조회) |
| userId | nullable, 선수 계정 연결 |
| currentGymId | 현재 소속 |
| recordWin/Loss/Draw | **캐시**, MatchResult 확정 시만 갱신 로직에서 수정 |

### FighterGymHistory

소속 이력. 과거 경기는 매치·결과 스냅샷으로 보존.

### Organizer / Event

- `Event.publicSlug`: 공개 URL.
- `photoRecordingEnabled`, `videoRecordingEnabled`, `liveStreamingEnabled`, `streamingConsentRequired`, `streamingNoticeText`: 대회 단위 촬영·스트리밍 정책.
- **스트리밍 동의는 대회 설정에 종속** — 신청·동의서 UI는 이 플래그에 따라 항목 노출.

### EventDivision

종목·룰·성별·연령·체급·스킬 등 신청·대진표 분류 단위.

### EventApplication

| 필드 | 설명 |
|------|------|
| fighterId, gymId, divisionId | 참조 |
| fighterSnapshot, gymSnapshot | JSON 등 — 당시 표시 정보 |
| applicationProfileImageUrl | 신청 시점 프로필 이미지 |
| status, paymentStatus | 신청·입금(중복 표현 필요 시 Payment 테이블과 정합) |

### EventPaymentSetting / EventApplicationPayment

MVP: 계좌 안내 + 수동 입금 확인. `EventApplicationPayment` 로 금액·입금자명·확인자·시각 기록.

### GymInviteLink / FighterRegistrationSubmission

- 링크별 `token`, 만료, 최대 사용 횟수.
- 제출 데이터: 조회용 생년월일+성별+전화 조합 인덱스 설계 검토(복합 유니크는 비즈니스 규칙과 충돌 시 애플리케이션에서 검증).

### GuardianConsent

- `fighterId` / `registrationSubmissionId` / `eventId` nullable 조합으로 단계별 연결.
- **서명 이미지 URL**: Storage 경로만 저장, 공개 금지.
- `ipAddress`, `userAgent`: 내부 증빙용 — **공개 API 미포함**.

### Bracket / BracketMatch

- **Bracket 단위**로 `type` 선택 — 동일 Event 내 토너먼트·매치리스트 혼합 가능.
- `fighterRedSnapshot`, `fighterBlueSnapshot`: 사진·체육관명·전적·체급 등 표시용.
- `nextMatchId`, `nextMatchSlot`: 싱글 엘리미네이션 진출.
- `globalMatchOrder`, `matNumber`: 순서·매트 운영.

### BracketChangeLog

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

## 5. 인덱스·제약 권장

- `Event(publicSlug)` UNIQUE
- `Fighter(fighterCode)` UNIQUE
- `BracketMatch(bracketId, round, matchOrder)` 등 목록 정렬 복합 인덱스
- `MatchResult(matchId, fighterId)` UNIQUE — 동일 매치·동일 선수 중복 방지
- `EventApplication(eventId, fighterId, divisionId)` 비즈니스 규칙에 따라 UNIQUE 또는 부분 유니크

## 6. 트랜잭션 경계 (중요 유스케이스)

- **결과 확정**: `BracketMatch` 업데이트 + `MatchResult` 2건 생성 + `Fighter` 캐시 갱신 + (선택) 알림. 단일 트랜잭션.
- **결과 수정**: 기존 MatchResult 상태 처리(void/corrected) + 변경 로그 + 캐시 재계산 또는 델타 갱신.
- **대진표 저장**: Match 변경 + `BracketChangeLog` 삽입.

## 7. Seed 전략

`seed.ts`: 역할별 테스트 사용자, 샘플 주최자·체육관·선수, 소규모 대회·디비전, 선택적 bracket/match. 실제 운영 데이터와 분리.

## 8. 마이그레이션 운영

- 초기 스키마를 크게 나누지 않고 하나의 `schema.prisma`에서 관리하되, 팀 규모 커질 때 도메인별 주석 섹션으로 구획.
- 파기적 변경 전 백필 스크립트 계획 문서화.

본 문서는 Prisma 모델 작성 시 단일 참조로 삼고, 코드 리뷰 시 “스냅샷·로그·전적 캐시” 세 가지를 반드시 확인한다.
