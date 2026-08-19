-- 선수 전적 구조화 + 학년 구조화 + EventApplication snapshot additive migration
-- 기존 필드(recordText, careerText, recordWin, recordLoss, recordDraw, grade) 유지

-- Fighter: 구조화 학교급/학년 추가
ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "schoolLevel"      TEXT;
ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "schoolGrade"      INTEGER;
-- Fighter: 총경기수 캐시 추가 (recordWin + recordLoss + recordDraw 재집계 시 함께 갱신)
ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "recordTotalBouts" INTEGER NOT NULL DEFAULT 0;
-- Fighter: 화면 표시용 전적 텍스트 (기존 EventApplication.recordText 와 별개)
ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "recordText"       TEXT;
ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "careerText"       TEXT;

-- EventApplication: 구조화 전적 snapshot (신청 당시 SSOT — Fighter 전적 변경과 독립)
ALTER TABLE "EventApplication" ADD COLUMN IF NOT EXISTS "totalBoutsSnapshot"  INTEGER;
ALTER TABLE "EventApplication" ADD COLUMN IF NOT EXISTS "winsSnapshot"        INTEGER;
ALTER TABLE "EventApplication" ADD COLUMN IF NOT EXISTS "drawsSnapshot"       INTEGER;
ALTER TABLE "EventApplication" ADD COLUMN IF NOT EXISTS "lossesSnapshot"      INTEGER;
-- EventApplication: 구조화 학년 snapshot
ALTER TABLE "EventApplication" ADD COLUMN IF NOT EXISTS "schoolLevelSnapshot" TEXT;
ALTER TABLE "EventApplication" ADD COLUMN IF NOT EXISTS "schoolGradeSnapshot" INTEGER;

-- 기존 recordTotalBouts 캐시 초기값 동기화 (신규 배포 직후 1회 실행)
UPDATE "Fighter"
SET "recordTotalBouts" = "recordWin" + "recordLoss" + "recordDraw"
WHERE "recordTotalBouts" = 0
  AND ("recordWin" > 0 OR "recordLoss" > 0 OR "recordDraw" > 0);
