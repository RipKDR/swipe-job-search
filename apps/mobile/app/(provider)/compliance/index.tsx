import { AppScreen } from '@/components/ui/AppScreen'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { TabWebShell } from '@/components/ui/TabWebShell'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@hi-hired/shared'
import { useEffect, useState } from 'react'
import { View, Text, Pressable } from '@/components/tw'
import { FlatList, Platform } from 'react-native'
import { useSafeAreaFrame } from 'react-native-safe-area-context'

type ComplianceReport = Database['public']['Tables']['compliance_reports']['Row']

export default function ComplianceScreen() {
  const { profile } = useAuth()
  const [reports, setReports] = useState<ComplianceReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return

    async function fetchReports() {
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
    }

    fetchReports()
  }, [profile?.id])

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

        {error ? (
          <View className="mt-8 px-4">
            <View className="bg-red-900/30 border border-red-800/50 rounded-xl p-4">
              <Text className="text-red-300 text-sm">{error}</Text>
              <Pressable
                onPress={() => setError(null)}
                className="mt-2"
              >
                <Text className="text-indigo-400 font-medium">Dismiss</Text>
              </Pressable>
            </View>
          </View>
        ) : reports.length === 0 ? (
          <View className="mt-4">
            <EmptyState
              emoji="📋"
              title="No Compliance Reports Yet"
              description="Weekly compliance reports are generated automatically every Monday. They will appear here once ready."
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

  return (
    <View className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mx-4">
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
          Period: {formatDate(report.period_start)} — {formatDate(report.period_end)}
        </Text>
        <Text className="text-slate-400 text-sm">
          Generated: {formatDate(report.created_at)}
        </Text>
      </View>

      {report.status === 'completed' && report.storage_path && (
        <Pressable
          className="mt-3 bg-indigo-600/20 border border-indigo-500/30 rounded-lg py-2 px-3 active:opacity-80"
          onPress={() => {
            // In a real app, download or open the PDF
            // const { data } = supabase.storage.from('compliance-reports').getPublicUrl(report.storage_path!)
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
