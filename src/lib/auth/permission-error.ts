export type PermissionDeniedReason =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND";

export class PermissionError extends Error {
  constructor(
    public readonly reason: PermissionDeniedReason,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = "PermissionError";
  }
}
