# 역할 및 권한

플랫폼 역할은 **User.role** 기준 5종: `admin`, `organizer`, `gym`, `fighter`, `spectator`(비로그인은 세션 없음으로 처리).

역할 판단은 **항상 서버**에서 `getCurrentActor()` → `authService.getActorByAuthUserId(Supabase user.id)`로 조회한 `ActorContext`를 따른다. 클라이언트 `localStorage` 등에 역할을 저장해 판단하지 않는다.

## 1. 역할 정의

### admin

- 전체 대회·주최자·체육관·선수·신고·시스템 설정 관리.
- 플랫폼 최상위 권한. 운영 정책상 모든 리소스 읽기/조정 가능(세부는 AuditLog).

### organizer

- **본인이 소유한 Organizer 프로필** 과 연결된 `Event` 에 대한 전 권한.
- 대회 공고 CRUD, 신청 검토·승인/반려, 입금 확인, 대진표 편집·공개, 경기 운영, 결과 입력·확정, 라이브 URL 설정.

### gym

- **본인 Gym** 과 소속 `Fighter` 관리, 초대 링크 발급, 등록 승인.
- 공개된 대회에 대한 신청·신청 내역·입금 상태 조회(본 Gym 관련만).
- 대진표/결과/전적 조회는 **본인 소속 선수·본 Gym 신청 범위** 로 제한.

### fighter

- 연결된 `Fighter` 레코드 기준 **본인** 신청·대진·결과·전적 조회.
- 주로 조회 주체; 신청 주체는 체육관 중심 MVP.

### spectator

- 비로그인. **공개 slug** 로 허용된 이벤트 메타·대진표·결과·라이브만 접근.
- 개인정보 필드는 응답 스키마에서 제외(서명·연락처·생년월일 등 금지).

## 2. 리소스별 권한 매트릭스 (MVP)

| 리소스 | admin | organizer | gym | fighter | spectator |
|--------|:-----:|:---------:|:---:|:-------:|:---------:|
| 공개 Event 페이지 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 내부 대시보드 홈 | ✓ | 역할별 | 역할별 | 역할별 | ✗ |
| Event CRUD | 전체 | 본인 organizer 이벤트만 | ✗ | ✗ | ✗ |
| 신청 목록/승인 | 전체 | 본인 이벤트 | ✗ | ✗ | ✗ |
| 입금 상태 변경 | 전체 | 본인 이벤트 | ✗ | ✗ | ✗ |
| Bracket 편집·공개 | 전체 | 본인 이벤트 | ✗ | ✗ | ✗ |
| Match 상태·결과 입력 | 전체 | 본인 이벤트 | ✗ | ✗ | ✗ |
| 결과 확정(MatchResult) | 전체 | 본인 이벤트 | ✗ | ✗ | ✗ |
| Gym/Fighter 관리 | 전체 | ✗ | 본인 Gym | 본인 Fighter 프로필 일부 | ✗ |
| 초대 링크·등록 승인 | 전체 | ✗ | 본인 Gym | ✗ | ✗ |
| 대회 신청(선수 선택) | 전체 | ✗ | 본인 Gym | ✗ | ✗ |
| 선수 전적 조회 | 전체 | 규정상 필요 시 | 소속 선수 | 본인 | 공개 전적만 |

## 3. 헬퍼 함수 (구현 계약)

`src/lib/permissions.ts` 에 다음 논리를 일관되게 구현한다.

| 함수 | 설명 |
|------|------|
| `requireRole(user, allowedRoles)` | 세션 없거나 역할 불일치 시 거부(redirect 또는 403). |
| `requireOrganizerForEvent(user, eventId)` | 해당 이벤트의 organizer 소유 검증. |
| `requireGymOwner(user, gymId)` | Gym 소유자 또는 위임된 역할 검증(MVP는 owner 중심). |
| `canManageEvent(user, eventId)` | organizer 이벤트 또는 admin. |
| `canViewFighter(user, fighterId)` | admin / 해당 gym 소속 관리자 / 본인 fighter / (공개 DTO만 제공 시 spectator 경로는 별도). |
| `canConfirmResult(user, eventId)` | 해당 이벤트 organizer 또는 admin. |
| `toPublicFighterDTO(fighter \| snapshot)` | 공개 가능 필드만 매핑. |

서버 액션·Route Handler 진입부에서 **항상** 권한 검사 후 service 호출.

## 4. 라우트 보호 전략 (App Router)

- **`(dashboard)/organizer/*`**: organizer 또는 admin.
- **`(dashboard)/gym/*`**: gym 또는 admin.
- **`(dashboard)/fighter/*`**: fighter 또는 admin.
- **`(dashboard)/admin/*`**: admin만.
- **`(auth)/*`**: 로그인 상태면 역할별 기본 대시보드로 리다이렉트 검토.
- **`(public)/*`**: 인증 선택적; 데이터는 public DTO만.

구현 패턴:

1. 레이아웃 또는 페이지 서버 컴포넌트에서 세션 조회(Supabase).
2. `permissions` 로 검증 실패 시 `notFound()` 또는 `redirect('/login')` (정보 노출 최소화 정책에 따라 선택).

클라이언트용 `RoleGuard` 는 UX용 이중 잠금이며, **권한의 최종 판단은 서버** 에서만 신뢰한다.

## 5. 데이터 접근과 권한의 분리

- **Repository**: “쿼리 가능 여부”를 가정하지 않고 순수 데이터 접근.
- **Service**: 호출자 역할·조직 소속을 인자로 받아 범위 제한(예: `listApplicationsForEvent(actor, eventId)`).
- 페이지는 서비스에 `actor` 전달만 담당.

## 6. 개인정보·공개 API

- spectator 및 공개 페이지용 메서드 네이밍 규칙: `getPublicEventBySlug`, `listPublicBrackets` 등으로 **민감 필드 제거를 강제**.
- organizer/gym 대시보드용 메서드는 별도 `…Internal` 또는 동일 엔티티라도 selector 분리.

## 7. 확장 시 고려

- 한 사용자가 organizer이면서 gym인 경우: MVP에서는 **단일 active role** 또는 URL 네임스페이스 분리 `/organizer` vs `/gym`.
- 세분화된 RBAC(예: 스태프 계정)은 `OrganizerMember`, `GymStaff` 테이블 도입 시 확장.

본 문서는 API·Server Action 작성 시 체크리스트로 사용한다.
