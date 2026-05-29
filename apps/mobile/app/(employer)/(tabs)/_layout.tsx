import { Tabs } from 'expo-router'
import { Text } from 'react-native'

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ color, fontSize: 24 }}>{emoji}</Text>
}

export default function EmployerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
        },
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="post-job"
        options={{
          title: 'Post Job',
          tabBarIcon: ({ color }) => <TabIcon emoji="➕" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="jobs/[id]/interested"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}
