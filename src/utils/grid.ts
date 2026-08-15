import type { PatternGrid, RepeatBox } from '../types/pattern'

export const REPEAT_COPY = 1
export const REPEAT_LEFT = 2
export const REPEAT_RIGHT = 4
export const REPEAT_TOP = 8
export const REPEAT_BOTTOM = 16
const REPEAT_OUTLINE_COLORS = [
  'color-mix(in oklab, var(--color-primary) 65%, var(--color-primary-content))',
  'var(--color-secondary)',
  'var(--color-info)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-error)',
  'var(--color-accent-content)',
  'var(--color-primary-content)',
]

export function repeatOutlineColor(index: number): string | undefined {
  return index < 0 ? undefined : REPEAT_OUTLINE_COLORS[index % REPEAT_OUTLINE_COLORS.length]
}

export function isCenterHeader(index: number, count: number): boolean {
  return count % 2 === 1
    ? index === Math.floor(count / 2)
    : index === count / 2 - 1 || index === count / 2
}

export function followsCenterBoundary(index: number, count: number): boolean {
  return count % 2 === 0 && index === count / 2
}

export function createGrid(rows: number, columns: number, color: string): PatternGrid {
  return Array.from({ length: rows }, () => Array<string>(columns).fill(color))
}

export function cloneGrid(grid: PatternGrid): PatternGrid {
  return grid.map((row) => [...row])
}

export function addRow(grid: PatternGrid, index: number, color: string): PatternGrid {
  const next = cloneGrid(grid)
  next.splice(index, 0, Array<string>(grid[0]?.length ?? 1).fill(color))
  return next
}

export function removeRow(grid: PatternGrid, index: number): PatternGrid {
  if (grid.length <= 1) return cloneGrid(grid)
  return grid.filter((_, rowIndex) => rowIndex !== index).map((row) => [...row])
}

export function addColumn(grid: PatternGrid, index: number, color: string): PatternGrid {
  return grid.map((row) => {
    const next = [...row]
    next.splice(index, 0, color)
    return next
  })
}

export function removeColumn(grid: PatternGrid, index: number): PatternGrid {
  if ((grid[0]?.length ?? 0) <= 1) return cloneGrid(grid)
  return grid.map((row) => row.filter((_, columnIndex) => columnIndex !== index))
}

export function ensureGridSize(grid: PatternGrid, rows: number, columns: number, color: string): PatternGrid {
  const next = grid.map((row) => [...row, ...Array<string>(Math.max(0, columns - row.length)).fill(color)])
  while (next.length < rows) next.push(Array<string>(Math.max(columns, next[0]?.length ?? 1)).fill(color))
  return next
}

export function repeatGrid(grid: PatternGrid, horizontal: number, vertical: number): PatternGrid {
  const repeatedRows = grid.map((row) => Array.from({ length: horizontal }, () => row).flat())
  return Array.from({ length: vertical }, () => repeatedRows.map((row) => [...row])).flat()
}

export function boxesOverlap(first: RepeatBox, second: RepeatBox): boolean {
  return first.top < second.bottom && second.top < first.bottom && first.left < second.right && second.left < first.right
}

export function sourceCellFor(boxes: RepeatBox[], row: number, column: number): [number, number, number] {
  const box = boxes.find((candidate) => candidate.enabled && row >= candidate.top && row < candidate.bottom && column >= candidate.left && column < candidate.right)
  if (!box) return [row, column, 0]
  if (box.direction === 'across') {
    const width = (box.right - box.left) / box.sections
    const copy = Math.floor((column - box.left) / width)
    return [row, box.left + ((column - box.left) % width), copy]
  }
  const height = (box.bottom - box.top) / box.sections
  const copy = Math.floor((row - box.top) / height)
  return [box.top + ((row - box.top) % height), column, copy]
}

export function synchronizeRepeatBox(grid: PatternGrid, box: RepeatBox): PatternGrid {
  const next = cloneGrid(grid)
  for (let row = box.top; row < box.bottom; row += 1) {
    for (let column = box.left; column < box.right; column += 1) {
      const [sourceRow, sourceColumn] = sourceCellFor([{ ...box, enabled: true }], row, column)
      next[row][column] = next[sourceRow][sourceColumn]
    }
  }
  return next
}

