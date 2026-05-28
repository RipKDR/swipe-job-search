import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import RoleSelection from '../role'

const mockPush = vi.fn()

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Onboarding role selection', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('starts with Continue disabled until a role is chosen', () => {
    render(<RoleSelection />)

    fireEvent.click(screen.getByText('Continue'))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('routes candidates to candidate profile onboarding', () => {
    render(<RoleSelection />)

    fireEvent.click(screen.getByText("I'm looking for work"))
    fireEvent.click(screen.getByText('Continue'))

    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/candidate-profile')
  })

  it('routes employers to employer profile onboarding', () => {
    render(<RoleSelection />)

    fireEvent.click(screen.getByText("I'm hiring"))
    fireEvent.click(screen.getByText('Continue'))

    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/employer-profile')
  })
})
