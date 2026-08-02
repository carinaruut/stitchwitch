import type { PatternGrid } from '../types/pattern'

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

export function repeatGrid(grid: PatternGrid, horizontal: number, vertical: number): PatternGrid {
  const repeatedRows = grid.map((row) => Array.from({ length: horizontal }, () => row).flat())
  return Array.from({ length: vertical }, () => repeatedRows.map((row) => [...row])).flat()
}

export function findUsedColors(grid: PatternGrid): string[] {
  return [...new Set(grid.flat())]
}
