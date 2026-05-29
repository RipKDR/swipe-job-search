import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/components/ui/Button', () => ({
  Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(
      Pressable,
      { onPress, disabled, accessibilityRole: 'button' },
      React.createElement(Text, null, title)
    );
  },
}));

import RoleSelection from '../role';
import {
  buildCandidateProfileUpdate,
  buildEmployerProfileInsert,
  buildEmployerProfileUpdate,
  getOnboardingRouteForRole,
} from '@/lib/onboarding-submit';

const mockPush = vi.fn();

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Onboarding role selection', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('routes candidate role to candidate profile onboarding', () => {
    expect(getOnboardingRouteForRole('candidate')).toBe('/(onboarding)/candidate-profile');
  });

  it('routes employer role to employer profile onboarding', () => {
    expect(getOnboardingRouteForRole('employer')).toBe('/(onboarding)/employer-profile');
  });

  it('starts with Continue disabled until a role is chosen', () => {
    render(<RoleSelection />);

    fireEvent.click(screen.getByText('Continue'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('routes candidates to candidate profile onboarding', () => {
    render(<RoleSelection />);

    fireEvent.click(screen.getByText("I'm looking for work"));
    fireEvent.click(screen.getByText('Continue'));

    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/candidate-profile');
  });

  it('routes employers to employer profile onboarding', () => {
    render(<RoleSelection />);

    fireEvent.click(screen.getByText("I'm hiring"));
    fireEvent.click(screen.getByText('Continue'));

    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/employer-profile');
  });
});

describe('Onboarding submit payload builders', () => {
  it('builds candidate profile update with role and completion timestamp', () => {
    const data = {
      full_name: 'Sam Candidate',
      suburb: 'Tullamarine',
      experience_text: 'Three years of hospitality and barista work',
      skills: ['barista', 'customer service'],
      availability_text: 'Weekdays after 4pm',
      work_rights: 'citizen' as const,
      avatar_url: 'https://example.com/avatar.jpg',
    };

    const payload = buildCandidateProfileUpdate(
      data as Parameters<typeof buildCandidateProfileUpdate>[0],
      '2026-01-01T00:00:00.000Z'
    );

    expect(payload.role).toBe('candidate');
    expect(payload.full_name).toBe(data.full_name);
    expect(payload.avatar_url).toBe(data.avatar_url);
    expect(payload.onboarding_completed_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('builds employer profile and linked employer_profiles payload', () => {
    const data = {
      business_name: 'Little Lane Cafe',
      suburb: 'Moonee Ponds',
      contact_name: 'Jane Employer',
      avatar_url: 'https://example.com/logo.jpg',
    };

    const profilePayload = buildEmployerProfileUpdate(data, '2026-01-01T00:00:00.000Z');
    const employerPayload = buildEmployerProfileInsert('user-1', data);

    expect(profilePayload.role).toBe('employer');
    expect(profilePayload.suburb).toBe('Moonee Ponds');
    expect(profilePayload.onboarding_completed_at).toBe('2026-01-01T00:00:00.000Z');

    expect(employerPayload.profile_id).toBe('user-1');
    expect(employerPayload.business_name).toBe('Little Lane Cafe');
    expect(employerPayload.contact_name).toBe('Jane Employer');
  });
});
