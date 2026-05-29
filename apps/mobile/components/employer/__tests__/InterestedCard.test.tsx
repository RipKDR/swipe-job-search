import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { InterestedCard } from '../InterestedCard'

describe('InterestedCard', () => {
  it('renders candidate details and default chat CTA', () => {
    render(
      <InterestedCard
        candidateId="candidate-1"
        fullName="Jess Candidate"
        suburb="Reservoir"
        skills={['Barista', 'POS']}
        onChat={vi.fn()}
      />
    )

    expect(screen.getByText('Jess Candidate')).toBeTruthy()
    expect(screen.getByText('Reservoir')).toBeTruthy()
    expect(screen.getByText('Barista · POS')).toBeTruthy()
    expect(screen.getByText('Start chat')).toBeTruthy()
  })

  it('calls onChat with candidate id when chat is pressed', () => {
    const onChat = vi.fn()
    render(
      <InterestedCard
        candidateId="candidate-1"
        fullName="Jess Candidate"
        suburb="Reservoir"
        skills={[]}
        onChat={onChat}
      />
    )

    fireEvent.click(screen.getByText('Start chat'))
    expect(onChat).toHaveBeenCalledWith('candidate-1')
  })

  it('shows loading state while match RPC is in flight', () => {
    render(
      <InterestedCard
        candidateId="candidate-1"
        fullName="Jess Candidate"
        suburb="Reservoir"
        skills={[]}
        actionState="matching"
        onChat={vi.fn()}
      />
    )

    expect(screen.getByText('Connecting…')).toBeTruthy()
  })

  it('shows idempotent already-matched state', () => {
    render(
      <InterestedCard
        candidateId="candidate-1"
        fullName="Jess Candidate"
        suburb="Reservoir"
        skills={[]}
        actionState="already_matched"
        onChat={vi.fn()}
      />
    )

    expect(screen.getByText('Already matched')).toBeTruthy()
  })
})
