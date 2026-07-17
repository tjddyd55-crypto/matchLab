"use client";

import { useState, useTransition } from "react";
import {
  approveAssociationConnectionRequestAction,
  rejectAssociationConnectionRequestAction,
} from "@/features/association-gym-connections/actions";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  memo: string | null;
  createdAt: string;
  gym: { id: string; name: string; phone: string | null; address: string | null };
  requestingUser: {
    id: string;
    name: string;
    phone: string | null;
    loginId: string | null;
  };
};

export function AssociationConnectionRequestsPanel({ rows }: { rows: Row[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-matchon-text-secondary">
        기존 체육관 연결 요청이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-xl border border-matchon-border bg-white">
        {rows.map((row) => (
          <li key={row.id} className="space-y-3 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-matchon-primary">
                기존 체육관 연결 요청
              </p>
              <p className="mt-1 font-semibold">{row.gym.name}</p>
              <p className="text-sm text-matchon-text-secondary">
                요청자 {row.requestingUser.name}
                {row.requestingUser.loginId
                  ? ` (${row.requestingUser.loginId})`
                  : ""}
                {row.gym.phone ? ` · ${row.gym.phone}` : ""}
              </p>
              <p className="text-xs text-matchon-text-secondary">
                {row.createdAt.slice(0, 10)}
                {row.memo ? ` · ${row.memo}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    setError(null);
                    const res =
                      await approveAssociationConnectionRequestAction(row.id);
                    if (!res.ok) setError(res.error.message);
                  });
                }}
              >
                승인
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    setError(null);
                    const res =
                      await rejectAssociationConnectionRequestAction(row.id);
                    if (!res.ok) setError(res.error.message);
                  });
                }}
              >
                반려
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
