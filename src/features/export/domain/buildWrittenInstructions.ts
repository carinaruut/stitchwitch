import type { PaletteEntry, PatternProject } from '../../../types/pattern'
import type { TrackerDirection, TrackerStartRow } from '../../../types/tracker'
import { colorSymbolMap, describeColor } from '../../../utils/colors'
import type { RenderedGrid } from '../../../utils/grid'
import { orderedColorCounts, paletteDetails, paletteMap } from '../../../utils/palette'

export interface WrittenInstructionOrder {
  startRow: TrackerStartRow
  firstRowDirection: TrackerDirection
  alternateRows: boolean
}

export interface WrittenInstructionLegendEntry {
  color: string
  count: number
  symbol: string
  customName: string
  details: string
  description: ReturnType<typeof describeColor>
}

export interface WrittenInstructionRun {
  color: string
  count: number
}

export interface WrittenInstructionRow {
  number: number
  direction: TrackerDirection
  runs: WrittenInstructionRun[]
}

export interface WrittenInstructionDocument {
  projectName: string
  columns: number
  rows: number
  totalStitches: number
  order: WrittenInstructionOrder
  horizontalRepeats: number
  verticalRepeats: number
  usesRepeatBoxes: boolean
  repeatBoxCount: number
  legend: WrittenInstructionLegendEntry[]
  instructionRows: WrittenInstructionRow[]
}

export const defaultWrittenInstructionOrder: WrittenInstructionOrder = {
  startRow: 'top',
  firstRowDirection: 'left-to-right',
  alternateRows: false,
}

export type InstructionTranslate = (key: string, values?: Record<string, unknown>) => string

export function writtenInstructionColorName(entry: WrittenInstructionLegendEntry, t: InstructionTranslate) {
  if (entry.customName) return entry.customName
  const color = t(`print.colors.${entry.description.name}`)
  return entry.description.tone
    ? t('print.colorWithTone', { tone: t(`print.tones.${entry.description.tone}`), color })
    : color
}

function rowDirection(order: WrittenInstructionOrder, logicalRow: number): TrackerDirection {
  if (!order.alternateRows || logicalRow % 2 === 0) return order.firstRowDirection
  return order.firstRowDirection === 'left-to-right' ? 'right-to-left' : 'left-to-right'
}

function runsForRow(cells: string[]): WrittenInstructionRun[] {
  return cells.reduce<WrittenInstructionRun[]>((runs, color) => {
    const previous = runs.at(-1)
    if (previous?.color === color) previous.count += 1
    else runs.push({ color, count: 1 })
    return runs
  }, [])
}

export function buildWrittenInstructions(
  project: PatternProject,
  rendered: RenderedGrid,
  order: WrittenInstructionOrder = defaultWrittenInstructionOrder,
): WrittenInstructionDocument {
  const cells = rendered.cells
  const rows = cells.length
  const columns = cells[0]?.length ?? 0
  const entries = paletteMap(project.palette)
  const counts = orderedColorCounts(cells, project.palette)
  const symbols = colorSymbolMap(counts.map(({ color }) => color), project.palette)
  const rowIndices = Array.from({ length: rows }, (_, index) => order.startRow === 'top' ? index : rows - index - 1)

  return {
    projectName: project.name,
    columns,
    rows,
    totalStitches: rows * columns,
    order: { ...order },
    horizontalRepeats: project.horizontalRepeats,
    verticalRepeats: project.verticalRepeats,
    usesRepeatBoxes: project.repeatBoxes.length > 0,
    repeatBoxCount: project.repeatBoxes.filter(box => box.enabled).length,
    legend: counts.map(({ color, count }) => {
      const entry: PaletteEntry | undefined = entries.get(color)
      return {
        color,
        count,
        symbol: symbols[color] ?? '',
        customName: entry?.name.trim() ?? '',
        details: paletteDetails(entry),
        description: describeColor(color),
      }
    }),
    instructionRows: rowIndices.map((rowIndex, logicalRow) => {
      const direction = rowDirection(order, logicalRow)
      const row = direction === 'right-to-left' ? [...cells[rowIndex]].reverse() : cells[rowIndex]
      return {
        number: rowIndex + 1,
        direction,
        runs: runsForRow(row),
      }
    }),
  }
}

export function formatWrittenInstructionsText(
  document: WrittenInstructionDocument,
  t: InstructionTranslate,
  formatNumber: (value: number) => string,
) {
  const legend = new Map(document.legend.map(entry => [entry.color, entry]))
  const stitchCount = (count: number) => t(count === 1 ? 'print.oneStitch' : 'print.stitches', { count: formatNumber(count) })
  const lines = [
    t('print.instructions.title', { name: document.projectName }),
    '',
    t('print.dimensions', { columns: formatNumber(document.columns), rows: formatNumber(document.rows) }),
    t('print.instructions.total', { count: stitchCount(document.totalStitches) }),
    t('print.instructions.order', {
      start: t(`print.instructions.start.${document.order.startRow}`),
      direction: t(`print.instructions.direction.${document.order.firstRowDirection}`),
      alternating: t(document.order.alternateRows ? 'print.instructions.alternating.yes' : 'print.instructions.alternating.no'),
    }),
    document.usesRepeatBoxes
      ? t('print.instructions.repeatBoxes', { count: formatNumber(document.repeatBoxCount) })
      : t('print.instructions.wholeRepeats', {
          horizontal: formatNumber(document.horizontalRepeats),
          vertical: formatNumber(document.verticalRepeats),
        }),
    '',
    t('print.instructions.legendTitle'),
    ...document.legend.map(entry => {
      const symbol = entry.symbol || t('print.instructions.noSymbol')
      const details = [entry.color.toUpperCase(), entry.details].filter(Boolean).join(' · ')
      return t('print.instructions.legendEntry', {
        symbol,
        name: writtenInstructionColorName(entry, t),
        details,
        count: stitchCount(entry.count),
      })
    }),
    '',
    t('print.instructions.rowsTitle'),
    ...document.instructionRows.map(row => t('print.instructions.row', {
      row: formatNumber(row.number),
      direction: t(`print.instructions.direction.${row.direction}`),
      runs: row.runs.map(run => {
        const entry = legend.get(run.color)
        return t('print.instructions.run', {
          count: formatNumber(run.count),
          name: entry ? writtenInstructionColorName(entry, t) : run.color.toUpperCase(),
          symbol: entry?.symbol ? t('print.instructions.runSymbol', { symbol: entry.symbol }) : '',
        }).trim()
      }).join(t('print.instructions.runSeparator')),
    })),
  ]

  return `${lines.join('\n')}\n`
}
