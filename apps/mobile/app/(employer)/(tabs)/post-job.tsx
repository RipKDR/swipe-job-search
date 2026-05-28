import React, { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { JobForm, type JobFormValues } from '@/components/employer/JobForm'

function buildPayDisplay(amount: number, period: 'hour' | 'week' | 'year') {
  const suffix = period === 'hour' ? '/hr' : period === 'week' ? '/wk' : '/yr'
  return `$${amount.toFixed(2)}${suffix}`
}

async function uploadJobPhoto(photoUri: string, employerId: string) {
  const response = await fetch(photoUri)
  const blob = await response.blob()
  const fileExt = photoUri.split('.').pop()?.split('?')[0] ?? 'jpg'
  const path = `${employerId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage.from('job-photos').upload(path, blob, {
    upsert: false,
    contentType: blob.type || 'image/jpeg',
  })

  if (error) throw error
  const { data } = supabase.storage.from('job-photos').getPublicUrl(path)
  return data.publicUrl
}

export default function PostJobScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSubmit = async (values: JobFormValues) => {
    if (!profile?.id) throw new Error('You must be signed in as an employer')

    setSubmitting(true)
    setFeedback(null)
    try {
      const { data: membership, error: circleError } = await (supabase as any)
        .from('circle_members')
        .select('circle_id')
        .eq('profile_id', profile.id)
        .limit(1)
        .maybeSingle()

      if (circleError) throw circleError
      if (!membership?.circle_id) throw new Error('No circle assigned to your employer profile')

      let photoUrl: string | null = null
      if (values.photoUri.trim()) {
        photoUrl = await uploadJobPhoto(values.photoUri.trim(), profile.id)
      }

      const payAmount = Number(values.payAmount)
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await (supabase as any).from('jobs').insert({
        employer_id: profile.id,
        circle_id: membership.circle_id,
        title: values.title.trim(),
        job_type: values.jobType,
        pay_amount: payAmount,
        pay_period: values.payPeriod,
        pay_display: buildPayDisplay(payAmount, values.payPeriod),
        hours_text: values.hoursText.trim(),
        suburb: values.suburb.trim(),
        description: values.description.trim() ? values.description.trim() : null,
        photo_url: photoUrl,
        expires_at: expiresAt,
      })

      if (error) throw error

      setFeedback('Job posted successfully')
      router.replace('/(employer)/(tabs)/jobs')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-slate-950 px-4 pt-14 pb-6">
      <View className="gap-3">
        <Text className="text-white text-2xl font-semibold">Post Job</Text>
        <Text className="text-slate-400">MVP fields with 30-day expiry and optional photo upload.</Text>
        {feedback ? <Text className="text-emerald-300">{feedback}</Text> : null}
        <JobForm submitting={submitting} onSubmit={handleSubmit} />
      </View>
    </ScrollView>
  )
}
