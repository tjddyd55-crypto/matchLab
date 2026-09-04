"use client";

import { useState } from "react";
import { AutoBracketGenerationPanel } from "@/components/domain/brackets/AutoBracketGenerationPanel";
import { BracketCreateForm } from "@/components/domain/brackets/BracketCreateForm";
import { BracketDuplicateValidationDialog } from "@/components/domain/brackets/BracketDuplicateValidationDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
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
  const [validationOpen, setValidationOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setValidationOpen(true)}
        >
          대진 검증
        </Button>
        <Button type="button" size="sm" onClick={() => setAutoMatchOpen(true)}>
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

      <BracketDuplicateValidationDialog
        eventId={eventId}
        open={validationOpen}
        onOpenChange={setValidationOpen}
      />

      <Dialog open={autoMatchOpen} onOpenChange={setAutoMatchOpen}>
        <DialogContent
          layout="shell"
          className="w-[min(100vw-1.5rem,42rem)] max-w-none max-h-[88dvh] sm:max-w-none"
        >
          <DialogHeader className="space-y-1">
            <DialogTitle>자동매칭</DialogTitle>
            <DialogDescription>
              조건을 설정하고 미리보기 후 적용하세요.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <AutoBracketGenerationPanel
              eventId={eventId}
              courts={courts}
              canResetSafely={canResetSafely}
              matchesWithResults={matchesWithResults}
              undividedApplicantCount={undividedApplicantCount}
              variant="plain"
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={groupCreateOpen} onOpenChange={setGroupCreateOpen}>
        <DialogContent
          layout="shell"
          className="w-[min(100vw-1.5rem,36rem)] max-w-none max-h-[88dvh] sm:max-w-none"
        >
          <DialogHeader className="space-y-1">
            <DialogTitle>대진표 그룹 생성</DialogTitle>
            <DialogDescription>
              경기구분을 선택하고 대진 방식을 정한 뒤 생성하세요.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <BracketCreateForm
              eventId={eventId}
              divisions={divisions}
              variant="plain"
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
