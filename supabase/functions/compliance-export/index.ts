/**
 * Compliance Export Edge Function
 *
 * Generates weekly Centrelink/DEWR compliance reports for provider mentors.
 * Aggregates candidate swipes, matches, and hires per week.
 *
 * Uses the same schema as the FastAPI compliance endpoint:
 * - compliance_report_runs: batch run tracking (retry-safe)
 * - compliance_report_rows: per-candidate data persistence
 * - compliance_reports: report metadata
 *
 * Triggered by:
 *  - Cron: every Monday 07:00 Australia/Melbourne
 *  - Manual: HTTP POST with optional { provider_id, candidate_id, period_start, period_end }
 *
 * Output: { reports_created: number, candidates_processed: number, errors: string[] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ReportInput {
  provider_id?: string
  candidate_id?: string
  period_start?: string
  period_end?: string
  report_type?: string
}

interface CandidateAggregation {
  candidate_id: string
  full_name: string
  total_swipes: number
  right_swipes: number
  left_swipes: number
  active_matches: number
  hires_completed: number
  total_earnings: number
  jobs_applied_to: { job_id: string; title: string; direction: string; swiped_at: string }[]
}

interface ComplianceReportData {
  generated_at: string
  provider_id: string
  period_start: string
  period_end: string
  report_type: string
  candidates: CandidateAggregation[]
  summary: {
    total_candidates: number
    total_swipes: number
    total_right_swipes: number
    total_matches: number
    total_hires: number
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body: ReportInput = await req.json().catch(() => ({}))

    // Determine date range
    const now = new Date()
    const defaultPeriodEnd = now.toISOString().split('T')[0]

    const lastMonday = new Date(now)
    lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7) - 7)
    lastMonday.setHours(0, 0, 0, 0)

    const periodStart = body.period_start || lastMonday.toISOString().split('T')[0]
    const periodEnd = body.period_end || defaultPeriodEnd
    const reportType = body.report_type || 'weekly_summary'
    const nowISO = new Date().toISOString()

    const errors: string[] = []

    // --- Step 1: Determine which candidates to process ---
    let candidateIds: string[] = []

    if (body.candidate_id) {
      candidateIds = [body.candidate_id]
    } else if (body.provider_id) {
      const { data: candidates, error: candErr } = await supabase
        .from('swipes')
        .select('candidate_id')
        .in('job_id', (
          supabase
            .from('jobs')
            .select('id')
            .eq('employer_id', body.provider_id)
            .gte('created_at', periodStart)
            .lte('created_at', periodEnd)
        ) as any)
        .not('candidate_id', 'is', null)

      if (candErr) {
        errors.push(`Failed to fetch candidates: ${candErr.message}`)
      } else {
        candidateIds = [...new Set((candidates || []).map(c => c.candidate_id))]
      }
    } else {
      const { data: activeCandidates, error: activeErr } = await supabase
        .from('swipes')
        .select('candidate_id')
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd + 'T23:59:59Z')

      if (activeErr) {
        errors.push(`Failed to fetch active candidates: ${activeErr.message}`)
      } else {
        candidateIds = [...new Set((activeCandidates || []).map(c => c.candidate_id))]
      }
    }

    if (candidateIds.length === 0) {
      return new Response(
        JSON.stringify({ reports_created: 0, candidates_processed: 0, errors, message: 'No candidates found' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // --- Step 2: Aggregate data for each candidate ---
    const candidates: CandidateAggregation[] = []

    for (const candidateId of candidateIds) {
      try {
        const agg = await aggregateCandidate(supabase, candidateId, periodStart, periodEnd)
        if (agg) candidates.push(agg)
      } catch (err) {
        errors.push(`Candidate ${candidateId}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // --- Step 3: Build aggregate report ---
    const providerId = body.provider_id || candidates[0]?.jobs_applied_to?.[0]?.job_id || 'unknown'

    const reportData: ComplianceReportData = {
      generated_at: nowISO,
      provider_id: providerId,
      period_start: periodStart,
      period_end: periodEnd,
      report_type: reportType,
      candidates,
      summary: {
        total_candidates: candidates.length,
        total_swipes: candidates.reduce((s, c) => s + c.total_swipes, 0),
        total_right_swipes: candidates.reduce((s, c) => s + c.right_swipes, 0),
        total_matches: candidates.reduce((s, c) => s + c.active_matches, 0),
        total_hires: candidates.reduce((s, c) => s + c.hires_completed, 0),
      },
    }

    // --- Step 4: Generate PDF ---
    const pdfBytes = generateCompliancePdf(reportData)

    // --- Step 5: Create run tracking row ---
    // Group candidates by provider for separate reports per provider
    const providerGroups = new Map<string, CandidateAggregation[]>()
    for (const candidate of candidates) {
      const { data: firstJob } = await supabase
        .from('jobs')
        .select('employer_id')
        .eq('id', candidate.jobs_applied_to[0]?.job_id || '')
        .maybeSingle()

      const effectiveProvider = firstJob?.employer_id || providerId
      const group = providerGroups.get(effectiveProvider) || []
      group.push(candidate)
      providerGroups.set(effectiveProvider, group)
    }

    // Create a single run for this export batch
    const { data: runRecord, error: runErr } = await supabase
      .from('compliance_report_runs')
      .insert({
        status: 'generating',
        total_candidates: candidates.length,
        started_at: nowISO,
        created_at: nowISO,
        updated_at: nowISO,
      })
      .select('id')
      .single()

    if (runErr) {
      errors.push(`Failed to create run record: ${runErr.message}`)
      return new Response(
        JSON.stringify({ reports_created: 0, candidates_processed: 0, errors }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const runId = runRecord.id

    // --- Step 6: Save reports + rows ---
    let reportsCreated = 0
    let completedCandidates = 0
    let failedCandidates = 0

    for (const [effectiveProviderId, candidateGroup] of providerGroups) {
      // Create a single compliance_reports row for this provider's group of candidates
      const reportDataAgg = {
        activity_summary: {
          total_swipes: candidateGroup.reduce((s, c) => s + c.total_swipes, 0),
          right_swipes: candidateGroup.reduce((s, c) => s + c.right_swipes, 0),
          unique_jobs_interacted: candidateGroup.reduce(
            (s, c) => s + c.jobs_applied_to.length, 0
          ),
          total_matches: candidateGroup.reduce((s, c) => s + c.active_matches, 0),
          total_hires: candidateGroup.reduce((s, c) => s + c.hires_completed, 0),
          candidate_rows: candidateGroup.length,
        },
        generated_at: nowISO,
      }

      const { data: reportRecord, error: insertErr } = await supabase
        .from('compliance_reports')
        .insert({
          candidate_id: candidateGroup[0].candidate_id, // primary candidate
          provider_id: effectiveProviderId,
          period_start: periodStart,
          period_end: periodEnd,
          report_type: reportType,
          report_data: reportDataAgg,
          status: 'generating',
          created_at: nowISO,
          updated_at: nowISO,
        })
        .select('id')
        .single()

      if (insertErr) {
        errors.push(`Failed to insert report for provider ${effectiveProviderId}: ${insertErr.message}`)
        failedCandidates += candidateGroup.length
        continue
      }

      const reportId = reportRecord.id

      // Upload combined PDF to storage
      const fileName = `compliance_${effectiveProviderId}_${periodStart}_${periodEnd}.pdf`
      const storagePath = `${effectiveProviderId}/${fileName}`

      const { error: uploadErr } = await supabase
        .storage
        .from('compliance-reports')
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadErr) {
        errors.push(`Failed to upload PDF for provider ${effectiveProviderId}: ${uploadErr.message}`)
      }

      // Create per-candidate rows (compliance_report_rows)
      for (const candidate of candidateGroup) {
        const uniqueJobs = new Set(candidate.jobs_applied_to.map(j => j.job_id))

        const { error: rowErr } = await supabase
          .from('compliance_report_rows')
          .insert({
            report_id: reportId,
            run_id: runId,
            candidate_id: candidate.candidate_id,
            status: 'completed',
            swipe_count: candidate.total_swipes,
            right_swipe_count: candidate.right_swipes,
            unique_jobs_interacted: uniqueJobs.size,
            match_count: candidate.active_matches,
            hire_count: candidate.hires_completed,
            total_earnings: candidate.total_earnings || null,
            swipes_data: candidate.jobs_applied_to,
            created_at: nowISO,
            updated_at: nowISO,
          })

        if (rowErr) {
          errors.push(`Failed to insert row for ${candidate.candidate_id}: ${rowErr.message}`)
          failedCandidates++
        } else {
          completedCandidates++
        }
      }

      // Mark report as completed
      await supabase
        .from('compliance_reports')
        .update({
          status: 'completed',
          storage_path: uploadErr ? null : storagePath,
          updated_at: nowISO,
        })
        .eq('id', reportId)

      reportsCreated++
    }

    // Mark run as completed
    await supabase
      .from('compliance_report_runs')
      .update({
        status: failedCandidates > 0 && completedCandidates === 0 ? 'failed' : 'completed',
        completed_candidates: completedCandidates,
        failed_candidates: failedCandidates,
        completed_at: nowISO,
        updated_at: nowISO,
      })
      .eq('id', runId)

    return new Response(
      JSON.stringify({
        reports_created: reportsCreated,
        candidates_processed: completedCandidates,
        candidates_failed: failedCandidates > 0 ? failedCandidates : undefined,
        run_id: runId,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Compliance export error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Aggregate a single candidate's swipe/match/hire data for the period.
 */
