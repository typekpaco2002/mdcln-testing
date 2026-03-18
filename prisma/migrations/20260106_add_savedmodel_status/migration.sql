-- AlterTable: Add status column to SavedModel for tracking async model generation
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'SavedModel' AND column_name = 'status'
    ) THEN
        ALTER TABLE "SavedModel" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ready';
    END IF;
END $$;
