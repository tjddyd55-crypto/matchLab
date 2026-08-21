/**
 * 코너 Select 현재 선수 표시 (정적)
 *   npm run verify:bracket-current-player
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const picker = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/ApprovedApplicationPicker.tsx",
    ),
    "utf8",
  );
  assert.match(picker, /현재 선수/);
  assert.match(picker, /activeFighterId|currentFighterId/);
  assert.match(picker, /빈 슬롯/);

  const slot = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/brackets/OrganizerMatchEditSlot.tsx",
    ),
    "utf8",
  );
  assert.match(slot, /isExternalRegistrationPlaceholderGymName/);

  console.log("verify:bracket-current-player OK");
}

main();
