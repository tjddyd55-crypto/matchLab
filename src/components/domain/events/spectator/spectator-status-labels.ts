import type { BracketMatchStatus } from "@/lib/enums";
import type { LiveStreamStatus } from "@/lib/enums";

export function spectatorMatchStatusLabel(status: BracketMatchStatus): string {
  switch (status) {
    case "waiting":
      return "대기";
    case "called":
      return "경기준비";
    case "ongoing":
      return "경기진행중";
    case "finished":
      return "종료";
    case "cancelled":
      return "취소";
    case "delayed":
      return "지연";
    default:
      return status;
  }
}

export function spectatorMatchStatusBadgeClass(status: BracketMatchStatus): string {
  switch (status) {
    case "ongoing":
      return "bg-primary/10 text-primary border-primary/30";
    case "called":
      return "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100";
    case "finished":
      return "bg-muted text-muted-foreground border-border";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-background text-foreground border-border";
  }
}

export function spectatorLiveStatusLabel(status: LiveStreamStatus): string {
  switch (status) {
    case "scheduled":
      return "준비중";
    case "live":
      return "방송중";
    case "ended":
      return "종료";
    case "hidden":
      return "비공개";
    default:
      return status;
  }
}
