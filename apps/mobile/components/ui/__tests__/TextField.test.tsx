import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TextField } from '../TextField'

describe('TextField', () => {
  it('renders label and forwards text changes', () => {
    const onChangeText = vi.fn()

    render(
      <TextField
        label="Email"
        placeholder="you@example.com"
        value=""
        onChangeText={onChangeText}
      />
    )

    expect(screen.getByText('Email')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    expect(onChangeText).toHaveBeenCalledWith('test@example.com')
  })

  it('shows validation error text', () => {
    render(
      <TextField
        label="Full Name *"
        value=""
        onChangeText={() => {}}
        error="Full name is required"
      />
    )

    expect(screen.getByText('Full name is required')).toBeTruthy()
  })
})
