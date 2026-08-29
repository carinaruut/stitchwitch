import type { PaletteEntry } from '../types/pattern'

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const GRAPHIC_SYMBOLS = [
  '●', '○', '■', '□', '▲', '△', '◆', '◇', '✕', '＋', '−', '│', '╱', '╲', '✦', '✚',
  '✖', '★', '☆', '♠', '♣', '♥', '♦', '☀', '☾', '☁', '☂', '⌁', '≈', '≡', '⊙', '⊗',
]
const UPPERCASE_LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
const LOWERCASE_LETTERS = [...'abcdefghijklmnopqrstuvwxyz']
const NUMBER_SYMBOLS = Array.from({ length: 100 }, (_, index) => String(index))
const PREFIXED_LETTERS = Array.from({ length: 9 }, (_, index) => {
  const prefix = String(index + 1)
  return [...LOWERCASE_LETTERS, ...UPPERCASE_LETTERS].map((letter) => `${prefix}${letter}`)
}).flat()
const COLOR_SYMBOLS = [...GRAPHIC_SYMBOLS, ...UPPERCASE_LETTERS, ...LOWERCASE_LETTERS, ...NUMBER_SYMBOLS, ...PREFIXED_LETTERS]

export type DescriptiveColorName =
  | 'black' | 'charcoal' | 'gray' | 'silver' | 'white'
  | 'red' | 'maroon' | 'burgundy' | 'coral' | 'salmon'
  | 'orange' | 'peach' | 'yellow' | 'gold' | 'cream'
  | 'lime' | 'olive' | 'green' | 'forestGreen' | 'sage' | 'mint' | 'emerald'
  | 'teal' | 'turquoise' | 'cyan' | 'aqua'
  | 'skyBlue' | 'blue' | 'navy' | 'indigo'
  | 'violet' | 'purple' | 'lavender' | 'plum'
  | 'magenta' | 'mauve' | 'pink' | 'rose'
  | 'brown' | 'tan' | 'beige'
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

export interface HsvColor {
  hue: number
  saturation: number
  value: number
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

export function hexToHsv(value: string): HsvColor | null {
  const rgb = hexToRgb(value)
  if (!rgb) return null
  const red = rgb.red / 255
  const green = rgb.green / 255
  const blue = rgb.blue / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const difference = maximum - minimum
  let hue = 0
  if (difference > 0) {
    if (maximum === red) hue = 60 * (((green - blue) / difference) % 6)
    else if (maximum === green) hue = 60 * ((blue - red) / difference + 2)
    else hue = 60 * ((red - green) / difference + 4)
  }
  if (hue < 0) hue += 360
  return {
    hue,
    saturation: maximum === 0 ? 0 : difference / maximum,
    value: maximum,
  }
}

export function hsvToHex(hue: number, saturation: number, value: number): string {
  const normalizedHue = ((hue % 360) + 360) % 360
  const normalizedSaturation = Math.min(1, Math.max(0, saturation))
  const normalizedValue = Math.min(1, Math.max(0, value))
  const chroma = normalizedValue * normalizedSaturation
  const section = normalizedHue / 60
  const intermediate = chroma * (1 - Math.abs((section % 2) - 1))
  const match = normalizedValue - chroma
  let channels: [number, number, number]
  if (section < 1) channels = [chroma, intermediate, 0]
  else if (section < 2) channels = [intermediate, chroma, 0]
  else if (section < 3) channels = [0, chroma, intermediate]
  else if (section < 4) channels = [0, intermediate, chroma]
  else if (section < 5) channels = [intermediate, 0, chroma]
  else channels = [chroma, 0, intermediate]
  return `#${channels.map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`
}

export function colorSymbolMap(colors: string[], palette: PaletteEntry[] = []): Record<string, string> {
  const symbols: Record<string, string> = {}
  const colorsInUse = new Set(colors)
  const usedSymbols = new Set<string>()
  for (const entry of palette) {
    if (!entry.symbol || entry.color.toLowerCase() === '#ffffff' || usedSymbols.has(entry.symbol)) continue
    if (colorsInUse.has(entry.color)) symbols[entry.color] = entry.symbol
    usedSymbols.add(entry.symbol)
  }
  let symbolIndex = 0
  for (const color of [...colors].sort()) {
    if (color.toLowerCase() === '#ffffff' || color in symbols) continue
    let symbol = COLOR_SYMBOLS[symbolIndex] ?? `#${symbolIndex - COLOR_SYMBOLS.length + 1}`
    while (usedSymbols.has(symbol)) {
      symbolIndex += 1
      symbol = COLOR_SYMBOLS[symbolIndex] ?? `#${symbolIndex - COLOR_SYMBOLS.length + 1}`
    }
    symbols[color] = symbol
    usedSymbols.add(symbol)
    symbolIndex += 1
  }
  return symbols
}

export function assignColorSymbols(entries: PaletteEntry[]): PaletteEntry[] {
  const symbols = colorSymbolMap(entries.map((entry) => entry.color), entries)
  return entries.map((entry) => ({ ...entry, symbol: symbols[entry.color] }))
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
    if (lightness < 0.1) return { name: 'black', tone: null }
    if (lightness < 0.28) return { name: 'charcoal', tone: null }
    if (lightness > 0.94) return { name: 'white', tone: null }
    if (lightness > 0.75) return { name: 'silver', tone: null }
    return { name: 'gray', tone: null }
  }

