import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobListItem } from '../JobListItem';
import type { MyJobItem } from '@/hooks/useMyJobs';

type TestJobListItemProps = React.ComponentProps<typeof JobListItem> & {
  onEdit?: (jobId: string) => void;
  onToggleStatus?: (job: MyJobItem) => void;
  statusUpdating?: boolean;
};

const TestableJobListItem = JobListItem as React.ComponentType<TestJobListItemProps>;

vi.mock('@/components/tw', () => ({
  View: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement('div', null, children);
  },
  Text: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement('span', null, children);
  },
  Pressable: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) => {
    const React = require('react');
    return React.createElement('button', { type: 'button', onClick: onPress }, children);
  },
}));

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
      loading ? 'Updating…' : title,
    );
  },
}));

function makeJob(overrides: Partial<MyJobItem> = {}): MyJobItem {
  return {
    id: 'job-1',
    title: 'Weekend barista',
    suburb: 'Moonee Ponds',
    pay_display: '$32.00/hr',
    status: 'active',
    expires_at: '2026-12-31T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    interestedCount: 2,
    ...overrides,
  };
}

describe('JobListItem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-04T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  it('calls edit with the job id', () => {
    const onEdit = vi.fn();

    render(
      <TestableJobListItem
        job={makeJob()}
        onOpenInterested={vi.fn()}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith('job-1');
  });

  it('pauses an active job', () => {
    const onToggleStatus = vi.fn();
    const job = makeJob({ status: 'active' });

    render(
      <TestableJobListItem
        job={job}
        onOpenInterested={vi.fn()}
        onToggleStatus={onToggleStatus}
      />,
    );

    fireEvent.click(screen.getByText('Pause'));
    expect(onToggleStatus).toHaveBeenCalledWith(job);
  });

  it('reopens a paused job', () => {
    const onToggleStatus = vi.fn();
    const job = makeJob({ status: 'paused' });

    render(
      <TestableJobListItem
        job={job}
        onOpenInterested={vi.fn()}
        onToggleStatus={onToggleStatus}
      />,
    );

    fireEvent.click(screen.getByText('Reopen'));
    expect(onToggleStatus).toHaveBeenCalledWith(job);
  });

  it('does not expose pause or reopen controls for hired jobs', () => {
    render(
      <TestableJobListItem
        job={makeJob({ status: 'hired' })}
        onOpenInterested={vi.fn()}
        onToggleStatus={vi.fn()}
      />,
    );

    expect(screen.queryByText('Pause')).toBeNull();
    expect(screen.queryByText('Reopen')).toBeNull();
  });
});
