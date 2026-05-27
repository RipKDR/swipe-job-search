import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export type RoleTab = {
  name: string
  title: string
  icon: string
}

interface RoleTabLayoutProps {
  tabs: RoleTab[]
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
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>{tab.icon}</Text>,
          }}
        />
      ))}
    </Tabs>
  )
}
