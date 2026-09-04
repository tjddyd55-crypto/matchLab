/**
 * Golden test auth production guard — static verification.
 *   npm run verify:golden-test-auth-safety
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertGoldenTestAuthSecret,
  isGoldenTestAuthEnabled,
  isGoldenTestAuthSecretConfigured,
} from "../src/lib/auth/golden-test-auth-policy";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

// --- env guard matrix ---
assert.equal(
  isGoldenTestAuthEnabled({
    MATCHON_GOLDEN_TEST_AUTH: "1",
    GOLDEN_FLOW_CI: "1",
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
  }),
  false,
  "production railway must refuse golden test auth",
);

assert.equal(
  isGoldenTestAuthEnabled({
    MATCHON_GOLDEN_TEST_AUTH: "1",
    GOLDEN_FLOW_CI: "1",
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "development",
  }),
  true,
  "railway development preview may allow golden test auth",
);

assert.equal(
  isGoldenTestAuthEnabled({
    GOLDEN_FLOW_CI: "1",
    NODE_ENV: "test",
  }),
  false,
  "missing MATCHON_GOLDEN_TEST_AUTH must refuse",
);

assert.equal(
  isGoldenTestAuthEnabled({
    MATCHON_GOLDEN_TEST_AUTH: "1",
    NODE_ENV: "test",
  }),
  false,
  "missing GOLDEN_FLOW_CI must refuse",
);

assert.equal(
  isGoldenTestAuthEnabled({
    MATCHON_GOLDEN_TEST_AUTH: "1",
    GOLDEN_FLOW_CI: "1",
    NODE_ENV: "test",
  }),
  true,
  "CI golden test auth enabled in non-production",
);

// --- secret required ---
assert.equal(
  isGoldenTestAuthSecretConfigured({ MATCHON_GOLDEN_TEST_AUTH_SECRET: "abc" }),
  true,
);
assert.equal(
  assertGoldenTestAuthSecret("abc", {
    MATCHON_GOLDEN_TEST_AUTH_SECRET: "abc",
  }),
  true,
);
assert.equal(
  assertGoldenTestAuthSecret("wrong", {
    MATCHON_GOLDEN_TEST_AUTH_SECRET: "abc",
  }),
  false,
);

// --- route must not accept arbitrary user id ---
const route = read("src/app/api/internal/golden-flow/test-session/route.ts");
assert.ok(
  route.includes("resolveGoldenTestOrganizerUserId"),
  "route must resolve golden organizer only",
);
assert.ok(
  !route.includes("req.json") &&
    !/searchParams\.get\([^)]*user/i.test(route) &&
    !/body\.(userId|loginId|email)/i.test(route),
  "route must not accept arbitrary identity from client",
);

// --- actor integrates golden session before supabase ---
const actor = read("src/lib/auth/actor.ts");
assert.ok(
  actor.includes("getActorFromGoldenTestSession"),
  "getCurrentActor must check golden test session",
);

// --- no middleware auth bypass ---
const middleware = read("src/middleware.ts");
assert.ok(
  !/golden|bypass|skipAuth/i.test(middleware),
  "middleware must not bypass auth for golden flow",
);

console.log("verify:golden-test-auth-safety OK");
