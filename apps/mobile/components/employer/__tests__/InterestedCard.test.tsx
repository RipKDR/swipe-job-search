import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import renderer from 'react-test-renderer'
import { InterestedCard } from '../InterestedCard'
import { Button } from '@/components/ui/Button'

describe('InterestedCard', () => {
  it('renders candidate details and default chat CTA', () => {
    const tree = renderer.create(
      <InterestedCard
        candidateId="candidate-1"
        fullName="Jess Candidate"
        suburb="Reservoir"
        skills={['Barista', 'POS']}
        onChat={vi.fn()}
      />
    )
    const output = JSON.stringify(tree.toJSON())

    expect(output).toContain('Jess Candidate')
    expect(output).toContain('Reservoir')
    expect(output).toContain('Barista, POS')
    expect(output).toContain('Chat')
  })

  it('calls onChat with candidate id when chat is pressed', () => {
    const onChat = vi.fn()
    const tree = renderer.create(
      <InterestedCard
        candidateId="candidate-1"
        fullName="Jess Candidate"
        suburb="Reservoir"
        skills={[]}
        onChat={onChat}
      />
    )

    const button = tree.root.findByType(Button)
    button.props.onPress()
    expect(onChat).toHaveBeenCalledWith('candidate-1')
  })

  it('shows loading state while match RPC is in flight', () => {
    const tree = renderer.create(
      <InterestedCard
        candidateId="candidate-1"
        fullName="Jess Candidate"
        suburb="Reservoir"
        skills={[]}
        actionState="matching"
        onChat={vi.fn()}
      />
    )
    const output = JSON.stringify(tree.toJSON())

    expect(output).toContain('Connecting...')
  })

  it('shows idempotent already-matched state', () => {
    const tree = renderer.create(
      <InterestedCard
        candidateId="candidate-1"
        fullName="Jess Candidate"
        suburb="Reservoir"
        skills={[]}
        actionState="already_matched"
        onChat={vi.fn()}
      />
    )
    const output = JSON.stringify(tree.toJSON())

    expect(output).toContain('Already matched')
  })
})
