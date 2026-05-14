# API 계약 (Next.js App Router)

본 문서는 **HTTP Route Handler**, **Server Actions**, **서버 전용 데이터 진입점**에 대한 계약을 정의한다. 원칙은 기존 `architecture.md`, `database.md`, `roles-permissions.md`와 동일하다.

## 1. 계층 규칙 (필수)

| 규칙 | 내용 |
|------|------|
| Prisma | **`src/lib/repositories/` 에서만** 호출한다. |
| 쓰기 | **`src/lib/services/`** 에서 트랜잭션으로 처리한다. 변경 이력(`BracketChangeLog`, `MatchResultChangeLog` 등)은 서비스 트랜잭션 안에서 반드시 기록한다. |
| 권한 | **Route Handler 또는 Server Action 최상단**에서 `permissions` / `requireRole` 등으로 검증한 뒤 service를 호출한다. |
| 공개 조회 | 응답은 **`Public*DTO`** 또는 공개 전용 selector로 매핑한다. 민감 필드는 포함하지 않는다. |
| 전적 | 공개 **전적 요약·목록의 원천은 `MatchResult`** 이며, `Fighter.record*` 는 UI 편의용 캐시로만 노출한다(내부 화면에서도 “공식” 상세는 MatchResult 기준 재구성을 권장). |

## 2. 진입점 종류

### 2.1 Route Handler (`src/app/api/**/route.ts`)

- 외부 클라이언트·웹훅·모바일 웹 등 **명시적 HTTP 계약**이 필요할 때 사용한다.
- MVP 기본 패턴: **역할별 대시보드 및 공개 페이지는 RSC + Server Actions** 로 충분한 경우가 많으나, 파일 업로드 완료 콜백·추후 외부 연동을 위해 `api/` 네임스페이스를 유지한다.

### 2.2 Server Actions (`actions` 또는 `features/*/actions.ts`)

- 폼 제출·토글·상태 변경 등 **동일 출처 POST** 에 적합하다.
- 시그니처: `(input: unknown) => Promise<ActionResult<T>>` 형태를 권장하고, 내부에서 Zod 파싱 실패 시 표준 에러 객체를 반환한다.

### 2.3 서버 컴포넌트 직접 호출

- 읽기 전용 목록·상세는 페이지/레이아웃에서 **service의 read 메서드**를 직접 호출할 수 있다. 이때도 Prisma는 거치지 않는다.

## 3. 이름·버전 규칙

- URL 경로는 **복수 리소스명 + 명사** (`/api/events`, `/api/events/[eventId]/applications`).
- Server Action 함수명은 **동사 + 도메인** (`approveApplication`, `publishBracket`, `confirmMatchResults`).
- 공개 API 응답 스키마 변경 시 **버전 접두사**가 필요해지면 `/api/v2/...` 또는 `Accept` 헤더 협상을 도입한다(MVP는 단일 버전).

## 4. DTO 분리

### 4.1 Public DTO (필수 대상)

다음 조회·변형은 **항상 Public 매핑**을 거친다.

- `GET /events` 공개 목록·상세(slug)
- 공개 `brackets`, `matches`(경기 카드), `results`
- 공개 `live-streams`
- 관람자·비로그인 접근 가능한 모든 응답

**포함 가능(예시)**: 선수명, 공개 프로필 이미지 URL, 소속 체육관명, 체급·종목·전적 요약, 경기 결과 요약.

**제외(금지)**: 휴대폰, 생년월일, 주소, 보호자 정보, 내부 메모, 서명 이미지 URL, IP, User-Agent, 주민번호 관련 모든 필드.

### 4.2 Internal DTO

주최자·체육관·관리자 대시보드 전용. 민감 정보 포함 가능하나 **역할·소속 범위**를 service에서 제한한다.

### 4.3 Fighter / Snapshot

- 공개 대진표·결과 카드는 **`BracketMatch`의 red/blue 스냅샷** 또는 공개 전용 `PublicFighterCard` DTO만 사용한다.
- 신청서 원본 `Fighter` 레코드 전체를 공개 엔드포인트로 넘기지 않는다.

## 5. 표준 응답 envelope

### 5.1 Route Handler JSON

```typescript
// 성공
{ "data": T, "meta"?: { ... } }

// 실패
{ "error": { "code": string, "message": string, "details"?: unknown } }
```

- `code`: 기계 판별용 (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `INTERNAL` 등).
- 민감한 DB/스택 정보는 `message`에 노출하지 않는다.

### 5.2 Server Action

- 동일한 `ActionResult<T>` 타입을 재사용하여 클라이언트에서 토스트·폼 에러 매핑을 일관화한다.

## 6. 주요 리소스별 계약 개요 (MVP)

아래는 **의미 단위** 목록이다. 실제 경로는 구현 시 `src/app/api` 및 Server Actions 파일로 고정한다.

