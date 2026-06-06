import React, { useState } from 'react';
import { View, Text } from '@/components/tw';
import {
  JOB_TYPES,
  type JobType,
  isBelowFairWorkMinimum,
  fairWorkWarningMessage,
  type BeachheadSuburb,
  BEACHHEAD_SUBURBS,
} from '@hi-hired/shared';
import { getErrorMessage } from '../../lib/errors';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { FormBlock } from '@/components/onboarding/FormBlock';
import { SuburbPicker } from '../forms/SuburbPicker';

export type JobFormValues = {
  title: string;
  jobType: JobType;
  payAmount: string;
  payPeriod: 'hour' | 'week' | 'year';
  hoursText: string;
  suburb: BeachheadSuburb;
  description: string;
  photoUri: string;
};

type JobFormProps = {
  submitting?: boolean;
  initialValues?: JobFormValues;
  submitLabel?: string;
  errorFallback?: string;
  resetOnSubmit?: boolean;
  onSubmit: (values: JobFormValues) => Promise<void> | void;
};

export const emptyJobFormValues: JobFormValues = {
  title: '',
  jobType: 'casual',
  payAmount: '',
  payPeriod: 'hour',
  hoursText: '',
  suburb: BEACHHEAD_SUBURBS[0],
  description: '',
  photoUri: '',
};

const inputClass = 'mb-0';

export function JobForm({
  submitting = false,
  initialValues = emptyJobFormValues,
  submitLabel = 'Post job',
  errorFallback = 'Unable to post job',
  resetOnSubmit = true,
  onSubmit,
}: JobFormProps) {
  const [values, setValues] = useState<JobFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);

  const payNumeric = Number(values.payAmount);
  const fairWorkWarning =
    values.payPeriod === 'hour' &&
    Number.isFinite(payNumeric) &&
    payNumeric > 0 &&
    isBelowFairWorkMinimum(payNumeric, values.payPeriod, values.jobType);

  const canSubmit =
    values.title.trim().length > 2 &&
    values.hoursText.trim().length > 2 &&
    values.suburb &&
    Number.isFinite(payNumeric) &&
    payNumeric > 0;

  const update = <K extends keyof JobFormValues>(key: K, next: JobFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: next }));
  };

  const handleSubmit = async () => {
    if (submitting || !canSubmit) return;
    setError(null);

    try {
      await onSubmit(values);
      if (resetOnSubmit) {
        setValues(emptyJobFormValues);
      }
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, errorFallback));
    }
  };

  return (
    <View className="gap-7">
      <TextField
        label="Job title *"
        className={inputClass}
        value={values.title}
        onChangeText={(value: string) => update('title', value)}
        placeholder="e.g. Weekend barista"
      />

      <FormBlock label="Job type *">
        <View className="flex-row flex-wrap gap-2">
          {JOB_TYPES.map((jobType) => (
            <Button
              key={jobType}
              title={jobType.replace('_', ' ')}
              variant={values.jobType === jobType ? 'primary' : 'secondary'}
              onPress={() => update('jobType', jobType)}
              className="px-4 py-3"
            />
          ))}
        </View>
      </FormBlock>

      <FormBlock label="Pay *" hint="Hourly pay is checked against Fair Work minimums">
        <View className="flex-row gap-2 mb-2">
          <TextField
            className={`flex-1 ${inputClass}`}
            value={values.payAmount}
            onChangeText={(value: string) => update('payAmount', value)}
            placeholder="Amount"
            keyboardType="numeric"
          />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {(['hour', 'week', 'year'] as const).map((period) => (
            <Button
              key={period}
              title={period}
              variant={values.payPeriod === period ? 'primary' : 'secondary'}
              onPress={() => update('payPeriod', period)}
              className="px-4 py-3 capitalize"
            />
          ))}
        </View>
        {fairWorkWarning ? (
          <Text className="text-amber-400 text-sm mt-2">
            {fairWorkWarningMessage(values.jobType)}
          </Text>
        ) : null}
      </FormBlock>

      <TextField
        label="Hours *"
        className={inputClass}
        value={values.hoursText}
        onChangeText={(value: string) => update('hoursText', value)}
        placeholder="Mon–Fri 7am–3pm"
      />
      <SuburbPicker
        value={values.suburb}
        onChange={(suburb) => update('suburb', suburb)}
        error={canSubmit && !values.suburb ? 'Please select a suburb' : undefined}
      />
      <TextField
        label="Description"
        className={inputClass}
        value={values.description}
        onChangeText={(value: string) => update('description', value)}
        placeholder="Optional — team culture, duties, perks"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <TextField
        label="Photo URL"
        className={inputClass}
        value={values.photoUri}
        onChangeText={(value: string) => update('photoUri', value)}
        placeholder="Optional image URL"
      />

      {error ? <Text className="text-red-400">{error}</Text> : null}
      <Button
        title={submitLabel}
        loading={submitting}
        disabled={!canSubmit || submitting}
        onPress={handleSubmit}
        fullWidth
      />
    </View>
  );
}
