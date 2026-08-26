-- Additive AuditAction values for organization platform status changes (Phase 2-1)
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'organizer_status_changed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_status_changed';
