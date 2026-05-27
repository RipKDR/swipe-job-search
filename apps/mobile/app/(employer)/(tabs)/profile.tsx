/**
 * Employer profile screen (placeholder)
 */

import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { signOutAndRedirect } from '@/lib/auth/signOutAndRedirect'

export default function EmployerProfileScreen() {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOutAndRedirect({
        signOut: async () => {
          const { error } = await supabase.auth.signOut()
          if (error) throw error
        },
        replace: (route) => router.replace(route as any),
      })
    } catch (error) {
      console.error('[profile] sign out failed', error)
      Alert.alert('Sign out failed', 'Please try again.')
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-6">
      <Text className="text-white text-xl mb-4">Profile Settings</Text>
      <Text className="text-slate-400 mb-8">Coming soon</Text>
      <TouchableOpacity
        onPress={handleSignOut}
        className="bg-slate-800 px-6 py-3 rounded-lg"
      >
        <Text className="text-white">Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}
