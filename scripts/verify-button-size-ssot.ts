/**
 * 업무형 Form/Button compact size SSOT 검증.
 *   npm run verify:button-size-ssot
 *
 * 금지: operational UI 의 h-11/h-12 override, size="field"
 * 예외: login / public hero / signature / mobile portal / account-setup touch
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** 스캔 루트 (업무형) */
const SCAN_DIRS = [
  "src/components/domain/brackets",
  "src/components/domain/courts",
  "src/components/domain/judges",
  "src/components/domain/events",
  "src/components/domain/credits",
  "src/components/domain/admin",
  "src/components/domain/gym",
  "src/components/domain/applications",
  "src/components/domain/organizer",
  "src/components/domain/division-templates",
  "src/components/ui/button.tsx",
];

/**
 * 경로 substring allowlist — 정상 예외.
 * login / public hero / signature / mobile touch / account setup
 */
const ALLOWLIST_PATH_SUBSTRINGS = [
  "src/components/domain/auth/",
  "src/components/domain/events/public/",
  "src/components/domain/consents/",
  "src/components/domain/gym-member-portal/",
  "src/components/domain/gym-member-self-registration/",
  "src/components/domain/fighters/FighterAccountSetupForm.tsx",
  "src/components/domain/fighters/FighterPasswordResetForm.tsx",
  "src/components/domain/gym-staff/GymStaffAccountSetupForm.tsx",
  "src/components/domain/gym-staff/GymStaffPasswordResetForm.tsx",
  "src/components/domain/gym-applications/GymApplicationInviteAcceptForm.tsx",
  "src/components/domain/association-applications/AssociationOwnerInviteAcceptForm.tsx",
  "src/components/domain/gym-join/",
  "src/components/domain/field-status/",
  "src/components/domain/gym-members/MemberFilterBar.tsx",
  "src/components/domain/gym-members/MemberDetailTabs.tsx",
  "src/components/domain/gym-members/MemberCopyPhoneButton.tsx",
  "src/components/domain/gym-members/MemberExcelImportDialog.tsx",
  "src/components/domain/gym-members/MemberLoadingSkeleton.tsx",
  "src/components/domain/member-gyms/MemberGymManualApplicationForm.tsx",
  "src/components/domain/events/OrganizerEventListTable.tsx", // poster thumb h-12, not form control
  "src/lib/ui/form-control-ui.ts",
  "src/lib/ui/auth-login-ui.ts",
];

const FORBIDDEN_HEIGHT =
  /\b(?:className|class)=\{?["'`][^"'`]*\b(?:h-11|h-12|min-h-11|min-h-12)\b/;
const FORBIDDEN_FIELD_SIZE = /\bsize=["']field["']/;

function walk(abs: string, out: string[] = []): string[] {
  const st = statSync(abs);
  if (st.isFile()) {
    if (/\.(tsx|ts)$/.test(abs)) out.push(abs);
    return out;
  }
  for (const name of readdirSync(abs)) {
    if (name === "node_modules" || name === "generated") continue;
    walk(join(abs, name), out);
  }
  return out;
}

function collectFiles(): string[] {
  const files: string[] = [];
  for (const rel of SCAN_DIRS) {
    const abs = join(ROOT, rel);
    try {
      walk(abs, files);
    } catch {
      /* missing path ok */
    }
  }
  return [...new Set(files)];
}

function isAllowlisted(relPosix: string) {
  return ALLOWLIST_PATH_SUBSTRINGS.some((s) => relPosix.includes(s.replace(/\\/g, "/")));
}

function main() {
  const violations: string[] = [];
  for (const abs of collectFiles()) {
    const rel = relative(ROOT, abs).replace(/\\/g, "/");
    if (isAllowlisted(rel)) continue;
    const src = readFileSync(abs, "utf8");
    const lines = src.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (line.includes("//") && FORBIDDEN_FIELD_SIZE.test(line) && line.trim().startsWith("//")) {
        return;
      }
      if (FORBIDDEN_HEIGHT.test(line)) {
        violations.push(`${rel}:${idx + 1}: oversized height override`);
      }
      if (FORBIDDEN_FIELD_SIZE.test(line)) {
        violations.push(`${rel}:${idx + 1}: size="field" forbidden — use default|sm|icon`);
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `button-size SSOT violations:\n${violations.join("\n")}`,
  );
  console.log(
    `verify:button-size-ssot: OK (scanned operational dirs, allowlist ${ALLOWLIST_PATH_SUBSTRINGS.length})`,
  );
}

main();
