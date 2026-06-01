import { AppScreen } from '@/components/ui/AppScreen'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { TabWebShell } from '@/components/ui/TabWebShell'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@hi-hired/shared'
import { useEffect, useState, useCallback } from 'react'
import { View, Text, Pressable, TextInput } from '@/components/tw'
import { FlatList, Platform, Alert } from 'react-native'

type ComplianceReport = Database['public']['Tables']['compliance_reports']['Row']

const DEFAULT_API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function ComplianceScreen() {
  const { profile } = useAuth()
  const [reports, setReports] = useState<ComplianceReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate report form state
  const [showForm, setShowForm] = useState(false)
  const [candidateId, setCandidateId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [periodDays, setPeriodDays] = useState('7')

  const fetchReports = useCallback(async () => {
    if (!profile?.id) return
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('compliance_reports')
        .select('*')
        .eq('provider_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError
      setReports((data as ComplianceReport[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance reports')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleGenerate = async () => {
    if (!candidateId.trim()) {
      Alert.alert('Validation', 'Please enter a candidate ID.')
      return
    }

    const days = parseInt(periodDays, 10)
    if (isNaN(days) || days < 1 || days > 90) {
      Alert.alert('Validation', 'Period must be between 1 and 90 days.')
      return
    }

    setGenerating(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        Alert.alert('Auth Error', 'Not authenticated. Please re-login.')
        return
      }

      const periodEnd = new Date()
      const periodStart = new Date()
      periodStart.setDate(periodStart.getDate() - days)

      const resp = await fetch(
        `${DEFAULT_API_BASE}/api/v1/compliance/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            candidate_id: candidateId.trim(),
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            report_type: days <= 7 ? 'weekly_summary' : days <= 14 ? 'fortnightly' : 'monthly',
          }),
        }
      )

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ detail: resp.statusText }))
        throw new Error(errBody.detail || `Server error (${resp.status})`)
      }

      setShowForm(false)
      setCandidateId('')
      Alert.alert('Report Generated', 'The compliance report has been generated successfully.')
      await fetchReports()
    } catch (err) {
      Alert.alert('Generation Failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading compliance reports…" />
  }

  return (
    <AppScreen centered={false} maxWidth="tab">
      <TabWebShell>
        <ScreenHeader
          title="Compliance Reports"
          subtitle="Weekly Centrelink/DEWR compliance summaries for your candidates."
        />

        <View className="px-4 mt-2 mb-4">
          <Pressable
            className="bg-indigo-600 py-3 px-4 rounded-xl active:opacity-80"
            onPress={() => setShowForm(!showForm)}
          >
            <Text className="text-white font-semibold text-center">
              {showForm ? 'Cancel' : '+ Generate Report'}
            </Text>
          </Pressable>
        </View>

        {showForm && (
          <View className="mx-4 mb-4 bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 gap-3">
            <View>
              <Text className="text-slate-400 text-xs mb-1">Candidate ID</Text>
              <TextInput
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="UUID of the candidate"
                placeholderTextColor="#64748b"
                value={candidateId}
                onChangeText={setCandidateId}
                autoCapitalize="none"
              />
            </View>
            <View>
              <Text className="text-slate-400 text-xs mb-1">Report period (days back)</Text>
              <TextInput
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="7"
                placeholderTextColor="#64748b"
                value={periodDays}
                onChangeText={setPeriodDays}
                keyboardType="number-pad"
              />
            </View>
            <Pressable
              className={`py-3 px-4 rounded-xl ${generating ? 'bg-indigo-800/50' : 'bg-emerald-600'} active:opacity-80`}
              onPress={handleGenerate}
              disabled={generating}
            >
              <Text className="text-white font-semibold text-center">
                {generating ? 'Generating…' : 'Generate Report'}
              </Text>
            </Pressable>
          </View>
        )}

        {error ? (
          <View className="mt-2 px-4">
            <View className="bg-red-900/30 border border-red-800/50 rounded-xl p-4">
              <Text className="text-red-300 text-sm">{error}</Text>
              <Pressable onPress={fetchReports} className="mt-2">
                <Text className="text-indigo-400 font-medium">Retry</Text>
              </Pressable>
            </View>
          </View>
        ) : reports.length === 0 ? (
          <View className="mt-4">
            <EmptyState
              emoji="📋"
              title="No Compliance Reports Yet"
              description="Generate a report for one of your candidates to get started. Reports include swipe activity, matches, and hires for the selected period."
            />
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            contentContainerClassName="pb-8 gap-3"
            renderItem={({ item }) => (
              <ReportCard report={item} />
            )}
          />
        )}
      </TabWebShell>
    </AppScreen>
  )
}

function ReportCard({ report }: { report: ComplianceReport }) {
  const statusColor =
    report.status === 'completed'
      ? 'text-emerald-400'
      : report.status === 'failed'
        ? 'text-red-400'
        : report.status === 'generating'
          ? 'text-amber-400'
          : 'text-slate-400'

  const statusLabel =
    report.status === 'completed'
      ? 'Completed'
      : report.status === 'failed'
        ? 'Failed'
        : report.status === 'generating'
          ? 'Generating…'
          : 'Pending'

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return d
    }
  }

  const [expanded, setExpanded] = useState(false)
  const reportData = report.report_data as Record<string, any> | null

  return (
    <View className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mx-4">
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-white font-semibold text-base">
            {report.report_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
          <Text className={`text-xs font-medium ${statusColor} px-2 py-0.5 rounded-full bg-slate-700/50`}>
            {statusLabel}
          </Text>
        </View>

        <View className="gap-1">
          <Text className="text-slate-400 text-sm">
            Candidate: {report.candidate_id?.slice(0, 8)}…
          </Text>
          <Text className="text-slate-400 text-sm">
            Period: {formatDate(report.period_start)} — {formatDate(report.period_end)}
          </Text>
          <Text className="text-slate-400 text-sm">
            Generated: {formatDate(report.created_at)}
          </Text>
        </View>
      </Pressable>

      {expanded && report.status === 'completed' && reportData && (
        <View className="mt-3 pt-3 border-t border-slate-700/60 gap-2">
          <Text className="text-emerald-300 font-medium text-sm">Activity Summary</Text>
          {reportData.activity_summary && (
            <>
              <Text className="text-slate-300 text-xs">
                Total Swipes: {reportData.activity_summary.total_swipes}
              </Text>
              <Text className="text-slate-300 text-xs">
                Right Swipes: {reportData.activity_summary.right_swipes}
              </Text>
              <Text className="text-slate-300 text-xs">
                Unique Jobs: {reportData.activity_summary.unique_jobs_interacted}
              </Text>
              <Text className="text-slate-300 text-xs">
                Matches: {reportData.activity_summary.total_matches}
              </Text>
              <Text className="text-slate-300 text-xs">
                Hires: {reportData.activity_summary.total_hires}
              </Text>
            </>
          )}

          {reportData.matches && reportData.matches.length > 0 && (
            <>
              <Text className="text-indigo-300 font-medium text-sm mt-1">Matches</Text>
              {reportData.matches.slice(0, 5).map((m: any, i: number) => (
                <Text key={i} className="text-slate-300 text-xs">
                  {m.status} — {m.created_at ? formatDate(m.created_at) : 'N/A'}
                </Text>
              ))}
            </>
          )}

          {reportData.hires && reportData.hires.length > 0 && (
            <>
              <Text className="text-emerald-300 font-medium text-sm mt-1">Hires</Text>
              {reportData.hires.slice(0, 5).map((h: any, i: number) => (
                <Text key={i} className="text-slate-300 text-xs">
                  Hire {i + 1} — {h.created_at ? formatDate(h.created_at) : 'N/A'}
                </Text>
              ))}
            </>
          )}
        </View>
      )}

      {expanded && report.status === 'completed' && report.storage_path && (
        <Pressable
          className="mt-3 bg-indigo-600/20 border border-indigo-500/30 rounded-lg py-2 px-3 active:opacity-80"
          onPress={() => {
            // PDF download — requires signed URL from backend
          }}
        >
          <Text className="text-indigo-300 text-sm font-medium text-center">
            View Report PDF
          </Text>
        </Pressable>
      )}

      {report.status === 'failed' && report.error_message && (
        <Text className="text-red-400/70 text-xs mt-2">{report.error_message}</Text>
      )}
    </View>
  )
}