  let hue: number
  if (maximum === red) hue = 60 * (((green - blue) / difference) % 6)
  else if (maximum === green) hue = 60 * ((blue - red) / difference + 2)
  else hue = 60 * ((red - green) / difference + 4)
  if (hue < 0) hue += 360

  let name: DescriptiveColorName
  if (hue < 15 || hue >= 345) {
    if (lightness < 0.25) name = 'maroon'
    else if (lightness < 0.4 && saturation < 0.75) name = 'burgundy'
    else if (lightness > 0.72) name = saturation < 0.65 ? 'rose' : 'pink'
    else if (saturation < 0.65) name = 'coral'
    else name = 'red'
  }
  else if (hue < 42) {
    if (lightness < 0.3) name = 'brown'
    else if (lightness > 0.78) name = saturation < 0.45 ? 'beige' : 'peach'
    else if (saturation < 0.38) name = lightness > 0.58 ? 'tan' : 'brown'
    else if (lightness > 0.64) name = hue < 25 ? 'salmon' : 'peach'
    else if (hue < 22 && lightness > 0.48) name = 'coral'
    else name = 'orange'
  }
  else if (hue < 68) {
    if (lightness > 0.86) name = 'cream'
    else if (lightness < 0.42 && saturation < 0.75) name = 'olive'
    else if (saturation < 0.55 || lightness < 0.52) name = 'gold'
    else name = 'yellow'
  }
  else if (hue < 100) name = lightness < 0.43 || saturation < 0.5 ? 'olive' : 'lime'
  else if (hue < 150) {
    if (lightness < 0.28) name = 'forestGreen'
    else if (saturation < 0.4) name = 'sage'
    else if (lightness > 0.75) name = 'mint'
    else if (saturation > 0.65) name = 'emerald'
    else name = 'green'
  }
  else if (hue < 180) {
    if (lightness < 0.32) name = 'teal'
    else if (lightness > 0.74) name = 'mint'
    else name = saturation > 0.55 ? 'turquoise' : 'teal'
  }
  else if (hue < 200) name = lightness > 0.72 ? 'aqua' : saturation > 0.55 ? 'cyan' : 'turquoise'
  else if (hue < 225) name = lightness > 0.68 || saturation < 0.45 ? 'skyBlue' : 'blue'
  else if (hue < 250) name = lightness < 0.28 ? 'navy' : hue > 240 ? 'indigo' : 'blue'
  else if (hue < 275) name = lightness > 0.72 ? 'lavender' : hue < 260 ? 'indigo' : 'violet'
  else if (hue < 300) name = lightness < 0.3 ? 'plum' : lightness > 0.72 ? 'lavender' : hue < 285 ? 'violet' : 'purple'
  else if (hue < 330) name = saturation < 0.5 ? 'mauve' : lightness > 0.7 ? 'rose' : 'magenta'
  else name = lightness < 0.3 ? 'burgundy' : saturation < 0.52 ? 'mauve' : lightness > 0.68 ? 'pink' : 'rose'

  const tone: DescriptiveColorTone | null = lightness < 0.24
    ? 'dark'
    : lightness > 0.8
      ? 'light'
      : saturation < 0.3
        ? 'muted'
        : saturation > 0.86
          ? 'vivid'
          : null
  return { name, tone }
}
