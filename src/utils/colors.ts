const HEX_COLOR = /^#[0-9a-f]{6}$/i
const COLOR_SYMBOLS = [
  '●', '○', '■', '□', '▲', '△', '◆', '◇', '✕', '＋', '−', '│', '╱', '╲', '✦', '✚',
  '✖', '★', '☆', '♠', '♣', '♥', '♦', '☀', '☾', '☁', '☂', '⌁', '≈', '≡', '⊙', '⊗',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'0123456789',
]

export type DescriptiveColorName = 'black' | 'gray' | 'white' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'teal' | 'turquoise' | 'cyan' | 'blue' | 'indigo' | 'purple' | 'magenta' | 'mauve' | 'pink' | 'brown' | 'beige'
export type DescriptiveColorTone = 'dark' | 'light' | 'muted' | 'vivid'

export interface ColorDescription {
  name: DescriptiveColorName
  tone: DescriptiveColorTone | null
}

export interface RgbColor {
  red: number
  green: number
  blue: number
}

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

export function hexToRgb(value: string): RgbColor | null {
  const hex = normalizeColor(value)
  if (!hex) return null
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  }
}

export function rgbToHex(red: number, green: number, blue: number): string | null {
  const channels = [red, green, blue]
  if (!channels.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255)) return null
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function colorSymbolMap(colors: string[]): Record<string, string> {
  const symbols: Record<string, string> = {}
  let symbolIndex = 0
  for (const color of colors) {
    if (color.toLowerCase() === '#ffffff' || color in symbols) continue
    symbols[color] = COLOR_SYMBOLS[symbolIndex] ?? String(symbolIndex + 1)
    symbolIndex += 1
  }
  return symbols
}

export function contrastColor(hex: string): '#000000' | '#ffffff' {
  const value = hex.slice(1)
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#000000' : '#ffffff'
}

export function describeColor(hex: string): ColorDescription {
  const value = hex.slice(1)
  const red = Number.parseInt(value.slice(0, 2), 16) / 255
  const green = Number.parseInt(value.slice(2, 4), 16) / 255
  const blue = Number.parseInt(value.slice(4, 6), 16) / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const lightness = (maximum + minimum) / 2
  const difference = maximum - minimum
  const saturation = difference === 0 ? 0 : difference / (1 - Math.abs(2 * lightness - 1))

  if (saturation < 0.12) {
    if (lightness < 0.12) return { name: 'black', tone: null }
    if (lightness > 0.93) return { name: 'white', tone: null }
    if (lightness < 0.35) return { name: 'gray', tone: 'dark' }
    if (lightness > 0.75) return { name: 'gray', tone: 'light' }
    return { name: 'gray', tone: null }
  }

  let hue = 0
  if (maximum === red) hue = 60 * (((green - blue) / difference) % 6)
  else if (maximum === green) hue = 60 * ((blue - red) / difference + 2)
  else hue = 60 * ((red - green) / difference + 4)
  if (hue < 0) hue += 360

  let name: DescriptiveColorName
  if (hue < 15 || hue >= 345) name = 'red'
  else if (hue < 45) name = lightness < 0.4 ? 'brown' : saturation < 0.45 && lightness > 0.65 ? 'beige' : 'orange'
  else if (hue < 70) name = 'yellow'
  else if (hue < 100) name = 'lime'
  else if (hue < 150) name = 'green'
  else if (hue < 180) name = lightness < 0.4 ? 'teal' : 'turquoise'
  else if (hue < 200) name = 'cyan'
  else if (hue < 245) name = 'blue'
  else if (hue < 260) name = 'indigo'
  else if (hue < 300) name = 'purple'
  else if (hue < 330) name = saturation < 0.5 ? 'mauve' : 'magenta'
  else name = 'pink'

  const tone: DescriptiveColorTone | null = lightness < 0.3
    ? 'dark'
    : lightness > 0.72
      ? 'light'
      : saturation < 0.35
        ? 'muted'
        : saturation > 0.8
          ? 'vivid'
          : null
  return { name, tone }
}
