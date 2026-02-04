"use strict";
/**
 * Job Worker - Processes background jobs from the queue
 *
 * This worker polls the job_queue table and calls the Vercel API
 * to execute the actual task orchestration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobWorker = void 0;
const uuid_1 = require("uuid");
const supabase_1 = require("./supabase");
const types_1 = require("./types");
const POLL_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const VERCEL_APP_URL = process.env.VERCEL_APP_URL || "http://localhost:3002";
class JobWorker {
    workerId;
    isShuttingDown = false;
    currentJob = null;
    heartbeatTimer = null;
    constructor() {
        this.workerId = `worker-${process.env.RAILWAY_REPLICA_ID || (0, uuid_1.v4)().slice(0, 8)}`;
        console.log(`🔧 Worker initialized with ID: ${this.workerId}`);
    }
    /**
     * Start the worker loop
     */
    async start() {
        console.log("🚀 Starting job worker...");
        console.log(`📡 Vercel API URL: ${VERCEL_APP_URL}`);
        // Handle graceful shutdown
        process.on("SIGTERM", () => this.shutdown());
        process.on("SIGINT", () => this.shutdown());
        while (!this.isShuttingDown) {
            try {
                // Check for pending jobs
                const job = await this.claimNextJob();
                if (job) {
                    console.log(`📋 Claimed job ${job.id}: "${job.command_text}"`);
                    await this.executeJob(job);
                }
                else {
                    // No jobs - wait before polling again
                    await this.sleep(POLL_INTERVAL);
                }
            }
            catch (error) {
                console.error("❌ Worker loop error:", error);
                await this.sleep(POLL_INTERVAL * 2); // Wait longer on error
            }
        }
        console.log("👋 Worker stopped");
    }
    /**
     * Graceful shutdown
     */
    shutdown() {
        console.log("🛑 Shutdown signal received...");
        this.isShuttingDown = true;
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        // If we have a current job, mark it for retry
        if (this.currentJob) {
            console.log(`⏸️ Releasing job ${this.currentJob.id} for retry...`);
            // The job will be picked up by another worker or marked as stale
        }
    }
    /**
     * Claim the next pending job (atomic operation)
     */
    async claimNextJob() {
        const supabase = (0, supabase_1.getSupabase)();
        // Use atomic update to claim job
        const { data, error } = await supabase
            .from("job_queue")
            .update({
            status: "running",
            worker_id: this.workerId,
            started_at: new Date().toISOString(),
            heartbeat_at: new Date().toISOString(),
        })
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1)
            .select()
            .single();
        if (error) {
            // No pending jobs (PGRST116) is normal
            if (error.code !== "PGRST116") {
                console.error("Error claiming job:", error.message);
            }
            return null;
        }
        return data;
    }
    /**
     * Execute a job by calling the Vercel API
     */
    async executeJob(job) {
        this.currentJob = job;
        // Start heartbeat
        this.startHeartbeat(job.id);
        try {
            // Update initial progress
            await this.updateProgress(job.id, 0, "scraping", "Starting workflow...");
            // Call the Vercel API to execute the command
            // This calls the existing /api/ai/command endpoint which handles the full workflow
            const result = await this.executeViaVercelAPI(job);
            // Mark job as completed
            await this.completeJob(job.id, result);
            console.log(`✅ Job ${job.id} completed successfully`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`❌ Job ${job.id} failed:`, errorMessage);
            await this.failJob(job.id, errorMessage);
        }
        finally {
            this.stopHeartbeat();
            this.currentJob = null;
        }
    }
    /**
     * Execute job via Vercel API
     * This calls the existing task orchestrator through the API
     */
    async executeViaVercelAPI(job) {
        // First, create the command record
        const commandResponse = await fetch(`${VERCEL_APP_URL}/api/ai/command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                command: job.command_text,
                userId: job.user_id,
                organizationId: job.organization_id,
                startExecution: false, // Don't start execution yet
            }),
        });
        if (!commandResponse.ok) {
            throw new Error(`Failed to create command: ${commandResponse.statusText}`);
        }
        const commandData = (await commandResponse.json());
        const commandId = commandData.commandId;
        // Update job with command ID
        await this.updateJobCommandId(job.id, commandId);
        // Trigger execution with template if specified
        const executeResponse = await fetch(`${VERCEL_APP_URL}/api/ai/command`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                commandId,
                templateId: job.parsed_params.templateName,
            }),
        });
        if (!executeResponse.ok) {
            throw new Error(`Failed to start execution: ${executeResponse.statusText}`);
        }
        // Poll for completion
        const result = await this.pollForCompletion(commandId, job.id);
        return result;
    }
    /**
     * Poll the command status until completion
     */
    async pollForCompletion(commandId, jobId) {
        const maxAttempts = 600; // 10 minutes at 1 second intervals
        let attempts = 0;
        while (attempts < maxAttempts && !this.isShuttingDown) {
            // Check if job was cancelled
            if (await this.isJobCancelled(jobId)) {
                throw new Error("Job cancelled by user");
            }
            // Fetch command status
            const response = await fetch(`${VERCEL_APP_URL}/api/ai/command?limit=1`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) {
                attempts++;
                await this.sleep(2000);
                continue;
            }
            const data = (await response.json());
            const command = data.commands?.find((c) => c.id === commandId);
            if (!command) {
                attempts++;
                await this.sleep(2000);
                continue;
            }
            // Update job progress based on command status
            await this.syncProgressFromCommand(jobId, command);
            // Check if completed
            if (command.status === "completed") {
                return command.result || { success: true, steps: [] };
            }
            // Check if failed
            if (command.status === "failed") {
                throw new Error(command.error_message || "Command execution failed");
            }
            attempts++;
            await this.sleep(1000); // Poll every 1 second
        }
        throw new Error("Job execution timeout");
    }
    /**
     * Sync job progress from command status
     */
    async syncProgressFromCommand(jobId, command) {
        if (!command.result?.steps?.length)
            return;
        const steps = command.result.steps;
        const currentStepData = steps[steps.length - 1];
        if (currentStepData) {
            const step = this.mapStepName(currentStepData.step);
            const progress = (0, types_1.calculateOverallProgress)(step, currentStepData.progress || 0);
            await this.updateProgress(jobId, progress, step, currentStepData.message || `Processing ${step}...`);
        }
    }
    /**
     * Map step names to JobStep type
     */
    mapStepName(step) {
        const mapping = {
            scraping: "scraping",
            scrape: "scraping",
            enrich_social: "enrich_social",
            enrich_emails: "enrich_emails",
            website_generation: "website_generation",
            "website-generation": "website_generation",
            video_generation: "video_generation",
            "video-generation": "video_generation",
            outreach: "outreach",
            send_outreach: "outreach",
        };
        return mapping[step] || "scraping";
    }
    /**
     * Update job progress in database
     */
    async updateProgress(jobId, progress, step, detail) {
        const supabase = (0, supabase_1.getSupabase)();
        await supabase
            .from("job_queue")
            .update({
            progress,
            current_step: step,
            current_step_detail: detail,
            heartbeat_at: new Date().toISOString(),
        })
            .eq("id", jobId);
    }
    /**
     * Update job with command ID
     */
    async updateJobCommandId(jobId, commandId) {
        const supabase = (0, supabase_1.getSupabase)();
        await supabase
            .from("job_queue")
            .update({ command_id: commandId })
            .eq("id", jobId);
    }
    /**
     * Mark job as completed
     */
    async completeJob(jobId, result) {
        const supabase = (0, supabase_1.getSupabase)();
        await supabase
            .from("job_queue")
            .update({
            status: "completed",
            progress: 100,
            result,
            completed_at: new Date().toISOString(),
        })
            .eq("id", jobId);
    }
    /**
     * Mark job as failed
     */
    async failJob(jobId, errorMessage) {
        const supabase = (0, supabase_1.getSupabase)();
        // Get current retry count
        const { data: job } = await supabase
            .from("job_queue")
            .select("retry_count, max_retries")
            .eq("id", jobId)
            .single();
        const retryCount = (job?.retry_count || 0) + 1;
        const shouldRetry = retryCount < (job?.max_retries || 3);
        await supabase
            .from("job_queue")
            .update({
            status: shouldRetry ? "pending" : "failed",
            error_message: errorMessage,
            retry_count: retryCount,
            worker_id: null,
            ...(shouldRetry ? {} : { completed_at: new Date().toISOString() }),
        })
            .eq("id", jobId);
        if (shouldRetry) {
            console.log(`🔄 Job ${jobId} will be retried (${retryCount}/${job?.max_retries})`);
        }
    }
    /**
     * Check if job was cancelled
     */
    async isJobCancelled(jobId) {
        const supabase = (0, supabase_1.getSupabase)();
        const { data } = await supabase
            .from("job_queue")
            .select("status")
            .eq("id", jobId)
            .single();
        return data?.status === "cancelled";
    }
    /**
     * Start heartbeat updates
     */
    startHeartbeat(jobId) {
        this.heartbeatTimer = setInterval(async () => {
            try {
                const supabase = (0, supabase_1.getSupabase)();
                await supabase
                    .from("job_queue")
                    .update({ heartbeat_at: new Date().toISOString() })
                    .eq("id", jobId);
            }
            catch (error) {
                console.error("Heartbeat update failed:", error);
            }
        }, HEARTBEAT_INTERVAL);
    }
    /**
     * Stop heartbeat updates
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.JobWorker = JobWorker;
//# sourceMappingURL=worker.js.map