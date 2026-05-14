"use client";

export type OrganizerApplicationFiltersState = {
  applicationStatus: string;
  paymentStatus: string;
  divisionId: string;
  gymId: string;
  consent: string;
};

export function OrganizerApplicationsFilterBar({
  filters,
  onChange,
  divisionOptions,
  gymOptions,
}: {
  filters: OrganizerApplicationFiltersState;
  onChange: (next: OrganizerApplicationFiltersState) => void;
  divisionOptions: { id: string; label: string }[];
  gymOptions: { id: string; name: string }[];
}) {
  function patch<K extends keyof OrganizerApplicationFiltersState>(
    key: K,
    value: OrganizerApplicationFiltersState[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm md:flex-row md:flex-wrap md:items-end">
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-app">
          신청 상태
        </label>
        <select
          id="f-app"
          className="border-input bg-background h-9 min-w-[140px] rounded-lg border px-2 text-sm"
          value={filters.applicationStatus}
          onChange={(e) => patch("applicationStatus", e.target.value)}
        >
          <option value="all">전체</option>
          <option value="pending">대기</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
          <option value="cancelled">취소</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-pay">
          입금 상태
        </label>
        <select
          id="f-pay"
          className="border-input bg-background h-9 min-w-[140px] rounded-lg border px-2 text-sm"
          value={filters.paymentStatus}
          onChange={(e) => patch("paymentStatus", e.target.value)}
        >
          <option value="all">전체</option>
          <option value="unpaid">미입금</option>
          <option value="pending_check">확인중</option>
          <option value="paid">입금완료</option>
          <option value="refunded">환불</option>
          <option value="waived">면제</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-div">
          부문
        </label>
        <select
          id="f-div"
          className="border-input bg-background h-9 min-w-[160px] rounded-lg border px-2 text-sm"
          value={filters.divisionId}
          onChange={(e) => patch("divisionId", e.target.value)}
        >
          <option value="all">전체</option>
          {divisionOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-gym">
          체육관
        </label>
        <select
          id="f-gym"
          className="border-input bg-background h-9 min-w-[160px] rounded-lg border px-2 text-sm"
          value={filters.gymId}
          onChange={(e) => patch("gymId", e.target.value)}
        >
          <option value="all">전체</option>
          {gymOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-muted-foreground text-xs" htmlFor="f-consent">
          동의
        </label>
        <select
          id="f-consent"
          className="border-input bg-background h-9 min-w-[140px] rounded-lg border px-2 text-sm"
          value={filters.consent}
          onChange={(e) => patch("consent", e.target.value)}
        >
          <option value="all">전체</option>
          <option value="not_required">동의 불필요</option>
          <option value="completed">완료</option>
          <option value="draft">작성중</option>
          <option value="missing">미작성</option>
          <option value="other">기타</option>
        </select>
      </div>
      <p className="text-muted-foreground text-xs md:flex-1 md:text-right">
        필터는 클라이언트에서만 적용됩니다. 고급 검색은 후속 단계에서 서버로 이전할 수
        있습니다.
      </p>
    </div>
  );
}
