-- TrainedLora table creation SQL (fixed version)
-- Run this if the table doesn't exist

CREATE TABLE TrainedLora (
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
CREATE INDEX TrainedLora_modelId_idx ON TrainedLora(modelId);
CREATE INDEX TrainedLora_status_idx ON TrainedLora(status);

-- Add foreign key constraint
ALTER TABLE TrainedLora 
ADD CONSTRAINT TrainedLora_modelId_fkey 
FOREIGN KEY (modelId) 
REFERENCES SavedModel(id) 
ON DELETE CASCADE;
