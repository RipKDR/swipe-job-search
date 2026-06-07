/**
 * Compliance Export Edge Function handler.
 *
 * Batch exports are persisted as one compliance_reports record per
 * candidate/provider pair. This matches the current schema where
 * compliance_report_runs.report_id is required.
 */

type UnknownRow = Record<string, unknown>;

interface SupabaseErrorLike {
  message: string;
}

interface SupabaseResult<T> {
  data: T | null;
  error: SupabaseErrorLike | null;
}

type QueryResult = SupabaseResult<UnknownRow[]>;

interface QueryBuilderLike extends PromiseLike<QueryResult> {
  select(columns?: string): QueryBuilderLike;
  insert(values: UnknownRow | UnknownRow[]): QueryBuilderLike;
  update(values: UnknownRow): QueryBuilderLike;
  eq(column: string, value: unknown): QueryBuilderLike;
  gte(column: string, value: unknown): QueryBuilderLike;
  lte(column: string, value: unknown): QueryBuilderLike;
  in(column: string, values: readonly unknown[]): QueryBuilderLike;
  not(column: string, operator: string, value: unknown): QueryBuilderLike;
  single<T extends UnknownRow = UnknownRow>(): Promise<SupabaseResult<T>>;
  maybeSingle<T extends UnknownRow = UnknownRow>(): Promise<SupabaseResult<T>>;
}

interface StorageBucketLike {
  upload(
    path: string,
    body: Uint8Array,
    options: { contentType: string; upsert: boolean },
  ): Promise<{ error: SupabaseErrorLike | null }>;
}

interface AuthUserLike {
  id: string;
}

export interface SupabaseClientLike {
  from(table: string): QueryBuilderLike;
  storage: {
    from(bucket: string): StorageBucketLike;
  };
  auth: {
    getUser(
      jwt: string,
    ): Promise<{ data: { user: AuthUserLike | null }; error: SupabaseErrorLike | null }>;
  };
}

interface ReportInput {
  provider_id?: string;
  candidate_id?: string;
  period_start?: string;
  period_end?: string;
  report_type?: string;
}

interface CandidateProviderPair {
  candidate_id: string;
  provider_id: string;
}

interface SwipeRow {
  id?: string;
  candidate_id?: string | null;
  job_id: string;
  direction: string;
  created_at: string;
}

interface JobRow {
  id: string;
  employer_id: string;
  title: string | null;
  pay_amount: string | number | null;
  pay_period: string | null;
}

interface MatchRow {
  id: string;
  job_id: string;
  candidate_id: string;
  employer_id: string;
  status: string;
  created_at?: string | null;
  hired_at?: string | null;
}

export interface CandidateAggregation {
  candidate_id: string;
  full_name: string;
  total_swipes: number;
  right_swipes: number;
  left_swipes: number;
  active_matches: number;
  hires_completed: number;
  total_earnings: number;
  jobs_applied_to: {
    job_id: string;
    title: string;
    direction: string;
    swiped_at: string;
  }[];
  matches_data: MatchRow[];
  hires_data: MatchRow[];
}

