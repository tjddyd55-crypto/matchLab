-- EventApplication structural field changes (divisionId, gender)
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'event_application_structural_changed';
