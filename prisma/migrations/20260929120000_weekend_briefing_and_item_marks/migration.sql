-- CreateTable
CREATE TABLE "WeekendBriefing" (
    "weekOf" DATE NOT NULL,
    "visibleUntil" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekendBriefing_pkey" PRIMARY KEY ("weekOf")
);

-- CreateTable
CREATE TABLE "ItemMark" (
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemMark_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ItemMark_date_idx" ON "ItemMark"("date");
