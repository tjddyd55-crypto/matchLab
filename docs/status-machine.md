# 상태 머신 및 전이 규칙

본 문서는 MVP 범위 내 **허용 상태값**과 **합법적인 전이**를 정의한다. 구현 시 Prisma `enum` 및 `lib/enums.ts` 와 **단일 출처**로 동기화한다.

공통 원칙:

- 상태 문자열을 UI·API에 하드코딩하지 않는다.
- **전적 반영**은 `MatchResult.status === confirmed`(및 정책에 따른 corrected 처리)와 서비스 로직으로만 발생한다.
- 대진표 구조·배정 변경은 **`BracketChangeLog`** 와 함께 커밋된다.
- 결과 수정은 **`MatchResultChangeLog`** 와 함께 커밋된다.

---

## 1. EventStatus

**값**: `draft` → `open` → `closed` → `bracket_ready` → `ongoing` → `finished` ; `cancelled` 는 특수 종료.

### 1.1 의미

| 상태 | 의미 |
|------|------|
| draft | 작성 중, 비공개 또는 제한 공개 |
| open | 신청 접수(정책에 따라 공개 페이지 노출) |
| closed | 신청 마감(미승인 처리 정책은 서비스 규칙) |
| bracket_ready | 대진표 작업 허용 강조(운영 플래그, 선택적) |
| ongoing | 대회 당일 운영 |
| finished | 종료·기록 유지 |
| cancelled | 폐지·환불 안내 등 운영 처리(결과·전적 정책은 서비스에서 명시) |

### 1.2 권장 전이

```
draft ──► open ──► closed ──► bracket_ready ──► ongoing ──► finished
   │        │         │              │             │
   └────────┴─────────┴──────────────┴─────────────┴──► cancelled (조건부)
```

- 뒤로 가는 전이(예: `finished` → `ongoing`)는 **admin 또는 명시적 보정 플로우** 만 허용하고 `AuditLog` 권장.
- `cancelled` 이후 재개는 MVP에서는 비권장(필요 시 admin만).

---

## 2. ApplicationStatus (`EventApplication.status`)

**값**: `pending`, `approved`, `rejected`, `cancelled`.

### 2.1 전이

```
pending ──► approved
    │            │
    ├──► rejected
    │
    └──► cancelled (gym 또는 organizer 정책)
```

- `approved`된 신청만 bracket 편성 대상(주최자 규칙).
- `rejected`/`cancelled`는 대진표 편성 제외; 이미 편성된 경우 **Bracket 편집 서비스**에서 별도 처리(매치 제거·부전승 등) + **`BracketChangeLog`**.

---

## 3. PaymentStatus

동일한 이름이 **`EventApplication.paymentStatus`** 와 **`EventApplicationPayment.paymentStatus`** 에 등장할 수 있다.

### 3.1 값

`unpaid`, `pending_check`, `paid`, `refunded`, `waived`.

### 3.2 단일 진실 원천 원칙 (권장)

| 레이어 | 역할 |
|--------|------|
| `EventApplicationPayment` | 입금 **이벤트 시퀀스**(금액·입금자명·확인자·시각)의 진실 |
| `EventApplication.paymentStatus` | 대시보드·필터 속도를 위한 **집계 캐시**(마지막 확정 상태 미러) |

**규칙**: 입금 확인/취소 서비스는 트랜잭션으로 Payment 행을 갱신하고 Application 캐시 필드를 동기화한다. 둘이 불일치하면 버그로 간주한다.

### 3.3 전이 (한 레코드 기준)

```
unpaid ──► pending_check ──► paid
   │            │
   │            └──► unpaid (입금자 수정 등)
   │
paid ──► refunded
any ──► waived (주최자 면제)
```

---

## 4. BracketType / BracketStatus

### 4.1 BracketType (불변 권장)

`single_elimination`, `match_list` — 생성 후 변경 금지(MVP). 변경 필요 시 새 bracket 생성 + 로그.

### 4.2 BracketStatus

**값**: `draft`, `published`, `ongoing`, `finished`.

```
draft ──► published ──► ongoing ──► finished
```