async function aggregateCandidate(
  supabase: ReturnType<typeof createClient>,
  candidateId: string,
  periodStart: string,
  periodEnd: string
): Promise<CandidateAggregation | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', candidateId)
    .single()

  if (!profile) return null

  const { data: swipes } = await supabase
    .from('swipes')
    .select('id, job_id, direction, created_at')
    .eq('candidate_id', candidateId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd + 'T23:59:59Z')

  const totalSwipes = swipes?.length || 0
  const rightSwipes = swipes?.filter(s => s.direction === 'right').length || 0
  const leftSwipes = swipes?.filter(s => s.direction === 'left').length || 0

  const jobIds = [...new Set((swipes || []).map(s => s.job_id))]
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, pay_amount, pay_period')
    .in('id', jobIds.length > 0 ? jobIds : ['00000000-0000-0000-0000-000000000000'])

  const jobTitles = new Map((jobs || []).map(j => [j.id, j.title]))

  const jobsAppliedTo = (swipes || []).map(s => ({
    job_id: s.job_id,
    title: jobTitles.get(s.job_id) || 'Unknown Job',
    direction: s.direction,
    swiped_at: s.created_at,
  }))

  const { data: activeMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('candidate_id', candidateId)
    .in('status', ['chatting', 'hire_pending', 'hired'])
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd + 'T23:59:59Z')

  const { data: hires } = await supabase
    .from('matches')
    .select('id')
    .eq('candidate_id', candidateId)
    .eq('status', 'hired')
    .gte('hired_at', periodStart)
    .lte('hired_at', periodEnd + 'T23:59:59Z')

  // Estimate earnings: for hired matches, sum job pay
  let totalEarnings = 0
  if (hires && hires.length > 0) {
    // We already have jobs data from the swipes query
    for (const job of jobs || []) {
      if (job.pay_amount) {
        const amount = parseFloat(job.pay_amount)
        totalEarnings += isNaN(amount) ? 0 : amount
      }
    }
  }

  return {
    candidate_id: candidateId,
    full_name: profile.full_name || 'Unknown',
    total_swipes: totalSwipes,
    right_swipes: rightSwipes,
    left_swipes: leftSwipes,
    active_matches: activeMatches?.length || 0,
    hires_completed: hires?.length || 0,
    total_earnings: totalEarnings,
    jobs_applied_to: jobsAppliedTo,
  }
}

