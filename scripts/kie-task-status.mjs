#!/usr/bin/env node
/**
 * Fetch KIE task status: node scripts/kie-task-status.mjs <taskId>
 */
import "dotenv/config";

const taskId = process.argv[2] || process.env.KIE_TASK_ID;
if (!taskId) {
  console.error("Usage: node scripts/kie-task-status.mjs <taskId>");
  process.exit(1);
}

const KIE_API_KEY = process.env.KIE_API_KEY;
if (!KIE_API_KEY) {
  console.error("KIE_API_KEY not set in env");
  process.exit(1);
}

const url = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${KIE_API_KEY}` },
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
if (!res.ok) {
  process.exit(1);
}
