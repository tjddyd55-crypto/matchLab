import { BracketMatchStatus } from "../src/generated/prisma";
import {
  countQueueMatchesUntilTarget,
  pickOperationSpotlightMatches,
} from "../src/lib/match-operation-display";

function assert(name: string, ok: boolean) {
  if (!ok) {
    console.error(`FAIL: ${name}`);
    process.exit(1);
  }
  console.log(`OK: ${name}`);
}

const rows = [
  { matchId: "m18", status: BracketMatchStatus.ongoing, hasOfficialResults: false },
  { matchId: "m19", status: BracketMatchStatus.waiting, hasOfficialResults: false },
  { matchId: "m20", status: BracketMatchStatus.waiting, hasOfficialResults: false },
  { matchId: "m21", status: BracketMatchStatus.cancelled, hasOfficialResults: false },
  { matchId: "m22", status: BracketMatchStatus.called, hasOfficialResults: false },
  { matchId: "m23", status: BracketMatchStatus.waiting, hasOfficialResults: false },
];

const spotlight = pickOperationSpotlightMatches(rows);
assert("spotlight current is ongoing", spotlight.current?.matchId === "m18");
const until = countQueueMatchesUntilTarget(rows, "m23");
assert("queue until target counts active queue only (19,20,22 = 3)", until === 3);

console.log("my-match queue QA: all checks passed");
