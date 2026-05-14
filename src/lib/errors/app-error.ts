import type { ActionErrorCode } from "@/lib/action-result";

export class AppError extends Error {
  constructor(
    public readonly code: ActionErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
