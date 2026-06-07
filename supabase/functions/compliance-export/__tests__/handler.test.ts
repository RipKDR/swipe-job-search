import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildReportAggregate,
  type CandidateAggregation,
  classifySwipeDirection,
  generateCompliancePdf,
  handleComplianceExport,
  type SupabaseClientLike,
} from "../handler.ts";

type Row = Record<string, unknown>;

interface StoredTables {
  [table: string]: Row[];
}

interface InsertLogEntry {
  table: string;
  row: Row;
}

interface MockResult<T> {
  data: T | null;
  error: { message: string } | null;
}

class MockStorageBucket {
  uploads: { path: string; body: Uint8Array }[] = [];

  constructor(private readonly uploadError?: string) {}

  upload(
    path: string,
    body: Uint8Array,
  ): Promise<{ error: { message: string } | null }> {
    this.uploads.push({ path, body });
    return Promise.resolve({
      error: this.uploadError ? { message: this.uploadError } : null,
    });
  }
}

class MockQuery implements PromiseLike<MockResult<Row[]>> {
  private mode: "select" | "insert" | "update" = "select";
  private insertRows: Row[] = [];
  private updateValues: Row = {};
  private filters: ((row: Row) => boolean)[] = [];

  constructor(
    private readonly table: string,
    private readonly db: MockSupabase,
  ) {}

  select(): MockQuery {
    return this;
  }

  insert(values: Row | Row[]): MockQuery {
    this.mode = "insert";
    this.insertRows = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: Row): MockQuery {
    this.mode = "update";
    this.updateValues = values;
    return this;
  }

  eq(column: string, value: unknown): MockQuery {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  gte(column: string, value: unknown): MockQuery {
    this.filters.push((row) =>
      typeof row[column] === "string" && typeof value === "string" &&
      row[column] >= value
    );
    return this;
  }

  lte(column: string, value: unknown): MockQuery {
    this.filters.push((row) =>
      typeof row[column] === "string" && typeof value === "string" &&
      row[column] <= value
    );
    return this;
  }

  in(column: string, values: readonly unknown[]): MockQuery {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  not(column: string, operator: string): MockQuery {
    if (operator === "is") {
      this.filters.push((row) =>
        row[column] !== null && row[column] !== undefined
      );
    }
    return this;
  }

  single<T extends Row = Row>(): Promise<MockResult<T>> {
    const result = this.execute();
    return Promise.resolve({
      data: (result.data?.[0] || null) as T | null,
      error: result.error,
    });
  }

  maybeSingle<T extends Row = Row>(): Promise<MockResult<T>> {
    return this.single<T>();
  }

  then<TResult1 = MockResult<Row[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: MockResult<Row[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private matchingRows(): Row[] {
    return this.db.tables[this.table].filter((row) =>
      this.filters.every((filter) => filter(row))
    );
  }

  private execute(): MockResult<Row[]> {
    if (this.mode === "insert") {
      const rows = this.insertRows.map((row) => {
        const stored = { id: row.id ?? this.db.nextId(this.table), ...row };
        this.db.tables[this.table].push(stored);
        this.db.insertLog.push({ table: this.table, row: stored });
        return stored;
      });
      return { data: rows, error: null };
    }

    if (this.mode === "update") {
      const rows = this.matchingRows();
      for (const row of rows) {
        Object.assign(row, this.updateValues);
        this.db.updateLog.push({ table: this.table, row: { ...row } });
      }
      return { data: rows, error: null };
    }

    return { data: this.matchingRows(), error: null };
  }
}

class MockSupabase implements SupabaseClientLike {
  tables: StoredTables;
  insertLog: InsertLogEntry[] = [];
  updateLog: InsertLogEntry[] = [];
  storageBucket: MockStorageBucket;
  private counters = new Map<string, number>();

  storage: SupabaseClientLike["storage"];

  constructor(seed: Partial<StoredTables>, uploadError?: string) {
    this.tables = {
      profiles: [],
      jobs: [],
      swipes: [],
      matches: [],
      compliance_reports: [],
      compliance_report_runs: [],
      compliance_report_rows: [],
      ...seed,
    };
    this.storageBucket = new MockStorageBucket(uploadError);
    this.storage = {
      from: () => this.storageBucket,
    };
  }

  from(table: string): MockQuery {
    if (!this.tables[table]) this.tables[table] = [];
    return new MockQuery(table, this);
  }

  nextId(table: string): string {
    const next = (this.counters.get(table) || 0) + 1;
    this.counters.set(table, next);
    return `${table}-${next}`;
  }
}

function baseSeed(): Partial<StoredTables> {
  return {
    profiles: [
      { id: "candidate-1", full_name: "Candidate One" },
      { id: "candidate-2", full_name: "Candidate Two" },
    ],
    jobs: [
      {
        id: "job-1",
        employer_id: "provider-1",
        title: "Provider One Job",
        pay_amount: "31.50",
        pay_period: "hour",
      },
      {
        id: "job-2",
        employer_id: "provider-2",
        title: "Provider Two Job",
        pay_amount: "25.00",
        pay_period: "hour",
      },
    ],
    swipes: [
      {
        id: "swipe-1",
        candidate_id: "candidate-1",
        job_id: "job-1",
        direction: "right",
        created_at: "2026-06-01T10:00:00Z",
      },
      {
        id: "swipe-2",
        candidate_id: "candidate-1",
        job_id: "job-1",
        direction: "applied",
        created_at: "2026-06-02T10:00:00Z",
      },
      {
        id: "swipe-3",
        candidate_id: "candidate-1",
        job_id: "job-1",
        direction: "left",
        created_at: "2026-06-03T10:00:00Z",
      },
      {
        id: "swipe-4",
        candidate_id: "candidate-1",
        job_id: "job-2",
        direction: "super",
        created_at: "2026-06-04T10:00:00Z",
      },
      {
        id: "swipe-5",
        candidate_id: "candidate-2",
        job_id: "missing-job",
        direction: "right",
        created_at: "2026-06-04T10:00:00Z",
      },
    ],
    matches: [
      {
        id: "match-1",
        candidate_id: "candidate-1",
        employer_id: "provider-1",
        job_id: "job-1",
        status: "hired",
        created_at: "2026-06-02T10:00:00Z",
        hired_at: "2026-06-05T10:00:00Z",
      },
    ],
  };
}

Deno.test("classifySwipeDirection treats right, applied, and super as positive actions", () => {
  assertEquals(classifySwipeDirection("right"), "positive");
  assertEquals(classifySwipeDirection("applied"), "positive");
  assertEquals(classifySwipeDirection("super"), "positive");
  assertEquals(classifySwipeDirection("left"), "pass");
  assertEquals(classifySwipeDirection("unknown"), "other");
});

Deno.test("buildReportAggregate produces the compliance activity summary shape", () => {
  const candidate: CandidateAggregation = {
    candidate_id: "candidate-1",
    full_name: "Candidate One",
    total_swipes: 3,
    right_swipes: 2,
    left_swipes: 1,
    active_matches: 1,
    hires_completed: 1,
    total_earnings: 31.5,
    jobs_applied_to: [
      {
        job_id: "job-1",
        title: "Job One",
        direction: "right",
        swiped_at: "2026-06-01T10:00:00Z",
      },
      {
        job_id: "job-1",
        title: "Job One",
        direction: "applied",
        swiped_at: "2026-06-02T10:00:00Z",
      },
    ],
    matches_data: [],
    hires_data: [],
  };

  assertEquals(buildReportAggregate([candidate], "2026-06-08T00:00:00Z"), {
    activity_summary: {
      total_swipes: 3,
      right_swipes: 2,
      unique_jobs_interacted: 1,
      total_matches: 1,
      total_hires: 1,
      candidate_rows: 1,
    },
    generated_at: "2026-06-08T00:00:00Z",
  });
});

Deno.test("generateCompliancePdf writes a valid xref offset using byte lengths", () => {
  const pdf = generateCompliancePdf({
    generated_at: "2026-06-08T00:00:00Z",
    provider_id: "provider-1",
    period_start: "2026-06-01",
    period_end: "2026-06-08",
    report_type: "weekly_summary",
    candidates: [],
    summary: {
      total_candidates: 0,
      total_swipes: 0,
      total_right_swipes: 0,
      total_matches: 0,
      total_hires: 0,
    },
  });

  const decoded = new TextDecoder().decode(pdf);
  assert(decoded.startsWith("%PDF-1.4"));
  assertStringIncludes(decoded, "xref\n0 6");
  const startXref = decoded.match(/startxref\n(\d+)/);
  assert(startXref);
  assertEquals(
    Number(startXref[1]),
    new TextEncoder().encode(decoded.slice(0, decoded.indexOf("xref\n0 6")))
      .byteLength,
  );
});

Deno.test("provider batch export creates report before run and scopes rows to provider jobs", async () => {
  const supabase = new MockSupabase(baseSeed());
  const response = await handleComplianceExport(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        provider_id: "provider-1",
        period_start: "2026-06-01",
        period_end: "2026-06-08",
      }),
    }),
    supabase,
    new Date("2026-06-08T00:00:00Z"),
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.reports_created, 1);
  assertEquals(body.candidates_processed, 1);
  assertEquals(supabase.insertLog[0].table, "compliance_reports");
  assertEquals(supabase.insertLog[1].table, "compliance_report_runs");
  assertEquals(
    supabase.tables.compliance_report_runs[0].report_id,
    supabase.tables.compliance_reports[0].id,
  );
  assertEquals(supabase.tables.compliance_report_rows[0].swipe_count, 3);
  assertEquals(supabase.tables.compliance_report_rows[0].right_swipe_count, 2);
});

