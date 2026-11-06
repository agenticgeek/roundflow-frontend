import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { BrandColourCheck } from '@/api/email-settings.api'
import { BrandColourField } from '@/features/email/components/BrandColourField'

function Harness({ initial = '', server = null, disabled = false }: { initial?: string; server?: BrandColourCheck | null; disabled?: boolean }) {
  const [value, setValue] = useState(initial)
  return <BrandColourField value={value} onChange={setValue} serverCheck={server} disabled={disabled} />
}

const serverCheck = (over: Partial<BrandColourCheck> = {}): BrandColourCheck => ({
  colour: '#FFD700',
  textColour: '#000000',
  buttonContrast: 14.1,
  warning: { code: 'LOW_CONTRAST_ON_WHITE', message: 'Too light on white', textColour: '#000000', safeAccentColour: '#8A7400' },
  ...over,
})

describe('BrandColourField', () => {
  it('shows nothing about contrast until there is a valid colour, and flags an invalid one', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.queryByText(/Button text contrast/)).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Brand colour'), '#12')
    expect(screen.getByLabelText('Brand colour')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a colour like #00758C')
  })

  it('previews a readable colour live: contrast, text colour and "readable on white"', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('Brand colour'), '#00758c')
    expect(screen.getByLabelText('Brand colour')).not.toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/Button text contrast: \d+\.\d:1 \(needs 4\.5:1\)/)).toBeInTheDocument()
    expect(screen.getByText('Text on this colour: #FFFFFF')).toBeInTheDocument()
    expect(screen.getByText('This colour is readable on white')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Preview of a button in this colour' })).toBeInTheDocument()
  })

  it('warns about a colour that is hard to read as text, without a server check yet', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('Brand colour'), '#FFD700')
    expect(screen.getByText('This colour is hard to read as text on white')).toBeInTheDocument()
    expect(screen.getByText(/links and small accents in emails will use a darker shade/)).toBeInTheDocument()
  })

  it('shows the backend warning with its safe accent colour once the saved colour matches', () => {
    render(<Harness initial="#ffd700" server={serverCheck()} />)
    expect(screen.getByText(/will use #8A7400 instead/)).toBeInTheDocument()
    expect(screen.getByText('Text on this colour: #000000')).toBeInTheDocument()
  })

  it('ignores a server check for a different colour than the one being edited', () => {
    render(<Harness initial="#00758C" server={serverCheck()} />)
    expect(screen.getByText('This colour is readable on white')).toBeInTheDocument()
  })

  it('uses the server textColour/contrast when it has no warning', () => {
    render(<Harness initial="#00758C" server={serverCheck({ colour: '#00758C', textColour: '#FFFFFF', buttonContrast: 5.9, warning: null })} />)
    expect(screen.getByText('Button text contrast: 5.9:1 (needs 4.5:1)')).toBeInTheDocument()
    expect(screen.getByText('This colour is readable on white')).toBeInTheDocument()
  })

  it('the colour picker and Remove colour change the value', async () => {
    const user = userEvent.setup()
    render(<Harness initial="#00758C" />)
    await user.click(screen.getByRole('button', { name: 'Remove colour' }))
    expect(screen.getByLabelText('Brand colour')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Remove colour' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Pick a brand colour'), { target: { value: '#336699' } })
    expect(screen.getByLabelText('Brand colour')).toHaveValue('#336699')
  })

  it('is read-only when disabled', () => {
    render(<Harness initial="#00758C" disabled />)
    expect(screen.getByLabelText('Brand colour')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Pick a brand colour')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Remove colour' })).not.toBeInTheDocument()
  })
})
