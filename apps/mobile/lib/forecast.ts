/**
 * @hi-hired/mobile — Offer-Potential Forecasting library.
 *
 * Provides match-score fetching from the backend API with graceful
 * fallback to a local heuristic when the backend is unavailable.
 */

const DEFAULT_API_BASE = (globalThis as any).EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchScoreResult {
  score: number;
  matching_skills: string[];
  missing_skills: string[];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ScoredJobItem {
  job: Record<string, any>;
  score: number;
  matching_skills: string[];
  missing_skills: string[];
}

export interface BatchScoreResult {
  results: ScoredJobItem[];
  total: number;
}

export interface UserProfileInput {
  user_id: string;
  skills: string[];
  suburb?: string;
  expected_salary?: number | null;
  preferred_type?: string | null;
  industry_preferences?: string[];
}

// ---------------------------------------------------------------------------
// Local heuristic fallback (mirrors the backend's _heuristic_score logic)
// ---------------------------------------------------------------------------

function _calculateSkillOverlap(userSkills: Set<string>, requiredSkills: Set<string>): { overlap: number; matching: string[]; missing: string[] } {
  const matching = [...userSkills].filter((s) => requiredSkills.has(s));
  const missing = [...requiredSkills].filter((s) => !userSkills.has(s));
  const union = new Set([...userSkills, ...requiredSkills]);
  const overlap = union.size > 0 ? matching.length / union.size : 0;
  return { overlap, matching, missing };
}

function _calculateSalaryAlignment(profileSalary: number | null | undefined, jobSalaryMax?: number): number {
  if (profileSalary == null || jobSalaryMax == null || jobSalaryMax <= 0) return 0;
  if (profileSalary <= jobSalaryMax) return 1;
  const ratio = profileSalary / jobSalaryMax;
  return Math.max(0, 2 - ratio);
}

function _calculateLocationMatch(profileSuburb: string | undefined, jobSuburb?: string): number {
  const normalized = (s: string | undefined) => (s ?? '').trim().toLowerCase();
  const profile = normalized(profileSuburb);
  const job = normalized(jobSuburb);
  return profile && job && profile === job ? 1 : 0;
}

function _calculateTypeMatch(preferredType: string | null | undefined, jobType?: string): number {
  return preferredType && jobType && preferredType === jobType ? 1 : 0;
}

function _determineConfidence(score: number): 'high' | 'medium' | 'low' {
  return score >= 0.85 ? 'high' : score >= 0.6 ? 'medium' : 'low';
}

function _buildReasoning(score: number, confidence: 'high' | 'medium' | 'low', matching: string[], missing: string[]): string {
  const parts: string[] = [];
  if (matching.length > 0) parts.push(`matches ${matching.length} skill${matching.length !== 1 ? 's' : ''}`);
  if (missing.length > 0) parts.push(`missing ${missing.length} skill${missing.length !== 1 ? 's' : ''}`);
  if (matching.length === 0 && missing.length === 0) parts.push('no skill data to evaluate');
  const verdict = score >= 0.7 ? 'Strong match' : score >= 0.4 ? 'Moderate match' : 'Weak match';
  return `${verdict} (${confidence} confidence) — ${parts.join('; ')}.`;
}

function _localHeuristicScore(
  profile: UserProfileInput,
  jobSkills: string[],
  jobSuburb?: string,
  jobSalaryMax?: number,
  jobEmploymentType?: string,
): MatchScoreResult {
  const userSkills = new Set(profile.skills.map((s) => s.trim().toLowerCase()));
  const requiredSkills = new Set(jobSkills.map((s) => s.trim().toLowerCase()));

  const { overlap: skillOverlap, matching, missing } = _calculateSkillOverlap(userSkills, requiredSkills);
  const salaryAlignment = _calculateSalaryAlignment(profile.expected_salary, jobSalaryMax);
  const locationMatch = _calculateLocationMatch(profile.suburb, jobSuburb);
  const typeMatch = _calculateTypeMatch(profile.preferred_type, jobEmploymentType);

  const score = Math.max(0, Math.min(1,
    skillOverlap * 0.45 +
    salaryAlignment * 0.30 +
    locationMatch * 0.15 +
    typeMatch * 0.10
  ));

  const confidence = _determineConfidence(score);
  const reasoning = _buildReasoning(score, confidence, matching, missing);

  return {
    score: Math.round(score * 10000) / 10000,
    matching_skills: matching,
    missing_skills: missing,
    confidence,
    reasoning,
  };
}

// ---------------------------------------------------------------------------
// Backend API calls
// ---------------------------------------------------------------------------

/**
 * Extract skills from a job object regardless of its shape.
 * Handles both the backend NormalizedJob format (requirements[]) and
 * the database Job format (description text).
 */
function _extractJobSkills(job: Record<string, any>): string[] {
  if (Array.isArray(job.requirements)) {
    return job.requirements
      .map((r: any) => (typeof r === 'string' ? r : r.name ?? ''))
      .filter(Boolean);
  }
  if (job.description) {
    // Fallback: extract common tech/role keywords from description
    const matches = (job.description.match(/\b\w+\b/g) ?? []) as string[];
    return [...new Set(matches.slice(0, 20))]; // cap at 20
  }
  return [];
}

/**
 * Fetch a single match score from the backend API.
 * Falls back to local heuristic if the backend is unreachable.
 */
export async function fetchMatchScore(
  userProfile: UserProfileInput,
  jobId: string,
  job: Record<string, any>,
  apiBase: string = DEFAULT_API_BASE,
): Promise<MatchScoreResult> {
  try {
    const resp = await fetch(`${apiBase}/api/v1/forecast/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        user_profile: userProfile,
        job,
      }),
    });

    if (!resp.ok) {
      console.warn(`[forecast] backend returned ${resp.status}, falling back to local`);
      return _fallbackScore(userProfile, job);
    }

    return await resp.json();
  } catch (err) {
    console.warn('[forecast] backend unreachable, using local heuristic', err);
    return _fallbackScore(userProfile, job);
  }
}

/**
 * Fetch top N matches for a user profile against a set of jobs.
 * Falls back to local scoring if the backend is unavailable.
 */
export async function fetchTopMatches(
  userProfile: UserProfileInput,
  jobs: Record<string, any>[],
  options?: {
    limit?: number;
    apiBase?: string;
  },
): Promise<ScoredJobItem[]> {
  const limit = options?.limit ?? 10;
  const apiBase = options?.apiBase ?? DEFAULT_API_BASE;

  try {
    const resp = await fetch(`${apiBase}/api/v1/forecast/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_profile: userProfile,
        jobs,
      }),
    });

    if (!resp.ok) {
      console.warn(`[forecast] batch backend returned ${resp.status}, falling back to local`);
      return _localBatchScore(userProfile, jobs, limit);
    }

    const data: BatchScoreResult = await resp.json();
    return data.results.slice(0, limit);
  } catch (err) {
    console.warn('[forecast] batch backend unreachable, using local heuristic', err);
    return _localBatchScore(userProfile, jobs, limit);
  }
}

// ---------------------------------------------------------------------------
// Fallback helpers
// ---------------------------------------------------------------------------

function _fallbackScore(
  userProfile: UserProfileInput,
  job: Record<string, any>,
): MatchScoreResult {
  const skills = _extractJobSkills(job);
  return _localHeuristicScore(
    userProfile,
    skills,
    job.suburb ?? job.location?.suburb,
    job.pay_amount ?? job.salary?.max,
    job.job_type ?? job.employment_type,
  );
}

function _localBatchScore(
  userProfile: UserProfileInput,
  jobs: Record<string, any>[],
  limit: number,
): ScoredJobItem[] {
  const scored: ScoredJobItem[] = jobs.map((job) => {
    const result = _fallbackScore(userProfile, job);
    return {
      job,
      score: result.score,
      matching_skills: result.matching_skills,
      missing_skills: result.missing_skills,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
