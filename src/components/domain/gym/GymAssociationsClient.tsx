"use client";

import { useState, useTransition } from "react";
import {
  cancelAssociationConnectionRequestAction,
  submitAssociationConnectionRequestAction,
} from "@/features/association-gym-connections/actions";
import { Button } from "@/components/ui/button";

type AssociationRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
};

type MembershipRow = {
  id: string;
  memberCode: string;
  status: string;
  joinedAt: string;
  organizer: { id: string; name: string; logoUrl: string | null };
};

type RequestRow = {
  id: string;
  status: string;
  createdAt: string;
  associationOrganizer: { id: string; name: string; logoUrl: string | null };
};

export function GymAssociationsClient({
  memberships,
  requests,
  associations,
}: {
  memberships: MembershipRow[];
  requests: RequestRow[];
  associations: AssociationRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const connectedIds = new Set(memberships.map((m) => m.organizer.id));
  const pendingIds = new Set(
    requests
      .filter((r) => r.status === "pending")
      .map((r) => r.associationOrganizer.id),
  );

  const filtered = associations.filter((a) =>
    a.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-bold text-matchon-text-primary">
          현재 연결된 협회
        </h2>
        {memberships.length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">
            연결된 협회가 없습니다. 아래에서 협회를 찾아 연결을 요청하세요.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border border-matchon-border bg-white">
            {memberships.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.organizer.name}</p>
                  <p className="text-sm text-matchon-text-secondary">
                    회원번호 {m.memberCode} · {m.status} ·{" "}
                    {m.joinedAt.slice(0, 10)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-matchon-text-primary">
          요청 상태
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-matchon-text-secondary">요청 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y rounded-xl border border-matchon-border bg-white">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-semibold">{r.associationOrganizer.name}</p>
                  <p className="text-sm text-matchon-text-secondary">
                    {r.status} · {r.createdAt.slice(0, 10)}
                  </p>
                </div>
                {r.status === "pending" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        setError(null);
                        const res =
                          await cancelAssociationConnectionRequestAction(r.id);
                        if (!res.ok) setError(res.error.message);
                      });
                    }}
                  >
                    취소
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-matchon-text-primary">
          협회 찾기
        </h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="협회명 검색"
          className="h-11 w-full max-w-md rounded-lg border border-matchon-border px-3"
        />
        <ul className="divide-y rounded-xl border border-matchon-border bg-white">
          {filtered.map((a) => {
            const connected = connectedIds.has(a.id);
            const waiting = pendingIds.has(a.id);
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.name}</p>
                  {a.websiteUrl ? (
                    <p className="truncate text-sm text-matchon-text-secondary">
                      {a.websiteUrl}
                    </p>
                  ) : null}
                </div>
                {connected ? (
                  <span className="text-sm text-matchon-text-secondary">
                    연결됨
                  </span>
                ) : waiting ? (
                  <span className="text-sm text-matchon-text-secondary">
                    승인 대기
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        setError(null);
                        const res =
                          await submitAssociationConnectionRequestAction(a.id);
                        if (!res.ok) setError(res.error.message);
                      });
                    }}
                  >
                    가입 요청
                  </Button>
                )}
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="p-4 text-sm text-matchon-text-secondary">
              검색 결과가 없습니다.
            </li>
          ) : null}
        </ul>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
