/**
 * PostHireSurvey - appears after a hire is confirmed.
 * Asks the hired candidate to report their actual salary for salary transparency.
 * Uses the salary-report lib to submit to salary_reports table.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from '@/components/tw';
import { submitSalaryReport, validateSalaryReport } from '@/lib/salary-report';
import { supabase } from '@/lib/supabase';
import type { ViewStyle } from 'react-native';

interface PostHireSurveyProps {
  jobId: string;
  jobTitle: string;
  /** Called when the survey is completed or dismissed */
  onComplete?: () => void;
  /** Called when user chooses to skip */
  onSkip?: () => void;
  testID?: string;
}

type SurveyPhase = 'prompt' | 'form' | 'submitting' | 'success' | 'error' | 'skipped';

/**
 * PostHireSurvey component.
 * Shows a prompt to report salary, then a form with hourly rate input,
 * report type selector, and submit button.
 */
export function PostHireSurvey({
  jobId,
  jobTitle,
  onComplete,
  onSkip,
  testID,
}: PostHireSurveyProps) {
  const [phase, setPhase] = useState<SurveyPhase>('prompt');
  const [hourlyRate, setHourlyRate] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleStart = () => {
    setPhase('form');
    setErrorMessage(null);
  };

  const handleSkip = () => {
    setPhase('skipped');
    onSkip?.();
  };

  const handleSubmit = async () => {
    const rate = parseFloat(hourlyRate);
    const validationError = validateSalaryReport({
      jobId,
      hourlyRate: rate,
      reportType: 'actual',
    });

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    setPhase('submitting');
    setErrorMessage(null);

    try {
      const result = await submitSalaryReport(supabase, jobId, rate, 'actual');

      if (result.success) {
        setPhase('success');
        onComplete?.();
      } else {
        setPhase('error');
        setErrorMessage(result.error ?? 'Something went wrong');
      }
    } catch (e) {
      setPhase('error');
      setErrorMessage(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View testID={testID} className="bg-[#f4f0e9] rounded-2xl border border-[#2a2723] p-4">
      {phase === 'prompt' && <PromptPhase jobTitle={jobTitle} onStart={handleStart} onSkip={handleSkip} />}
      {phase === 'form' && (
        <FormPhase
          hourlyRate={hourlyRate}
          onChangeRate={setHourlyRate}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
          onSkip={handleSkip}
          isSubmitting={submitting}
        />
      )}
      {phase === 'submitting' && <SubmittingPhase />}
      {phase === 'success' && <SuccessPhase />}
      {phase === 'error' && (
        <ErrorPhase errorMessage={errorMessage} onRetry={handleSubmit} onDismiss={handleSkip} />
      )}
      {phase === 'skipped' && null}
    </View>
  );

  if (phase === 'form' && submitting) {
    // Guard: disable submit in JSX too
  }
}

/* ─── Sub-components ─── */

function PromptPhase({
  jobTitle,
  onStart,
  onSkip,
}: {
  jobTitle: string;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      <Text className="text-[#1f1c18] text-base font-semibold">
        💰 Help others know the rate
      </Text>
      <Text className="mt-1.5 text-[#6b665f] text-xs leading-snug">
        You were hired for <Text className="font-semibold text-[#1f1c18]">{jobTitle}</Text>.
        Share what hourly rate you received — it helps the community understand real market rates.
        Your identity stays private.
      </Text>
      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel="Share your salary rate"
          className="flex-1 bg-[#166534] py-2.5 rounded-full items-center active:opacity-80"
        >
          <Text className="text-white text-sm font-semibold">Share rate</Text>
        </Pressable>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip, I'd rather not share"
          className="flex-1 bg-[#2a2723] py-2.5 rounded-full items-center active:opacity-80"
        >
          <Text className="text-[#a19b8f] text-sm">Skip</Text>
        </Pressable>
      </View>
    </>
  );
}

function FormPhase({
  hourlyRate,
  onChangeRate,
  errorMessage,
  onSubmit,
  onSkip,
  isSubmitting = false,
}: {
  hourlyRate: string;
  onChangeRate: (v: string) => void;
  errorMessage: string | null;
  onSubmit: () => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <>
      <Text className="text-[#1f1c18] text-base font-semibold">
        What hourly rate did you receive?
      </Text>
      <Text className="mt-1 text-[#6b665f] text-xs">
        Enter the actual hourly rate (before tax) from your hire.
        This is shown as a community average — never linked to you personally.
      </Text>

      <View className="mt-3 flex-row items-center border border-[#2a2723] rounded-xl bg-white px-3 py-2">
        <Text className="text-[#6b665f] text-sm font-semibold mr-1">$</Text>
        <TextInput
          value={hourlyRate}
          onChangeText={onChangeRate}
          placeholder="0.00"
          keyboardType="decimal-pad"
          accessibilityLabel="Enter your hourly rate"
          className="flex-1 text-[#1f1c18] text-base tabular-nums"
        />
        <Text className="text-[#6b665f] text-xs ml-1">/hr</Text>
      </View>

      {errorMessage && (
        <Text className="mt-1.5 text-red-600 text-[11px]">{errorMessage}</Text>
      )}

      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={onSubmit}
          accessibilityRole="button"
          accessibilityLabel="Submit salary report"
          disabled={isSubmitting}
          className={`flex-1 ${isSubmitting ? 'bg-[#166534]/50' : 'bg-[#166534]'} py-2.5 rounded-full items-center active:opacity-80`}
        >
          <Text className="text-white text-sm font-semibold">{isSubmitting ? 'Submitting…' : 'Submit'}</Text>
        </Pressable>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip"
          className="flex-1 bg-[#2a2723] py-2.5 rounded-full items-center active:opacity-80"
        >
          <Text className="text-[#a19b8f] text-sm">Skip</Text>
        </Pressable>
      </View>
    </>
  );
}

function SubmittingPhase() {
  return (
    <View className="items-center py-4">
      <Text className="text-[#6b665f] text-sm">Submitting...</Text>
    </View>
  );
}

function SuccessPhase() {
  return (
    <View className="items-center py-2">
      <Text className="text-[#166534] text-base font-semibold">✓ Thanks for sharing!</Text>
      <Text className="mt-1 text-[#6b665f] text-xs text-center">
        Your report helps everyone understand fair pay in your community.
      </Text>
    </View>
  );
}

function ErrorPhase({
  errorMessage,
  onRetry,
  onDismiss,
}: {
  errorMessage: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <Text className="text-red-600 text-sm font-semibold">Error submitting report</Text>
      {errorMessage && (
        <Text className="mt-1 text-[#6b665f] text-xs">{errorMessage}</Text>
      )}
      <View className="mt-3 flex-row gap-2">
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          className="flex-1 bg-[#166534] py-2.5 rounded-full items-center active:opacity-80"
        >
          <Text className="text-white text-sm font-semibold">Try again</Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          className="flex-1 bg-[#2a2723] py-2.5 rounded-full items-center active:opacity-80"
        >
          <Text className="text-[#a19b8f] text-sm">Dismiss</Text>
        </Pressable>
      </View>
    </>
  );
}

export default PostHireSurvey;
