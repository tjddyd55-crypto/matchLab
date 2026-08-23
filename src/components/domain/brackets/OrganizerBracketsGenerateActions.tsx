"use client";

import { useState } from "react";
import { AutoBracketGenerationPanel } from "@/components/domain/brackets/AutoBracketGenerationPanel";
import { BracketCreateForm } from "@/components/domain/brackets/BracketCreateForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PublicEventDivisionDTO } from "@/lib/dto/public";
import type { EventCourtVM } from "@/lib/services/event-court.service";

export function OrganizerBracketsGenerateActions({
  eventId,
  courts,
  canResetSafely,
  matchesWithResults,
  undividedApplicantCount,
  divisions,
}: {
  eventId: string;
  courts: EventCourtVM[];
  canResetSafely: boolean;
  matchesWithResults: number;
  undividedApplicantCount: number;
  divisions: PublicEventDivisionDTO[];
}) {
  const [autoMatchOpen, setAutoMatchOpen] = useState(false);
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setAutoMatchOpen(true)}
        >
          자동매칭
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setGroupCreateOpen(true)}
        >
          그룹 생성
        </Button>
      </div>

      <Dialog open={autoMatchOpen} onOpenChange={setAutoMatchOpen}>
        <DialogContent className="flex max-h-[88dvh] w-[min(100vw-1.5rem,42rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 text-left">
            <DialogTitle>자동매칭</DialogTitle>
            <DialogDescription>
              조건을 설정하고 미리보기 후 적용하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <AutoBracketGenerationPanel
              eventId={eventId}
              courts={courts}
              canResetSafely={canResetSafely}
              matchesWithResults={matchesWithResults}
              undividedApplicantCount={undividedApplicantCount}
              variant="plain"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupCreateOpen} onOpenChange={setGroupCreateOpen}>
        <DialogContent className="flex max-h-[88dvh] w-[min(100vw-1.5rem,36rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 text-left">
            <DialogTitle>대진표 그룹 생성</DialogTitle>
            <DialogDescription>
              경기구분을 선택하고 대진 방식을 정한 뒤 생성하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <BracketCreateForm
              eventId={eventId}
              divisions={divisions}
              variant="plain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
