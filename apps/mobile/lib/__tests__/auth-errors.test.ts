import { describe, it, expect } from 'vitest'
import { formatSupabaseAuthError } from '../auth-errors'

describe('formatSupabaseAuthError', () => {
  it('maps invalid email validation to friendly copy', () => {
    const message = formatSupabaseAuthError({
      status: 400,
      code: 'validation_failed',
      message: 'Unable to validate email address: invalid format',
    })
    expect(message).toBe('Enter a valid email address and try again.')
  })

  it('adds redirect URL guidance for disallowed redirect errors', () => {
    const message = formatSupabaseAuthError(
      {
        status: 400,
        message: 'Redirect URL is not allowed',
      },
      { redirectUrl: 'http://localhost:8081/callback' },
    )
    expect(message).toContain('http://localhost:8081/callback')
    expect(message).toContain('Redirect URLs')
  })

  it('passes through other 400 validation messages', () => {
    const message = formatSupabaseAuthError({
      status: 400,
      code: 'validation_failed',
      message: 'One of email or phone must be set',
    })
    expect(message).toBe('One of email or phone must be set')
  })
})
