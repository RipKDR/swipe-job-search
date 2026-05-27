import { RoleTabLayout } from '@/components/navigation/RoleTabLayout'

const EMPLOYER_TABS = [
  { name: 'jobs', title: 'My Jobs', icon: '📋' },
  { name: 'matches', title: 'Matches', icon: '💬' },
  { name: 'profile', title: 'Profile', icon: '👤' },
] as const

export default function EmployerLayout() {
  return <RoleTabLayout tabs={[...EMPLOYER_TABS]} />
}
