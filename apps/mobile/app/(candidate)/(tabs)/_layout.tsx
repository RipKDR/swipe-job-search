import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TabIcon } from '@/components/navigation/RoleTabLayout';

function CandidateTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
        },
        tabBarActiveTintColor: '#818cf8',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen
        name="deck"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <TabIcon emoji="💼" color={color} />,
        }}
      />

      <Tabs.Screen
        name="applied"
        options={{
          title: 'Applied',
          tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function CandidateTabsLayout() {
  if (Platform.OS === 'web') {
    return <CandidateTabs />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CandidateTabs />
    </GestureHandlerRootView>
  );
}
