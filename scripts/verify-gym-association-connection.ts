/**
 * 협회 연결 요청 모델 존재·독립 가입과 분리 검증 (스키마 SSOT).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

assert.ok(schema.includes("model AssociationGymConnectionRequest"));
assert.ok(schema.includes("model GymApplication"));
assert.ok(schema.includes("AssociationGymConnectionRequestStatus"));
assert.equal(schema.includes("associationId String"), false);

console.log("verify:gym-association-connection: OK");
