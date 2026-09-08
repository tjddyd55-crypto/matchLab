/**
 * 대회 종료 lifecycle 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const schema = read("prisma/schema.prisma");
assert.match(schema, /model Event \{[\s\S]*completedAt\s+DateTime\?/);

const eventService = read("src/lib/services/event.service.ts");
assert.match(eventService, /EventStatus\.finished.*EventStatus\.ongoing/);
assert.match(eventService, /completedAt/);
assert.match(eventService, /lifecycle: "EVENT_COMPLETED"/);
assert.match(eventService, /lifecycle: "EVENT_REOPENED"/);

const guard = read("src/lib/event-completion-guard.ts");
assert.match(guard, /assertEventWritable/);

const labels = read("src/lib/event-organizer-status.ts");
assert.match(labels, /finished: "대회 종료"/);

const panel = read("src/components/domain/events/EventCompletionPanel.tsx");
assert.match(panel, /대회 종료/);
assert.match(panel, /대회 종료 해제/);

console.log("verify:event-completion-lifecycle: OK");
