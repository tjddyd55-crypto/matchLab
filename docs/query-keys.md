# TanStack Query 키 및 Invalidation 규칙

클라이언트 데이터 일관성을 위해 **계층적 Query Key**와 **Supabase Realtime 이벤트 → invalidate 매핑**을 표준화한다.

원칙:

- DB 커밋 후에만 Realtime 이벤트를 신뢰한다.
- 이벤트 수신 시 **관련 키 전체를 무한정 무효화하지 않고**, 도메인 단위로 최소 범위를 무효화한다.
- 서버가 성공한 직후에는 필요 시 `setQueryData` 로 낙관적 업데이트 가능하나, **실시간 구독이 있는 화면은 invalidate 를 기본**으로 한다.

---

## 1. 키 팩토리 위치

`src/features/*/query-keys.ts` 또는 `src/lib/query-keys.ts` 에 **팩토리 객체**로 정의한다.

예시 패턴(의사 코드):

```typescript
export const queryKeys = {
  events: {
    all: ['events'] as const,
    publicList: () => [...queryKeys.events.all, 'public', 'list'] as const,
    publicDetail: (slug: string) => [...queryKeys.events.all, 'public', 'detail', slug] as const,
    organizerList: (organizerId: string) => [...queryKeys.events.all, 'organizer', organizerId] as const,
  },
  brackets: {
    all: ['brackets'] as const,
    byEvent: (eventId: string) => [...queryKeys.brackets.all, 'event', eventId] as const,
    publicBySlug: (slug: string) => [...queryKeys.brackets.all, 'public', slug] as const,
  },
  // ...
} as const;
```

- 키 배열의 마지막 세그먼트에 **식별자**를 두어 부분 무효화가 가능하게 한다.

---

## 2. 도메인별 기본 키 트리 (MVP)

아래는 **권장 최소 세트**이다.

| 도메인 | 키 예시 | 비고 |
|--------|---------|------|
| Events | `['events','public','list']`, `['events','public','detail',slug]` | 공개 |
| | `['events','organizer',organizerId]` | 대시보드 |
| Divisions | `['events',eventId,'divisions']` | 상세에 포함 가능 |
| Applications | `['events',eventId,'applications']`, `['gyms',gymId,'applications']` | 역할별 파편 |
| Fighters | `['gyms',gymId,'fighters']`, `['fighters',fighterId]` 내부 전용 | 공개 금지 |
| Invite / Registration | `['gyms',gymId,'invite-links']`, `['registrations',submissionId]` | 내부 |
| Brackets | `['events',eventId,'brackets']`, `['brackets',bracketId]` | 운영+공개 |
| Matches | `['brackets',bracketId,'matches']`, `['events',eventId,'matches']` | 매트·순서 UI |
| Results | `['events',eventId,'results']`, `['fighters',fighterId,'results','public']` | 공개 DTO |
| Records summary | `['fighters',fighterId,'record-summary']` | 캐시 필드 표시용 |
| Live | `['events',eventId,'live-streams']`, `['events','public',slug,'live-streams']` | 공개 |
| Notifications | `['notifications',userId]` | 인앱 알림; 행에 선택적 `href`(내부 경로만, 민감 정보 금지) |

---

## 3. Supabase Realtime → Invalidate 매핑

구현 시 **채널 이름·필터**는 스키마와 RLS에 맞춘다. 아래는 **논리 매핑**이다.

### 3.1 Bracket / BracketMatch 변경

**관찰 리소스**: `Bracket`, `BracketMatch` (이벤트·브라켓 단위 구독).

| 실시간 페이로드 요약 | 무효화할 Query Key |
|---------------------|---------------------|
| 브라켓 메타 변경(공개 여부, 상태, 타이틀) | `byEvent(eventId)`, `publicBySlug(slug)`, `bracketId` |
| 매치 배정·순서·매트·상태·스냅샷 | `matches`(해당 bracket/event), 공개 `brackets` 트리 |
| 삭제 | 동상 + 목록 refetch |

### 3.2 MatchResult 확정·수정

**관찰 리소스**: `MatchResult`, `MatchResultChangeLog`(로그 자체는 보통 구독 안 함).

| 변경 | 무효화 |
|------|--------|
| 새 확정 행 생성 | `events/eventId/results`, 해당 `matches`, **공개 results**, 관련 `fighters/*/results`, **record-summary** |
| 결과 수정·void | 동일 + organizer 결과 목록 |

원천 데이터는 `MatchResult` 이므로 **record-summary 무효화는 필수**(캐시 필드와 불일치 방지).

### 3.3 EventApplication / Payment

| 변경 | 무효화 |
|------|--------|
| 신청 상태 변경 | `events/eventId/applications`, `gyms/gymId/applications`, fighter 신청 목록 |
| 입금 상태 변경 | 동일 + 주최자 대시보드 집계 쿼리(카운트 위젯) |

### 3.4 Event 메타·slug·상태

| 변경 | 무효화 |
|------|--------|
| 이벤트 수정 | `publicDetail(slug)`, organizer 목록, 라이브·결과 키 중 slug 의존 항목 |

### 3.5 EventLiveStream

| 변경 | 무효화 |
|------|--------|
| URL·상태 | `live-streams` 관련 키, 공개 라이브 페이지 |

### 3.6 Notification

| 변경 | 무효화 |
|------|--------|
| 새 알림 | `notifications/userId` |

---

## 4. 무효화 깊이 선택 우선순위

1. **정확한 키** (`bracketId`, `eventId`) 가 알려지면 해당 브랜치만 `invalidateQueries`.
2. 알 수 없으면 **`events/eventId/*`** 수준의 중간 노드 무효화.
3. 전역 `refetchType: 'none'` + `setQueryData`는 스파이크 부하 주의.

---

## 5. Server Action 성공 후 클라이언트

- 호출 컴포넌트에서 `queryClient.invalidateQueries` 로 **해당 도메인 키**를 명시적으로 무효화한다.
- 동일 사용자 세션에서 Realtime과 이중 무효화되어도 무방하다(멱등).

---

## 6. 스토리지·업로드

파일 업로드 완료는 Realtime 대신 **업로드 액션 응답**으로 관련 엔티티 키만 무효화한다(예: `fighters`, `applications` 프로필 URL).

---

## 7. 금지

- Realtime 수신만으로 **전적 숫자를 클라이언트에서 가산**하지 않는다 — 반드시 서버 데이터 재조회.
- 관련 없는 `['events']` 전역 무효화를 기본값으로 두지 않는다.

본 문서는 구현 시 `useSubscription` 계층과 함께 코드 주석으로 채널 이름을 연결한다.