export interface ComplianceReportData {
  generated_at: string;
  provider_id: string;
  period_start: string;
  period_end: string;
  report_type: string;
  candidates: CandidateAggregation[];
  summary: {
    total_candidates: number;
    total_swipes: number;
    total_right_swipes: number;
    total_matches: number;
    total_hires: number;
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

const JSON_HEADERS = { "Content-Type": "application/json" };
const ACTIVE_MATCH_STATUSES = ["chatting", "hire_pending", "hired"];
const REPORT_TYPES = new Set([
  "weekly_summary",
  "fortnightly",
  "monthly",
  "bulk_swipe_audit",
  "other",
]);
function jsonResponse(body: UnknownRow, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function dateOnly(value: Date): string {
  return value.toISOString().split("T")[0];
}

function resolvePeriod(body: ReportInput, now: Date) {
  const defaultPeriodEnd = dateOnly(now);
  const lastMonday = new Date(now);
  lastMonday.setDate(
    lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7) - 7,
  );
  lastMonday.setHours(0, 0, 0, 0);

  return {
    periodStart: body.period_start || dateOnly(lastMonday),
    periodEnd: body.period_end || defaultPeriodEnd,
  };
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function periodEndOfDay(periodEnd: string): string {
  return `${periodEnd}T23:59:59Z`;
}

function addPair(
  pairs: Map<string, CandidateProviderPair>,
  candidateId: unknown,
  providerId: unknown,
) {
  if (typeof candidateId !== "string" || typeof providerId !== "string") return;
  if (!candidateId || !providerId) return;
  pairs.set(`${candidateId}:${providerId}`, {
    candidate_id: candidateId,
    provider_id: providerId,
  });
}

async function selectRows<T>(query: QueryBuilderLike): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as T[];
}

async function singleRow<T extends UnknownRow>(
  query: QueryBuilderLike,
): Promise<SupabaseResult<T>> {
  return await query.single<T>();
}

async function updateRows(
  query: QueryBuilderLike,
): Promise<SupabaseResult<UnknownRow[]>> {
  return await query;
}

function jobIds(rows: { id: string }[]): string[] {
  return [...new Set(rows.map((row) => row.id))];
}

async function fetchProviderJobs(
  supabase: SupabaseClientLike,
  providerId: string,
): Promise<JobRow[]> {
  return await selectRows<JobRow>(
    supabase
      .from("jobs")
      .select("id, employer_id, title, pay_amount, pay_period")
      .eq("employer_id", providerId),
  );
}

async function fetchJobsByIds(
  supabase: SupabaseClientLike,
  ids: string[],
): Promise<JobRow[]> {
  if (ids.length === 0) return [];
  return await selectRows<JobRow>(
    supabase
      .from("jobs")
      .select("id, employer_id, title, pay_amount, pay_period")
      .in("id", ids),
  );
}

async function fetchPeriodSwipes(
  supabase: SupabaseClientLike,
  periodStart: string,
  periodEnd: string,
  candidateId?: string,
  jobIdsForProvider?: string[],
): Promise<SwipeRow[]> {
  let query = supabase
    .from("swipes")
    .select("id, candidate_id, job_id, direction, created_at")
    .gte("created_at", periodStart)
    .lte("created_at", periodEndOfDay(periodEnd));

  if (candidateId) query = query.eq("candidate_id", candidateId);
  if (jobIdsForProvider) {
    if (jobIdsForProvider.length === 0) return [];
    query = query.in("job_id", jobIdsForProvider);
  }

  return await selectRows<SwipeRow>(query);
}

async function fetchPeriodMatches(
  supabase: SupabaseClientLike,
  periodStart: string,
  periodEnd: string,
  candidateId?: string,
  providerId?: string,
): Promise<MatchRow[]> {
  let createdQuery = supabase
    .from("matches")
    .select(
      "id, job_id, candidate_id, employer_id, status, created_at, hired_at",
    )
    .in("status", ACTIVE_MATCH_STATUSES)
    .gte("created_at", periodStart)
    .lte("created_at", periodEndOfDay(periodEnd));

  let hiredQuery = supabase
    .from("matches")
    .select(
      "id, job_id, candidate_id, employer_id, status, created_at, hired_at",
    )
    .eq("status", "hired")
    .gte("hired_at", periodStart)
    .lte("hired_at", periodEndOfDay(periodEnd));

  if (candidateId) {
    createdQuery = createdQuery.eq("candidate_id", candidateId);
    hiredQuery = hiredQuery.eq("candidate_id", candidateId);
  }

  if (providerId) {
    createdQuery = createdQuery.eq("employer_id", providerId);
    hiredQuery = hiredQuery.eq("employer_id", providerId);
  }

  const createdRows = await selectRows<MatchRow>(createdQuery);
  const hiredRows = await selectRows<MatchRow>(hiredQuery);
  const rows = new Map<string, MatchRow>();
  for (const row of [...createdRows, ...hiredRows]) rows.set(row.id, row);
  return [...rows.values()];
}

async function resolveCandidateProviderPairs(
  supabase: SupabaseClientLike,
  body: ReportInput,
  periodStart: string,
  periodEnd: string,
): Promise<CandidateProviderPair[]> {
  const pairs = new Map<string, CandidateProviderPair>();

  if (body.candidate_id && body.provider_id) {
    addPair(pairs, body.candidate_id, body.provider_id);
    return [...pairs.values()];
  }

  if (body.provider_id) {
    const providerJobs = await fetchProviderJobs(supabase, body.provider_id);
    const swipes = await fetchPeriodSwipes(
      supabase,
      periodStart,
      periodEnd,
      undefined,
      jobIds(providerJobs),
    );
    for (const swipe of swipes) {
      addPair(pairs, swipe.candidate_id, body.provider_id);
    }

    const matches = await fetchPeriodMatches(
      supabase,
      periodStart,
      periodEnd,
      undefined,
      body.provider_id,
    );
    for (const match of matches) {
      addPair(pairs, match.candidate_id, body.provider_id);
    }

    return [...pairs.values()];
  }

  if (body.candidate_id) {
    const swipes = await fetchPeriodSwipes(
      supabase,
      periodStart,
      periodEnd,
      body.candidate_id,
    );
    const jobs = await fetchJobsByIds(supabase, [
      ...new Set(swipes.map((swipe) => swipe.job_id)),
    ]);
    const providerByJob = new Map(jobs.map((job) => [job.id, job.employer_id]));
    for (const swipe of swipes) {
      addPair(pairs, body.candidate_id, providerByJob.get(swipe.job_id));
    }

    const matches = await fetchPeriodMatches(
      supabase,
      periodStart,
      periodEnd,
      body.candidate_id,
    );
    for (const match of matches) {
      addPair(pairs, body.candidate_id, match.employer_id);
    }

    return [...pairs.values()];
  }

  const swipes = await fetchPeriodSwipes(supabase, periodStart, periodEnd);
  const jobs = await fetchJobsByIds(supabase, [
    ...new Set(swipes.map((swipe) => swipe.job_id)),
  ]);
  const providerByJob = new Map(jobs.map((job) => [job.id, job.employer_id]));
  for (const swipe of swipes) {
    addPair(pairs, swipe.candidate_id, providerByJob.get(swipe.job_id));
  }

  const matches = await fetchPeriodMatches(supabase, periodStart, periodEnd);
  for (const match of matches) {
    addPair(pairs, match.candidate_id, match.employer_id);
  }

  return [...pairs.values()];
}

export function classifySwipeDirection(
  direction: string,
): "positive" | "pass" | "other" {
  if (
    direction === "right" || direction === "applied" || direction === "super"
  ) return "positive";
  if (direction === "left") return "pass";
  return "other";
}

async function aggregateCandidate(
  supabase: SupabaseClientLike,
  candidateId: string,
  providerId: string,
  periodStart: string,
  periodEnd: string,
): Promise<CandidateAggregation | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", candidateId)
    .maybeSingle<{ full_name?: string | null }>();

  if (profileError) throw new Error(profileError.message);
  if (!profile) return null;

  const providerJobs = await fetchProviderJobs(supabase, providerId);
  const providerJobIds = jobIds(providerJobs);
  const swipes = await fetchPeriodSwipes(
    supabase,
    periodStart,
    periodEnd,
    candidateId,
    providerJobIds,
  );

  const jobsById = new Map(providerJobs.map((job) => [job.id, job]));
  const totalSwipes = swipes.length;
  const rightSwipes =
    swipes.filter((swipe) =>
      classifySwipeDirection(swipe.direction) === "positive"
    ).length;
  const leftSwipes =
    swipes.filter((swipe) => classifySwipeDirection(swipe.direction) === "pass")
      .length;

  const jobsAppliedTo = swipes.map((swipe) => ({
    job_id: swipe.job_id,
    title: jobsById.get(swipe.job_id)?.title || "Unknown Job",
    direction: swipe.direction,
    swiped_at: swipe.created_at,
  }));

  const matches = await fetchPeriodMatches(
    supabase,
    periodStart,
    periodEnd,
    candidateId,
    providerId,
  );
  const activeMatches = matches.filter((match) =>
    ACTIVE_MATCH_STATUSES.includes(match.status)
  );
  const hires = matches.filter((match) =>
    match.status === "hired" && match.hired_at
  );

  let totalEarnings = 0;
  for (const hire of hires) {
    const amount = jobsById.get(hire.job_id)?.pay_amount;
    if (amount === null || amount === undefined) continue;
    const numericAmount = typeof amount === "number"
      ? amount
      : Number.parseFloat(amount);
    totalEarnings += Number.isNaN(numericAmount) ? 0 : numericAmount;
  }

  return {
    candidate_id: candidateId,
    full_name: profile.full_name || "Unknown",
    total_swipes: totalSwipes,
    right_swipes: rightSwipes,
    left_swipes: leftSwipes,
    active_matches: activeMatches.length,
    hires_completed: hires.length,
    total_earnings: totalEarnings,
    jobs_applied_to: jobsAppliedTo,
    matches_data: activeMatches,
    hires_data: hires,
  };
}

export function buildReportAggregate(
  candidates: CandidateAggregation[],
  generatedAt: string,
): UnknownRow {
  const uniqueJobs = new Set<string>();
  for (const candidate of candidates) {
    for (const job of candidate.jobs_applied_to) uniqueJobs.add(job.job_id);
  }

  return {
    activity_summary: {
      total_swipes: candidates.reduce(
        (sum, candidate) => sum + candidate.total_swipes,
        0,
      ),
      right_swipes: candidates.reduce(
        (sum, candidate) => sum + candidate.right_swipes,
        0,
      ),
      unique_jobs_interacted: uniqueJobs.size,
      total_matches: candidates.reduce(
        (sum, candidate) => sum + candidate.active_matches,
        0,
      ),
      total_hires: candidates.reduce(
        (sum, candidate) => sum + candidate.hires_completed,
        0,
      ),
      candidate_rows: candidates.length,
    },
    generated_at: generatedAt,
  };
}

function buildReportData(
  providerId: string,
  periodStart: string,
  periodEnd: string,
  reportType: string,
  generatedAt: string,
  candidates: CandidateAggregation[],
): ComplianceReportData {
  return {
    generated_at: generatedAt,
    provider_id: providerId,
    period_start: periodStart,
    period_end: periodEnd,
    report_type: reportType,
    candidates,
    summary: {
      total_candidates: candidates.length,
      total_swipes: candidates.reduce(
        (sum, candidate) => sum + candidate.total_swipes,
        0,
      ),
      total_right_swipes: candidates.reduce(
        (sum, candidate) => sum + candidate.right_swipes,
        0,
      ),
      total_matches: candidates.reduce(
        (sum, candidate) => sum + candidate.active_matches,
        0,
      ),
      total_hires: candidates.reduce(
        (sum, candidate) => sum + candidate.hires_completed,
        0,
      ),
    },
  };
}

async function markReportFailed(
  supabase: SupabaseClientLike,
  reportId: string,
  errorMessage: string,
  nowISO: string,
) {
  await updateRows(
    supabase
      .from("compliance_reports")
      .update({
        status: "failed",
        error_message: errorMessage,
        updated_at: nowISO,
      })
      .eq("id", reportId),
  );
}

async function markRunFailed(
  supabase: SupabaseClientLike,
  runId: string,
  errorMessage: string,
  nowISO: string,
) {
  await updateRows(
    supabase
      .from("compliance_report_runs")
      .update({
        status: "failed",
        completed_candidates: 0,
        failed_candidates: 1,
        error_message: errorMessage,
        completed_at: nowISO,
        updated_at: nowISO,
      })
      .eq("id", runId),
  );
}

async function processPair(
  supabase: SupabaseClientLike,
  pair: CandidateProviderPair,
  periodStart: string,
  periodEnd: string,
  reportType: string,
  nowISO: string,
): Promise<
  {
    reportCreated: boolean;
    candidateCompleted: boolean;
    runId?: string;
    error?: string;
  }
> {
  const aggregate = await aggregateCandidate(
    supabase,
    pair.candidate_id,
    pair.provider_id,
    periodStart,
    periodEnd,
  );

  if (!aggregate) {
    return {
      reportCreated: false,
      candidateCompleted: false,
      error: `Candidate ${pair.candidate_id}: profile not found`,
    };
  }

  const reportDataAgg = buildReportAggregate([aggregate], nowISO);
  const { data: reportRecord, error: reportErr } = await singleRow<
    { id: string }
  >(
    supabase
      .from("compliance_reports")
      .insert({
        candidate_id: pair.candidate_id,
        provider_id: pair.provider_id,
        period_start: periodStart,
        period_end: periodEnd,
        report_type: reportType,
        report_data: reportDataAgg,
        status: "generating",
        created_at: nowISO,
        updated_at: nowISO,
      })
      .select("id"),
  );

  if (reportErr || !reportRecord) {
    return {
      reportCreated: false,
      candidateCompleted: false,
      error:
        `Failed to insert report for ${pair.provider_id}/${pair.candidate_id}: ${
          reportErr?.message || "missing id"
        }`,
    };
  }

  const reportId = reportRecord.id;
  const { data: runRecord, error: runErr } = await singleRow<{ id: string }>(
    supabase
      .from("compliance_report_runs")
      .insert({
        report_id: reportId,
        status: "generating",
        total_candidates: 1,
        started_at: nowISO,
        created_at: nowISO,
        updated_at: nowISO,
      })
      .select("id"),
  );

  if (runErr || !runRecord) {
    const message = `Failed to create run record: ${
      runErr?.message || "missing id"
    }`;
    await markReportFailed(supabase, reportId, message, nowISO);
    return {
      reportCreated: true,
      candidateCompleted: false,
      error: `${pair.provider_id}/${pair.candidate_id}: ${message}`,
    };
  }

  const runId = runRecord.id;
  const uniqueJobs = new Set(
    aggregate.jobs_applied_to.map((job) => job.job_id),
  );
  const { error: rowErr } = await singleRow<{ id: string }>(
    supabase
      .from("compliance_report_rows")
      .insert({
        report_id: reportId,
        run_id: runId,
        candidate_id: aggregate.candidate_id,
        status: "completed",
        swipe_count: aggregate.total_swipes,
        right_swipe_count: aggregate.right_swipes,
        unique_jobs_interacted: uniqueJobs.size,
        match_count: aggregate.active_matches,
        hire_count: aggregate.hires_completed,
        total_earnings: aggregate.total_earnings || null,
        swipes_data: aggregate.jobs_applied_to,
        matches_data: aggregate.matches_data,
        hires_data: aggregate.hires_data,
        created_at: nowISO,
        updated_at: nowISO,
      })
      .select("id"),
  );

  if (rowErr) {
    const message = `Failed to insert row: ${rowErr.message}`;
    await markReportFailed(supabase, reportId, message, nowISO);
    await markRunFailed(supabase, runId, message, nowISO);
    return {
      reportCreated: true,
      candidateCompleted: false,
      runId,
      error: `${pair.provider_id}/${pair.candidate_id}: ${message}`,
    };
  }

  const reportData = buildReportData(
    pair.provider_id,
    periodStart,
    periodEnd,
    reportType,
    nowISO,
    [aggregate],
  );
  const pdfBytes = generateCompliancePdf(reportData);
  const storagePath =
    `${pair.provider_id}/${pair.candidate_id}/compliance_${reportId}_${periodStart}_${periodEnd}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from("compliance-reports")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    const message = `Failed to upload PDF: ${uploadErr.message}`;
    await markReportFailed(supabase, reportId, message, nowISO);
    await markRunFailed(supabase, runId, message, nowISO);
    return {
      reportCreated: true,
      candidateCompleted: false,
      runId,
      error: `${pair.provider_id}/${pair.candidate_id}: ${message}`,
    };
  }

  const reportUpdate = await updateRows(
    supabase
      .from("compliance_reports")
      .update({
        status: "completed",
        storage_path: storagePath,
        error_message: null,
        updated_at: nowISO,
      })
      .eq("id", reportId),
  );

  if (reportUpdate.error) {
    const message =
      `Failed to mark report completed: ${reportUpdate.error.message}`;
    await markRunFailed(supabase, runId, message, nowISO);
    return {
      reportCreated: true,
      candidateCompleted: false,
      runId,
      error: `${pair.provider_id}/${pair.candidate_id}: ${message}`,
    };
  }

  const runUpdate = await updateRows(
    supabase
      .from("compliance_report_runs")
      .update({
        status: "completed",
        completed_candidates: 1,
        failed_candidates: 0,
        completed_at: nowISO,
        updated_at: nowISO,
      })
      .eq("id", runId),
  );

  if (runUpdate.error) {
    return {
      reportCreated: true,
      candidateCompleted: false,
      runId,
      error:
        `${pair.provider_id}/${pair.candidate_id}: Failed to mark run completed: ${runUpdate.error.message}`,
    };
  }

  return {
    reportCreated: true,
    candidateCompleted: true,
    runId,
  };
}

export async function handleComplianceExport(
  req: Request,
  supabase: SupabaseClientLike,
  now = new Date(),
): Promise<Response> {
  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!jwt) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const callerId = user.id;

    const body = (await req.json().catch(() => ({}))) as ReportInput;

    // --- UUID validation (prevent path manipulation in storage keys) ---
    if (body.provider_id !== undefined && !isUuid(body.provider_id)) {
      return jsonResponse({ error: "Invalid provider_id" }, 400);
    }
    if (body.candidate_id !== undefined && !isUuid(body.candidate_id)) {
      return jsonResponse({ error: "Invalid candidate_id" }, 400);
    }

    // --- Authorization: look up caller's role, then enforce scope ---
    const { data: callerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle<{ role: string }>();

    if (profileErr || !callerProfile) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const callerRole = callerProfile.role;

    if (callerRole === "employer") {
      // Employers may only generate reports scoped to themselves as provider.
      if (!body.provider_id) {
        body.provider_id = callerId;
      } else if (body.provider_id !== callerId) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      // Employers cannot request candidate-only reports (no provider scope).
      if (body.candidate_id && !body.provider_id) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    } else if (callerRole === "candidate") {
      // Candidates may only generate reports scoped to themselves.
      if (!body.candidate_id) {
        body.candidate_id = callerId;
      } else if (body.candidate_id !== callerId) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      // Candidates cannot request provider-scoped reports.
      if (body.provider_id) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    } else {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { periodStart, periodEnd } = resolvePeriod(body, now);
    const reportType = body.report_type || "weekly_summary";
    const nowISO = now.toISOString();

    if (!REPORT_TYPES.has(reportType)) {
      return jsonResponse({ error: `Invalid report_type: ${reportType}` }, 400);
    }

    if (!isDateOnly(periodStart) || !isDateOnly(periodEnd)) {
      return jsonResponse({
        error: "period_start and period_end must use YYYY-MM-DD format",
      }, 400);
    }

    if (periodEnd < periodStart) {
      return jsonResponse({
        error: "period_end must not be before period_start",
      }, 400);
    }

    const errors: string[] = [];
    let pairs: CandidateProviderPair[];
    try {
      pairs = await resolveCandidateProviderPairs(
        supabase,
        body,
        periodStart,
        periodEnd,
      );
    } catch (error) {
      return jsonResponse(
        {
          reports_created: 0,
          candidates_processed: 0,
          errors: [
            `Failed to resolve candidate/provider pairs: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        },
        500,
      );
    }

    if (pairs.length === 0) {
      return jsonResponse({
        reports_created: 0,
        candidates_processed: 0,
        errors,
        message: "No candidate/provider pairs found",
      });
    }

    let reportsCreated = 0;
    let completedCandidates = 0;
    let failedCandidates = 0;
    const runIds: string[] = [];

    for (const pair of pairs) {
      try {
        const result = await processPair(
          supabase,
          pair,
          periodStart,
          periodEnd,
          reportType,
          nowISO,
        );
        if (result.reportCreated) reportsCreated++;
        if (result.candidateCompleted) {
          completedCandidates++;
        } else {
          failedCandidates++;
        }
        if (result.runId) runIds.push(result.runId);
        if (result.error) errors.push(result.error);
      } catch (error) {
        failedCandidates++;
        errors.push(
          `${pair.provider_id}/${pair.candidate_id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return jsonResponse({
      reports_created: reportsCreated,
      candidates_processed: completedCandidates,
      candidates_failed: failedCandidates > 0 ? failedCandidates : undefined,
      run_id: runIds[0],
      run_ids: runIds.length > 1 ? runIds : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Compliance export error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
}

export function generateCompliancePdf(
  report: ComplianceReportData,
): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const lineHeight = 14;
  const lines: string[] = [];

  lines.push("Workforce Australia Compliance Report");
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Period: ${report.period_start} to ${report.period_end}`);
  lines.push(`Report Type: ${report.report_type}`);
  lines.push("");
  lines.push("ACTIVITY SUMMARY");
  lines.push("=".repeat(60));
  lines.push(`  Total Candidates:    ${report.summary.total_candidates}`);
  lines.push(`  Total Swipes:        ${report.summary.total_swipes}`);
  lines.push(`  Applications:        ${report.summary.total_right_swipes}`);
  lines.push(`  Active Matches:      ${report.summary.total_matches}`);
  lines.push(`  Hires Completed:     ${report.summary.total_hires}`);
  lines.push("=".repeat(60));
  lines.push("");

  for (const candidate of report.candidates) {
    lines.push(`CANDIDATE: ${candidate.full_name}`);
    lines.push("-".repeat(60));
    lines.push(
      `  Swipes:   ${candidate.total_swipes} total (${candidate.right_swipes} applied, ${candidate.left_swipes} passed)`,
    );
    lines.push(`  Matches:  ${candidate.active_matches} active`);
    lines.push(`  Hires:    ${candidate.hires_completed}`);
    if (candidate.total_earnings > 0) {
      lines.push(`  Earnings: $${candidate.total_earnings.toFixed(2)}`);
    }
    if (candidate.jobs_applied_to.length > 0) {
      lines.push("  Jobs:");
      for (const job of candidate.jobs_applied_to.slice(0, 20)) {
        const dir = classifySwipeDirection(job.direction) === "positive"
          ? "APPLIED"
          : "PASS";
        lines.push(
          `    - ${job.title} [${dir}] ${job.swiped_at?.slice(0, 10) || ""}`,
        );
      }
      if (candidate.jobs_applied_to.length > 20) {
        lines.push(`    ... and ${candidate.jobs_applied_to.length - 20} more`);
      }
    }
    lines.push("");
  }

  lines.push("=".repeat(60));
  lines.push("End of Report");
  lines.push("Report generated by Hi-Hired Platform");
  lines.push(
    `Report Type: ${report.report_type} | Period: ${report.period_start} to ${report.period_end}`,
  );

  const textContent = lines.join("\n");
  const objects: string[] = [];

  function addObject(content: string): void {
    objects.push(content);
  }

  addObject("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  addObject("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  addObject(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
  );

  function escapePdfString(value: string): string {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\n/g, "\\n");
  }

  let streamContent = "BT\n";
  streamContent += "/F1 9 Tf\n";
  streamContent += `${margin} ${pageHeight - margin - 20} Td\n`;

  for (const line of textContent.split("\n")) {
    streamContent += `(${escapePdfString(line)}) Tj\n`;
    streamContent += `0 -${lineHeight} Td\n`;
  }

  streamContent += "ET\n";

  const encoder = new TextEncoder();
  const streamLength = encoder.encode(streamContent).byteLength;
  addObject(
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
  );
  addObject(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj",
  );

  const pdfHeader = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const objectOffsets: number[] = [];
  let body = "";
  let currentOffset = encoder.encode(pdfHeader).byteLength;

  for (const object of objects) {
    objectOffsets.push(currentOffset);
    const objectWithSeparator = `${object}\n`;
    body += objectWithSeparator;
    currentOffset += encoder.encode(objectWithSeparator).byteLength;
  }

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of objectOffsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdfHeader + body + xref + trailer);
}
