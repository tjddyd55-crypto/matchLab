/**
 * Development DB fail-closed preflight.
 * Production(yamabiko) write를 막기 위한 최소 가드.
 */
export function assertDevelopmentYamanoteDatabaseUrl(
  databaseUrl = process.env.DATABASE_URL ?? "",
): { host: string } {
  const hostMatch = databaseUrl.match(/@([^/]+)\//);
  const host = hostMatch?.[1] ?? "";
  const isYamanote = /yamanote/i.test(databaseUrl);
  const isYamabiko = /yamabiko/i.test(databaseUrl);
  if (!isYamanote || isYamabiko) {
    throw new Error(
      `REFUSING DB write: expected Development yamanote host, got host=${host || "unknown"}`,
    );
  }
  return { host };
}
