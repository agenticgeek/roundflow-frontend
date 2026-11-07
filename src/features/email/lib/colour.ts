/** WCAG 2.x contrast maths for the brand colour preview. The server (`brandColourCheck`) is the source of truth. */

const HEX = /^#[0-9a-fA-F]{6}$/

export function isHexColour(value: string): boolean {
  return HEX.test(value)
}

/** `#00758c` → `#00758C`; anything that is not `#RRGGBB` → `null`. */
export function normaliseHex(value: string): string | null {
  const trimmed = value.trim()
  return isHexColour(trimmed) ? trimmed.toUpperCase() : null
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** Contrast ratio of two `#RRGGBB` colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light! + 0.05) / (dark! + 0.05)
}

export type BrandColourPreview = {
  /** Text colour for a button filled with the brand colour: whichever of white and black reads better. */
  textColour: '#000000' | '#FFFFFF'
  buttonContrast: number
  /** Contrast of the colour used as text on white. */
  onWhite: number
  /** True below 4.5:1: the colour is saved but links and accents use a safer shade. */
  lowContrastOnWhite: boolean
}

export function checkBrandColour(hex: string): BrandColourPreview {
  const withWhite = contrastRatio(hex, '#FFFFFF')
  const withBlack = contrastRatio(hex, '#000000')
  const onWhite = withWhite
  return {
    textColour: withWhite >= withBlack ? '#FFFFFF' : '#000000',
    buttonContrast: Math.max(withWhite, withBlack),
    onWhite,
    lowContrastOnWhite: onWhite < 4.5,
  }
}
