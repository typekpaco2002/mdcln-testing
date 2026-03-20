-- TrainedLora table creation SQL
-- Based on Prisma schema.prisma

CREATE TABLE IF NOT EXISTS TrainedLora (
    id TEXT NOT NULL,
    modelId TEXT NOT NULL,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'awaiting_images',
    loraUrl TEXT,
    triggerWord TEXT,
    trainedAt TIMESTAMP(3),
    falRequestId TEXT,
    error TEXT,
    faceReferenceUrl TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL,
    defaultAppearance JSONB,
    trainingMode TEXT NOT NULL DEFAULT 'standard',

    CONSTRAINT TrainedLora_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS TrainedLora_modelId_idx ON TrainedLora(modelId);
CREATE INDEX IF NOT EXISTS TrainedLora_status_idx ON TrainedLora(status);

-- Add foreign key constraint (only if SavedModel table exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'TrainedLora_modelId_fkey'
    ) THEN
        ALTER TABLE TrainedLora 
        ADD CONSTRAINT TrainedLora_modelId_fkey 
        FOREIGN KEY (modelId) 
        REFERENCES SavedModel(id) 
        ON DELETE CASCADE;
    END IF;
END $$;