- `published` 이후 공개 페이지 노출(`isPublic` 과 함께 정책 결합).
- `draft`에서 편집 시에도 구조 변경은 **`BracketChangeLog`** (저장 단위는 서비스에서 정의: 배치 저장 vs 매 변경).

---

## 5. BracketMatchStatus

**값**: `waiting`, `called`, `ongoing`, `finished`, `delayed`, `cancelled`.

### 5.1 권장 전이

```
waiting ──► called ──► ongoing ──► finished
    │                       │
    └──► delayed ───────────┘
    │
    └──► cancelled (대진표에서 제외·무효)
```

- `finished`는 경기 종료**운영** 상태이며, **전적 반영은 별도** `confirmMatchResults` 플로우다.
- `cancelled` 매치는 `MatchResult` 생성 안 함(MVP 기본).

---

## 6. MatchResult — 결과 타입 vs 레코드 상태

### 6.1 `MatchResult.result` (선수 관점)

`win`, `loss`, `draw`, `no_contest`.

### 6.2 `BracketMatch.resultType` (경기 결방식)

`decision`, `ko`, `tko`, `submission`, `disqualification`, `walkover`, `forfeit`, `draw`, `no_contest` 등 스키마 확정값과 일치.

### 6.3 `MatchResult.status`

**값**: `pending`, `confirmed`, `corrected`, `voided`.

```
pending ──► confirmed
               │
               ├──► corrected (수정됨, 새 로그)
               └──► voided (무효, 전적에서 제외·역산은 서비스 규칙)
```

- **전적 캐시 갱신**은 `confirmed` 및 `corrected`의 최종 해석에만 적용한다(`voided`는 역산).
- 동일 매치에 대한 재확정 시 기존 행을 **조용히 덮어쓰지 않는다**(로그 + 상태 전이).

---

## 7. FighterRegistrationSubmission.status

스키마 확정 전이라면 다음과 같은 **권장 세트**로 통일한다:

`submitted`, `duplicate_review`, `approved`, `rejected`.

```
submitted ──► duplicate_review ──► approved │ rejected
```

승인 시 `Fighter` 생성 및 `fighterCode` 발급은 **단일 트랜잭션**으로 처리한다.

---

## 8. GymInviteLink.status

권장: `active`, `paused`, `expired`, `revoked`.

- 사용 횟수·만료 시 `expired` 자동 전이(배치 또는 조회 시 lazy).

---

## 9. GuardianConsent.consentStatus

권장: `draft`, `completed`, `revoked`(운영), `superseded`(재서명).

- 공개 API에는 상태조차 필요하면 최소 필드만.

---

## 10. EventLiveStream.status

**값**: `scheduled`, `live`, `ended`, `hidden`.

```
scheduled ──► live ──► ended
     │
     └──► hidden
```

---

## 11. Notification / AuditLog

- `Notification` 은 읽음 여부만 상태로 두며(`readAt`), 도메인 상태머신과 분리한다.
- **`AuditLog` 와 `BracketChangeLog` / `MatchResultChangeLog` 의 역할 분담·병행 기준**은 `api-contract.md` **§11 AuditLog와 도메인별 변경 로그 사용 기준**을 따른다.

---

## 12. BracketChangeLog.changeType 권장 목록

Prisma·`lib/enums.ts` 에 동일 이름으로 옮길 때 **`BracketChangeLog`** 전용 enum 으로 명명한다(예: `BracketChangeType`). 아래 **Realtime 무효화 요약**은 `query-keys.md` 의 이벤트·브라켓 트리와 정합시킨다.