/**
 * Generate a structured PDF report with candidate compliance data.
 * Uses raw PDF construction — no external dependencies needed in Deno.
 * Designed to match the reportlab-based backend PDF format.
 */
function generateCompliancePdf(report: ComplianceReportData): Uint8Array {
  const pageWidth = 595  // A4
  const pageHeight = 842
  const margin = 50
  const lineHeight = 14

  // Build text content
  const lines: string[] = []
  lines.push(`Workforce Australia Compliance Report`)
  lines.push(`Generated: ${report.generated_at}`)
  lines.push(`Period: ${report.period_start} to ${report.period_end}`)
  lines.push(`Report Type: ${report.report_type}`)
  lines.push('')
  lines.push(`ACTIVITY SUMMARY`)
  lines.push(`${'='.repeat(60)}`)
  lines.push(`  Total Candidates:    ${report.summary.total_candidates}`)
  lines.push(`  Total Swipes:        ${report.summary.total_swipes}`)
  lines.push(`  Applications:        ${report.summary.total_right_swipes}`)
  lines.push(`  Active Matches:      ${report.summary.total_matches}`)
  lines.push(`  Hires Completed:     ${report.summary.total_hires}`)
  lines.push(`${'='.repeat(60)}`)
  lines.push('')

  for (const candidate of report.candidates) {
    lines.push(`CANDIDATE: ${candidate.full_name}`)
    lines.push(`${'-'.repeat(60)}`)
    lines.push(`  Swipes:   ${candidate.total_swipes} total (${candidate.right_swipes} applied, ${candidate.left_swipes} passed)`)
    lines.push(`  Matches:  ${candidate.active_matches} active`)
    lines.push(`  Hires:    ${candidate.hires_completed}`)
    if (candidate.total_earnings > 0) {
      lines.push(`  Earnings: $${candidate.total_earnings.toFixed(2)}`)
    }
    if (candidate.jobs_applied_to.length > 0) {
      lines.push(`  Jobs:`)
      for (const job of candidate.jobs_applied_to.slice(0, 20)) {
        const dir = job.direction === 'right' ? 'APPLIED' : 'PASS'
        lines.push(`    - ${job.title} [${dir}] ${job.swiped_at?.slice(0, 10) || ''}`)
      }
      if (candidate.jobs_applied_to.length > 20) {
        lines.push(`    ... and ${candidate.jobs_applied_to.length - 20} more`)
      }
    }
    lines.push('')
  }

  lines.push(`${'='.repeat(60)}`)
  lines.push('End of Report')
  lines.push(`Report generated by Hi-Hired Platform`)
  lines.push(`Report Type: ${report.report_type} | Period: ${report.period_start} to ${report.period_end}`)

  const textContent = lines.join('\n')

  // --- Build PDF document (PDF 1.4) ---
  const objects: string[] = []
  let objectNum = 0

  function addObject(content: string): number {
    objects.push(content)
    return ++objectNum
  }

  addObject(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`)
  addObject(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`)
  addObject(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
    `/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`
  )

  function escapePdfString(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, '\\n')
  }

  let streamContent = 'BT\n'
  streamContent += '/F1 9 Tf\n'
  streamContent += `${margin} ${pageHeight - margin - 20} Td\n`

  for (const line of textContent.split('\n')) {
    streamContent += `(${escapePdfString(line)}) Tj\n`
    streamContent += `0 -${lineHeight} Td\n`
  }

  streamContent += 'ET\n'

  const streamLength = streamContent.length
  addObject(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`)
  addObject(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj`)

  const pdfHeader = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n'
  const body = objects.join('\n') + '\n'
  const xrefOffset = pdfHeader.length + body.length

  let xref = `xref\n0 ${objectNum + 1}\n0000000000 65535 f \n`
  let currentOffset = pdfHeader.length
  for (let i = 0; i < objectNum; i++) {
    const objStart = currentOffset
    const objEndMarker = body.indexOf('\nendobj', objStart)
    xref += `${String(objStart).padStart(10, '0')} 00000 n \n`
    currentOffset = objEndMarker + 7
  }

  const trailer = `trailer\n<< /Size ${objectNum + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new TextEncoder().encode(pdfHeader + body + xref + trailer)
}
