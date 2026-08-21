-- Additive: EventApplication 추가정보 수신번호 snapshot (Development yamanote)
-- Production 금지. 기존 row는 null 허용 (소급 채우지 않음).

ALTER TABLE "EventApplication"
  ADD COLUMN IF NOT EXISTS "additionalInfoRecipientPhone" TEXT;
