-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('GOOGLE', 'TICKTICK');

-- CreateEnum
CREATE TYPE "DigestType" AS ENUM ('EMAIL', 'NEWS', 'PORTFOLIO');

-- CreateTable
CREATE TABLE "OAuthCredential" (
    "provider" "Provider" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthCredential_pkey" PRIMARY KEY ("provider")
);

-- CreateTable
CREATE TABLE "Digest" (
    "id" TEXT NOT NULL,
    "type" "DigestType" NOT NULL,
    "date" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Digest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Digest_type_date_idx" ON "Digest"("type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Digest_type_date_key" ON "Digest"("type", "date");
