import { MAX_PROJECT_SWATCHES, type PaletteEntry } from '../../../types/pattern'
import { assignColorSymbols, normalizeColor } from '../../../utils/colors'
import { emptyPaletteEntry, paletteEntries, reorderPaletteEntries } from '../../../utils/palette'
import { synchronizeRepeatBox } from '../../../utils/grid'
import type { PatternCommandContext } from '../domain/patternCommandContext'

export function usePatternPaletteCommands(context: PatternCommandContext) {
  function addSwatch(value = context.selectedColor.value) {
    const color = normalizeColor(value)
    if (!color || context.project.value.swatches.includes(color) || context.project.value.swatches.length >= MAX_PROJECT_SWATCHES) return
    context.project.value.swatches.push(color)
  }

  function removeSwatch(color: string) {
    context.project.value.swatches = context.project.value.swatches.filter((swatch) => swatch !== color)
  }

  function updatePaletteEntry(colorValue: string, updates: Partial<Pick<PaletteEntry, 'name' | 'brand' | 'code' | 'notes'>>) {
    const color = normalizeColor(colorValue)
    if (!color) return
    const entries = paletteEntries(context.project.value)
    const index = entries.findIndex((entry) => entry.color === color)
    if (index < 0) return
    context.beginGridChange()
    entries[index] = { ...entries[index], ...updates }
    context.project.value.palette = entries
  }

  function movePaletteEntry(colorValue: string, direction: -1 | 1) {
    const color = normalizeColor(colorValue)
    if (!color) return
    const entries = paletteEntries(context.project.value)
    const index = entries.findIndex((entry) => entry.color === color)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= entries.length) return
    context.beginGridChange()
    const current = entries[index]
    entries[index] = entries[destination]
    entries[destination] = current
    context.project.value.palette = entries
  }

  function reorderPaletteEntry(sourceValue: string, targetValue: string, after: boolean) {
    const source = normalizeColor(sourceValue)
    const target = normalizeColor(targetValue)
    if (!source || !target || source === target) return
    const entries = paletteEntries(context.project.value)
    const reordered = reorderPaletteEntries(entries, source, target, after)
    if (!reordered) return
    context.beginGridChange()
    context.project.value.palette = reordered
  }

  function switchPaletteColor(sourceValue: string, targetValue: string): boolean {
    const source = normalizeColor(sourceValue)
    const target = normalizeColor(targetValue)
    if (!source || !target || source === target) return false
    const entries = paletteEntries(context.project.value)
    const sourceEntry = entries.find((entry) => entry.color === source)
    const targetEntry = entries.find((entry) => entry.color === target)
    if (!sourceEntry) return false
    context.beginGridChange()
    if (targetEntry) {
      const conflictingMetadata = [
        targetEntry.name && sourceEntry.name && targetEntry.name !== sourceEntry.name ? sourceEntry.name : '',
        targetEntry.brand && sourceEntry.brand && targetEntry.brand !== sourceEntry.brand ? sourceEntry.brand : '',
        targetEntry.code && sourceEntry.code && targetEntry.code !== sourceEntry.code ? sourceEntry.code : '',
      ].filter(Boolean)
      const sourceDetails = conflictingMetadata.length > 0 ? [source.toUpperCase(), ...conflictingMetadata].join(' · ') : ''
      const notes = [targetEntry.notes.trim(), sourceEntry.notes.trim(), sourceDetails].filter(Boolean)
      const merged: PaletteEntry = {
        color: target,
        symbol: targetEntry.symbol,
        name: targetEntry.name || sourceEntry.name,
        brand: targetEntry.brand || sourceEntry.brand,
        code: targetEntry.code || sourceEntry.code,
        notes: [...new Set(notes)].join('\n'),
      }
      context.project.value.palette = entries.filter((entry) => entry.color !== source).map((entry) => entry.color === target ? merged : entry)
    } else {
      context.project.value.palette = entries.map((entry) => entry.color === source ? { ...entry, color: target } : entry)
    }
    let cells = context.project.value.cells.map((row) => row.map((color) => color === source ? target : color))
    for (const box of context.project.value.repeatBoxes) if (box.enabled) cells = synchronizeRepeatBox(cells, box)
    context.project.value.cells = cells
    if (context.project.value.backgroundColor === source) context.project.value.backgroundColor = target
    context.project.value.swatches = [...new Set(context.project.value.swatches.map((color) => color === source ? target : color))]
    context.recentColors.value = [...new Set(context.recentColors.value.map((color) => color === source ? target : color))]
    if (context.selectedColor.value === source) context.selectedColor.value = target
    context.persistColors()
    return true
  }

  return { addSwatch, removeSwatch, updatePaletteEntry, movePaletteEntry, reorderPaletteEntry, switchPaletteColor }
}

export function choosePatternColor(context: PatternCommandContext, value: string, recent = false): boolean {
  const color = normalizeColor(value)
  if (!color) return false
  context.selectedColor.value = color
  const entries = paletteEntries(context.project.value)
  if (!entries.some((entry) => entry.color === color)) {
    context.project.value.palette = assignColorSymbols([...entries, emptyPaletteEntry(color)])
  } else if (context.project.value.palette.length !== entries.length) {
    context.project.value.palette = entries
  }
  if (recent) context.recentColors.value = [color, ...context.recentColors.value.filter((item) => item !== color)].slice(0, 20)
  context.persistColors()
  return true
}
