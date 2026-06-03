import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CandidateOnboardingSchema, type CandidateOnboarding } from '@hi-hired/shared'
import { CandidateProfileForm } from '../CandidateProfileForm'
import { Button } from '../../ui/Button'

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: vi.fn(),
}))

vi.mock('@/lib/avatarUpload', () => ({
  uploadAvatar: vi.fn(),
}))

function CandidateFormHarness() {
  const form = useForm<CandidateOnboarding>({
    resolver: zodResolver(CandidateOnboardingSchema),
    defaultValues: {
      full_name: '',
      experience_text: '',
      skills: [],
      availability_text: '',
    },
  })

  return (
    <>
      <CandidateProfileForm form={form} />
      <Button title="Submit" onPress={form.handleSubmit(() => {})} />
    </>
  )
}

describe('CandidateProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders required field labels', () => {
    render(<CandidateFormHarness />)

    expect(screen.getByText('Full Name *')).toBeTruthy()
    expect(screen.getByText('Experience *')).toBeTruthy()
    expect(screen.getByText('Skills *')).toBeTruthy()
    expect(screen.getByText('Availability *')).toBeTruthy()
    expect(screen.getByText('Work rights *')).toBeTruthy()
  })

  it('shows validation errors when submitted empty', async () => {
    render(<CandidateFormHarness />)

    fireEvent.click(screen.getByText('Submit'))

    expect(await screen.findByText('Full name is required')).toBeTruthy()
    expect(screen.getByText('Please select a suburb')).toBeTruthy()
  })
})
