# UI·UX 가이드

PC 현장 운영(주최·체육관 관리)과 모바일 현장/관람/동의를 **동등하게** 다룬다. 단일 거대 반응형 컴포넌트 지양.

## 1. 레이아웃 셸

| 컴포넌트 | 용도 |
|----------|------|
| `PublicShell` | 관람자·공개 페이지. 헤더 간결, 라이브/대진표/결과 진입 강조. |
| `DashboardShell` | 역할별 대시보드. 좌측 `Sidebar`, 상단 `Header`. |
| `AppShell` | 최상위 공통(폰트·테마·토스트 등). |
| `MobileBottomNav` | 모바일 전용 하단 네비(fighter/gym/spectator 핵심 탭). |

역할별 대시보드는 **라우트 그룹으로 분리**하고 네비 항목을 공유하지 않는다.

## 2. PC vs Mobile 원칙

### PC 우선 화면

- 테이블 중심(TanStack Table), 필터·정렬·일괄 작업.
- 신청자 관리: 상태·입금·동의·체급 복합 필터.
- 대진표 편집·경기 순서·매트 배정.

### Mobile 우선 화면

- 카드 리스트, 큰 CTA, 한 화면 1~2 주요 행동.
- **선수**: 첫 화면에 **내 다음 경기**(상태·매트·예정 시간).
- **관람자**: 라이브 / 대진표 / 결과 로 즉시 이동.
- **보호자 동의**: 긴 문서 스크롤 + 고정 하단 서명·제출.

### 분리 규칙

- Tailwind `md:` 만으로 UX 동등하면 하나의 컴포넌트 유지.
- 테이블 vs 카드처럼 **패러다임이 다르면 파일 분리**:

예시 네이밍:

- `ApplicationsTableDesktop.tsx` / `ApplicationsCardListMobile.tsx`
- `BracketViewDesktop.tsx` / `BracketViewMobile.tsx`
- `MatchListDesktop.tsx` / `MatchListMobile.tsx`

금지: 모바일에서 PC 테이블을 무한 가로 스크롤로만 보여주기.

## 3. 공개 페이지 IA

- `/` — 행사 목록(예정·진행중 구분).
- `/events/[slug]` — 상세, 신청 기간, 장소, 디비전, 촬영/스트리밍 안내, (로그인 시) 신청 이동.
- `/events/[slug]/brackets` — 공개 대진표. 토너먼트 vs 매치 리스트 UI 분기.
- `/events/[slug]/live` — embed, 매트별 탭, 현재/다음 경기 요약.
- `/events/[slug]/results` — 디비전별·매치별 결과.

공개 영역에서는 **이름·사진·소속·체급·종목·전적·경기 결과** 만 노출. 연락처·생년월일·보호자·서명·IP 등 배제.

## 4. 역할별 대시보드 IA (요약)

### Organizer

- 홈: 신청·입금·동의·대진표·미확정 경기 카운트 위젯.
- 이벤트 마스터: 생성 → 신청 관리 → brackets → matches → live → results.

### Gym

- 홈: 신청 중인 대회, 오늘 경기, 입금·동의 미완료 알림.
- Fighters, Invite Links, Events/Apply, Applications, Records.

### Fighter

- 홈: 다음 경기, 신청 현황, 전적 요약.
- Events, Records(연도·종목 필터는 모바일 필터 칩).

### Admin

- 전역 목록·설정(MVP는 최소 화면 + 확장 여지).

## 5. 디자인 시스템

- **shadcn/ui** (`components/ui`): Button, Form, Dialog, Sheet, Tabs, Table 등.
- **토큰**: Tailwind 테마 일관 색상·간격. 상태별 의미 색은 Badge와 매핑.

## 6. 공통 컴포넌트 매핑

| 모듈 | 컴포넌트 |
|------|----------|
| 상태 | `EventStatusBadge`, `ApplicationStatusBadge`, `PaymentStatusBadge`, `MatchStatusBadge`, `ConsentStatusBadge` |
| 선수 | `FighterAvatar`, `FighterCard`, `FighterRecordSummary`, `FighterSnapshotCard` |
| 경기 | `MatchCard`, `MatchResultCard`, `MatchStatusControl` |
| 대진표 | `TournamentBracketView`, `MatchListView`, `BracketEditor`, `MatchEditor` |
| 폼 | `EventForm`, `FighterForm`, `ApplicationForm`, `ConsentForm`, `PaymentSettingForm`, `LiveStreamForm` |
| 업로드 | `ImageUploader`, `ProfileImageUploader`, `SignatureUploader`( 실제 서명은 `SignaturePad` ) |

## 7. 폼·검증

- React Hook Form + Zod. 스키마는 `lib/validators` 에 도메인별 분리.
- 서버에서 동일 Zod(또는 공유 타입) 재검증.

## 8. 데이터 로딩

- TanStack Query: 클라이언트 패칭·캐시·invalidate.
- 실시간 이벤트 수신 후 관련 query key 무효화.

## 9. 접근성·현장 사용성

- 터치 타겟 최소 44px 권장.
- 동의서: 단계별 진행 표시, 서명 영역 명확 구분.
- 대진표 공개 뷰: 자동 새로고침보다 Realtime + 로딩 표시.

## 10. 에러·빈 상태

- `EmptyState` 로 목록 없음 통일.
- 권한 거부는 민감 정보 노출 없이 “접근할 수 없습니다” 수준.

본 문서는 컴포넌트 분할 논쟁 시 **“운영자 테이블 vs 참가자 카드”** 기준으로 판단한다.
