import React, { useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { fair_work_mins, JOB_TYPES, type JobType } from '@hi-hired/shared'
import { Button } from '@/components/ui/Button'

export type JobFormValues = {
  title: string
  jobType: JobType
  payAmount: string
  payPeriod: 'hour' | 'week' | 'year'
  hoursText: string
  suburb: string
  description: string
  photoUri: string
}

type JobFormProps = {
  submitting?: boolean
  onSubmit: (values: JobFormValues) => Promise<void> | void
}

const initialValues: JobFormValues = {
  title: '',
  jobType: 'casual',
  payAmount: '',
  payPeriod: 'hour',
  hoursText: '',
  suburb: '',
  description: '',
  photoUri: '',
}

export function JobForm({ submitting = false, onSubmit }: JobFormProps) {
  const [values, setValues] = useState<JobFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  const payNumeric = Number(values.payAmount)
  const payTooLow =
    values.payPeriod === 'hour' &&
    Number.isFinite(payNumeric) &&
    payNumeric > 0 &&
    payNumeric < fair_work_mins.hour

  const canSubmit =
    values.title.trim().length > 2 &&
    values.hoursText.trim().length > 2 &&
    values.suburb.trim().length > 1 &&
    Number.isFinite(payNumeric) &&
    payNumeric > 0 &&
    !payTooLow

  const update = <K extends keyof JobFormValues>(key: K, next: JobFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: next }))
  }

  const handleSubmit = async () => {
    setError(null)
    if (!canSubmit) {
      setError('Please complete all required fields before posting')
      return
    }

    if (payTooLow) {
      setError(`Hourly pay must be at least $${fair_work_mins.hour.toFixed(2)} for beachhead compliance`)
      return
    }

    try {
      await onSubmit(values)
      setValues(initialValues)
    } catch (submitError: any) {
      setError(submitError?.message ?? 'Unable to post job')
    }
  }

  return (
    <View className="gap-3">
      <TextInput
        value={values.title}
        onChangeText={(value) => update('title', value)}
        placeholder="Job title"
        placeholderTextColor="#94a3b8"
        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
      />

      <View className="flex-row flex-wrap gap-2">
        {JOB_TYPES.map((jobType) => (
          <Button
            key={jobType}
            title={jobType.replace('_', ' ')}
            variant={values.jobType === jobType ? 'primary' : 'secondary'}
            onPress={() => update('jobType', jobType)}
          />
        ))}
      </View>

      <View className="flex-row gap-2">
        <TextInput
          value={values.payAmount}
          onChangeText={(value) => update('payAmount', value)}
          placeholder="Pay amount"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
        />
        <View className="flex-row gap-2">
          {(['hour', 'week', 'year'] as const).map((period) => (
            <Button
              key={period}
              title={period}
              variant={values.payPeriod === period ? 'primary' : 'secondary'}
              onPress={() => update('payPeriod', period)}
            />
          ))}
        </View>
      </View>

      {payTooLow ? (
        <Text className="text-amber-300 text-sm">
          Pay is below beachhead minimum (${fair_work_mins.hour.toFixed(2)}/hour).
        </Text>
      ) : null}

      <TextInput
        value={values.hoursText}
        onChangeText={(value) => update('hoursText', value)}
        placeholder="Hours (e.g. Mon-Fri 7am-3pm)"
        placeholderTextColor="#94a3b8"
        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
      />
      <TextInput
        value={values.suburb}
        onChangeText={(value) => update('suburb', value)}
        placeholder="Suburb"
        placeholderTextColor="#94a3b8"
        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
      />
      <TextInput
        value={values.description}
        onChangeText={(value) => update('description', value)}
        placeholder="Description (optional)"
        placeholderTextColor="#94a3b8"
        multiline
        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white min-h-24"
      />
      <TextInput
        value={values.photoUri}
        onChangeText={(value) => update('photoUri', value)}
        placeholder="Photo URI (optional)"
        placeholderTextColor="#94a3b8"
        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
      />

      {error ? <Text className="text-rose-300">{error}</Text> : null}
      <Button title="Post job" loading={submitting} disabled={!canSubmit || submitting} onPress={handleSubmit} fullWidth />
    </View>
  )
}
