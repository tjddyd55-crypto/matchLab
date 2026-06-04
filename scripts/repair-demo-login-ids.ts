/**
 * production 등에서 User.loginId가 비어 있을 때 데모 계정 loginId만 복구합니다.
 * db:seed 없음 · Supabase 비밀번호 변경 없음.
 *
 * 실행: DATABASE_URL=... npm run repair:demo-login-ids
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const DEMO_LOGIN_IDS: { email: string; loginId: string }[] = [
  { email: "admin@demo.local", loginId: "admin" },
  { email: "organizer@demo.local", loginId: "organizer" },
  { email: "gym@demo.local", loginId: "gym" },
  { email: "fighter@demo.local", loginId: "fighter" },
  { email: "fighterdemo@internal.matchlab.local", loginId: "fighterdemo" },
];

async function main() {
  console.info("[repair-demo-login-ids] User.loginId 동기화…");
  for (const row of DEMO_LOGIN_IDS) {
    const user = await prisma.user.findUnique({
      where: { email: row.email },
      select: { id: true, loginId: true, email: true },
    });
    if (!user) {
      console.warn(`  skip (no user): ${row.email}`);
      continue;
    }
    if (user.loginId === row.loginId) {
      console.info(`  ok: ${row.loginId} → ${row.email}`);
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { loginId: row.loginId },
    });
    console.info(
      `  fixed: ${row.email} loginId ${user.loginId ?? "(null)"} → ${row.loginId}`,
    );
  }
  console.info("[repair-demo-login-ids] 완료");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
