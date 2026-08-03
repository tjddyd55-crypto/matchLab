/**
 * Development Auth E2E: admin-issued password reset link.
 * Uses ephemeral Dev Supabase + Dev DB only. Never touches Production Auth.
 *
 *   npx tsx scripts/e2e-admin-password-reset-link.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

process.env.MATCHON_ADMIN_PASSWORD_RESET_LINK_ENABLED = "true";
process.env.MATCHON_ADMIN_PASSWORD_RESET_TTL_MS = String(30 * 60_000);
process.env.MATCHON_ADMIN_PASSWORD_RESET_REISSUE_MIN_MS = "1";
process.env.NODE_ENV = "development";
process.env.RAILWAY_ENVIRONMENT_NAME = "development";

const pg = JSON.parse(
  readFileSync("tmp-prev-pg.json", "utf8").replace(/^\uFEFF/, ""),
);
const appVars = JSON.parse(
  readFileSync("tmp-preview-vars.json", "utf8").replace(/^\uFEFF/, ""),
);
const prodVars = JSON.parse(
  readFileSync("tmp-prod-vars.json", "utf8").replace(/^\uFEFF/, ""),
);

const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
if (/yamabiko/i.test(dbUrl) || !/yamanote/i.test(dbUrl)) {
  throw new Error("REFUSE: Development DB only");
}

const supabaseUrl = String(appVars.NEXT_PUBLIC_SUPABASE_URL || "");
const anonKey = String(appVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
const serviceKey = String(appVars.SUPABASE_SERVICE_ROLE_KEY || "");
const supabaseRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] ?? "";
const prodRef =
  String(prodVars.NEXT_PUBLIC_SUPABASE_URL || "").match(
    /https:\/\/([^.]+)/,
  )?.[1] ?? "";
if (supabaseRef !== "nbunulwquhcckhrcdnmg") {
  throw new Error(`REFUSE: unexpected Dev Supabase ref ${supabaseRef}`);
}
if (prodRef === supabaseRef) {
  throw new Error("REFUSE: Dev and Prod Supabase must differ");
}

process.env.DATABASE_URL = dbUrl;
process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
process.env.NEXT_PUBLIC_APP_URL =
  String(appVars.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
  "https://app-preview-member-gym-b.up.railway.app";
process.env.MATCHON_ADMIN_PASSWORD_RESET_PEPPER =
  process.env.MATCHON_ADMIN_PASSWORD_RESET_PEPPER ||
  String(appVars.MATCHON_PHONE_VERIFICATION_PEPPER || "dev-apr-pepper");

const stamp = Date.now().toString(36);
const loginId = `qa_apr_${stamp}`;
const email = `${loginId}@matchon-qa.local`;
const originalPassword = `QaOrig!${randomBytes(4).toString("hex")}A1`;
const newPassword = `QaNew!${randomBytes(4).toString("hex")}B2`;
const adminLoginId = `qa_apr_admin_${stamp}`;
const adminEmail = `${adminLoginId}@matchon-qa.local`;
const adminPassword = `QaAdmin!${randomBytes(4).toString("hex")}C3`;

const anonA = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonB = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { Pool } = await import("pg");
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const out: Record<string, unknown> = {
  ok: false,
  supabaseRef,
  prodSupabaseRef: prodRef,
  steps: [] as string[],
};
function step(s: string) {
  (out.steps as string[]).push(s);
  console.log("STEP", s);
}

let authUserId: string | null = null;
let adminAuthUserId: string | null = null;
let userId: string | null = null;
let adminUserId: string | null = null;
let gymId: string | null = null;

async function cleanup() {
  if (userId) {
    await pool.query(
      `delete from \"AdminPasswordResetLink\" where \"userId\" = $1`,
      [userId],
    );
    await pool.query(`delete from \"AuditLog\" where \"actorUserId\" = $1`, [
      userId,
    ]);
    if (adminUserId) {
      await pool.query(`delete from \"AuditLog\" where \"actorUserId\" = $1`, [
        adminUserId,
      ]);
    }
    if (gymId) {
      await pool.query(`delete from \"Gym\" where id = $1`, [gymId]);
    }
    await pool.query(`delete from \"User\" where id = $1`, [userId]);
  }
  if (adminUserId) {
    await pool.query(`delete from \"User\" where id = $1`, [adminUserId]);
  }
  if (authUserId) await admin.auth.admin.deleteUser(authUserId);
  if (adminAuthUserId) await admin.auth.admin.deleteUser(adminAuthUserId);
}

try {
  step("create_ephemeral_admin_user");
  const adminCreated = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });
  if (adminCreated.error || !adminCreated.data.user) {
    throw new Error(adminCreated.error?.message || "admin create failed");
  }
  adminAuthUserId = adminCreated.data.user.id;
  adminUserId = `usr_apr_admin_${stamp}`;
  await pool.query(
    `insert into \"User\" (
      id, \"authUserId\", \"loginId\", email, name, role, \"createdAt\", \"updatedAt\"
    ) values ($1,$2,$3,$4,$5,'admin'::\"UserRole\", now(), now())`,
    [adminUserId, adminAuthUserId, adminLoginId, adminEmail, "QA APR Admin"],
  );

  step("create_ephemeral_gym_owner");
  const created = await admin.auth.admin.createUser({
    email,
    password: originalPassword,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message || "owner create failed");
  }
  authUserId = created.data.user.id;
  userId = `usr_apr_${stamp}`;
  gymId = `gym_apr_${stamp}`;
  await pool.query(
    `insert into \"User\" (
      id, \"authUserId\", \"loginId\", email, name, role, \"createdAt\", \"updatedAt\"
    ) values ($1,$2,$3,$4,$5,'gym'::\"UserRole\", now(), now())`,
    [userId, authUserId, loginId, email, "QA APR Owner"],
  );
  await pool.query(
    `insert into \"Gym\" (
      id, \"ownerUserId\", name, status, \"createdAt\", \"updatedAt\"
    ) values ($1,$2,$3,'active'::\"GymStatus\", now(), now())`,
    [gymId, userId, `QA APR Gym ${stamp}`],
  );

  step("sessions_before_reset");
  const loginA = await anonA.auth.signInWithPassword({
    email,
    password: originalPassword,
  });
  const loginB = await anonB.auth.signInWithPassword({
    email,
    password: originalPassword,
  });
  if (!loginA.data.session || !loginB.data.session) {
    throw new Error("session create failed");
  }
  const sessionA = loginA.data.session;
  const sessionB = loginB.data.session;

  const { adminPasswordResetLinkService } = await import(
    "../src/lib/services/admin-password-reset-link.service"
  );
  const actor = {
    userId: adminUserId,
    role: "admin" as const,
    email: adminEmail,
  };

  step("non_admin_forbidden");
  let nonAdminBlocked = false;
  try {
    await adminPasswordResetLinkService.issueLink(
      {
        userId: userId!,
        role: "gym",
        email,
        gymId: gymId!,
      },
      { loginId },
    );
  } catch {
    nonAdminBlocked = true;
  }
  out.nonAdminBlocked = nonAdminBlocked;
  if (!nonAdminBlocked) throw new Error("non-admin should fail");

  step("issue_link_a");
  const linkA = await adminPasswordResetLinkService.issueLink(actor, {
    loginId,
  });
  out.linkAHasTokenInUrl = /token=/.test(linkA.resetUrl);
  out.linkAUsesAppUrl = linkA.resetUrl.startsWith(
    process.env.NEXT_PUBLIC_APP_URL!,
  );

  step("reissue_link_b");
  const linkB = await adminPasswordResetLinkService.issueLink(actor, {
    loginId,
  });
  const tokenA = new URL(linkA.resetUrl).searchParams.get("token") || "";
  const tokenB = new URL(linkB.resetUrl).searchParams.get("token") || "";
  out.tokensDiffer = tokenA !== tokenB;

  step("old_link_a_exchange_fails");
  const exchA =
    await adminPasswordResetLinkService.exchangeTokenForChallenge({
      rawToken: tokenA,
    });
  out.linkAStatusAfterReissue = exchA.status;
  if (exchA.status === "valid") throw new Error("revoked link A should fail");

  step("link_b_exchange_ok");
  const exchB =
    await adminPasswordResetLinkService.exchangeTokenForChallenge({
      rawToken: tokenB,
    });
  if (exchB.status !== "valid" || !exchB.challengeToken) {
    throw new Error("link B exchange failed");
  }

  step("complete_password");
  await adminPasswordResetLinkService.completeWithChallenge({
    challengeToken: exchB.challengeToken,
    newPassword,
    confirmPassword: newPassword,
    requestIp: "127.0.0.1",
    userAgent: "apr-e2e",
  });

  step("reuse_link_b_fails");
  const reuse = await adminPasswordResetLinkService.exchangeTokenForChallenge({
    rawToken: tokenB,
  });
  out.linkBReuseStatus = reuse.status;
  if (reuse.status === "valid") throw new Error("consumed link should fail");

  step("old_password_fails");
  const oldFail = await anonA.auth.signInWithPassword({
    email,
    password: originalPassword,
  });
  out.oldPasswordFails = Boolean(oldFail.error);

  step("new_password_ok");
  const newOk = await anonA.auth.signInWithPassword({
    email,
    password: newPassword,
  });
  out.newPasswordWorks = Boolean(newOk.data.session);

  step("session_invalidation");
  const accessA = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${sessionA.access_token}`,
      apikey: anonKey,
    },
  });
  const accessB = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${sessionB.access_token}`,
      apikey: anonKey,
    },
  });
  const refreshA = await anonA.auth.refreshSession({
    refresh_token: sessionA.refresh_token,
  });
  const refreshB = await anonB.auth.refreshSession({
    refresh_token: sessionB.refresh_token,
  });
  out.sessionAAccessStatus = accessA.status;
  out.sessionBAccessStatus = accessB.status;
  out.sessionARefreshOk = Boolean(refreshA.data.session);
  out.sessionBRefreshOk = Boolean(refreshB.data.session);

  step("revoke_flow");
  const linkC = await adminPasswordResetLinkService.issueLink(actor, {
    loginId,
  });
  await adminPasswordResetLinkService.revokeActiveLink(actor, {
    linkId: linkC.linkId,
  });
  const tokenC = new URL(linkC.resetUrl).searchParams.get("token") || "";
  const exchC =
    await adminPasswordResetLinkService.exchangeTokenForChallenge({
      rawToken: tokenC,
    });
  out.revokedStatus = exchC.status;

  step("expiry_flow");
  process.env.MATCHON_ADMIN_PASSWORD_RESET_TTL_MS = "1";
  // reload config via new issue with tiny TTL — service loads config each call
  const linkD = await adminPasswordResetLinkService.issueLink(actor, {
    loginId,
  });
  await new Promise((r) => setTimeout(r, 20));
  const tokenD = new URL(linkD.resetUrl).searchParams.get("token") || "";
  const exchD =
    await adminPasswordResetLinkService.exchangeTokenForChallenge({
      rawToken: tokenD,
    });
  out.expiredStatus = exchD.status;

  const audits = await pool.query(
    `select action::text as action, count(*)::int as n
     from \"AuditLog\"
     where \"actorUserId\" in ($1, $2)
       and action::text in (
         'admin_password_reset_link_issued',
         'admin_password_reset_link_revoked',
         'password_reset_by_admin_link_completed'
       )
     group by 1 order by 1`,
    [adminUserId, userId],
  );
  out.auditCounts = audits.rows;

  const rawInDb = await pool.query(
    `select count(*)::int as n from \"AdminPasswordResetLink\"
     where \"userId\" = $1 and \"tokenHash\" = $2`,
    [userId, tokenB],
  );
  out.rawTokenStoredInDb = rawInDb.rows[0].n > 0;

  out.ok =
    out.nonAdminBlocked === true &&
    out.tokensDiffer === true &&
    out.linkAStatusAfterReissue !== "valid" &&
    out.linkBReuseStatus !== "valid" &&
    out.oldPasswordFails === true &&
    out.newPasswordWorks === true &&
    out.sessionAAccessStatus === 403 &&
    out.sessionBAccessStatus === 403 &&
    out.sessionARefreshOk === false &&
    out.sessionBRefreshOk === false &&
    out.revokedStatus === "revoked" &&
    out.expiredStatus === "expired" &&
    out.rawTokenStoredInDb === false;
} catch (e) {
  out.error = e instanceof Error ? e.message : String(e);
  out.ok = false;
} finally {
  step("cleanup");
  try {
    await cleanup();
    out.cleaned = true;
  } catch (e) {
    out.cleanupError = e instanceof Error ? e.message : String(e);
  }
  await pool.end();
}

writeFileSync(
  "tmp-dev-admin-password-reset-link-e2e.json",
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
if (!out.ok) process.exit(1);
console.log("ADMIN_PASSWORD_RESET_LINK_E2E_PASS");