| 도메인 | 공개 읽기 | 인증 읽기 | 쓰기(요약) |
|--------|-----------|-----------|------------|
| Events | slug 목록·상세(Public) | 주최자·관리자 전체 | organizer/admin: 생성·수정·상태 |
| Divisions | 공개 상세 내 포함 | 동일 | organizer: CRUD |
| Applications | 없음 | gym: 본인 신청, organizer: 본인 이벤트 | gym: 신청, organizer: 승인/반려, 입금 반영 |
| Fighters | 없음(카드는 스냅샷 경유) | gym/fighter/admin | gym: 등록·승인 파이프라인 |
| Invite / Registration | 토큰 기반 제출(제한적 Public 폼) | gym | gym: 링크 생성 |
| Consent | 없음 | gym/organizer 내부 | 제출·연결(서명 URL 비공개) |
| Brackets | 공개 published | organizer 운영 | 생성·편집 시 **BracketChangeLog** |
| Matches | 공개(운영 데이터) | organizer | 상태·배정 변경 시 로그 정책 준수 |
| Results / Records | 공개 결과(Public) | fighter/gym/organizer | 확정·수정 시 **MatchResult** + **MatchResultChangeLog** |
| Live | 공개 embed 메타 | organizer | URL CRUD |
| Uploads | 없음 또는 서명된 업로드 정책 | 역할별 | Storage 업로드는 서버 검증 |

## 7. 쓰기 유스케이스와 이력 (서비스 책임)

서비스 메서드 예시(이름은 구현 시 확정):

- `saveBracketDraft` / `publishBracket` / `updateBracketMatches` → 트랜잭션 내 매치 변경 + **`BracketChangeLog`** (before/after JSON, reason).
- `recordMatchOutcomeDraft` → 매치 필드 임시 저장(전적·MatchResult 없음).
- `confirmMatchResults` → **`MatchResult` 2행 생성**, 매치와 일관성, **`Fighter` 캐시 재계산**.
- `correctMatchResult` → 기존 결과 상태 처리 + **`MatchResultChangeLog`** + 캐시 재계산.

**금지**: Route Handler / Action에서 Prisma 트랜잭션으로 위 로직을 직접 구현하고 로그 누락.

## 8. 인증·세션

- Supabase Auth 세션을 서버에서 검증한 후 `ActorContext`(userId, role, organizerId?, gymId?, fighterId?)를 service에 전달한다.
- **로그인**: `signInWithPasswordAction` — anon `signInWithPassword` 후 `authService.getActorByAuthUserId`로 DB 매핑 확인. 매핑 없으면 세션 제거 + `ActionResult` 오류(`FORBIDDEN`, 고정 메시지). **service role로 로그인 처리 금지.**
- **로그아웃**: `signOutAction` — anon `signOut` 후 `/login` 안내.
- **spectator** 는 세션 없음; 공개 라우트만 허용.

## 9. 실시간과 API의 관계

- API 성공 응답만으로 UI를 영구 확정하지 않는다. 구독 클라이언트는 `query-keys.md` 규칙에 따라 invalidate 한다.
- DB 커밋 없는 브로드캐스트는 금지이다.

## 10. 업로드·서명 URL 계약 (Supabase Storage)

### 10.1 스토리지·버킷

- **모든 프로필·신청 이미지·서명 이미지는 Supabase Storage `private` bucket** 에 저장한다.
- 객체는 **추측 불가능한 경로**(예: `gym/{gymId}/fighters/{fighterId}/profile/{uuid}.webp`)를 사용하고, **공개 ACL·영구 공개 URL 금지**이다.
- 클라이언트가 버킷 정책만으로 임의 읽기·쓰기하지 않는다. **업로드·조회는 모두 서버 검증 후 signed URL** 로만 허용한다.

### 10.2 대상 자산 (MVP)

| 유형 | 설명 | DB 연결(예시) |
|------|------|----------------|
| 선수 프로필 이미지 | 체육관이 소속 선수 프로필을 등록·수정할 때 | `Fighter.profileImageUrl` 등 내부 참조 |
| 대회 신청 당시 프로필 이미지 | 신청 시점 컷을 분리 보관할 때 | `EventApplication.applicationProfileImageUrl` |
| 보호자 동의서 손사인 | 동의서 전자서명 이미지 | `GuardianConsent.signatureImageUrl` |

서명·민감 이미지는 **어떤 공개 API·Public DTO에도 절대 포함하지 않는다.**

### 10.3 발급 진입점

업로드용 **signed URL 발급**은 Route Handler 또는 Server Action 중 하나로 통일해 팀 컨벤션을 정한다. 권장 패턴:

| 권장 이름 | 역할 |
|-----------|------|
| `createProfileImageUploadUrl` | 프로필 이미지 업로드용 PUT/POST signed URL + 허용 MIME·최대 크기 메타 |
| `createApplicationImageUploadUrl` | 특정 `eventId` 신청 컨텍스트에서 신청 프로필 이미지 업로드 |
| `createConsentSignatureUploadUrl` | 특정 동의서 제출 플로우에서 서명 이미지 업로드 |
| `getPrivateFileSignedUrl` | 이미 저장된 **private 객체**에 대한 단기 **읽기(download/preview)** signed URL |

### 10.4 권한 검증 (진입부 필수)

signed URL 발급 전에 **Route Handler 또는 Server Action 최상단**에서 다음을 검증한다.