| changeType | 의미 | 주로 발생하는 화면 | reason | Realtime invalidate 요약 |
|------------|------|-------------------|--------|--------------------------|
| `bracket_created` | 이벤트 하위에 새 `Bracket` 레코드가 생성됨 | 주최자 · 대진표 생성 마법사 | 선택 | `events/{eventId}/brackets`, organizer 브라켓 목록 |
| `bracket_published` | `Bracket` 가 공개 상태로 전환되거나 공개 플래그가 켜짐 | 주최자 · 대진표 공개 | 권장 | 공개 `brackets`(slug)·`byEvent`, 해당 `bracketId` |
| `bracket_unpublished` | 공개 해제·비공개 전환 | 주최자 · 공개 설정 | **필수** | 공개·내부 브라켓 트리 전반 |
| `fighter_assigned` | 매치 코너(red/blue)에 선수 배정 | 주최자 · 대진표 편집기 | **필수** | 해당 `brackets/{bracketId}/matches`, 이벤트 단위 matches, 공개 대진표 |
| `fighter_removed` | 배정된 선수가 코너에서 제거됨 | 주최자 · 대진표 편집기 | **필수** | 동상 |
| `opponent_changed` | 한 코너 또는 양측의 대전 상대 구성이 바뀜(배정 교체 포함) | 주최자 · 대진표 편집기 | **필수** | 동상 |
| `bye_assigned` | 부전승 처리로 진출 연결·코너 비움 등 반영 | 주최자 · 토너먼트 편집 | **필수** | 브라켓 트리·matches·공개 대진표 |
| `match_order_changed` | 동일 라운드 내 `matchOrder` 등 부분 순서 변경 | 주최자 · 경기 순서(매치 리스트·라운드 내) | 권장 | 해당 bracket matches, 공개 카드 순서 |
| `global_order_changed` | `globalMatchOrder` 등 대회 전체 흐름 번호 변경 | 주최자 · 경기 순서 관리 | 권장 | 이벤트·브라켓 matches, 공개 순서 뷰 |
| `mat_changed` | `matNumber`(매트 배정) 변경 | 주최자 · 현장 운영·매트 배정 | 선택(현장 속도) — 구조 영향 시 권장 | matches, 공개 현장 뷰 |
| `match_status_changed` | `BracketMatchStatus`(waiting/called/ongoing/finished/delayed 등)만 변경 | 주최자 · 현장 운영 | 선택 | 해당 이벤트·브라켓 matches, 공개 경기 상태 |
| `winner_changed` | 토너먼트 진행 상 **진출 승자·연결 슬롯**이 바뀜(next 슬롯·winnerId 등 브라켓 의미) | 주최자 · 대진표 편집·결과 입력(브라켓 연동) | **필수** | 브라켓 전체 일관성 필요 구간 무효화(트리+matches) |
| `result_type_changed` | 매치의 기술적 결방식 필드(`BracketMatch.resultType`) 변경 | 주최자 · 결과 입력 패널 | **확정 전 필수**, 현장 단순 수정은 권장 | matches; **공식 전적 반영 후**는 `MatchResult` 플로우·로그와 중복 없게 서비스에서 단일 책임 유지 |
| `match_cancelled` | 매치가 취소·무효 처리되어 브라켓에서 제외 또는 cancelled 상태 | 주최자 · 대진표·운영 | **필수** | matches·공개 브라켓(해당 매치)·연결된 다음 매치 |
| `bracket_reset` | 브라켓 또는 이벤트 단위 **대규모 초기화**(매치·배정 리셋) | 주최자 · 위험 조작·관리자 보조 | **필수** | 이벤트 `brackets`·모든 관련 matches·공개 대진표; 필요 시 organizer 대시보드 집계 |

**notes**

- `winner_changed` 와 `result_type_changed` 는 **`BracketMatch` 운영 데이터** 로깅용이다. **공식 전적 확정·정정**은 반드시 **`MatchResult` + `MatchResultChangeLog`** 로 처리한다(중복 기록은 피하되, 브라켓 필드 수정과 전적 확정이 같은 트랜잭션에서 일어날 때 각 로그의 책임만 명확히 한다).
- `reason` 은 운영 감사 품질용이다. **필수** 행에서 비어 있으면 코드 리뷰 불통과.

---

## 13. 충돌 방지 메모

| 주제 | 규칙 |
|------|------|
| 매치 `finished` vs MatchResult | 운영 종료와 공식 전적 확정을 분리한다. |
| 신청 `approved` vs 입금 `paid` | 주최자 규칙으로 “둘 다 만족 시에만 편성” 등을 서비스에서 강제한다. |
| 동일 이름의 PaymentStatus | Application vs Payment 행의 역할을 혼동하지 않는다(3절). |

본 문서는 테스트 시 **허용 전이 표**로 변환해 테이블 기반 테스트를 작성할 것을 권장한다.
