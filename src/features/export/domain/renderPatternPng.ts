import type { PatternProject } from '../../../types/pattern'
import { renderAnnotations } from '../../../utils/annotations'
import type { RenderedGrid } from '../../../utils/grid'

export async function renderPatternPng(project: PatternProject, rendered: RenderedGrid, includeAnnotations: boolean) {
  const { cells, rowHeaders, columnHeaders } = rendered
  const maximumDimension = Math.max(cells.length, cells[0].length)
  const cellPixels = Math.max(1, Math.min(project.cellSize, Math.floor((4096 - 32) / maximumDimension)))
  const fontPixels = Math.max(6, Math.min(14, Math.floor(cellPixels * 0.5)))
  const largestCoordinate = String(Math.max(...rowHeaders, ...columnHeaders) + 1)
  const headerPixels = Math.max(cellPixels, Math.ceil(largestCoordinate.length * fontPixels * 0.65) + 6)
  const canvas = document.createElement('canvas')
  canvas.width = headerPixels + cells[0].length * cellPixels
  canvas.height = headerPixels + cells.length * cellPixels
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas rendering is unavailable')

  context.fillStyle = '#f3f4f6'
  context.fillRect(0, 0, canvas.width, canvas.height)
  cells.forEach((row, rowIndex) => row.forEach((color, columnIndex) => {
    context.fillStyle = color
    context.fillRect(headerPixels + columnIndex * cellPixels, headerPixels + rowIndex * cellPixels, cellPixels, cellPixels)
  }))

  context.strokeStyle = '#9ca3af'
  context.lineWidth = 1
  context.beginPath()
  for (let row = 0; row <= cells.length; row++) {
    const y = Math.min(canvas.height - 0.5, headerPixels + row * cellPixels + 0.5)
    context.moveTo(0, y)
    context.lineTo(canvas.width, y)
  }
  for (let column = 0; column <= cells[0].length; column++) {
    const x = Math.min(canvas.width - 0.5, headerPixels + column * cellPixels + 0.5)
    context.moveTo(x, 0)
    context.lineTo(x, canvas.height)
  }
  context.rect(0.5, 0.5, canvas.width - 1, canvas.height - 1)
  context.stroke()

  context.fillStyle = '#111827'
  context.font = `${fontPixels}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  rowHeaders.forEach((coordinate, index) => context.fillText(String(coordinate + 1), headerPixels / 2, headerPixels + (index + 0.5) * cellPixels))
  columnHeaders.forEach((coordinate, index) => {
    const label = String(coordinate + 1)
    const x = headerPixels + (index + 0.5) * cellPixels
    if (context.measureText(label).width <= cellPixels - 2) context.fillText(label, x, headerPixels / 2)
    else {
      context.save()
      context.translate(x, headerPixels / 2)
      context.rotate(-Math.PI / 2)
      context.fillText(label, 0, 0)
      context.restore()
    }
  })

  if (includeAnnotations) {
    const annotations = renderAnnotations(project.annotations, rendered.sourceRows, rendered.sourceColumns)
    for (const annotation of annotations) {
      const x = headerPixels + (annotation.displayColumn + 0.5) * cellPixels
      const y = headerPixels + (annotation.displayRow + 0.5) * cellPixels
      context.save()
      context.strokeStyle = '#ffffff'
      context.fillStyle = annotation.color
      context.lineCap = 'round'
      context.lineJoin = 'round'
      if (annotation.type === 'text') {
        const left = x - cellPixels * 0.32
        const top = y - cellPixels * 0.3
        const width = cellPixels * 0.64
        const height = cellPixels * 0.48
        const drawComment = (color: string, lineWidth: number) => {
          context.strokeStyle = color
          context.lineWidth = lineWidth
          context.beginPath()
          context.roundRect(left, top, width, height, cellPixels * 0.1)
          context.moveTo(left + cellPixels * 0.18, top + height)
          context.lineTo(left + cellPixels * 0.12, top + height + cellPixels * 0.16)
          context.lineTo(left + cellPixels * 0.3, top + height)
          context.stroke()
        }
        context.fillStyle = '#ffffff'
        context.beginPath()
        context.roundRect(left, top, width, height, cellPixels * 0.1)
        context.fill()
        drawComment('#ffffff', Math.max(3, cellPixels * 0.28))
        drawComment(annotation.color, Math.max(1.5, cellPixels * 0.12))
      } else if (annotation.type === 'marker') {
        context.beginPath()
        context.arc(x, y, cellPixels * 0.3, 0, Math.PI * 2)
        context.lineWidth = Math.max(2, cellPixels * 0.12)
        context.stroke()
        context.fill()
        context.beginPath()
        context.fillStyle = '#ffffff'
        context.arc(x, y, cellPixels * 0.09, 0, Math.PI * 2)
        context.fill()
      } else {
        const endX = headerPixels + ((annotation.displayEndColumn ?? annotation.displayColumn) + 0.5) * cellPixels
        const endY = headerPixels + ((annotation.displayEndRow ?? annotation.displayRow) + 0.5) * cellPixels
        const angle = Math.atan2(endY - y, endX - x)
        const drawArrow = (color: string, width: number, head: number) => {
          context.strokeStyle = color
          context.fillStyle = color
          context.lineWidth = width
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(endX, endY)
          context.stroke()
          context.beginPath()
          context.moveTo(endX, endY)
          context.lineTo(endX - head * Math.cos(angle - Math.PI / 6), endY - head * Math.sin(angle - Math.PI / 6))
          context.lineTo(endX - head * Math.cos(angle + Math.PI / 6), endY - head * Math.sin(angle + Math.PI / 6))
          context.closePath()
          context.fill()
        }
        drawArrow('#ffffff', Math.max(3, cellPixels * 0.28), cellPixels * 0.42)
        drawArrow(annotation.color, Math.max(1.5, cellPixels * 0.14), cellPixels * 0.32)
      }
      context.restore()
    }
  }

  return new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG creation failed')), 'image/png'))
}
