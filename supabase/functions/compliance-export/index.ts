/**
 * Compliance Export Edge Function
 *
 * Generates weekly Centrelink/DEWR compliance reports for provider mentors.
 * Aggregates candidate swipes, matches, and hires per week.
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

    // Determine date range: default to last Monday midnight AEST → now
    const now = new Date()
    const defaultPeriodEnd = now.toISOString().split('T')[0]

    // Compute last Monday 00:00 AEST
    const lastMonday = new Date(now)
    lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7) - 7) // previous Monday
    lastMonday.setHours(0, 0, 0, 0)

    const periodStart = body.period_start || lastMonday.toISOString().split('T')[0]
    const periodEnd = body.period_end || defaultPeriodEnd
    const reportType = body.report_type || 'weekly_summary'

    const errors: string[] = []

    // --- Step 1: Determine which candidates to process ---
    let candidateIds: string[] = []

    if (body.candidate_id) {
      candidateIds = [body.candidate_id]
    } else if (body.provider_id) {
      // Get candidates that have swiped on this provider's jobs
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
      // Cron mode: all candidates with activity in period
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

    // --- Step 2: For each candidate, aggregate their data ---
    const candidates: CandidateAggregation[] = []

    for (const candidateId of candidateIds) {
      try {
        const agg = await aggregateCandidate(supabase, candidateId, periodStart, periodEnd)
        if (agg) candidates.push(agg)
      } catch (err) {
        errors.push(`Candidate ${candidateId}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // --- Step 3: Build report ---
    const providerId = body.provider_id || candidates[0]?.jobs_applied_to?.[0]?.job_id || 'unknown'

    const reportData: ComplianceReportData = {
      generated_at: new Date().toISOString(),
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

    // --- Step 4: Generate PDF bytes ---
    const pdfBytes = generateSimplePdf(reportData)

    // --- Step 5: Save compliance report for each candidate ---
    let reportsCreated = 0

    for (const candidate of candidates) {
      // Determine which provider this candidate interacted with (use first job's employer)
      const { data: firstJob } = await supabase
        .from('jobs')
        .select('employer_id')
        .eq('id', candidate.jobs_applied_to[0]?.job_id || '')
        .single()

      const effectiveProviderId = firstJob?.employer_id || providerId

      // Insert compliance_reports record
      const fileName = `compliance_${effectiveProviderId}_${candidate.candidate_id}_${periodStart}_${periodEnd}.pdf`
      const storagePath = `${effectiveProviderId}/${candidate.candidate_id}/${fileName}`

      const { data: reportRecord, error: insertErr } = await supabase
        .from('compliance_reports')
        .insert({
          candidate_id: candidate.candidate_id,
          provider_id: effectiveProviderId,
          period_start: periodStart,
          period_end: periodEnd,
          report_type: reportType,
          report_data: candidate as any,
          storage_path: storagePath,
          status: 'generating',
        })
        .select('id')
        .single()

      if (insertErr) {
        errors.push(`Failed to insert report for ${candidate.candidate_id}: ${insertErr.message}`)
        continue
      }

      // Upload PDF to Supabase Storage
      const { error: uploadErr } = await supabase
        .storage
        .from('compliance-reports')
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadErr) {
        errors.push(`Failed to upload PDF for ${candidate.candidate_id}: ${uploadErr.message}`)
        // Mark report as failed
        await supabase
          .from('compliance_reports')
          .update({ status: 'failed', error_message: uploadErr.message })
          .eq('id', reportRecord!.id)
        continue
      }

      // Mark report as completed
      await supabase
        .from('compliance_reports')
        .update({ status: 'completed' })
        .eq('id', reportRecord!.id)

      reportsCreated++
    }

    return new Response(
      JSON.stringify({
        reports_created: reportsCreated,
        candidates_processed: candidates.length,
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
  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', candidateId)
    .single()

  if (!profile) return null

  // Fetch swipes in period
  const { data: swipes } = await supabase
    .from('swipes')
    .select('id, job_id, direction, created_at')
    .eq('candidate_id', candidateId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd + 'T23:59:59Z')

  const totalSwipes = swipes?.length || 0
  const rightSwipes = swipes?.filter(s => s.direction === 'right').length || 0
  const leftSwipes = swipes?.filter(s => s.direction === 'left').length || 0

  // Fetch job titles for swiped jobs
  const jobIds = [...new Set((swipes || []).map(s => s.job_id))]
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title')
    .in('id', jobIds.length > 0 ? jobIds : ['00000000-0000-0000-0000-000000000000'])

  const jobTitles = new Map((jobs || []).map(j => [j.id, j.title]))

  const jobsAppliedTo = (swipes || []).map(s => ({
    job_id: s.job_id,
    title: jobTitles.get(s.job_id) || 'Unknown Job',
    direction: s.direction,
    swiped_at: s.created_at,
  }))

  // Fetch active matches (chatting or hire_pending)
  const { data: activeMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('candidate_id', candidateId)
    .in('status', ['chatting', 'hire_pending', 'hired'])
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd + 'T23:59:59Z')

  // Fetch hires completed in period
  const { data: hires } = await supabase
    .from('matches')
    .select('id')
    .eq('candidate_id', candidateId)
    .eq('status', 'hired')
    .gte('hired_at', periodStart)
    .lte('hired_at', periodEnd + 'T23:59:59Z')

  return {
    candidate_id: candidateId,
    full_name: profile.full_name || 'Unknown',
    total_swipes: totalSwipes,
    right_swipes: rightSwipes,
    left_swipes: leftSwipes,
    active_matches: activeMatches?.length || 0,
    hires_completed: hires?.length || 0,
    jobs_applied_to: jobsAppliedTo,
  }
}

/**
 * Generate a simple PDF report with candidate compliance data.
 * Uses raw PDF construction (no heavy dependencies).
 */
