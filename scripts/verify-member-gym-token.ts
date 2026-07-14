/**
 * 회원사 가입 링크 토큰 해시 순수 검증 (DB 불필요).
 * 실행: npx tsx scripts/verify-member-gym-token.ts
 */
import {
  generateMemberGymJoinToken,
  hashMemberGymJoinToken,
  memberGymJoinTokensEqual,
} from "../src/lib/member-gym/token";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const token = generateMemberGymJoinToken();
assert(token.length === 48, "token length");
const hash = hashMemberGymJoinToken(token);
assert(hash.length === 64, "sha256 hex length");
assert(memberGymJoinTokensEqual(token, hash), "equal match");
assert(!memberGymJoinTokensEqual("0".repeat(48), hash), "mismatch");
assert(
  hashMemberGymJoinToken(token) === hashMemberGymJoinToken(` ${token} `),
  "trim",
);

console.log("verify-member-gym-token: ALL PASS");
