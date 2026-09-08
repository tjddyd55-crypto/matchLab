import "server-only";

import { EventStatus } from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";

export const EVENT_COMPLETION_WRITE_BLOCKED_MESSAGE =
  "대회가 종료되어 수정할 수 없습니다. 종료 해제 후 다시 시도해 주세요.";

export function isEventFinishedStatus(status: EventStatus | string): boolean {
  return status === EventStatus.finished;
}

export async function assertEventWritable(eventId: string): Promise<void> {
  const row = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (!row) {
    throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
  }
  if (isEventFinishedStatus(row.status)) {
    throw new AppError("CONFLICT", EVENT_COMPLETION_WRITE_BLOCKED_MESSAGE);
  }
}
