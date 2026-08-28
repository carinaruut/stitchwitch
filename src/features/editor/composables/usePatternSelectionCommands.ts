import type { GridSelection, PatternGrid } from '../../../types/pattern'
import { normalizeColor } from '../../../utils/colors'
import { cloneGrid, ensureGridSize, renderGrid, sourceCellFor } from '../../../utils/grid'
import type { PatternCommandContext, SelectionClipboard } from '../domain/patternCommandContext'

export function usePatternSelectionCommands(context: PatternCommandContext) {
  function setSelection(top: number, left: number, bottom: number, right: number) {
    context.selection.value = {
      top: Math.max(0, Math.min(top, bottom)),
      left: Math.max(0, Math.min(left, right)),
      bottom: Math.min(context.project.value.cells.length - 1, Math.max(top, bottom)),
      right: Math.min(context.project.value.cells[0].length - 1, Math.max(left, right)),
    }
    context.selectRow(context.selection.value.top)
    context.selectColumn(context.selection.value.left)
  }

  function setHeaderSelection(axis: 'row' | 'column'): boolean {
    const indices = axis === 'row' ? context.selectedRows.value : context.selectedColumns.value
    if (indices.length < 2) {
      context.selection.value = null
      return false
    }
    context.selection.value = axis === 'row'
      ? { top: Math.min(...indices), left: 0, bottom: Math.max(...indices), right: context.project.value.cells[0].length - 1 }
      : { top: 0, left: Math.min(...indices), bottom: context.project.value.cells.length - 1, right: Math.max(...indices) }
    return true
  }

  function selectionCoordinates(candidate: GridSelection): Array<[number, number]> {
    if (candidate.cells) return candidate.cells
    const coordinates: Array<[number, number]> = []
    for (let row = candidate.top; row <= candidate.bottom; row += 1) {
      for (let column = candidate.left; column <= candidate.right; column += 1) coordinates.push([row, column])
    }
    return coordinates
  }

  function selectionClipboard(candidate: GridSelection): SelectionClipboard {
    const rendered = renderGrid(context.project.value.cells, 1, 1, context.project.value.repeatBoxes, context.project.value.rowIds, context.project.value.columnIds).cells
    const selectedCells = candidate.cells ? new Set(candidate.cells.map(([row, column]) => `${row}:${column}`)) : null
    const cells = rendered.slice(candidate.top, candidate.bottom + 1).map((row) => row.slice(candidate.left, candidate.right + 1))
    const mask = selectedCells
      ? cells.map((row, rowOffset) => row.map((_, columnOffset) => selectedCells.has(`${candidate.top + rowOffset}:${candidate.left + columnOffset}`)))
      : null
    return { cells, mask }
  }

  function setClipboardSelection(row: number, column: number, copied: SelectionClipboard) {
    const bottom = row + copied.cells.length - 1
    const right = column + copied.cells[0].length - 1
    const cells = copied.mask
      ? copied.mask.flatMap((maskRow, rowOffset) => maskRow.flatMap((selected, columnOffset) => selected ? [[row + rowOffset, column + columnOffset] as [number, number]] : []))
      : undefined
    context.selection.value = { top: row, left: column, bottom, right, cells }
    context.selectRow(row)
    context.selectColumn(column)
  }

  function setMagicSelection(row: number, column: number, extend = false) {
    if (row < 0 || row >= context.project.value.cells.length || column < 0 || column >= context.project.value.cells[0].length) return
    const color = context.project.value.cells[row][column]
    const cells: Array<[number, number]> = []
    const pending: Array<[number, number]> = [[row, column]]
    const visited = new Set([`${row}:${column}`])
    let top = row
    let left = column
    let bottom = row
    let right = column
    while (pending.length > 0) {
      const [currentRow, currentColumn] = pending.pop()!
      cells.push([currentRow, currentColumn])
      top = Math.min(top, currentRow)
      left = Math.min(left, currentColumn)
      bottom = Math.max(bottom, currentRow)
      right = Math.max(right, currentColumn)
      const neighbors: Array<[number, number]> = [[currentRow - 1, currentColumn], [currentRow + 1, currentColumn], [currentRow, currentColumn - 1], [currentRow, currentColumn + 1]]
      for (const [nextRow, nextColumn] of neighbors) {
        const key = `${nextRow}:${nextColumn}`
        if (nextRow < 0 || nextRow >= context.project.value.cells.length || nextColumn < 0 || nextColumn >= context.project.value.cells[0].length || visited.has(key)) continue
        if (context.project.value.cells[nextRow][nextColumn] !== color) continue
        visited.add(key)
        pending.push([nextRow, nextColumn])
      }
    }
    if (extend && context.selection.value) {
      const combined = new Map<string, [number, number]>()
      for (const [selectedRow, selectedColumn] of selectionCoordinates(context.selection.value)) combined.set(`${selectedRow}:${selectedColumn}`, [selectedRow, selectedColumn])
      for (const [selectedRow, selectedColumn] of cells) combined.set(`${selectedRow}:${selectedColumn}`, [selectedRow, selectedColumn])
      cells.splice(0, cells.length, ...combined.values())
      top = Math.min(top, context.selection.value.top)
      left = Math.min(left, context.selection.value.left)
      bottom = Math.max(bottom, context.selection.value.bottom)
      right = Math.max(right, context.selection.value.right)
    }
    context.selection.value = { top, left, bottom, right, cells }
    context.selectRow(row)
    context.selectColumn(column)
  }

  function fillSelection(color: string, rememberColor = true): boolean {
    if (!context.selection.value) return false
    const normalized = normalizeColor(color)
    if (!normalized) return false
    context.beginGridChange()
    const cells = cloneGrid(context.project.value.cells)
    for (const [row, column] of selectionCoordinates(context.selection.value)) {
      const [sourceRow, sourceColumn] = sourceCellFor(context.project.value.repeatBoxes, row, column)
      cells[sourceRow][sourceColumn] = normalized
    }
    context.project.value.cells = context.synchronizeEnabledBoxes(cells)
    if (rememberColor) context.chooseColor(normalized, true)
    return true
  }

  function eraseSelection(): boolean {
    return fillSelection(context.project.value.backgroundColor, false)
  }

  function copySelection(): boolean {
    if (!context.selection.value) return false
    context.clipboard.value = selectionClipboard(context.selection.value)
    return true
  }

  function writeClipboard(cells: PatternGrid, data: PatternGrid, row: number, column: number, mask: boolean[][] | null = null): PatternGrid {
    let next = ensureGridSize(cells, row + data.length, column + data[0].length, context.project.value.backgroundColor)
    next = cloneGrid(next)
    for (let rowOffset = 0; rowOffset < data.length; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < data[rowOffset].length; columnOffset += 1) {
        if (mask && !mask[rowOffset][columnOffset]) continue
        const [sourceRow, sourceColumn] = sourceCellFor(context.project.value.repeatBoxes, row + rowOffset, column + columnOffset)
        next[sourceRow][sourceColumn] = data[rowOffset][columnOffset]
      }
    }
    return context.synchronizeEnabledBoxes(next)
  }

  function pasteSelection(): boolean {
    if (!context.selection.value || !context.clipboard.value) return false
    const row = context.selection.value.top
    const column = context.selection.value.left
    if (row + context.clipboard.value.cells.length > 500 || column + context.clipboard.value.cells[0].length > 500) return false
    context.beginGridChange()
    context.project.value.cells = writeClipboard(context.project.value.cells, context.clipboard.value.cells, row, column, context.clipboard.value.mask)
    setClipboardSelection(row, column, context.clipboard.value)
    return true
  }

  function moveSelectionTo(row: number, column: number): boolean {
    if (!context.selection.value) return false
    const source = { ...context.selection.value }
    const copied = selectionClipboard(source)
    if (row + copied.cells.length > 500 || column + copied.cells[0].length > 500) return false
    context.beginGridChange()
    const next = cloneGrid(context.project.value.cells)
    for (const [sourceRow, sourceColumn] of selectionCoordinates(source)) {
      const [mappedRow, mappedColumn] = sourceCellFor(context.project.value.repeatBoxes, sourceRow, sourceColumn)
      next[mappedRow][mappedColumn] = context.project.value.backgroundColor
    }
    context.project.value.cells = writeClipboard(next, copied.cells, row, column, copied.mask)
    setClipboardSelection(row, column, copied)
    return true
  }

  function mirrorSelection(direction: 'horizontal' | 'vertical'): boolean {
    if (!context.selection.value) return false
    const source = context.selection.value
    const copied = selectionClipboard(source)
    copied.cells = direction === 'horizontal' ? copied.cells.map((row) => [...row].reverse()) : [...copied.cells].reverse()
    if (copied.mask) copied.mask = direction === 'horizontal' ? copied.mask.map((row) => [...row].reverse()) : [...copied.mask].reverse()
    context.beginGridChange()
    const next = cloneGrid(context.project.value.cells)
    if (source.cells) {
      for (const [sourceRow, sourceColumn] of source.cells) {
        const [mappedRow, mappedColumn] = sourceCellFor(context.project.value.repeatBoxes, sourceRow, sourceColumn)
        next[mappedRow][mappedColumn] = context.project.value.backgroundColor
      }
    }
    context.project.value.cells = writeClipboard(next, copied.cells, source.top, source.left, copied.mask)
    setClipboardSelection(source.top, source.left, copied)
    return true
  }

  function rotateSelection(direction: 'clockwise' | 'counterclockwise'): boolean {
    if (!context.selection.value) return false
    const source = { ...context.selection.value }
    const copied = selectionClipboard(source)
    const rotate = <T>(grid: T[][]): T[][] => Array.from({ length: grid[0].length }, (_, row) => Array.from({ length: grid.length }, (_, column) => direction === 'clockwise' ? grid[grid.length - column - 1][row] : grid[column][grid[0].length - row - 1]))
    copied.cells = rotate(copied.cells)
    if (copied.mask) copied.mask = rotate(copied.mask)
    if (source.top + copied.cells.length > 500 || source.left + copied.cells[0].length > 500) return false
    context.beginGridChange()
    const next = cloneGrid(context.project.value.cells)
    for (const [sourceRow, sourceColumn] of selectionCoordinates(source)) {
      const [mappedRow, mappedColumn] = sourceCellFor(context.project.value.repeatBoxes, sourceRow, sourceColumn)
      next[mappedRow][mappedColumn] = context.project.value.backgroundColor
    }
    context.project.value.cells = writeClipboard(next, copied.cells, source.top, source.left, copied.mask)
    setClipboardSelection(source.top, source.left, copied)
    return true
  }

  return { setSelection, setHeaderSelection, setMagicSelection, fillSelection, eraseSelection, copySelection, pasteSelection, moveSelectionTo, mirrorSelection, rotateSelection }
}
