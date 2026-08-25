import type { PaletteEntry, PatternGrid, PatternProject } from '../types/pattern'
import { assignColorSymbols } from './colors'
import { countColors } from './grid'

export const emptyPaletteEntry = (color: string): PaletteEntry => ({ color, name: '', brand: '', code: '', notes: '' })

export function paletteEntries(project: PatternProject): PaletteEntry[] {
  const entries = project.palette.map((entry) => ({ ...entry }))
  const known = new Set(entries.map((entry) => entry.color))
  const colors = [project.backgroundColor, ...project.swatches, ...project.cells.flat()]
  for (const color of colors) {
    if (known.has(color)) continue
    known.add(color)
    entries.push(emptyPaletteEntry(color))
  }
  return assignColorSymbols(entries)
}

export function paletteMap(palette: PaletteEntry[]): Map<string, PaletteEntry> {
  return new Map(palette.map((entry) => [entry.color, entry]))
}

export function orderedColorCounts(cells: PatternGrid, palette: PaletteEntry[]) {
  const counts = countColors(cells)
  const order = new Map(palette.map((entry, index) => [entry.color, index]))
  return counts
    .map((entry, index) => ({ ...entry, index }))
    .sort((first, second) => (order.get(first.color) ?? palette.length + first.index) - (order.get(second.color) ?? palette.length + second.index))
    .map(({ color, count }) => ({ color, count }))
}

export function reorderPaletteEntries(entries: PaletteEntry[], source: string, target: string, after: boolean): PaletteEntry[] | null {
  const sourceIndex = entries.findIndex((entry) => entry.color === source)
  const reordered = [...entries]
  if (sourceIndex < 0) return null
  const [sourceEntry] = reordered.splice(sourceIndex, 1)
  const targetIndex = reordered.findIndex((entry) => entry.color === target)
  if (targetIndex < 0) return null
  reordered.splice(targetIndex + (after ? 1 : 0), 0, sourceEntry)
  return reordered
}

export function paletteLabel(entry: PaletteEntry | undefined, fallback: string) {
  return entry?.name.trim() || fallback
}

export function paletteDetails(entry: PaletteEntry | undefined) {
  if (!entry) return ''
  return [entry.brand.trim(), entry.code.trim()].filter(Boolean).join(' ')
}
