import { describe, expect, it } from 'vitest'
import { checkBrandColour, contrastRatio, isHexColour, normaliseHex } from '@/features/email/lib/colour'

describe('isHexColour / normaliseHex', () => {
  it('accepts only #RRGGBB and upper-cases it', () => {
    expect(isHexColour('#00758c')).toBe(true)
    expect(isHexColour('#00758')).toBe(false)
    expect(isHexColour('00758c')).toBe(false)
    expect(isHexColour('#GGGGGG')).toBe(false)
    expect(normaliseHex(' #00758c ')).toBe('#00758C')
    expect(normaliseHex('nope')).toBeNull()
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for the same colour', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5)
  })

  it('puts the RoundFlow teal below AA on white (3.30:1)', () => {
    expect(contrastRatio('#029BB6', '#FFFFFF')).toBeCloseTo(3.3, 1)
  })
})

describe('checkBrandColour (client-side preview; the server is the source of truth)', () => {
  it('passes a dark colour: white text on the button, no warning', () => {
    const check = checkBrandColour('#00758C')
    expect(check.textColour).toBe('#FFFFFF')
    expect(check.buttonContrast).toBeGreaterThanOrEqual(4.5)
    expect(check.onWhite).toBeGreaterThanOrEqual(4.5)
    expect(check.lowContrastOnWhite).toBe(false)
  })

  it('warns when the colour is too light to read as text on white, and picks black button text', () => {
    const check = checkBrandColour('#FFD700')
    expect(check.lowContrastOnWhite).toBe(true)
    expect(check.textColour).toBe('#000000')
  })

  it('picks white text on the teal button only if that gives 4.5:1, else black', () => {
    const check = checkBrandColour('#029BB6')
    expect(check.lowContrastOnWhite).toBe(true)
    expect(check.textColour).toBe('#000000')
    expect(check.buttonContrast).toBeGreaterThanOrEqual(4.5)
  })
})