export interface RenderedGrid {
  cells: PatternGrid
  sourceRows: number[][]
  sourceColumns: number[][]
  rowHeaders: number[]
  columnHeaders: number[]
  rowCopies: number[]
  columnCopies: number[]
  repeatFlags: number[][]
  repeatColorIndices: number[][]
}

function identityRenderedGrid(grid: PatternGrid, boxes: RepeatBox[]): RenderedGrid {
  const sourceRows = grid.map((row, rowIndex) => row.map(() => rowIndex))
  const sourceColumns = grid.map((row) => row.map((_, columnIndex) => columnIndex))
  const repeatFlags = grid.map((row) => row.map(() => 0))
  const repeatColorIndices = grid.map((row) => row.map(() => -1))
  const cells = cloneGrid(grid)

  for (let row = 0; row < grid.length; row += 1) {
    for (let column = 0; column < grid[row].length; column += 1) {
      const boxIndex = boxes.findIndex((candidate) => candidate.enabled && row >= candidate.top && row < candidate.bottom && column >= candidate.left && column < candidate.right)
      if (boxIndex < 0) continue
      const box = boxes[boxIndex]
      const [sourceRow, sourceColumn, copy] = sourceCellFor([box], row, column)
      sourceRows[row][column] = sourceRow
      sourceColumns[row][column] = sourceColumn
      cells[row][column] = grid[sourceRow][sourceColumn]
      repeatColorIndices[row][column] = boxIndex

      let flags = copy > 0 ? REPEAT_COPY : 0
      if (box.direction === 'across') {
        const width = (box.right - box.left) / box.sections
        if ((column - box.left) % width === 0) flags |= REPEAT_LEFT
        if (column === box.right - 1) flags |= REPEAT_RIGHT
        if (row === box.top) flags |= REPEAT_TOP
        if (row === box.bottom - 1) flags |= REPEAT_BOTTOM
      } else {
        const height = (box.bottom - box.top) / box.sections
        if (column === box.left) flags |= REPEAT_LEFT
        if (column === box.right - 1) flags |= REPEAT_RIGHT
        if ((row - box.top) % height === 0) flags |= REPEAT_TOP
        if (row === box.bottom - 1) flags |= REPEAT_BOTTOM
      }
      repeatFlags[row][column] = flags
    }
  }

  return {
    cells,
    sourceRows,
    sourceColumns,
    rowHeaders: Array.from({ length: grid.length }, (_, index) => index),
    columnHeaders: Array.from({ length: grid[0].length }, (_, index) => index),
    rowCopies: Array<number>(grid.length).fill(0),
    columnCopies: Array<number>(grid[0].length).fill(0),
    repeatFlags,
    repeatColorIndices,
  }
}

export function renderGrid(grid: PatternGrid, horizontal: number, vertical: number, boxes: RepeatBox[]): RenderedGrid {
  if (boxes.length > 0) return identityRenderedGrid(grid, boxes)

  const rowHeaders = Array.from({ length: vertical }, () => Array.from({ length: grid.length }, (_, index) => index)).flat()
  const columnHeaders = Array.from({ length: horizontal }, () => Array.from({ length: grid[0].length }, (_, index) => index)).flat()
  const rowCopies = Array.from({ length: vertical }, (_, copy) => Array<number>(grid.length).fill(copy)).flat()
  const columnCopies = Array.from({ length: horizontal }, (_, copy) => Array<number>(grid[0].length).fill(copy)).flat()
  const cells = rowHeaders.map((row) => columnHeaders.map((column) => grid[row][column]))
  return {
    cells,
    sourceRows: rowHeaders.map((row) => columnHeaders.map(() => row)),
    sourceColumns: rowHeaders.map(() => [...columnHeaders]),
    rowHeaders,
    columnHeaders,
    rowCopies,
    columnCopies,
    repeatFlags: cells.map((row) => row.map(() => 0)),
    repeatColorIndices: cells.map((row) => row.map(() => -1)),
  }
}

export function countColors(grid: PatternGrid): Array<{ color: string; count: number }> {
  const counts = new Map<string, number>()
  for (const color of grid.flat()) counts.set(color, (counts.get(color) ?? 0) + 1)
  return [...counts].map(([color, count]) => ({ color, count }))
}
