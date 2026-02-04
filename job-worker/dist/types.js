"use strict";
/**
 * Types for job worker
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STEP_PROGRESS = void 0;
exports.calculateOverallProgress = calculateOverallProgress;
// Step progress allocation
exports.STEP_PROGRESS = {
    scraping: [0, 20],
    enrich_social: [20, 30],
    enrich_emails: [30, 45],
    website_generation: [45, 80],
    video_generation: [80, 90],
    outreach: [90, 100],
};
/**
 * Calculate overall progress from step progress
 */
function calculateOverallProgress(step, stepProgress) {
    const [start, end] = exports.STEP_PROGRESS[step];
    return Math.round(start + (end - start) * (stepProgress / 100));
}
//# sourceMappingURL=types.js.map