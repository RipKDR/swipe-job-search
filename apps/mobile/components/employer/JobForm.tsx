import React, { useState } from 'react';
import { View, Text } from '@/components/tw';
import {
  JOB_TYPES,
  type JobType,
  isBelowFairWorkMinimum,
  fairWorkWarningMessage,
} from '@hi-hired/shared';
import { getErrorMessage } from '../../lib/errors';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { FormBlock } from '@/components/onboarding/FormBlock';

export type JobFormValues = {
  title: string;
  jobType: JobType;
  payAmount: string;
  payPeriod: 'hour' | 'week' | 'year';
  hoursText: string;
  suburb: string;
  description: string;
  photoUri: string;
};

type JobFormProps = {
  submitting?: boolean;
  onSubmit: (values: JobFormValues) => Promise<void> | void;
};

const initialValues: JobFormValues = {
  title: '',
  jobType: 'casual',
  payAmount: '',
  payPeriod: 'hour',
  hoursText: '',
  suburb: '',
  description: '',
  photoUri: '',
};

const inputClass = 'mb-0';

export function JobForm({ submitting = false, onSubmit }: JobFormProps) {
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
    values.suburb.trim().length > 1 &&
    Number.isFinite(payNumeric) &&
    payNumeric > 0;

  const update = <K extends keyof JobFormValues>(key: K, next: JobFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: next }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError('Please complete all required fields before posting');
      return;
    }

    try {
      await onSubmit(values);
      setValues(initialValues);
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, 'Unable to post job'));
    }
  };

  return (
    <View className="gap-7">
      <TextField
        label="Job title *"
        className={inputClass}
        value={values.title}
        onChangeText={(value) => update('title', value)}
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
            onChangeText={(value) => update('payAmount', value)}
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
        onChangeText={(value) => update('hoursText', value)}
        placeholder="Mon–Fri 7am–3pm"
      />
      <TextField
        label="Suburb *"
        className={inputClass}
        value={values.suburb}
        onChangeText={(value) => update('suburb', value)}
        placeholder="Moonee Ponds"
      />
      <TextField
        label="Description"
        className={inputClass}
        value={values.description}
        onChangeText={(value) => update('description', value)}
        placeholder="Optional — team culture, duties, perks"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <TextField
        label="Photo URL"
        className={inputClass}
        value={values.photoUri}
        onChangeText={(value) => update('photoUri', value)}
        placeholder="Optional image URL"
      />

      {error ? <Text className="text-red-400">{error}</Text> : null}
      <Button
        title="Post job"
        loading={submitting}
        disabled={!canSubmit || submitting}
        onPress={handleSubmit}
        fullWidth
      />
    </View>
  );
}
