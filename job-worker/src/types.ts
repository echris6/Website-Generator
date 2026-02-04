/**
 * Types for job worker
 */

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type JobStep =
  | "scraping"
  | "enrich_social"
  | "enrich_emails"
  | "website_generation"
  | "video_generation"
  | "outreach";

export interface Job {
  id: string;
  user_id: string;
  organization_id: string | null;
  command_id: string | null;
  command_text: string;
  parsed_intent: string;
  parsed_params: ParsedParams;
  status: JobStatus;
  progress: number;
  current_step: JobStep | null;
  current_step_detail: string | null;
  result: TaskResult | null;
  error_message: string | null;
  worker_id: string | null;
  heartbeat_at: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ParsedParams {
  industry?: string;
  location?: string;
  count?: number;
  websiteCount?: number;
  outreachCount?: number;
  generateWebsites?: boolean;
  enrichSocialMedia?: boolean;
  enrichEmails?: boolean;
  sendOutreach?: boolean;
  requireWebsite?: boolean;
  minRating?: number;
  minReviews?: number;
  maxReviews?: number;
  templateName?: string;
  language?: string;
  websiteFilter?: {
    type: "top" | "rated_above" | "with_email" | "all";
    value?: number;
  };
  outreachFilter?: {
    type: "all" | "top" | "specific_count";
    value?: number;
  };
  [key: string]: unknown;
}

export interface TaskProgress {
  step: JobStep;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  message?: string;
  error?: string;
  data?: unknown[];
  count?: number;
}

export interface TaskResult {
  success: boolean;
  leadsScraped?: number;
  businesses?: Business[];
  websitesGenerated?: number;
  websites?: Website[];
  outreachSent?: number;
  outreachReady?: boolean;
  outreachBusinesses?: Business[];
  campaignId?: string;
  error?: string;
  steps: TaskProgress[];
}

export interface Business {
  id?: string;
  google_place_id?: string;
  business_name: string;
  full_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  category?: string;
  rating?: number;
  review_count?: number;
  phone?: string;
  website?: string;
  email?: string;
  instagram_handle?: string;
  instagram_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

export interface Website {
  id: string;
  business_name: string;
  business_city?: string;
  html_url?: string;
  video_url?: string;
  video_status?: string;
  deployed_url?: string;
  instagram_handle?: string;
  instagram_url?: string;
  facebook_url?: string;
  [key: string]: unknown;
}

// Progress callback type
export type ProgressCallback = (
  progress: number,
  step: JobStep,
  detail: string
) => Promise<void>;

// Step progress allocation
export const STEP_PROGRESS: Record<JobStep, [number, number]> = {
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
export function calculateOverallProgress(
  step: JobStep,
  stepProgress: number
): number {
  const [start, end] = STEP_PROGRESS[step];
  return Math.round(start + (end - start) * (stepProgress / 100));
}
