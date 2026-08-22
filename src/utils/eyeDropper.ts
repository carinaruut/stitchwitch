import { normalizeColor } from './colors'

export type EyeDropperResult =
  | { status: 'picked'; color: string }
  | { status: 'cancelled' }
  | { status: 'unavailable' }

export async function pickScreenColor(): Promise<EyeDropperResult> {
  const EyeDropper = (window as Window & {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }).EyeDropper
  if (!EyeDropper) return { status: 'unavailable' }
  try {
    const result = await new EyeDropper().open()
    const color = normalizeColor(result.sRGBHex)
    return color ? { status: 'picked', color } : { status: 'unavailable' }
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError'
      ? { status: 'cancelled' }
      : { status: 'unavailable' }
  }
}
