import prisma from "../lib/prisma.js";
import { isR2Configured } from "../utils/r2.js";
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const BACKUP_PREFIX = "private-backups/";

function getR2Client() {
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

export class BackupService {
  static async createBackup() {
    try {
      const client = getR2Client();
      if (!client) {
        throw new Error("R2 not configured — cannot create backup");
      }

      const timestamp = new Date().toISOString();
      
      const [users, models, generations, creditTransactions] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            credits: true,
            role: true,
            isVerified: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            createdAt: true
          }
        }),
        prisma.model.findMany(),
        prisma.generation.findMany(),
        prisma.creditTransaction.findMany()
      ]);

      const backup = {
        timestamp,
        version: '1.0',
        data: {
          users,
          models,
          generations,
          creditTransactions
        },
        stats: {
          totalUsers: users.length,
          totalModels: models.length,
          totalGenerations: generations.length,
          totalTransactions: creditTransactions.length,
          totalCredits: users.reduce((sum, u) => sum + u.credits, 0)
        }
      };

      const backupJson = JSON.stringify(backup, null, 2);
      const backupFileName = `backup_${Date.now()}.json`;
      const key = `${BACKUP_PREFIX}${backupFileName}`;

      await client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: Buffer.from(backupJson),
        ContentType: "application/json",
      }));

      console.log(`✅ Backup created (private): ${backupFileName}`);
      console.log(`📊 Stats: ${backup.stats.totalUsers} users, ${backup.stats.totalCredits} total credits`);

      return {
        success: true,
        backup,
        fileName: backupFileName
      };
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      throw error;
    }
  }

  static async restoreCreditsFromBackup(backupData) {
    try {
      if (!backupData || !backupData.data || !backupData.data.users) {
        throw new Error('Invalid backup data format');
      }

      const restored = [];
      const notFound = [];

      for (const backupUser of backupData.data.users) {
        const currentUser = await prisma.user.findUnique({
          where: { email: backupUser.email }
        });

        if (currentUser) {
          await prisma.user.update({
            where: { id: currentUser.id },
            data: { credits: backupUser.credits }
          });
          
          restored.push({
            email: backupUser.email,
            restoredCredits: backupUser.credits
          });
        } else {
          notFound.push(backupUser.email);
        }
      }

      console.log(`✅ Restored credits for ${restored.length} users`);
      if (notFound.length > 0) {
        console.log(`⚠️  ${notFound.length} users from backup not found in current database`);
      }

      return {
        success: true,
        restored,
        notFound,
        stats: {
          totalRestored: restored.length,
          notFoundCount: notFound.length
        }
      };
    } catch (error) {
      console.error('❌ Credit restoration failed:', error);
      throw error;
    }
  }

  static async getBackupHistory() {
    try {
      const client = getR2Client();
      if (!client) {
        console.warn("⚠️ R2 not configured — skipping backup history");
        return [];
      }

      const command = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: BACKUP_PREFIX,
        MaxKeys: 50,
      });

      const result = await client.send(command);
      const contents = result.Contents || [];

      const backups = contents
        .filter(obj => obj.Key.endsWith(".json"))
        .map(obj => ({
          fileName: obj.Key.split("/").pop(),
          createdAt: obj.LastModified?.toISOString() || "",
          key: obj.Key,
          size: obj.Size || 0,
        }));

      return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('❌ Failed to fetch backup history:', error);
      return [];
    }
  }

  static async downloadBackup(key) {
    try {
      const client = getR2Client();
      if (!client) {
        throw new Error("R2 not configured");
      }

      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      });

      const result = await client.send(command);
      const chunks = [];
      for await (const chunk of result.Body) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString("utf-8");
      return JSON.parse(body);
    } catch (error) {
      console.error('❌ Failed to download backup:', error);
      throw error;
    }
  }
}