Deno.test("candidate-only export derives separate providers from activity", async () => {
  const supabase = new MockSupabase(baseSeed());
  const response = await handleComplianceExport(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        candidate_id: "candidate-1",
        period_start: "2026-06-01",
        period_end: "2026-06-08",
      }),
    }),
    supabase,
    new Date("2026-06-08T00:00:00Z"),
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.reports_created, 2);
  assertEquals(
    new Set(supabase.tables.compliance_reports.map((row) => row.provider_id)),
    new Set(["provider-1", "provider-2"]),
  );
});

Deno.test("candidate-only export reports when provider ownership cannot be derived", async () => {
  const supabase = new MockSupabase(baseSeed());
  const response = await handleComplianceExport(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        candidate_id: "candidate-2",
        period_start: "2026-06-01",
        period_end: "2026-06-08",
      }),
    }),
    supabase,
    new Date("2026-06-08T00:00:00Z"),
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.reports_created, 0);
  assertEquals(body.message, "No candidate/provider pairs found");
});

Deno.test("upload failure marks report and run failed", async () => {
  const supabase = new MockSupabase(baseSeed(), "storage unavailable");
  const response = await handleComplianceExport(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        provider_id: "provider-1",
        period_start: "2026-06-01",
        period_end: "2026-06-08",
      }),
    }),
    supabase,
    new Date("2026-06-08T00:00:00Z"),
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.candidates_processed, 0);
  assertEquals(body.candidates_failed, 1);
  assertStringIncludes(body.errors[0], "Failed to upload PDF");
  assertEquals(supabase.tables.compliance_reports[0].status, "failed");
  assertEquals(supabase.tables.compliance_report_runs[0].status, "failed");
});
