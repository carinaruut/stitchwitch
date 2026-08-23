import type { PatternAnnotation } from '../types/pattern'

export type RenderedAnnotation = PatternAnnotation & {
  renderId: string
  displayRow: number
  displayColumn: number
  displayEndRow?: number
  displayEndColumn?: number
  commentCount?: number
}

export function renderAnnotations(annotations: PatternAnnotation[], sourceRows: number[][], sourceColumns: number[][]): RenderedAnnotation[] {
  if (sourceRows.length === 0 || sourceColumns.length === 0) return []
  const rows = sourceRows.length
  const columns = sourceRows[0].length
  const cellsBySource = new Map<string, Array<[number, number]>>()
  for (let displayRow = 0; displayRow < rows; displayRow += 1) {
    for (let displayColumn = 0; displayColumn < columns; displayColumn += 1) {
      const key = `${sourceRows[displayRow][displayColumn]}:${sourceColumns[displayRow][displayColumn]}`
      const matches = cellsBySource.get(key)
      if (matches) matches.push([displayRow, displayColumn])
      else cellsBySource.set(key, [[displayRow, displayColumn]])
    }
  }
  const cellsFor = (row: number, column: number) => cellsBySource.get(`${row}:${column}`) ?? []

  return annotations.flatMap((annotation) => cellsFor(annotation.row, annotation.column).map(([displayRow, displayColumn]) => {
    if (annotation.type !== 'arrow') return { ...annotation, renderId: `${annotation.id}:${displayRow}:${displayColumn}`, displayRow, displayColumn }
    const expectedRow = displayRow + annotation.endRow - annotation.row
    const expectedColumn = displayColumn + annotation.endColumn - annotation.column
    const targets = cellsFor(annotation.endRow, annotation.endColumn)
    const [displayEndRow, displayEndColumn] = targets.reduce(
      (best, target) => Math.abs(target[0] - expectedRow) + Math.abs(target[1] - expectedColumn) < Math.abs(best[0] - expectedRow) + Math.abs(best[1] - expectedColumn) ? target : best,
      targets[0] ?? [expectedRow, expectedColumn],
    )
    return { ...annotation, renderId: `${annotation.id}:${displayRow}:${displayColumn}`, displayRow, displayColumn, displayEndRow, displayEndColumn }
  }))
}

export function identitySourceMaps(rowHeaders: number[], columnHeaders: number[]) {
  return {
    sourceRows: rowHeaders.map((row) => columnHeaders.map(() => row)),
    sourceColumns: rowHeaders.map(() => columnHeaders.map((column) => column)),
  }
}
