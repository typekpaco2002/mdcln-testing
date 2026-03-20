-- Create SavedModel table first (required for TrainedLora foreign key)
CREATE TABLE IF NOT EXISTS SavedModel (
    id TEXT NOT NULL,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    photo1Url TEXT NOT NULL,
    photo2Url TEXT NOT NULL,
    photo3Url TEXT NOT NULL,
    thumbnail TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    isAIGenerated BOOLEAN NOT NULL DEFAULT false,
    aiGenerationParams JSONB,
    loraStatus TEXT,
    loraUrl TEXT,
    loraTriggerWord TEXT,
    loraTrainedAt TIMESTAMP(3),
    loraFalRequestId TEXT,
    loraError TEXT,
    nsfwUnlocked BOOLEAN NOT NULL DEFAULT false,
    looksUnlockedByAdmin BOOLEAN NOT NULL DEFAULT false,
    faceReferenceUrl TEXT,
    nsfwOverride BOOLEAN NOT NULL DEFAULT false,
    loraSessionPaid BOOLEAN NOT NULL DEFAULT false,
    activeLoraId TEXT,
    age INTEGER,
    savedAppearance JSONB,
    paymentIntentId TEXT,
    elevenLabsVoiceId TEXT,
    elevenLabsVoiceType TEXT,
    elevenLabsVoiceName TEXT,
    modelVoicePreviewUrl TEXT,
    CONSTRAINT SavedModel_pkey PRIMARY KEY (id)
);

-- Create indexes for SavedModel
CREATE INDEX IF NOT EXISTS SavedModel_userId_idx ON SavedModel(userId);
CREATE INDEX IF NOT EXISTS SavedModel_isAIGenerated_idx ON SavedModel(isAIGenerated);
CREATE INDEX IF NOT EXISTS SavedModel_loraStatus_idx ON SavedModel(loraStatus);

-- Create TrainedLora table
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

-- Create indexes for TrainedLora
CREATE INDEX IF NOT EXISTS TrainedLora_modelId_idx ON TrainedLora(modelId);
CREATE INDEX IF NOT EXISTS TrainedLora_status_idx ON TrainedLora(status);

-- Add foreign key constraint
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
