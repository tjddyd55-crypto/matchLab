/**
 * Golden Flow seed/cleanup/test — production DB 실행 차단.
 * SSOT: yamanote=dev, yamabiko=prod, localhost/ci=테스트 허용.
 */
export function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    "";
  if (!url) {
    throw new Error("DATABASE_URL(또는 DIRECT_URL)이 필요합니다.");
  }
  return url;
}

export function isProductionDatabaseUrl(databaseUrl: string): boolean {
  const url = databaseUrl.trim().toLowerCase();
  if (!url) return true;
  if (/yamabiko/i.test(url)) return true;
  if (/\/prod(uction)?[/?#]|_prod(uction)?[/?#]/i.test(url)) return true;
  if (process.env.REFUSE_GOLDEN_FLOW_ON_PRODUCTION === "1") {
    if (/railway\.app/i.test(url) && !/yamanote/i.test(url)) return true;
  }
  return false;
}

export function isAllowedGoldenFlowDatabase(databaseUrl: string): boolean {
  const url = databaseUrl.trim().toLowerCase();
  if (!url) return false;
  if (isProductionDatabaseUrl(url)) return false;
  if (/yamanote/i.test(url) && /yamabiko/i.test(url)) return false;
  if (
    /localhost|127\.0\.0\.1|matchon_ci|postgresql:\/\/ci:ci@/i.test(url)
  ) {
    return true;
  }
  if (/yamanote/i.test(url)) return true;
  return false;
}

/** seed/cleanup/verify 진입 시 호출 */
export function assertSafeForGoldenFlow(databaseUrl?: string): void {
  const url = databaseUrl ?? getDatabaseUrl();
  if (isProductionDatabaseUrl(url)) {
    throw new Error(
      "REFUSE_GOLDEN_FLOW_ON_PRODUCTION: production 또는 yamabiko DB에서는 Golden Flow를 실행할 수 없습니다.",
    );
  }
  if (!isAllowedGoldenFlowDatabase(url)) {
    throw new Error(
      `REFUSE_GOLDEN_FLOW: 허용되지 않은 DATABASE_URL입니다. (yamanote, localhost, CI만 허용)`,
    );
  }
  if (process.env.NODE_ENV === "production" && !/localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error(
      "REFUSE_GOLDEN_FLOW: NODE_ENV=production에서는 Golden Flow를 실행할 수 없습니다.",
    );
  }
}
