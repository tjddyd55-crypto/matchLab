/**
 * TanStack Query 키 팩토리 (`query-keys.md`).
 * Realtime 수신 시 동일 세그먼트를 invalidate 한다.
 */

export const queryKeys = {
  events: {
    all: ["events"] as const,
    publicList: () => [...queryKeys.events.all, "public", "list"] as const,
    publicDetail: (slug: string) =>
      [...queryKeys.events.all, "public", "detail", slug] as const,
    organizerList: (organizerId: string) =>
      [...queryKeys.events.all, "organizer", organizerId] as const,
    dashboardCounts: (organizerId: string) =>
      [...queryKeys.events.all, "organizer", organizerId, "counts"] as const,
  },
  divisions: {
    all: ["divisions"] as const,
    byEvent: (eventId: string) =>
      [...queryKeys.divisions.all, "event", eventId] as const,
  },
  applications: {
    all: ["applications"] as const,
    byEvent: (eventId: string) =>
      [...queryKeys.applications.all, "event", eventId] as const,
    byGym: (gymId: string) =>
      [...queryKeys.applications.all, "gym", gymId] as const,
  },
  gyms: {
    all: ["gyms"] as const,
    detail: (gymId: string) => [...queryKeys.gyms.all, gymId] as const,
  },
  fighters: {
    all: ["fighters"] as const,
    byGym: (gymId: string) =>
      [...queryKeys.fighters.all, "gym", gymId] as const,
    detail: (fighterId: string) =>
      [...queryKeys.fighters.all, fighterId] as const,
    recordSummary: (fighterId: string) =>
      [...queryKeys.fighters.all, fighterId, "record-summary"] as const,
    resultsPublic: (fighterId: string) =>
      [...queryKeys.fighters.all, fighterId, "results", "public"] as const,
  },
  brackets: {
    /** 브래킷/매치 서버 액션 성공 시 `router.refresh()` 또는 `invalidateQueries` 후보 (`docs/query-keys.md`). */
    all: ["brackets"] as const,
    byEvent: (eventId: string) =>
      [...queryKeys.brackets.all, "event", eventId] as const,
    detail: (bracketId: string) =>
      [...queryKeys.brackets.all, bracketId] as const,
    publicBySlug: (slug: string) =>
      [...queryKeys.brackets.all, "public", slug] as const,
  },
  matches: {
    all: ["matches"] as const,
    byBracket: (bracketId: string) =>
      [...queryKeys.matches.all, "bracket", bracketId] as const,
    byEvent: (eventId: string) =>
      [...queryKeys.matches.all, "event", eventId] as const,
  },
  results: {
    /** MatchResult 생성·정정·무효 시 `byEvent` / `publicBySlug` 및 전적 요약 무효화 */
    all: ["results"] as const,
    byEvent: (eventId: string) =>
      [...queryKeys.results.all, "event", eventId] as const,
    publicBySlug: (slug: string) =>
      [...queryKeys.results.all, "public", slug] as const,
  },
  records: {
    /** 전적 캐시·MatchResult 변경 시 fighter / gym 레코드 무효화 */
    all: ["records"] as const,
    byFighter: (fighterId: string) =>
      [...queryKeys.records.all, "fighter", fighterId] as const,
    byGym: (gymId: string) =>
      [...queryKeys.records.all, "gym", gymId] as const,
    summaryByFighter: (fighterId: string) =>
      [...queryKeys.records.all, "summary", fighterId] as const,
  },
  liveStreams: {
    all: ["live-streams"] as const,
    byEvent: (eventId: string) =>
      [...queryKeys.liveStreams.all, "event", eventId] as const,
    publicBySlug: (slug: string) =>
      [...queryKeys.liveStreams.all, "public", slug] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    byUser: (userId: string) =>
      [...queryKeys.notifications.all, userId] as const,
  },
} as const;
