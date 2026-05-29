import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { resolveTabBarColor } from '@/lib/tab-bar-color'

export type RoleTab = {
  name: string
  title: string
  icon: string
}

interface RoleTabLayoutProps {
  tabs: RoleTab[]
}

export function TabIcon({ emoji, color }: { emoji: string; color: unknown }) {
  return (
    <Text style={{ color: resolveTabBarColor(color), fontSize: 24 }}>{emoji}</Text>
  );
}

export function RoleTabLayout({ tabs }: RoleTabLayoutProps) {
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
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <TabIcon emoji={tab.icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  )
}
