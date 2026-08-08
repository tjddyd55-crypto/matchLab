"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createGymMemberGroupAction,
  deleteGymMemberGroupAction,
  reorderGymMemberGroupsAction,
  updateGymMemberGroupAction,
} from "@/features/gym-members/actions";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

export type GymMemberGroupRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  memberCount: number;
};

export function GymMemberGroupManager({
  groups: initialGroups,
}: {
  groups: GymMemberGroupRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState(initialGroups);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  function run(
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
    onOk?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error?.message ?? "처리에 실패했습니다.");
        return;
      }
      onOk?.();
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...groups];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    setGroups(next);
    run(() => reorderGymMemberGroupsAction(next.map((g) => g.id)));
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4">
        <h2 className="text-base font-semibold">그룹 추가</h2>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto]"
          action={(fd) => run(() => createGymMemberGroupAction(fd))}
        >
          <input
            name="name"
            required
            placeholder="예: 성인, 초등, 오전반"
            className={matchonFieldInputClass}
          />
          <Button type="submit" disabled={pending}>
            추가
          </Button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">그룹 목록</h2>
        <ul className="divide-y divide-matchon-border rounded-xl border border-matchon-border bg-white">
          {groups.map((g, idx) => (
            <li key={g.id} className="space-y-2 p-3">
              {editingId === g.id ? (
                <form
                  className="grid gap-2 sm:grid-cols-2"
                  action={(fd) =>
                    run(() => updateGymMemberGroupAction(g.id, fd), () =>
                      setEditingId(null),
                    )
                  }
                >
                  <input
                    name="name"
                    required
                    defaultValue={g.name}
                    className={matchonFieldInputClass}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="hidden" name="isActive" value="false" />
                    <input
                      type="checkbox"
                      name="isActive"
                      value="true"
                      defaultChecked={g.isActive}
                    />
                    활성
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" size="sm" disabled={pending}>
                      저장
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      취소
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {g.name}
                      {!g.isActive ? (
                        <span className="ml-2 text-xs text-matchon-text-secondary">
                          비활성
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-matchon-text-secondary">
                      회원 {g.memberCount}명
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending || idx === 0}
                      onClick={() => move(idx, -1)}
                      aria-label="위로"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending || idx === groups.length - 1}
                      onClick={() => move(idx, 1)}
                      aria-label="아래로"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(g.id)}
                    >
                      수정
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `"${g.name}" 그룹을 삭제할까요? (배정은 해제됩니다)`,
                          )
                        ) {
                          return;
                        }
                        run(() => deleteGymMemberGroupAction(g.id));
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {groups.length === 0 ? (
            <li className="p-4 text-sm text-matchon-text-secondary">
              등록된 그룹이 없습니다.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
