/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobForm, type JobFormValues } from '../JobForm';

type TestJobFormProps = React.ComponentProps<typeof JobForm> & {
  initialValues?: JobFormValues;
  submitLabel?: string;
  errorFallback?: string;
  resetOnSubmit?: boolean;
};

const TestableJobForm = JobForm as React.ComponentType<TestJobFormProps>;

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    title,
    onPress,
    disabled,
    loading,
    variant,
  }: {
    title: string;
    onPress?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: string;
  }) => {
    const React = require('react');
    return React.createElement(
      'button',
      {
        type: 'button',
        disabled: Boolean(disabled || loading),
        onClick: disabled || loading ? undefined : onPress,
        'data-variant': variant,
      },
      loading ? 'Loading…' : title,
    );
  },
}));

vi.mock('@/components/ui/TextField', () => ({
  TextField: ({
    label,
    placeholder,
    value,
    onChangeText,
  }: {
    label?: string;
    placeholder?: string;
    value?: string;
    onChangeText?: (value: string) => void;
  }) => {
    const React = require('react');
    return React.createElement(
      'label',
      null,
      label ? React.createElement('span', null, label) : null,
      React.createElement('input', {
        placeholder,
        value: value ?? '',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChangeText?.(event.target.value),
      }),
    );
  },
}));

vi.mock('@/components/onboarding/FormBlock', () => ({
  FormBlock: ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(
      'section',
      null,
      React.createElement('span', null, label),
      hint ? React.createElement('span', null, hint) : null,
      children,
    );
  },
}));

const existingJobValues: JobFormValues = {
  title: 'Weekend barista',
  jobType: 'part_time',
  payAmount: '32',
  payPeriod: 'hour',
  hoursText: 'Sat–Sun 7am–2pm',
  suburb: 'Moonee Ponds',
  description: 'Fast-paced cafe with a small team.',
  photoUri: 'https://example.com/job.jpg',
};

describe('JobForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefills fields and custom CTA when editing an existing job', () => {
    render(
      <TestableJobForm
        initialValues={existingJobValues}
        submitLabel="Update job"
        resetOnSubmit={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Weekend barista')).toBeTruthy();
    expect(screen.getByDisplayValue('32')).toBeTruthy();
    expect(screen.getByDisplayValue('Sat–Sun 7am–2pm')).toBeTruthy();
    expect(screen.getByDisplayValue('Moonee Ponds')).toBeTruthy();
    expect(screen.getByDisplayValue('Fast-paced cafe with a small team.')).toBeTruthy();
    expect(screen.getByDisplayValue('https://example.com/job.jpg')).toBeTruthy();
    expect(screen.getByText('Update job')).toBeTruthy();
  });

  it('submits edited values without resetting the form in edit mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <TestableJobForm
        initialValues={existingJobValues}
        submitLabel="Update job"
        resetOnSubmit={false}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. Weekend barista'), {
      target: { value: 'Senior weekend barista' },
    });
    fireEvent.click(screen.getByText('Update job'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        ...existingJobValues,
        title: 'Senior weekend barista',
      });
    });
    expect(screen.getByDisplayValue('Senior weekend barista')).toBeTruthy();
  });
});
