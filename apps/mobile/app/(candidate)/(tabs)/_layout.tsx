import { Tabs } from 'expo-router'
import { Text, Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ color, fontSize: 24 }}>{emoji}</Text>
}

function CandidateTabs() {
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
        name="deck"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <TabIcon emoji="💼" color={String(color)} />,
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
    </Tabs>
  )
}

export default function CandidateTabsLayout() {
  if (Platform.OS === 'web') {
    return <CandidateTabs />
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CandidateTabs />
    </GestureHandlerRootView>
  )
}
