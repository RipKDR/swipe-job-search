import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { FormField } from '../FormField'

type FormValues = {
  business_name: string
}

function FormFieldHarness() {
  const { control } = useForm<FormValues>({
    defaultValues: { business_name: '' },
  })

  return (
    <FormField
      control={control}
      name="business_name"
      label="Business Name *"
      placeholder="Your business name"
    />
  )
}

describe('FormField', () => {
  it('binds react-hook-form value to TextField', () => {
    render(<FormFieldHarness />)

    const input = screen.getByPlaceholderText('Your business name')
    fireEvent.change(input, { target: { value: 'Little Lane Cafe' } })
    expect((input as HTMLInputElement).value).toBe('Little Lane Cafe')
  })
})
