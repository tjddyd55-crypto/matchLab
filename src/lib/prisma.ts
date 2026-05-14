import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma";

/**
 * Prisma 단일 인스턴스 (개발 핫 리로드 시 연결 폭주 방지).
 * Prisma 7 + PostgreSQL: `@prisma/adapter-pg` 필수.
 * 호출 금지: 페이지·클라이언트 컴포넌트 — repository 계층에서만 사용.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL가 설정되지 않았습니다.");
  }

  const pool = globalForPrisma.pgPool ?? new Pool({ connectionString: url });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
