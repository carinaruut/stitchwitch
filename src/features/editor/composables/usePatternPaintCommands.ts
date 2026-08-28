import { sourceCellFor } from '../../../utils/grid'
import type { PatternCommandContext } from '../domain/patternCommandContext'

export function usePatternPaintCommands(context: PatternCommandContext) {
  function mirroredPaintTargets(row: number, column: number): Array<[number, number]> {
    const rows = context.project.value.cells.length
    const columns = context.project.value.cells[0].length
    const box = context.project.value.repeatBoxes.find((candidate) => candidate.enabled && row >= candidate.top && row < candidate.bottom && column >= candidate.left && column < candidate.right)
    let origins: Array<[number, number]> = [[row, column]]
    if (box?.direction === 'across') {
      const sectionWidth = (box.right - box.left) / box.sections
      origins = Array.from({ length: box.sections }, (_, copy) => [row, column + copy * sectionWidth])
    } else if (box?.direction === 'down') {
      const sectionHeight = (box.bottom - box.top) / box.sections
      origins = Array.from({ length: box.sections }, (_, copy) => [row + copy * sectionHeight, column])
    }
    const targets: Array<[number, number]> = [[row, column]]
    for (const [originRow, originColumn] of origins) {
      if (context.mirrorVertical.value) targets.push([originRow, columns - 1 - originColumn])
      if (context.mirrorHorizontal.value) targets.push([rows - 1 - originRow, originColumn])
      if (context.mirrorVertical.value && context.mirrorHorizontal.value) targets.push([rows - 1 - originRow, columns - 1 - originColumn])
    }
    const seen = new Set<string>()
    return targets.filter(([targetRow, targetColumn]) => {
      const key = `${targetRow}:${targetColumn}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  function floodFill(startRow: number, startColumn: number, replacement: string) {
    const selectedCells = context.selection.value?.cells ? new Set(context.selection.value.cells.map(([row, column]) => `${row}:${column}`)) : null
    const withinSelection = (row: number, column: number) => context.selection.value !== null
      && row >= context.selection.value.top && row <= context.selection.value.bottom
      && column >= context.selection.value.left && column <= context.selection.value.right
      && (!selectedCells || selectedCells.has(`${row}:${column}`))
    const startInsideSelection = withinSelection(startRow, startColumn)
    const allowed = (row: number, column: number) => !context.selection.value || withinSelection(row, column) === startInsideSelection
    const target = context.project.value.cells[startRow][startColumn]
    if (target === replacement) return
    const pending: Array<[number, number]> = [[startRow, startColumn]]
    context.project.value.cells[startRow][startColumn] = replacement
    while (pending.length > 0) {
      const [row, column] = pending.pop()!
      const neighbors: Array<[number, number]> = [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]
      for (const [nextRow, nextColumn] of neighbors) {
        if (nextRow < 0 || nextRow >= context.project.value.cells.length || nextColumn < 0 || nextColumn >= context.project.value.cells[0].length) continue
        if (!allowed(nextRow, nextColumn) || context.project.value.cells[nextRow][nextColumn] !== target) continue
        context.project.value.cells[nextRow][nextColumn] = replacement
        pending.push([nextRow, nextColumn])
      }
    }
  }

  function paintCell(row: number, column: number) {
    context.selectRow(row)
    context.selectColumn(column)
    if (context.tool.value === 'eyedropper') {
      context.chooseColor(context.project.value.cells[row][column], true)
      context.tool.value = 'pencil'
      return
    }
    if (context.tool.value === 'fill') {
      for (const [targetRow, targetColumn] of mirroredPaintTargets(row, column)) {
        const [sourceRow, sourceColumn] = sourceCellFor(context.project.value.repeatBoxes, targetRow, targetColumn)
        floodFill(sourceRow, sourceColumn, context.selectedColor.value)
      }
      return
    }
    const color = context.tool.value === 'eraser' ? context.project.value.backgroundColor : context.selectedColor.value
    for (const [targetRow, targetColumn] of mirroredPaintTargets(row, column)) {
      const [sourceRow, sourceColumn] = sourceCellFor(context.project.value.repeatBoxes, targetRow, targetColumn)
      if (context.project.value.cells[sourceRow][sourceColumn] !== color) context.project.value.cells[sourceRow][sourceColumn] = color
    }
  }

  function commitColor() {
    if (context.tool.value === 'pencil' || context.tool.value === 'fill') context.chooseColor(context.selectedColor.value, true)
  }

  return { paintCell, commitColor }
}
