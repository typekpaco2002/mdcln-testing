-- Dedicated KIE task correlation mapping for callback-driven pipelines
CREATE TABLE "KieTask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'kie',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "step" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "outputUrl" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "KieTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KieTask_taskId_key" ON "KieTask"("taskId");
CREATE INDEX "KieTask_entityType_entityId_idx" ON "KieTask"("entityType", "entityId");
CREATE INDEX "KieTask_status_createdAt_idx" ON "KieTask"("status", "createdAt");
CREATE INDEX "KieTask_userId_createdAt_idx" ON "KieTask"("userId", "createdAt");
