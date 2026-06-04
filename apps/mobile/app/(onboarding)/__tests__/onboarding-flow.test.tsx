import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import RoleSelection from '../role';
import {
  buildCandidateProfileUpdate,
  buildEmployerProfileDetailsUpdate,
  buildEmployerProfileInsert,
  buildEmployerProfileUpdate,
  buildProviderProfileUpdate,
  getOnboardingRouteForRole,
} from '@/lib/onboarding-submit';

const mocks = vi.hoisted(() => ({
  authUser: null as null | { id: string },
  applyProfile: vi.fn(),
  capture: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) => {
    const React = require('react');
    return React.createElement('button', { onClick: onPress, disabled, 'data-testid': 'continue-btn' }, title);
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.authUser,
    applyProfile: mocks.applyProfile,
  }),
}));

vi.mock('@/hooks/usePostHog', () => ({
  usePostHog: () => ({ capture: mocks.capture }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mocks.from(table),
  },
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

describe('Onboarding role selection', () => {
  beforeEach(() => {
    mocks.authUser = null;
    mocks.applyProfile.mockClear();
    mocks.capture.mockClear();
    mocks.eq.mockReset();
    mocks.from.mockReset();
    mocks.push.mockClear();
    mocks.replace.mockClear();
    mocks.select.mockReset();
    mocks.single.mockReset();
    mocks.update.mockReset();

    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.from.mockReturnValue({ update: mocks.update });
  });

  it('routes candidate role to candidate profile onboarding', () => {
    expect(getOnboardingRouteForRole('candidate')).toBe('/(onboarding)/candidate-profile');
  });

  it('routes employer role to employer profile onboarding', () => {
    expect(getOnboardingRouteForRole('employer')).toBe('/(onboarding)/employer-profile');
  });

  it('routes provider role to provider compliance onboarding', () => {
    expect(getOnboardingRouteForRole('provider')).toBe('/(provider)/compliance');
  });

  it('starts with Continue disabled until a role is chosen', () => {
    render(<RoleSelection />);

    fireEvent.click(screen.getByText('Continue'));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('routes candidates to candidate profile onboarding', () => {
    render(<RoleSelection />);

    fireEvent.click(screen.getByText("I'm looking for work"));
    fireEvent.click(screen.getByText('Continue'));

    expect(mocks.push).toHaveBeenCalledWith('/(onboarding)/candidate-profile');
  });

  it('routes employers to employer profile onboarding', () => {
    render(<RoleSelection />);

    fireEvent.click(screen.getByText("I'm hiring"));
    fireEvent.click(screen.getByText('Continue'));

    expect(mocks.push).toHaveBeenCalledWith('/(onboarding)/employer-profile');
  });

  it('updates provider role, applies the returned profile, and replaces to compliance', async () => {
    const updatedProfile = {
      id: 'provider-1',
      role: 'provider',
      onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    };
    mocks.authUser = { id: 'provider-1' };
    mocks.single.mockResolvedValue({ data: updatedProfile, error: null });

    render(<RoleSelection />);

    fireEvent.click(screen.getByText("I'm a provider / mentor"));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(mocks.from).toHaveBeenCalledWith('profiles');
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'provider', onboarding_completed_at: expect.any(String) })
      );
      expect(mocks.eq).toHaveBeenCalledWith('id', 'provider-1');
      expect(mocks.select).toHaveBeenCalled();
      expect(mocks.applyProfile).toHaveBeenCalledWith(updatedProfile);
      expect(mocks.replace).toHaveBeenCalledWith('/(provider)/compliance');
    });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('keeps providers on role selection if direct role update fails', async () => {
    mocks.authUser = { id: 'provider-1' };
    mocks.single.mockResolvedValue({ data: null, error: new Error('network unavailable') });

    render(<RoleSelection />);

    fireEvent.click(screen.getByText("I'm a provider / mentor"));
    fireEvent.click(screen.getByText('Continue'));

    expect(await screen.findByText('Could not activate provider mode. Please try again.')).toBeTruthy();
    expect(mocks.applyProfile).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
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
    } satisfies Parameters<typeof buildCandidateProfileUpdate>[0];

    const payload = buildCandidateProfileUpdate(data, '2026-01-01T00:00:00.000Z');

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
    } satisfies Parameters<typeof buildEmployerProfileUpdate>[0];

    const profilePayload = buildEmployerProfileUpdate(data, '2026-01-01T00:00:00.000Z');
    const employerPayload = buildEmployerProfileInsert('user-1', data);

    expect(profilePayload.role).toBe('employer');
    expect(profilePayload.suburb).toBe('Moonee Ponds');
    expect(profilePayload.onboarding_completed_at).toBe('2026-01-01T00:00:00.000Z');

    expect(employerPayload.profile_id).toBe('user-1');
    expect(employerPayload.business_name).toBe('Little Lane Cafe');
    expect(employerPayload.contact_name).toBe('Jane Employer');
  });

  it('includes employer about text in linked employer_profiles insert when provided', () => {
    const data = {
      business_name: 'Little Lane Cafe',
      suburb: 'Moonee Ponds',
      contact_name: 'Jane Employer',
      about_text: 'Family-owned cafe hiring friendly baristas.',
    } satisfies Parameters<typeof buildEmployerProfileInsert>[1];

    expect(buildEmployerProfileInsert('user-1', data)).toEqual({
      profile_id: 'user-1',
      business_name: 'Little Lane Cafe',
      contact_name: 'Jane Employer',
      about_text: 'Family-owned cafe hiring friendly baristas.',
    });
  });

  it('normalizes absent or empty employer about text to null in linked employer_profiles insert', () => {
    const baseData = {
      business_name: 'Little Lane Cafe',
      suburb: 'Moonee Ponds',
      contact_name: 'Jane Employer',
    } satisfies Parameters<typeof buildEmployerProfileInsert>[1];

    expect(buildEmployerProfileInsert('user-1', baseData).about_text).toBeNull();
    expect(buildEmployerProfileInsert('user-1', { ...baseData, about_text: '' }).about_text).toBeNull();
  });

  it('builds employer profile details update payload with about text and updated timestamp', () => {
    const data = {
      business_name: 'Little Lane Cafe',
      suburb: 'Moonee Ponds',
      contact_name: 'Jane Employer',
      about_text: 'Family-owned cafe hiring friendly baristas.',
      avatar_url: 'https://example.com/logo.jpg',
    } satisfies Parameters<typeof buildEmployerProfileDetailsUpdate>[0];

    expect(buildEmployerProfileDetailsUpdate(data, '2026-01-01T00:00:00.000Z')).toEqual({
      business_name: 'Little Lane Cafe',
      contact_name: 'Jane Employer',
      about_text: 'Family-owned cafe hiring friendly baristas.',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('builds provider profile update with role and completion timestamp', () => {
    const payload = buildProviderProfileUpdate('2026-01-01T00:00:00.000Z');

    expect(payload.role).toBe('provider');
    expect(payload.onboarding_completed_at).toBe('2026-01-01T00:00:00.000Z');
  });
});
