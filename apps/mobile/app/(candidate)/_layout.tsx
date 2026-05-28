import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function CandidateLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>💼</Text>,
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: 'Matches',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>💬</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>👤</Text>,
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  )
}
