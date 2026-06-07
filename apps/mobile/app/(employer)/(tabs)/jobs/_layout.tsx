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
        name="[id]/interested"
        options={{
          title: 'Interested Candidates',
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: 'Edit Job',
        }}
      />
    </Stack>
  );
}