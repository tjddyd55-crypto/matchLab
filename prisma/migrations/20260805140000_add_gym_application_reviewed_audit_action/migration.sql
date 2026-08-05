-- Additive: ensure gym application review audit action exists.
-- Production previously had association_application_reviewed only.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_application_reviewed';
