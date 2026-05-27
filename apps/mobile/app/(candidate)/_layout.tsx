import { RoleTabLayout } from '@/components/navigation/RoleTabLayout'

const CANDIDATE_TABS = [
  { name: 'deck', title: 'Jobs', icon: '💼' },
  { name: 'matches', title: 'Matches', icon: '💬' },
  { name: 'profile', title: 'Profile', icon: '👤' },
] as const

export default function CandidateLayout() {
  return <RoleTabLayout tabs={[...CANDIDATE_TABS]} />
}
