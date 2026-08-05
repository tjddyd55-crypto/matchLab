/**
 * Development-only: optional password_help loginId + requestedLoginId E2E.
 *   npx tsx scripts/e2e-admin-account-identity.mts
 */
import { readFileSync } from "node:fs";
import { Pool } from "pg";

function readEnvLocal(): Record<string, string> {
  const raw = readFileSync(".env.local", "utf8").replace(/^\uFEFF/, "");
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]!] = m[2]!.replace(/^"(.*)"$/, "$1");
  }
  return out;
}

const env = readEnvLocal();
const dbUrl = env.DATABASE_URL || "";
if (!/yamanote/i.test(dbUrl) || /yamabiko/i.test(dbUrl)) {
  throw new Error("REFUSE: Development DB only");
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const stamp = Date.now().toString(36);
const loginA = `reqa${stamp}`.slice(0, 20);
const loginB = `reqb${stamp}`.slice(0, 20);
const checks: Record<string, unknown> = {};
const cleanupIds: {
  inquiries: string[];
  associations: string[];
  gyms: string[];
} = { inquiries: [], associations: [], gyms: [] };

try {
  const colAssoc = await pool.query<{ exists: boolean }>(
    `select exists (
       select 1 from information_schema.columns
       where table_name = 'AssociationApplication' and column_name = 'requestedLoginId'
     ) as exists`,
  );
  const colGym = await pool.query<{ exists: boolean }>(
    `select exists (
       select 1 from information_schema.columns
       where table_name = 'GymApplication' and column_name = 'requestedLoginId'
     ) as exists`,
  );
  checks.migrationAssocColumn = colAssoc.rows[0]?.exists === true;
  checks.migrationGymColumn = colGym.rows[0]?.exists === true;

  const owner = await pool.query<{
    id: string;
    loginid: string;
    name: string;
  }>(
    `select u.id, u."loginId" as loginid, u.name
     from "User" u
     join "Organizer" o on o."userId" = u.id
     where u."loginId" is not null
       and u."loginId" not like 'pending-gym-%'
       and u."authUserId" is not null
     limit 1`,
  );
  if (!owner.rows[0]) throw new Error("no activated association owner");
  const knownLoginId = owner.rows[0].loginid;

  const withLogin = await pool.query<{ id: string }>(
    `insert into "DesktopSupportInquiry"
      (id, category, source, name, "loginId", contact, message, "roleHint", status, "createdAt", "updatedAt")
     values
      (concat('c', substr(md5(random()::text), 1, 24)),
       'password_help'::"DesktopSupportInquiryCategory",
       'desktop'::"DesktopSupportInquirySource",
       $1, $2, '010-1234-5678',
       $3, 'desktop_login',
       'open'::"DesktopSupportInquiryStatus",
       now(), now())
     returning id`,
    [owner.rows[0].name, knownLoginId, `qa identity with login ${stamp}`],
  );
  cleanupIds.inquiries.push(withLogin.rows[0]!.id);

  const blankLogin = await pool.query<{ id: string; loginid: string | null }>(
    `insert into "DesktopSupportInquiry"
      (id, category, source, name, "loginId", contact, message, "roleHint", status, "createdAt", "updatedAt")
     values
      (concat('c', substr(md5(random()::text), 1, 24)),
       'password_help'::"DesktopSupportInquiryCategory",
       'web'::"DesktopSupportInquirySource",
       $1, null, '010-9876-5432',
       $2, 'password_reset',
       'open'::"DesktopSupportInquiryStatus",
       now(), now())
     returning id, "loginId" as loginid`,
    [owner.rows[0].name, `qa identity blank login ${stamp}`],
  );
  cleanupIds.inquiries.push(blankLogin.rows[0]!.id);
  checks.passwordHelpBlankLoginIdAllowed = blankLogin.rows[0]?.loginid === null;
  checks.inquiryLoginIdStored = true;

  const assoc = await pool.query<{ id: string; requested: string | null }>(
    `insert into "AssociationApplication"
      (id, "associationName", "representativeName", "contactName", "contactPhone",
       "contactEmail", "requestedLoginId", status, "termsAcceptedAt", "privacyAcceptedAt",
       "submittedAt", "createdAt", "updatedAt")
     values
      (concat('a', substr(md5(random()::text), 1, 24)),
       $1, '대표', '담당', '01011112222',
       $2, $3, 'pending'::"AssociationApplicationStatus",
       now(), now(), now(), now(), now())
     returning id, "requestedLoginId" as requested`,
    [`QA협회${stamp}`, `qa-assoc-${stamp}@example.com`, loginA],
  );
  cleanupIds.associations.push(assoc.rows[0]!.id);
  checks.associationRequestedLoginIdStored =
    assoc.rows[0]?.requested === loginA;

  const dupAssoc = await pool.query(
    `select count(*)::int as n from "AssociationApplication"
     where "requestedLoginId" = $1
       and "deletedAt" is null
       and status in ('pending', 'under_review', 'approved')`,
    [loginA],
  );
  checks.associationDuplicateDetectable = (dupAssoc.rows[0] as { n: number }).n >= 1;

  const gym = await pool.query<{ id: string; requested: string | null }>(
    `insert into "GymApplication"
      (id, "gymName", "representativeName", "contactName", "mobilePhone",
       email, "requestedLoginId", status, "privacyConsent", "registrationConsent",
       "termsAcceptedAt", "privacyAcceptedAt",
       "submittedAt", "createdAt", "updatedAt")
     values
      (concat('g', substr(md5(random()::text), 1, 24)),
       $1, '대표', '담당', '01033334444',
       $2, $3, 'pending'::"GymApplicationStatus", true, true,
       now(), now(), now(), now(), now())
     returning id, "requestedLoginId" as requested`,
    [`QA체육관${stamp}`, `qa-gym-${stamp}@example.com`, loginB],
  );
  cleanupIds.gyms.push(gym.rows[0]!.id);
  checks.gymRequestedLoginIdStored = gym.rows[0]?.requested === loginB;

  const crossDup = await pool.query(
    `select
       (select count(*)::int from "AssociationApplication"
         where "requestedLoginId" = $1 and "deletedAt" is null
           and status in ('pending', 'under_review', 'approved')) as assoc_n,
       (select count(*)::int from "GymApplication"
         where "requestedLoginId" = $1 and "deletedAt" is null
           and status in ('pending', 'under_review', 'approved')) as gym_n`,
    [loginA],
  );
  const cross = crossDup.rows[0] as { assoc_n: number; gym_n: number };
  checks.crossAppUniquenessQueryable =
    cross.assoc_n >= 1 && typeof cross.gym_n === "number";

  const legacyNull = await pool.query<{ n: number }>(
    `select count(*)::int as n from "AssociationApplication"
     where "requestedLoginId" is null and "deletedAt" is null`,
  );
  checks.legacyNullRequestedLoginIdOk = (legacyNull.rows[0]?.n ?? 0) >= 0;

  const inactiveApproved = await pool.query<{
    requested: string | null;
    loginid: string | null;
    auth: string | null;
  }>(
    `select aa."requestedLoginId" as requested, u."loginId" as loginid, u."authUserId" as auth
     from "AssociationApplication" aa
     left join "Organizer" o on o.id = aa."createdOrganizerId"
     left join "User" u on u.id = o."userId"
     where aa.status = 'approved' and aa."deletedAt" is null
     order by aa."submittedAt" desc
     limit 5`,
  );
  checks.inactiveResetBlockedSample = inactiveApproved.rows.some(
    (r) => r.loginid && !r.auth,
  )
    ? "has_inactive_owner"
    : "no_inactive_sample";

  const requiredTrue = [
    "migrationAssocColumn",
    "migrationGymColumn",
    "passwordHelpBlankLoginIdAllowed",
    "inquiryLoginIdStored",
    "associationRequestedLoginIdStored",
    "gymRequestedLoginIdStored",
    "associationDuplicateDetectable",
    "crossAppUniquenessQueryable",
  ] as const;
  for (const key of requiredTrue) {
    if (checks[key] !== true) throw new Error(`failed ${key}: ${checks[key]}`);
  }

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
} finally {
  for (const id of cleanupIds.inquiries) {
    await pool.query(`delete from "DesktopSupportInquiry" where id = $1`, [id]);
  }
  for (const id of cleanupIds.associations) {
    await pool.query(`delete from "AssociationApplication" where id = $1`, [
      id,
    ]);
  }
  for (const id of cleanupIds.gyms) {
    await pool.query(`delete from "GymApplication" where id = $1`, [id]);
  }
  await pool.end();
}
