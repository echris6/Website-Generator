/**
 * Job Worker Entry Point
 * Background job processor for AI Dashboard workflows
 */

import "dotenv/config";
import { JobWorker } from "./worker";

// Validate required environment variables
const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "VERCEL_APP_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log("================================================");
console.log("🤖 AI Dashboard Job Worker");
console.log("================================================");
console.log(`📅 Started: ${new Date().toISOString()}`);
console.log(`🔗 Vercel API: ${process.env.VERCEL_APP_URL}`);
console.log(`📦 Supabase: ${process.env.SUPABASE_URL}`);
console.log("================================================");

// Create and start worker
const worker = new JobWorker();
worker.start().catch((error) => {
  console.error("❌ Worker failed to start:", error);
  process.exit(1);
});
