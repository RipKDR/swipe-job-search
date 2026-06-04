import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type InboxMatch = {
  id: string
  status: 'chatting' | 'hire_pending' | 'hired' | 'unmatched' | 'archived'
  jobId: string
  jobTitle: string
  counterpartId: string
  counterpartName: string
  counterpartAvatarUrl: string | null
  lastMessagePreview: string | null
  updatedAt: string
  isNewMatch: boolean
}

export async function fetchMatchInbox(userId: string, role: 'candidate' | 'employer'): Promise<InboxMatch[]> {
  const participantColumn = role === 'candidate' ? 'candidate_id' : 'employer_id'

  const { data: matchesData, error: matchesError } = await supabase
    .from('matches')
    .select(
      `
      id,
      status,
      job_id,
      candidate_id,
      employer_id,
      created_at,
      updated_at,
      jobs(title),
      candidate:profiles!matches_candidate_id_fkey(id,full_name,avatar_url),
      employer:profiles!matches_employer_id_fkey(id,full_name,avatar_url)
    `
    )
    .eq(participantColumn, userId)
    .in('status', ['chatting', 'hire_pending'])
    .order('updated_at', { ascending: false })

  if (matchesError) throw matchesError

  const matches = (matchesData ?? []) as any[]
  if (matches.length === 0) return []

  const matchIds = matches.map((match) => match.id as string)

  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('match_id,body,created_at')
    .in('match_id', matchIds)
    .order('created_at', { ascending: false })

  if (messagesError) throw messagesError

  const lastMessageByMatch = new Map<string, { body: string; created_at: string }>()
  for (const message of (messagesData ?? []) as any[]) {
    const matchId = message.match_id as string
    if (!lastMessageByMatch.has(matchId)) {
      lastMessageByMatch.set(matchId, {
        body: message.body as string,
        created_at: message.created_at as string,
      })
    }
  }

  return matches.map((match) => {
    const counterpart =
      role === 'candidate'
        ? (match.employer as { id: string; full_name: string | null; avatar_url: string | null })
        : (match.candidate as { id: string; full_name: string | null; avatar_url: string | null })

    const lastMessage = lastMessageByMatch.get(match.id as string)

    return {
      id: match.id as string,
      status: match.status as InboxMatch['status'],
      jobId: match.job_id as string,
      jobTitle: (match.jobs?.title as string | undefined) ?? 'Job',
      counterpartId: counterpart?.id ?? '',
      counterpartName: counterpart?.full_name ?? (role === 'candidate' ? 'Employer' : 'Candidate'),
      counterpartAvatarUrl: counterpart?.avatar_url ?? null,
      lastMessagePreview: lastMessage?.body ?? null,
      updatedAt: (match.updated_at as string) ?? (match.created_at as string),
      isNewMatch: !lastMessage,
    }
  })
}

export function useMatchInbox() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['match-inbox', profile?.id, profile?.role],
    enabled: Boolean(profile?.id && profile?.role),
    queryFn: () => fetchMatchInbox(profile!.id, profile!.role as 'candidate' | 'employer'),
  })
}

export type MatchDetail = {
  id: string
  status: InboxMatch['status']
  jobId: string
  jobTitle: string
  candidateId: string
  employerId: string
  counterpartId: string
  counterpartName: string
  candidate_hire_confirmed: boolean
  employer_hire_confirmed: boolean
  hire_initiated_by: string | null
}

export async function fetchMatchDetail(matchId: string, userId: string, role: 'candidate' | 'employer'): Promise<MatchDetail> {
  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      id,
      status,
      job_id,
      candidate_id,
      employer_id,
      candidate_hire_confirmed,
      employer_hire_confirmed,
      hire_initiated_by,
      jobs(title),
      candidate:profiles!matches_candidate_id_fkey(id,full_name),
      employer:profiles!matches_employer_id_fkey(id,full_name)
    `
    )
    .eq('id', matchId)
    .single()

  if (error) throw error

  const match = data as any
  const isParticipant =
    match.candidate_id === userId || match.employer_id === userId

  if (!isParticipant) {
    throw new Error('Match was not found or you are not a participant')
  }

  const counterpart =
    role === 'candidate'
      ? (match.employer as { id: string; full_name: string | null })
      : (match.candidate as { id: string; full_name: string | null })

  return {
    id: match.id as string,
    status: match.status as MatchDetail['status'],
    jobId: match.job_id as string,
    jobTitle: (match.jobs?.title as string | undefined) ?? 'Job',
    candidateId: match.candidate_id as string,
    employerId: match.employer_id as string,
    counterpartId: counterpart?.id ?? '',
    counterpartName: counterpart?.full_name ?? (role === 'candidate' ? 'Employer' : 'Candidate'),
    candidate_hire_confirmed: Boolean(match.candidate_hire_confirmed),
    employer_hire_confirmed: Boolean(match.employer_hire_confirmed),
    hire_initiated_by: (match.hire_initiated_by as string | null) ?? null,
  }
}

export function useMatchDetail(matchId: string) {
  const { profile, user } = useAuth()

  return useQuery({
    queryKey: ['match-detail', matchId, profile?.id],
    enabled: Boolean(matchId && profile?.id && profile?.role),
    queryFn: () => fetchMatchDetail(matchId, user!.id, profile!.role as 'candidate' | 'employer'),
  })
}
