/**
 * Onboarding/signup layout verification
 *   npx tsx scripts/verify-onboarding-layout.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function main() {
  const onboardingLayout = read("src/app/(onboarding)/layout.tsx");
  assert.match(onboardingLayout, /OnboardingShell/);
  assert.doesNotMatch(onboardingLayout, /PublicNav/);

  const shell = read("src/components/layout/OnboardingShell.tsx");
  assert.match(shell, /overflow-y-auto/);
  assert.match(shell, /max-w-2xl/);
  assert.doesNotMatch(shell, /from "@\/components\/layout\/PublicNav"/);

  const joinGym = read("src/app/(onboarding)/join/gym/page.tsx");
  assert.match(joinGym, /layout="onboarding"/);
  assert.doesNotMatch(joinGym, /\(public\)/);

  const publicLayout = read("src/app/(public)/layout.tsx");
  assert.match(publicLayout, /PublicShell/);

  const joinInPublic = (() => {
    try {
      read("src/app/(public)/join/gym/page.tsx");
      return true;
    } catch {
      return false;
    }
  })();
  assert.equal(joinInPublic, false, "join/gym must not remain under (public)");

  const authShell = read("src/components/domain/auth/AuthLoginShell.tsx");
  assert.match(authShell, /layout === "onboarding"/);

  console.log("verify-onboarding-layout: PASS");
}

main();
