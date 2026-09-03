-- The Digest table only ever held test/sample data posted during development
-- (fake email/news/portfolio content used to screenshot the UI) — none of it
-- is real user data, and the new payload shape is a complete restructure, not
-- a compatible evolution, so this replaces the table rather than migrating
-- rows in place.
DROP TABLE "Digest";
DROP TYPE "DigestType";

-- CreateTable
CREATE TABLE "Briefing" (
    "date" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Briefing_pkey" PRIMARY KEY ("date")
);
