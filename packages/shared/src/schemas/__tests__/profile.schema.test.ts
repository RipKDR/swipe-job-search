// Profile schema tests
// Per U4 test scenarios: skills max 5, required fields validation
import { describe, it, expect } from 'vitest';
import {
  CandidateOnboardingSchema,
  EmployerOnboardingSchema,
} from '../profile';

describe('CandidateOnboardingSchema', () => {
  it('accepts valid candidate profile data', () => {
    const validData = {
      full_name: 'John Doe',
      suburb: 'Tullamarine' as const,
      experience_text: '2 years barista at Campos, 1 year hospitality',
      skills: ['barista', 'customer service', 'cash handling'],
      availability_text: 'Weekends, weekday evenings after 5pm',
      work_rights: 'citizen' as const,
      avatar_url: null,
    };

    const result = CandidateOnboardingSchema.safeParse(validData);
    if (!result.success) {
      console.error('Validation error:', JSON.stringify(result.error.errors, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('rejects skills array with more than 5 items', () => {
    const invalidData = {
      full_name: 'John Doe',
      suburb: 'Tullamarine' as const,
      experience_text: 'Experienced worker',
      skills: ['skill1', 'skill2', 'skill3', 'skill4', 'skill5', 'skill6'], // 6 skills
      availability_text: 'Full time',
      work_rights: 'citizen' as const,
    };

    const result = CandidateOnboardingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Maximum 5 skills');
    }
  });

  it('rejects empty full_name', () => {
    const invalidData = {
      full_name: '',
      suburb: 'Tullamarine' as const,
      experience_text: 'Good experience',
      skills: ['skill1'],
      availability_text: 'Anytime',
      work_rights: 'citizen' as const,
    };

    const result = CandidateOnboardingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('full_name');
    }
  });

  it('rejects experience_text under 10 characters', () => {
    const invalidData = {
      full_name: 'John Doe',
      suburb: 'Tullamarine' as const,
      experience_text: 'Short', // < 10 chars
      skills: ['skill1'],
      availability_text: 'Anytime',
      work_rights: 'citizen' as const,
    };

    const result = CandidateOnboardingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 10 characters');
    }
  });

  it('requires at least one skill', () => {
    const invalidData = {
      full_name: 'John Doe',
      suburb: 'Tullamarine' as const,
      experience_text: 'Good experience here',
      skills: [], // Empty
      availability_text: 'Anytime',
      work_rights: 'citizen' as const,
    };

    const result = CandidateOnboardingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least one skill');
    }
  });

  it('rejects invalid suburb', () => {
    const invalidData = {
      full_name: 'John Doe',
      suburb: 'Sydney' as any, // Not in BEACHHEAD_SUBURBS
      experience_text: 'Good experience here',
      skills: ['skill1'],
      availability_text: 'Anytime',
      work_rights: 'citizen' as const,
    };

    const result = CandidateOnboardingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects invalid work_rights', () => {
    const invalidData = {
      full_name: 'John Doe',
      suburb: 'Tullamarine' as const,
      experience_text: 'Good experience here',
      skills: ['skill1'],
      availability_text: 'Anytime',
      work_rights: 'invalid_option' as any,
    };

    const result = CandidateOnboardingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('EmployerOnboardingSchema', () => {
  it('accepts valid employer profile data', () => {
    const validData = {
      full_name: 'Jane Smith',
      suburb: 'Moonee Ponds' as const,
      business_name: 'Little Lane Cafe',
      contact_name: 'Jane Smith',
      avatar_url: null,
    };

    const result = EmployerOnboardingSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty business_name', () => {
    const invalidData = {
      full_name: 'Jane Smith',
      suburb: 'Moonee Ponds' as const,
      business_name: '', // Empty
      contact_name: 'Jane Smith',
    };

    const result = EmployerOnboardingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('business_name');
    }
  });

  it('accepts null contact_name', () => {
    const validData = {
      full_name: 'Jane Smith',
      suburb: 'Moonee Ponds' as const,
      business_name: 'Little Lane Cafe',
      contact_name: null,
    };

    const result = EmployerOnboardingSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid suburb', () => {
    const invalidData = {
      full_name: 'Jane Smith',
      suburb: 'Perth' as any, // Not in BEACHHEAD_SUBURBS
      business_name: 'Little Lane Cafe',
      contact_name: 'Jane Smith',
    };

    const result = EmployerOnboardingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
