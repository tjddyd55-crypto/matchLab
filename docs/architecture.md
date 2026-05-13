# 아키텍처 개요

격투기 대회 운영 플랫폼은 **도메인 중심 레이어링**과 **클라이언트·서버 경계 명확화**를 전제로 한다. UI는 Next.js App Router, 영속성은 PostgreSQL(Prisma), 인증·파일·실시간은 Supabase를 사용한다.

## 1. 아키텍처 목표

- **확장성**: 결제, 알림톡, 랭킹 등은 MVP에서 제외하되, 포트(인터페이스)·모듈 경계로 추가 비용을 최소화한다.
- **감사 가능성**: 신청·대진표·결과·입금 상태 변경은 이력 없이 일어나지 않는다(규정된 로그·변경 테이블).
- **개인정보 분리**: 공개 뷰 모델과 내부 뷰 모델을 분리하고, API·페이지에서 노출 필드를 명시적으로 통제한다.
- **전적 단일 원천**: `MatchResult`가 원천이며, `Fighter`의 승·패·무는 조회용 캐시다.

## 2. 시스템 구성

```
[Browser]
    │
    ▼
Next.js App Router (RSC + Client Components)
    │
    ├── Server Actions / Route Handlers (API)
    │       └── Services → Repositories → Prisma → PostgreSQL
    │
    ├── Supabase Auth (세션/토큰)
    ├── Supabase Storage (이미지·서명 등)
    └── Supabase Realtime (구독 → 클라이언트에서 invalidate/refetch)
```

- **DB 변경이 선행**되어야 실시간 이벤트가 의미 있다. UI만 바꾸는 낙관적 업데이트는 보조 수단이며, 최종 일관성은 서버·DB 기준이다.

## 3. 디렉터리 역할 (요약)

| 영역 | 위치 | 책임 |
|------|------|------|
| 라우트·페이지 | `src/app/` | 라우팅, 레이아웃, 서버에서의 진입점 호출 |
| 공통 UI | `src/components/ui/`, `src/components/shared/` | shadcn·배지·가드·테이블 래퍼 등 |
| 도메인 UI 조각 | `src/components/domain/<도메인>/` | 특정 도메인에 묶인 표현 컴포넌트 |
| 유스케이스·조합 | `src/features/<도메인>/` | 폼 플로우, 훅, 도메인 단위 기능 |
| 공통 라이브러리 | `src/lib/` | Prisma 클라이언트, Supabase, 권한, 상수, 유효성 |
| 비즈니스 규칙·트랜잭션 | `src/lib/services/` | 유스케이스 오케스트레이션 |
| 데이터 접근 | `src/lib/repositories/` | Prisma 쿼리 캡슐화 |
| 스키마·시드 | `src/prisma/` | 모델·마이그레이션·seed |

**금지**: 페이지·클라이언트 컴포넌트에서 Prisma 직접 호출. 반드시 service/repository 경유.

## 4. 도메인 경계

- **Identity & Tenancy**: `User`, 역할, `Organizer`, `Gym`, `Fighter` 소속 관계.
- **Events**: `Event`, `EventDivision`, 공개 slug, 대회 단위 스트리밍·촬영 설정.
- **Applications**: `EventApplication`, 스냅샷, 결제 설정·입금 상태.
- **Registration & Consent**: 초대 링크, 등록 제출, 보호자 동의(서명 저장소 정책 분리).
- **Brackets & Matches**: `Bracket`(타입별), `BracketMatch`, 스냅샷, 변경 로그.
- **Results & Records**: `MatchResult`, 변경 로그, 파이터 전적 캐시 갱신.
- **Live**: `EventLiveStream`(URL/embed만 MVP).
- **Notifications / Audit**: 알림, 감사 로그(필요 시 액션 단위).

도메인 간 의존 방향: **상위 플로우(예: 결과 확정)** 가 여러 서비스를 호출하되, **저수준 테이블 로직은 해당 repository** 에 둔다.

## 5. 데이터 흐름 패턴

1. **읽기**: Server Component 또는 Route Handler → service → repository → Prisma.
2. **쓰기**: Server Action / POST handler → Zod 검증 → service(트랜잭션) → 이력 테이블 동반 업데이트.
3. **실시간**: DB 커밋 후 Supabase Realtime → 클라이언트에서 TanStack Query `invalidateQueries` 또는 선택적 refetch.

## 6. 스냅샷 전략

- 신청·대진표·결과에는 **당시 표시용 데이터**를 JSON 등으로 스냅샷 저장한다.
- 소속 체육관 변경 후에도 과거 경기·전적 화면은 스냅샷을 우선 표시한다.

## 7. 보안·컴플라이언스 (구조적 대응)

- 공개 API·페이지용 **DTO/selector** 로 필드 화이트리스트.
- 서명·민감 이미지는 **비공개 버킷 + 서버 검증된 단기 URL 또는 인증된 경로**만 허용(MVP에서 공개 URL 금지 원칙 준수).
- 주민등록번호 및 일부 수집 없음 — 스키마·폼에서 필드 자체를 두지 않는다.

## 8. 확장 포인트 (MVP 이후)

| 기능 | 확장 방법 |
|------|-----------|
| 카드 결제 | `payments` feature + 외부 PSP 어댑터, 입금 상태와 동일 상태머신 확장 |
| 알림톡/문자 | `notifications` 발송 어댑터 인터페이스 |
| 랭킹 | `MatchResult` 집계 파이프라인 또는 별도 랭킹 테이블 |
| YouTube OAuth/API | `live-streams` 서비스에 토큰·채널 연동 레이어 추가 |
| QR 체크인 | `events` 또는 `matches` 하위 리소스로 체크인 기록 |

## 9. 개발 순서와 본 문서의 관계

본 프로젝트는 사용자 지정 **13단계 개발 순서**를 따른다. 각 단계별 산출물은 다음 문서와 연결된다.

- 데이터 모델·무결성: `database.md`
- RBAC·라우트 보호: `roles-permissions.md`
- 화면·반응형·PC/모바일 분리: `ui-ux.md`
- MVP 범위·수용 기준: `mvp-scope.md`
- HTTP·Server Action 계약·DTO: `api-contract.md`
- 상태값·전이 규칙: `status-machine.md`
- TanStack Query 키·Realtime 무효화: `query-keys.md`
- Storage·업로드 signed URL·감사 로그 계약: `api-contract.md` §10–11

다음 단계(코드) 진입 전에 본 아키텍처를 기준으로 폴더 생성 및 의존 방향을 검증한다.