function generateSimplePdf(report: ComplianceReportData): Uint8Array {
  const lines: string[] = []
  const pageWidth = 595 // A4 width in points
  const pageHeight = 842 // A4 height
  const margin = 50
  const usableWidth = pageWidth - 2 * margin

  // Metadata
  lines.push(`Centrelink Compliance Report`)
  lines.push(`Generated: ${report.generated_at}`)
  lines.push(`Period: ${report.period_start} to ${report.period_end}`)
  lines.push(`Report Type: ${report.report_type}`)
  lines.push('')
  lines.push(`--- Summary ---`)
  lines.push(`Total Candidates: ${report.summary.total_candidates}`)
  lines.push(`Total Swipes: ${report.summary.total_swipes}`)
  lines.push(`Total Right Swipes (Interest): ${report.summary.total_right_swipes}`)
  lines.push(`Total Active Matches: ${report.summary.total_matches}`)
  lines.push(`Total Hires: ${report.summary.total_hires}`)
  lines.push('')

  // Per-candidate detail
  for (const candidate of report.candidates) {
    lines.push(`--- ${candidate.full_name} (${candidate.candidate_id}) ---`)
    lines.push(`  Swipes: ${candidate.total_swipes} total (${candidate.right_swipes} right, ${candidate.left_swipes} left)`)
    lines.push(`  Active Matches: ${candidate.active_matches}`)
    lines.push(`  Hires Completed: ${candidate.hires_completed}`)
    if (candidate.jobs_applied_to.length > 0) {
      lines.push(`  Jobs Applied To:`)
      for (const job of candidate.jobs_applied_to) {
        const dir = job.direction === 'right' ? 'INTERESTED' : 'PASS'
        lines.push(`    - ${job.title} (${dir}) — ${job.swiped_at}`)
      }
    }
    lines.push('')
  }

  // Build text content
  const textContent = lines.join('\n')

  // Simple PDF construction using PDF 1.4 spec
  // This creates a valid PDF with text content
  const objects: string[] = []
  let objectNum = 0

  function addObject(content: string): number {
    objects.push(content)
    return ++objectNum
  }

  // Object 1: Catalog
  addObject(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`)

  // Object 2: Pages
  addObject(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`)

  // Object 3: Page
  addObject(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`)

  // Escape PDF string special characters
  function escapePdfString(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, '\\n')
  }

  // Build content stream for text on the page
  let streamContent = ''
  streamContent += 'BT\n'
  streamContent += '/F1 10 Tf\n'
  streamContent += `${margin} ${pageHeight - margin - 20} Td\n`

  const textLines = textContent.split('\n')
  const lineHeight = 14

  for (const line of textLines) {
    // Check if we need a new page (very basic)
    const y = pageHeight - margin - 20 - (textLines.indexOf(line) + 1) * lineHeight
    if (y < margin) {
      // For simplicity, just truncate
      break
    }
    streamContent += `(${escapePdfString(line)}) Tj\n`
    streamContent += `0 -${lineHeight} Td\n`
  }

  streamContent += 'ET\n'

  // Object 4: Content stream
  const streamLength = streamContent.length
  addObject(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`)

  // Object 5: Font
  addObject(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj`)

  // Build final PDF
  const pdfHeader = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n'
  const body = objects.join('\n') + '\n'
  const xrefOffset = pdfHeader.length + body.length

  const xref = `xref\n0 ${objectNum + 1}\n0000000000 65535 f \n`
  let currentOffset = pdfHeader.length
  for (let i = 0; i < objectNum; i++) {
    const objStart = currentOffset
    // Find the end of this object
    const objEnd = body.indexOf('\nendobj', objStart)
    const line = `${String(objStart).padStart(10, '0')} 00000 n \n`
    xref += line
    currentOffset = objEnd + 7 // +7 for '\nendobj'
  }

  const trailer = `trailer\n<< /Size ${objectNum + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const pdf = pdfHeader + body + xref + trailer
  return new TextEncoder().encode(pdf)
}