- **role**: `admin` / `organizer` / `gym` / `fighter` / 토큰 기반 제출(등록·동의 폼) 등 컨텍스트별 허용 매트릭스.
- **gymId**: 해당 Gym 소유·소속 선수·신청만 허용.
- **fighterId**: 프로필·신청 이미지 경로가 해당 파이터와 일치하는지.
- **eventId**: 신청 이미지는 해당 이벤트·디비전 신청 권한이 있는 경우만.

토큰 기반 공개 폼은 **User 세션이 없어도** `invite token + 서버측 검증`으로 동등한 범위 검증을 수행한다.

### 10.5 Signed URL 만료 시간 (권장)

| 용도 | 만료(권장) | 비고 |
|------|------------|------|
| 업로드 URL | 60초 ~ 15분 | 짧을수록 유출 피해 축소 |
| 내부 미리보기/다운로드 (`getPrivateFileSignedUrl`) | 1분 ~ 10분 | organizer/gym 대시보드에서만 사용 |
| 동의 서명 이미지 조회 | 1분 ~ 5분 | 보호자·서명 데이터는 최소 노출 |

운영 정책에 따라 조정하되, **장기 무제한 URL 금지**.

### 10.6 업로드 완료 후 Query 무효화

업로드 완료는 Storage 웹훅이 아니라 **클라이언트가 업로드 성공 후** 또는 **다음 Server Action(예: 저장 확인)** 성공 시 다음을 무효화한다(`query-keys.md` 와 정합).

- 프로필: `['gyms', gymId, 'fighters']`, `['fighters', fighterId]`(내부)
- 신청 이미지: `['events', eventId, 'applications']`, `['gyms', gymId, 'applications']`
- 서명: 동의서 목록·신청 상세 등 organizer/gym 내부 키 (공개 키와 혼동 금지)

Realtime 구독 화면은 별도로 **관련 bracket/application 구독 시 invalidate** 규칙을 따른다.

### 10.7 공개 페이지·Public DTO 재확인

**절대 노출 금지**: 서명 이미지 URL, 보호자 성명·연락처·관계 등 보호자 정보, IP 주소, User-Agent.

공개 대진표·결과에 필요한 선수 이미지는 **`BracketMatch` 스냅샷 등 공개 파이프라인**으로만 제공하고, Storage **직링크·서명 URL을 내려주지 않는다**(필요 시 공개용 변환·별도 공개 가능 파생본 정책은 2차; MVP는 스냅샷에 허용된 URL만).

---

## 11. AuditLog와 도메인별 변경 로그 사용 기준

서비스 계층에서 **상태·구조·결과를 바꾸는 모든 메서드**는 아래 기준에 따라 **도메인 로그 또는 AuditLog(또는 병행)** 를 남긴다. **로그 없이 상태만 변경하는 service 메서드는 금지**이다.

| 변경 성격 | 우선 로그 | AuditLog 병행 |
|-----------|-----------|----------------|
| `Bracket`/`BracketMatch` 구조·배정·순서·매트·승자(진출)·결방식·취소 등 운영 데이터 | **`BracketChangeLog`** (`beforeData`/`afterData`, `changeType`) | 중요 운영(공개 해제, 전체 리셋 등) 시 권장 |
| `MatchResult` 확정 이후 수정·무효·정정 | **`MatchResultChangeLog`** (+ MatchResult 상태 전이) | 무효·관리자 정정 시 권장 |
| `Event` 상태 전이·slug 등 메타·민감 설정 | **`AuditLog`** | 도메인 전용 테이블이 없으면 필수 |
| 사용자 역할·권한·소속 변경, 로그인 세션 이상 조치 | **`AuditLog`** | 필수 |
| 관리자·시스템 설정(플랫폼 전역) 변경 | **`AuditLog`** | 필수 |
| 신청·입금 상태 변경 | `EventApplicationPayment` 시퀀스 + Application 캐시 동기화(`status-machine.md`) | 주최자 입금 확정·환불 등 고위험 작업은 **AuditLog 권장** |
| 대진표가 아닌 단순 알림 읽음 | 없음(Notification `readAt`만) | 불필요 |

**요약 규칙**

- 대진표·매치 **구조/배정/승자(브라켓 의미)** 변경 → **`BracketChangeLog` 우선**.
- **공식 전적에 영향**하는 결과 변경 → **`MatchResultChangeLog` 우선**.
- **테넌트·보안·시스템** 차원 이벤트 → **`AuditLog`**.
- 영향이 큰 작업(브라켓 전체 리셋, 결과 무효, 이벤트 취소)은 **도메인 로그 + `AuditLog` 병행 가능**.

상세 `changeType` 목록은 `status-machine.md` 의 **`BracketChangeLog.changeType`** 절을 따른다.

---

## 12. Webhooks (`src/app/api/webhooks/**`)

MVP에서는 미사용 가능. 자리만 두고, 호출 시 서명 검증 → **idempotent** 처리 → service 위임 패턴을 문서화한다.

---

본 계약은 구현 전 코드 리뷰 체크리스트로 사용한다: **권한(진입부) → Zod → service → repository → DTO 매핑**.
