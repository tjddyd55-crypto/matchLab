/**
 * extractMatchWeightFromMemo
 *   npm run verify:match-weight-from-memo
 */
import assert from "node:assert/strict";
import { extractMatchWeightFromMemo } from "../src/lib/brackets/extract-match-weight-from-memo";

function main() {
  assert.equal(extractMatchWeightFromMemo("68kg"), "68kg");
  assert.equal(extractMatchWeightFromMemo("68 kg"), "68kg");
  assert.equal(extractMatchWeightFromMemo("42.5kg"), "42.5kg");
  assert.equal(extractMatchWeightFromMemo("42.5 KG"), "42.5kg");
  assert.equal(extractMatchWeightFromMemo("68KG"), "68kg");
  assert.equal(extractMatchWeightFromMemo("68kg / 3라운드 진행"), "68kg");
  assert.equal(extractMatchWeightFromMemo("계체 68kg / 목표 66kg"), "68kg");
  assert.equal(extractMatchWeightFromMemo("결승 경기"), null);
  assert.equal(extractMatchWeightFromMemo("운영 확인"), null);
  assert.equal(extractMatchWeightFromMemo(""), null);
  assert.equal(extractMatchWeightFromMemo(null), null);
  assert.equal(extractMatchWeightFromMemo(undefined), null);
  console.log("verify:match-weight-from-memo OK");
}

main();
