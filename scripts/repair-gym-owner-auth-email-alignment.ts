/**
 * 운영 DB: 회원사 초대 활성화 후 User.email≠Auth email 불일치 복구
 * (비밀번호는 변경하지 않음 — 필요 시 재초대)
 *
 *   npx tsx scripts/repair-gym-owner-auth-email-alignment.ts
 *   npx tsx scripts/repair-gym-owner-auth-email-alignment.ts --apply
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { loginIdToAuthEmail } from "../src/lib/fighter-login";

const apply = process.argv.includes("--apply");

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL required");
  }
  const pool = new Pool({
    connectionString,
    ssl:
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1")
        ? undefined
        : { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const owners = await prisma.user.findMany({
    where: {
      role: UserRole.gym,
      loginId: { not: null },
      authUserId: { not: null },
      NOT: { loginId: { startsWith: "manual-gym-" } },
    },
    select: {
      id: true,
      loginId: true,
      email: true,
      authUserId: true,
      name: true,
      ownedGym: { select: { id: true, name: true } },
    },
  });

  const candidates = owners.filter((u) => {
    if (!u.loginId || !u.email) return false;
    if (u.email.toLowerCase().endsWith("@demo.local")) return false;
    const authEmail = loginIdToAuthEmail(u.loginId);
    return u.email.toLowerCase() !== authEmail.toLowerCase();
  });

  console.log(
    `scanned=${owners.length} misaligned=${candidates.length} apply=${apply}`,
  );

  for (const u of candidates) {
    const authEmail = loginIdToAuthEmail(u.loginId!);
    console.log(
      JSON.stringify({
        userId: u.id,
        loginId: u.loginId,
        gym: u.ownedGym?.name,
        previousEmail: u.email,
        authEmail,
      }),
    );
    if (!apply) continue;

    const clash = await prisma.user.findFirst({
      where: {
        email: { equals: authEmail, mode: "insensitive" },
        NOT: { id: u.id },
      },
      select: { id: true },
    });
    if (clash) {
      console.warn(`SKIP conflict userId=${u.id} clash=${clash.id}`);
      continue;
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { email: authEmail },
    });
    console.log(`REPAIRED ${u.id}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
