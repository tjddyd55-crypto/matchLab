-- Fighter 기존/외부 전적 필드 추가 (additive only — data backfill/update 없음)
-- externalRecord* = Career SSOT layer A (MATCHON 이전·외부 대회)
-- Fighter.record* = MatchResult 재집계 캐시 (변경 없음)

ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "externalRecordWin"       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "externalRecordLoss"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "externalRecordDraw"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "externalRecordNoContest" INTEGER NOT NULL DEFAULT 0;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'fighter_external_record_updated';
