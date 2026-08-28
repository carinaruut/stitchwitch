import { addColumn, addRow, cloneGrid, removeColumn, removeRow, sourceCellFor, synchronizeRepeatBox } from '../../../utils/grid'
import { createStableId } from '../../../utils/validation'
import type { PatternCommandContext } from '../domain/patternCommandContext'

export function usePatternAxisCommands(context: PatternCommandContext) {
  function adjustAnnotationsForInsert(axis: 'row' | 'column', index: number, count: number) {
    const coordinate = axis === 'row' ? 'row' : 'column'
    const endCoordinate = axis === 'row' ? 'endRow' : 'endColumn'
    for (const annotation of context.project.value.annotations) {
      if (annotation[coordinate] >= index) annotation[coordinate] += count
      if (annotation.type === 'arrow' && annotation[endCoordinate] >= index) annotation[endCoordinate] += count
    }
  }

  function adjustAnnotationsForDelete(axis: 'row' | 'column', index: number) {
    const coordinate = axis === 'row' ? 'row' : 'column'
    const endCoordinate = axis === 'row' ? 'endRow' : 'endColumn'
    const finalCoordinate = (axis === 'row' ? context.project.value.cells.length : context.project.value.cells[0].length) - 2
    for (const annotation of context.project.value.annotations) {
      if (annotation[coordinate] > index) annotation[coordinate] -= 1
      else if (annotation[coordinate] === index) annotation[coordinate] = Math.min(index, finalCoordinate)
      if (annotation.type === 'arrow' && annotation[endCoordinate] > index) annotation[endCoordinate] -= 1
      else if (annotation.type === 'arrow' && annotation[endCoordinate] === index) annotation[endCoordinate] = Math.min(index, finalCoordinate)
    }
  }

  function adjustBoxesForInsert(axis: 'row' | 'column', index: number, count: number, excludedIds: string[] = []) {
    adjustAnnotationsForInsert(axis, index, count)
    for (const box of context.project.value.repeatBoxes) {
      if (excludedIds.includes(box.id)) continue
      const start = axis === 'row' ? 'top' : 'left'
      const end = axis === 'row' ? 'bottom' : 'right'
      if (index <= box[start]) {
        box[start] += count
        box[end] += count
      } else if (index < box[end]) box[end] += count
    }
  }

  function adjustBoxesForDelete(axis: 'row' | 'column', index: number, excludedIds: string[] = []) {
    adjustAnnotationsForDelete(axis, index)
    context.project.value.repeatBoxes = context.project.value.repeatBoxes.flatMap((box) => {
      if (excludedIds.includes(box.id)) return [box]
      const start = axis === 'row' ? 'top' : 'left'
      const end = axis === 'row' ? 'bottom' : 'right'
      if (index < box[start]) return [{ ...box, [start]: box[start] - 1, [end]: box[end] - 1 }]
      if (index >= box[end]) return [box]
      if (box[end] - box[start] === 1) return []
      const adjusted = { ...box, [end]: box[end] - 1 }
      const repeatLength = adjusted.direction === 'across' ? adjusted.right - adjusted.left : adjusted.bottom - adjusted.top
      return repeatLength % adjusted.sections === 0 ? [adjusted] : []
    })
  }

  function insertRow(index: number) {
    insertMultipleRows(index, 1)
  }

  function insertMultipleRows(index: number, count: number) {
    context.selection.value = null
    const total = Math.min(50, Math.max(1, Math.floor(count)))
    const target = context.project.value.repeatBoxes.find((box) => box.direction === 'down' && index > box.top && index < box.bottom)
    context.beginGridChange()
    let cells = cloneGrid(context.project.value.cells)
    if (target) {
      const sectionHeight = (target.bottom - target.top) / target.sections
      const sectionOffset = (index - target.top) % sectionHeight
      const aligned = context.project.value.repeatBoxes.filter((box) => box.direction === 'down' && box.top === target.top && box.bottom === target.bottom && box.sections === target.sections)
      const alignedIds = aligned.map((box) => box.id)
      for (let section = 0; section < target.sections; section += 1) {
        const position = target.top + section * sectionHeight + sectionOffset + section * total
        for (let offset = 0; offset < total; offset += 1) {
          cells = addRow(cells, position + offset, context.project.value.backgroundColor)
          context.project.value.rowIds.splice(position + offset, 0, createStableId())
          adjustBoxesForInsert('row', position + offset, 1, alignedIds)
        }
      }
      for (const box of aligned) box.bottom += total * box.sections
      for (const box of aligned) if (box.enabled) cells = synchronizeRepeatBox(cells, box)
      context.project.value.cells = cells
      context.selectRow(target.top + sectionOffset)
      return
    }
    adjustBoxesForInsert('row', index, total)
    for (let offset = 0; offset < total; offset += 1) {
      cells = addRow(cells, index + offset, context.project.value.backgroundColor)
      context.project.value.rowIds.splice(index + offset, 0, createStableId())
    }
    context.project.value.cells = cells
    context.selectRow(Math.min(index, cells.length - 1))
  }

  function fillRows(indices: number[], color: string, rememberColor = true) {
    const rows = [...new Set(indices)].filter((index) => index >= 0 && index < context.project.value.cells.length)
    if (rows.length === 0) return
    context.beginGridChange()
    const cells = cloneGrid(context.project.value.cells)
    for (const row of rows) {
      for (let column = 0; column < cells[row].length; column += 1) {
        const [sourceRow, sourceColumn] = sourceCellFor(context.project.value.repeatBoxes, row, column)
        cells[sourceRow][sourceColumn] = color
      }
    }
    context.project.value.cells = context.synchronizeEnabledBoxes(cells)
    if (rememberColor) context.chooseColor(color, true)
  }

  function fillSelectedRows(color: string) { fillRows(context.selectedRows.value, color) }
  function fillRow(index: number, color: string) { context.selectRow(index); fillRows([index], color) }
  function eraseSelectedRows() { fillRows(context.selectedRows.value, context.project.value.backgroundColor, false) }
  function eraseRow(index: number) { context.selectRow(index); fillRows([index], context.project.value.backgroundColor, false) }

  function deleteRowAt(index: number) {
    const target = context.project.value.repeatBoxes.find((box) => box.enabled && box.direction === 'down' && index >= box.top && index < box.bottom)
    if (target && context.project.value.cells.length > target.sections) {
      const sectionHeight = (target.bottom - target.top) / target.sections
      const sectionOffset = (index - target.top) % sectionHeight
      const aligned = context.project.value.repeatBoxes.filter((box) => box.direction === 'down' && box.top === target.top && box.bottom === target.bottom && box.sections === target.sections)
      const alignedIds = aligned.map((box) => box.id)
      let cells = cloneGrid(context.project.value.cells)
      for (let section = target.sections - 1; section >= 0; section -= 1) {
        const position = target.top + section * sectionHeight + sectionOffset
        cells = removeRow(cells, position)
        context.project.value.rowIds.splice(position, 1)
        adjustBoxesForDelete('row', position, alignedIds)
      }
      if (sectionHeight === 1) context.project.value.repeatBoxes = context.project.value.repeatBoxes.filter((box) => !alignedIds.includes(box.id))
      else for (const box of aligned) box.bottom -= box.sections
      if (sectionHeight > 1) for (const box of aligned) if (box.enabled) cells = synchronizeRepeatBox(cells, box)
      context.project.value.cells = cells
      return
    }
    adjustBoxesForDelete('row', index)
    context.project.value.rowIds.splice(index, 1)
    context.project.value.cells = removeRow(context.project.value.cells, index)
  }

  function deleteSelectedRows() {
    if (context.project.value.cells.length <= 1) return
    context.selection.value = null
    const operations = new Map<string, number>()
    for (const index of context.selectedRows.value) {
      const target = context.project.value.repeatBoxes.find((box) => box.enabled && box.direction === 'down' && index >= box.top && index < box.bottom)
      if (!target) operations.set(`row:${index}`, index)
      else {
        const sectionHeight = (target.bottom - target.top) / target.sections
        const offset = (index - target.top) % sectionHeight
        operations.set(`repeat:${target.top}:${target.bottom}:${target.sections}:${offset}`, target.top + offset)
      }
    }
    context.beginGridChange()
    const indices = [...operations.values()].sort((a, b) => b - a)
    for (const index of indices) {
      if (context.project.value.cells.length <= 1) break
      deleteRowAt(Math.min(index, context.project.value.cells.length - 1))
    }
    context.selectRow(Math.min(indices.at(-1) ?? context.selectedRow.value, context.project.value.cells.length - 1))
  }

  function deleteSelectedRow() { context.selectRow(context.selectedRow.value, false, true); deleteSelectedRows() }

  function insertColumn(index: number) { insertMultipleColumns(index, 1) }

  function insertMultipleColumns(index: number, count: number) {
    context.selection.value = null
    const total = Math.min(50, Math.max(1, Math.floor(count)))
    const target = context.project.value.repeatBoxes.find((box) => box.direction === 'across' && index > box.left && index < box.right)
    context.beginGridChange()
    let cells = cloneGrid(context.project.value.cells)
    if (target) {
      const sectionWidth = (target.right - target.left) / target.sections
      const sectionOffset = (index - target.left) % sectionWidth
      const aligned = context.project.value.repeatBoxes.filter((box) => box.direction === 'across' && box.left === target.left && box.right === target.right && box.sections === target.sections)
      const alignedIds = aligned.map((box) => box.id)
      for (let section = 0; section < target.sections; section += 1) {
        const position = target.left + section * sectionWidth + sectionOffset + section * total
        for (let offset = 0; offset < total; offset += 1) {
          cells = addColumn(cells, position + offset, context.project.value.backgroundColor)
          context.project.value.columnIds.splice(position + offset, 0, createStableId())
          adjustBoxesForInsert('column', position + offset, 1, alignedIds)
        }
      }
      for (const box of aligned) box.right += total * box.sections
      for (const box of aligned) if (box.enabled) cells = synchronizeRepeatBox(cells, box)
      context.project.value.cells = cells
      context.selectColumn(target.left + sectionOffset)
      return
    }
    adjustBoxesForInsert('column', index, total)
    for (let offset = 0; offset < total; offset += 1) {
      cells = addColumn(cells, index + offset, context.project.value.backgroundColor)
      context.project.value.columnIds.splice(index + offset, 0, createStableId())
    }
    context.project.value.cells = cells
    context.selectColumn(Math.min(index, cells[0].length - 1))
  }

  function fillColumns(indices: number[], color: string, rememberColor = true) {
    const columns = [...new Set(indices)].filter((index) => index >= 0 && index < context.project.value.cells[0].length)
    if (columns.length === 0) return
    context.beginGridChange()
    const cells = cloneGrid(context.project.value.cells)
    for (let row = 0; row < cells.length; row += 1) {
      for (const column of columns) {
        const [sourceRow, sourceColumn] = sourceCellFor(context.project.value.repeatBoxes, row, column)
        cells[sourceRow][sourceColumn] = color
      }
    }
    context.project.value.cells = context.synchronizeEnabledBoxes(cells)
    if (rememberColor) context.chooseColor(color, true)
  }

  function fillSelectedColumns(color: string) { fillColumns(context.selectedColumns.value, color) }
  function fillColumn(index: number, color: string) { context.selectColumn(index); fillColumns([index], color) }
  function eraseSelectedColumns() { fillColumns(context.selectedColumns.value, context.project.value.backgroundColor, false) }
  function eraseColumn(index: number) { context.selectColumn(index); fillColumns([index], context.project.value.backgroundColor, false) }

  function deleteColumnAt(index: number) {
    const target = context.project.value.repeatBoxes.find((box) => box.enabled && box.direction === 'across' && index >= box.left && index < box.right)
    if (target && context.project.value.cells[0].length > target.sections) {
      const sectionWidth = (target.right - target.left) / target.sections
      const sectionOffset = (index - target.left) % sectionWidth
      const aligned = context.project.value.repeatBoxes.filter((box) => box.direction === 'across' && box.left === target.left && box.right === target.right && box.sections === target.sections)
      const alignedIds = aligned.map((box) => box.id)
      let cells = cloneGrid(context.project.value.cells)
      for (let section = target.sections - 1; section >= 0; section -= 1) {
        const position = target.left + section * sectionWidth + sectionOffset
        cells = removeColumn(cells, position)
        context.project.value.columnIds.splice(position, 1)
        adjustBoxesForDelete('column', position, alignedIds)
      }
      if (sectionWidth === 1) context.project.value.repeatBoxes = context.project.value.repeatBoxes.filter((box) => !alignedIds.includes(box.id))
      else for (const box of aligned) box.right -= box.sections
      if (sectionWidth > 1) for (const box of aligned) if (box.enabled) cells = synchronizeRepeatBox(cells, box)
      context.project.value.cells = cells
      return
    }
    adjustBoxesForDelete('column', index)
    context.project.value.columnIds.splice(index, 1)
    context.project.value.cells = removeColumn(context.project.value.cells, index)
  }

  function deleteSelectedColumns() {
    if (context.project.value.cells[0].length <= 1) return
    context.selection.value = null
    const operations = new Map<string, number>()
    for (const index of context.selectedColumns.value) {
      const target = context.project.value.repeatBoxes.find((box) => box.enabled && box.direction === 'across' && index >= box.left && index < box.right)
      if (!target) operations.set(`column:${index}`, index)
      else {
        const sectionWidth = (target.right - target.left) / target.sections
        const offset = (index - target.left) % sectionWidth
        operations.set(`repeat:${target.left}:${target.right}:${target.sections}:${offset}`, target.left + offset)
      }
    }
    context.beginGridChange()
    const indices = [...operations.values()].sort((a, b) => b - a)
    for (const index of indices) {
      if (context.project.value.cells[0].length <= 1) break
      deleteColumnAt(Math.min(index, context.project.value.cells[0].length - 1))
    }
    context.selectColumn(Math.min(indices.at(-1) ?? context.selectedColumn.value, context.project.value.cells[0].length - 1))
  }

  function deleteSelectedColumn() { context.selectColumn(context.selectedColumn.value, false, true); deleteSelectedColumns() }

  return { insertRow, insertMultipleRows, fillRow, fillSelectedRows, eraseRow, eraseSelectedRows, deleteSelectedRow, deleteSelectedRows, insertColumn, insertMultipleColumns, fillColumn, fillSelectedColumns, eraseColumn, eraseSelectedColumns, deleteSelectedColumn, deleteSelectedColumns }
}
