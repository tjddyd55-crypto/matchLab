/**
 * create/update/release payload 분리 계약
 *   npm run verify:gym-fighter-create-payload
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gymFighterCreateSchema } from "../src/lib/validators/gym-fighter.validator";

function main() {
  const actions = readFileSync(
    join(process.cwd(), "src/features/fighters/actions.ts"),
    "utf8",
  );
  assert.ok(actions.includes("buildCreateGymFighterPayload"));
  assert.ok(actions.includes("buildUpdateGymFighterPayload"));
  assert.equal(actions.includes("payloadFromGymFighterForm"), false);

  const createFn = actions.slice(
    actions.indexOf("function buildCreateGymFighterPayload"),
    actions.indexOf("function buildUpdateGymFighterPayload"),
  );
  assert.equal(createFn.includes("fighterId"), false);
  assert.equal(createFn.includes("status"), false);
  assert.equal(createFn.includes("releaseAffiliation"), false);

  const updateFn = actions.slice(
    actions.indexOf("function buildUpdateGymFighterPayload"),
    actions.indexOf("export async function createGymFighterDirectAction"),
  );
  assert.ok(updateFn.includes("fighterId"));
  assert.ok(updateFn.includes("status"));
  assert.equal(updateFn.includes("releaseAffiliation"), false);
  assert.equal(updateFn.includes("createLoginAccount"), false);

  assert.ok(actions.includes("releaseGymFighterAffiliationAction"));

  const bad = gymFighterCreateSchema.safeParse({
    name: "테스트",
    birthDate: "1990-01-15",
    gender: "male",
    fighterId: "x",
    status: "active",
    releaseAffiliation: "true",
  });
  assert.equal(bad.success, false);

  const good = gymFighterCreateSchema.safeParse({
    name: "테스트",
    birthDate: "1990-01-15",
    gender: "male",
  });
  assert.equal(good.success, true);

  console.log("verify:gym-fighter-create-payload: OK");
}

main();
