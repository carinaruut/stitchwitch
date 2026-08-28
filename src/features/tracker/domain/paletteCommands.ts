import type { PaletteEntry } from '../../../types/pattern'
import { normalizeColor } from '../../../utils/colors'
import { paletteEntries, reorderPaletteEntries } from '../../../utils/palette'
import type { TrackerCommandContext } from './trackerCommandContext'

export function createPaletteCommands({ pattern }: TrackerCommandContext) {
  function updatePaletteEntry(color: string, updates: Partial<Pick<PaletteEntry, 'name' | 'brand' | 'code' | 'notes'>>) {
    const entries = paletteEntries(pattern.value)
    const index = entries.findIndex((entry) => entry.color === color)
    if (index < 0) return
    entries[index] = { ...entries[index], ...updates }
    pattern.value.palette = entries
  }

  function movePaletteEntry(color: string, direction: -1 | 1) {
    const entries = paletteEntries(pattern.value)
    const index = entries.findIndex((entry) => entry.color === color)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= entries.length) return
    const current = entries[index]
    entries[index] = entries[destination]
    entries[destination] = current
    pattern.value.palette = entries
  }

  function reorderPaletteEntry(source: string, target: string, after: boolean) {
    if (source === target) return
    const reordered = reorderPaletteEntries(paletteEntries(pattern.value), source, target, after)
    if (reordered) pattern.value.palette = reordered
  }

  function switchPaletteColor(sourceValue: string, targetValue: string): boolean {
    const source = normalizeColor(sourceValue)
    const target = normalizeColor(targetValue)
    if (!source || !target || source === target) return false
    const entries = paletteEntries(pattern.value)
    const sourceEntry = entries.find((entry) => entry.color === source)
    const targetEntry = entries.find((entry) => entry.color === target)
    if (!sourceEntry) return false
    if (targetEntry) {
      const sourceDetails = [source.toUpperCase(), sourceEntry.name, sourceEntry.brand, sourceEntry.code].filter(Boolean).join(' · ')
      const merged: PaletteEntry = {
        color: target,
        symbol: targetEntry.symbol,
        name: targetEntry.name || sourceEntry.name,
        brand: targetEntry.brand || sourceEntry.brand,
        code: targetEntry.code || sourceEntry.code,
        notes: [...new Set([targetEntry.notes.trim(), sourceEntry.notes.trim(), sourceDetails].filter(Boolean))].join('\n'),
      }
      pattern.value.palette = entries.filter((entry) => entry.color !== source).map((entry) => entry.color === target ? merged : entry)
    } else {
      pattern.value.palette = entries.map((entry) => entry.color === source ? { ...entry, color: target } : entry)
    }
    pattern.value.cells = pattern.value.cells.map((row) => row.map((color) => color === source ? target : color))
    if (pattern.value.backgroundColor === source) pattern.value.backgroundColor = target
    pattern.value.swatches = [...new Set(pattern.value.swatches.map((color) => color === source ? target : color))]
    pattern.value.recentColors = [...new Set(pattern.value.recentColors.map((color) => color === source ? target : color))]
    return true
  }

  return { updatePaletteEntry, movePaletteEntry, reorderPaletteEntry, switchPaletteColor }
}
