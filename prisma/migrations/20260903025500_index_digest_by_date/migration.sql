-- DropIndex
-- Redundant: the unique constraint on (type, date) already provides this index.
DROP INDEX "Digest_type_date_idx";

-- CreateIndex
-- For "everything on this date" lookups (the date-picker history view).
CREATE INDEX "Digest_date_idx" ON "Digest"("date");
