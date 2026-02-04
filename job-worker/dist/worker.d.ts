/**
 * Job Worker - Processes background jobs from the queue
 *
 * This worker polls the job_queue table and calls the Vercel API
 * to execute the actual task orchestration.
 */
export declare class JobWorker {
    private workerId;
    private isShuttingDown;
    private currentJob;
    private heartbeatTimer;
    constructor();
    /**
     * Start the worker loop
     */
    start(): Promise<void>;
    /**
     * Graceful shutdown
     */
    private shutdown;
    /**
     * Claim the next pending job (atomic operation)
     */
    private claimNextJob;
    /**
     * Execute a job by calling the Vercel API
     */
    private executeJob;
    /**
     * Execute job via Vercel API
     * This calls the existing task orchestrator through the API
     */
    private executeViaVercelAPI;
    /**
     * Poll the command status until completion
     */
    private pollForCompletion;
    /**
     * Sync job progress from command status
     */
    private syncProgressFromCommand;
    /**
     * Map step names to JobStep type
     */
    private mapStepName;
    /**
     * Update job progress in database
     */
    private updateProgress;
    /**
     * Update job with command ID
     */
    private updateJobCommandId;
    /**
     * Mark job as completed
     */
    private completeJob;
    /**
     * Mark job as failed
     */
    private failJob;
    /**
     * Check if job was cancelled
     */
    private isJobCancelled;
    /**
     * Start heartbeat updates
     */
    private startHeartbeat;
    /**
     * Stop heartbeat updates
     */
    private stopHeartbeat;
    /**
     * Sleep helper
     */
    private sleep;
}
//# sourceMappingURL=worker.d.ts.map