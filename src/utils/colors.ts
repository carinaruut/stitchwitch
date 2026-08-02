const HEX_COLOR = /^#[0-9a-f]{6}$/i

export function normalizeColor(value: string): string | null {
  const color = value.trim().toLowerCase()
  if (HEX_COLOR.test(color)) return color
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
  }
  return null
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

export function contrastColor(hex: string): '#000000' | '#ffffff' {
  const value = hex.slice(1)
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#000000' : '#ffffff'
}
