import { defineRailway, project, service } from "railway/iac";

/**
 * MATCHON Railway IaC SSOT (replaces deprecated railway.json).
 *
 * Deploy order per release:
 *   1. build  — npm ci → npm run build (db:generate && next build)
 *   2. preDeploy — npm run db:migrate:gate (migrate status → migrate deploy)
 *   3. start  — npm start (next start)
 *
 * preDeploy failure aborts the deployment (fail-fast). Never db push / migrate dev.
 *
 * Apply after editing: railway config plan && railway config apply
 */
export const partial = "app";

export default defineRailway(() => {
  const app = service("app", {
    build: "npm run build",
    start: "npm start",
    preDeploy: "npm run db:migrate:gate",
  });

  return project("matchon", {
    resources: [app],
  });
});
