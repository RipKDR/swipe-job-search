import { Stack } from 'expo-router';

export default function JobsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'My Jobs',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Job Details',
        }}
      />
    </Stack>
  );
}