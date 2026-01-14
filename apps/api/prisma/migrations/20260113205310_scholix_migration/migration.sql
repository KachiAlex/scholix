/*
  Warnings:

  - You are about to drop the column `schoolId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[activeSessionId]` on the table `School` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[activeTermId]` on the table `School` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CbtQuestionType" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTIPLE');

-- CreateEnum
CREATE TYPE "CbtAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'VIEW_ONLY');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'NOTICE', 'WARNING', 'ALERT');

-- CreateEnum
CREATE TYPE "ResultDraftStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_schoolId_fkey";

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "accentColor" TEXT,
ADD COLUMN     "activeSessionId" TEXT,
ADD COLUMN     "activeTermId" TEXT,
ADD COLUMN     "brandingUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "licenseExpiresAt" TIMESTAMP(3),
ADD COLUMN     "licenseNotes" TEXT,
ADD COLUMN     "licenseSeats" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "shortCode" TEXT,
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "schoolId",
ADD COLUMN     "activeSchoolId" TEXT,
ADD COLUMN     "activeSessionId" TEXT,
ADD COLUMN     "activeTermId" TEXT,
ADD COLUMN     "primarySchoolId" TEXT;

-- CreateTable
CREATE TABLE "PlatformPlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "seatPrice" INTEGER NOT NULL,
    "billingInterval" TEXT NOT NULL DEFAULT 'student/month',
    "minSeats" INTEGER NOT NULL DEFAULT 500,
    "discountPercent" INTEGER,
    "discountLabel" TEXT,
    "features" JSONB,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSchoolMembership" (
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSchoolMembership_pkey" PRIMARY KEY ("userId","schoolId")
);

-- CreateTable
CREATE TABLE "CbtQuestion" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT,
    "type" "CbtQuestionType" NOT NULL DEFAULT 'MCQ_SINGLE',
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbtQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbtQuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbtQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbtExam" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT,
    "sessionId" TEXT,
    "termId" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbtExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbtExamQuestion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbtExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbtAttempt" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "CbtAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbtAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CbtAttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbtAttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantFeatureFlag" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantAuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorId" TEXT,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "details" JSONB,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gradingConfig" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentResultDraft" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT,
    "status" "ResultDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "totalScore" DOUBLE PRECISION,
    "data" JSONB,
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentResultDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPlan_slug_key" ON "PlatformPlan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CbtExam_schoolId_name_key" ON "CbtExam"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CbtExamQuestion_examId_questionId_key" ON "CbtExamQuestion"("examId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CbtAttempt_examId_studentId_key" ON "CbtAttempt"("examId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CbtAttemptAnswer_attemptId_questionId_key" ON "CbtAttemptAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantFeatureFlag_schoolId_slug_key" ON "TenantFeatureFlag"("schoolId", "slug");

-- CreateIndex
CREATE INDEX "TenantAuditLog_schoolId_severity_idx" ON "TenantAuditLog"("schoolId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "ResultTemplate_schoolId_name_key" ON "ResultTemplate"("schoolId", "name");

-- CreateIndex
CREATE INDEX "StudentResultDraft_schoolId_status_idx" ON "StudentResultDraft"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentResultDraft_templateId_studentId_termId_key" ON "StudentResultDraft"("templateId", "studentId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "School_activeSessionId_key" ON "School"("activeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "School_activeTermId_key" ON "School"("activeTermId");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_activeSessionId_fkey" FOREIGN KEY ("activeSessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_activeTermId_fkey" FOREIGN KEY ("activeTermId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primarySchoolId_fkey" FOREIGN KEY ("primarySchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeSchoolId_fkey" FOREIGN KEY ("activeSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeSessionId_fkey" FOREIGN KEY ("activeSessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeTermId_fkey" FOREIGN KEY ("activeTermId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSchoolMembership" ADD CONSTRAINT "UserSchoolMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSchoolMembership" ADD CONSTRAINT "UserSchoolMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtQuestion" ADD CONSTRAINT "CbtQuestion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtQuestion" ADD CONSTRAINT "CbtQuestion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtQuestionOption" ADD CONSTRAINT "CbtQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CbtQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtExam" ADD CONSTRAINT "CbtExam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtExam" ADD CONSTRAINT "CbtExam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtExam" ADD CONSTRAINT "CbtExam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtExam" ADD CONSTRAINT "CbtExam_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtExam" ADD CONSTRAINT "CbtExam_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtExamQuestion" ADD CONSTRAINT "CbtExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "CbtExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtExamQuestion" ADD CONSTRAINT "CbtExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CbtQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtAttempt" ADD CONSTRAINT "CbtAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "CbtExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtAttempt" ADD CONSTRAINT "CbtAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtAttemptAnswer" ADD CONSTRAINT "CbtAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CbtAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtAttemptAnswer" ADD CONSTRAINT "CbtAttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CbtQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CbtAttemptAnswer" ADD CONSTRAINT "CbtAttemptAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "CbtQuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantFeatureFlag" ADD CONSTRAINT "TenantFeatureFlag_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantAuditLog" ADD CONSTRAINT "TenantAuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantAuditLog" ADD CONSTRAINT "TenantAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultTemplate" ADD CONSTRAINT "ResultTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultTemplate" ADD CONSTRAINT "ResultTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultTemplate" ADD CONSTRAINT "ResultTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResultDraft" ADD CONSTRAINT "StudentResultDraft_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResultDraft" ADD CONSTRAINT "StudentResultDraft_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ResultTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResultDraft" ADD CONSTRAINT "StudentResultDraft_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResultDraft" ADD CONSTRAINT "StudentResultDraft_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;
