-- 1차 최소 신청: 생년월일 미입력 허용 (Development additive only)
ALTER TABLE "Fighter" ALTER COLUMN "birthDate" DROP NOT NULL;
