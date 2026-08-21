/**
 * Admin 전체 체육관 = registered Gym only (정적)
 *   npm run verify:registered-gym-list
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const admin = readFileSync(
    join(process.cwd(), "src/lib/repositories/admin.repository.ts"),
    "utf8",
  );
  assert.match(admin, /listAdminGyms/);
  assert.match(admin, /excludeExternalRegistrationPlaceholderGymWhere/);

  const helper = readFileSync(
    join(
      process.cwd(),
      "src/lib/gym/external-registration-placeholder-gym.ts",
    ),
    "utf8",
  );
  assert.match(helper, /ext-reg-/);
  assert.match(helper, /MATCHON 외부등록/);

  console.log("verify:registered-gym-list OK");
}

main();
