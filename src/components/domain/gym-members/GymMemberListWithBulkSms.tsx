"use client";

import { useCallback, useState } from "react";
import type { GymMemberListItemVM } from "@/lib/services/gym-member.service";
import { GymMemberBulkSmsButton } from "@/components/domain/gym-members/GymMemberBulkSmsButton";
import { MemberTable } from "@/components/domain/gym-members/MemberTable";
import { MemberMobileCard } from "@/components/domain/gym-members/MemberMobileCard";

export function GymMemberListWithBulkSms({
  members,
}: {
  members: GymMemberListItemVM[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const onToggle = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const onToggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(
        checked ? new Set(members.map((member) => member.id)) : new Set(),
      );
    },
    [members],
  );

  const selection = {
    selectedIds,
    onToggle,
    onToggleAll,
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <GymMemberBulkSmsButton
          memberIds={members.map((member) => member.id)}
          selectedIds={[...selectedIds]}
        />
        {selectedIds.size > 0 ? (
          <span className="text-sm text-matchon-text-secondary">
            {selectedIds.size}명 선택
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-col gap-2 overflow-x-hidden lg:hidden">
        {members.map((member) => (
          <div key={member.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-3 shrink-0"
              checked={selectedIds.has(member.id)}
              onChange={(e) => selection.onToggle(member.id, e.target.checked)}
              aria-label={`${member.name} 선택`}
            />
            <div className="min-w-0 flex-1">
              <MemberMobileCard member={member} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <MemberTable members={members} selection={selection} />
      </div>
    </>
  );
}
