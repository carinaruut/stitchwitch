import type { StitchProject } from '../../../types/tracker'
import { appError } from '../../../utils/appError'
import { renderGrid } from '../../../utils/grid'
import { asStitchProject } from '../../../utils/project'
import { createStableId, validateProject } from '../../../utils/validation'

export const MAX_SHARE_URL_LENGTH = 8_000
export const MAX_SHARE_TOKEN_LENGTH = 7_500
export const MAX_SHARE_COMPRESSED_BYTES = 6_000
export const MAX_SHARE_DECOMPRESSED_BYTES = 2_000_000
export const MAX_SHARE_RENDERED_STITCHES = 50_000

const TOKEN_PREFIX = 'sw1.gzip'
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8', { fatal: true })

interface CompactShareProject {
  format: 'stitch-share'
  version: 1
  pattern: Record<string, unknown>
  tracker?: Record<string, unknown>
}

export interface EncodedSharedProject {
  token: string
  json: string
  compressedBytes: number
  decompressedBytes: number
}

function compressionStream(format: 'gzip') {
  if (typeof CompressionStream === 'undefined') throw appError('share.unsupportedCompression')
  return new CompressionStream(format)
}

function decompressionStream(format: 'gzip') {
  if (typeof DecompressionStream === 'undefined') throw appError('share.unsupportedCompression')
  return new DecompressionStream(format)
}

async function readBoundedStream(stream: ReadableStream<Uint8Array>, expectedBytes: number) {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > expectedBytes || total > MAX_SHARE_DECOMPRESSED_BYTES) {
        await reader.cancel()
        throw appError('share.decompressedTooLarge')
      }
      chunks.push(value)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError') throw error
    throw appError('share.malformed')
  } finally {
    reader.releaseLock()
  }
  if (total !== expectedBytes) throw appError('share.truncated')
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return output
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function compactBytesFromBase64Url(value: unknown, maximum: number) {
  if (typeof value !== 'string' || !BASE64URL_PATTERN.test(value)) throw appError('share.invalidProject')
  const padding = '='.repeat((4 - value.length % 4) % 4)
  let binary: string
  try {
    binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + padding)
  } catch {
    throw appError('share.invalidProject')
  }
  if (binary.length > maximum) throw appError('share.invalidProject')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function base64UrlToBytes(value: string) {
  if (!value || !BASE64URL_PATTERN.test(value)) throw appError('share.malformed')
  const padding = '='.repeat((4 - value.length % 4) % 4)
  let binary: string
  try {
    binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + padding)
  } catch {
    throw appError('share.malformed')
  }
  if (binary.length > MAX_SHARE_COMPRESSED_BYTES) throw appError('share.compressedTooLarge')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function currentPatternSource(value: unknown) {
  if (!value || typeof value !== 'object') throw appError('share.invalidProject')
  const source = value as Record<string, unknown>
  if (source.format !== 'stitch-project' || source.version !== 1 || !source.pattern || typeof source.pattern !== 'object') {
    throw appError('share.unsupportedProject')
  }
  const pattern = source.pattern as Record<string, unknown>
  if (pattern.format !== 'stitch-pattern' || pattern.version !== 1 || !Array.isArray(pattern.repeatBoxes)) {
    throw appError('share.unsupportedProject')
  }
  return pattern
}

export function validateSharedProject(value: unknown): StitchProject {
  const pattern = currentPatternSource(value)
  const validation = validateProject(pattern)
  if (!validation.valid) throw validation.error
  const usesRepeatBoxes = (pattern.repeatBoxes as unknown[]).length > 0
  const rows = pattern.rows as number
  const columns = pattern.columns as number
  const renderedRows = usesRepeatBoxes ? rows : rows * (pattern.verticalRepeats as number)
  const renderedColumns = usesRepeatBoxes ? columns : columns * (pattern.horizontalRepeats as number)
  if (renderedRows * renderedColumns > MAX_SHARE_RENDERED_STITCHES) throw appError('share.renderedTooLarge')
  try {
    return asStitchProject(value)
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError') throw error
    throw appError('share.invalidProject')
  }
}

function encodeCellSet(ids: readonly string[] | null | undefined, indexById: Map<string, number>, total: number) {
  if (!ids) return null
  const bytes = new Uint8Array(Math.ceil(total / 8))
  for (const id of ids) {
    const index = indexById.get(id)
    if (index === undefined) throw appError('share.invalidProject')
    bytes[index >> 3] |= 1 << (index & 7)
  }
  return bytesToBase64Url(bytes)
}

function decodeCellSet(value: unknown, ids: readonly string[]) {
  if (value === null || value === undefined) return null
  const expectedBytes = Math.ceil(ids.length / 8)
  const bytes = compactBytesFromBase64Url(value, expectedBytes)
  if (bytes.byteLength !== expectedBytes) throw appError('share.invalidProject')
  const completed: string[] = []
  for (let index = 0; index < ids.length; index += 1) {
    if (bytes[index >> 3]! & (1 << (index & 7))) completed.push(ids[index]!)
  }
  const unusedBits = expectedBytes * 8 - ids.length
  if (unusedBits > 0 && bytes.at(-1)! >> (8 - unusedBits)) throw appError('share.invalidProject')
  return completed
}

function withoutId<T extends { id: string }>(value: T) {
  const { id: _id, ...rest } = value
  return rest
}

function compactSharedProject(project: StitchProject): CompactShareProject {
  const rendered = renderGrid(
    project.pattern.cells,
    project.pattern.horizontalRepeats,
    project.pattern.verticalRepeats,
    project.pattern.repeatBoxes,
    project.pattern.rowIds,
    project.pattern.columnIds,
  )
  const renderedIds = rendered.cellIds.flat()
  const indexById = new Map(renderedIds.map((id, index) => [id, index]))
  const colors = [...new Set(project.pattern.cells.flat())]
  const colorIndexes = new Map(colors.map((color, index) => [color, index]))
  const {
    rowIds: _rowIds,
    columnIds: _columnIds,
    cells,
    repeatBoxes,
    annotations,
    ...pattern
  } = project.pattern
  const compact: CompactShareProject = {
    format: 'stitch-share',
    version: 1,
    pattern: {
      ...pattern,
      colors,
      cells: cells.map(row => row.map(color => colorIndexes.get(color)!)),
      repeatBoxes: repeatBoxes.map(withoutId),
      annotations: annotations.map(withoutId),
    },
  }
  if (!project.tracker) return compact

  const tracker = structuredClone(project.tracker) as unknown as Record<string, unknown>
  const progress = tracker.progress as Record<string, unknown>
  progress.completedCells = encodeCellSet(progress.completedCells as string[], indexById, renderedIds.length)
  const timer = tracker.timer as Record<string, unknown>
  timer.sessionStartedCompletedCells = encodeCellSet(timer.sessionStartedCompletedCells as string[] | null, indexById, renderedIds.length)
  const rowIndexById = new Map(project.pattern.rowIds.map((id, index) => [id, index]))
  tracker.rowNotes = Object.fromEntries(Object.entries(tracker.rowNotes as Record<string, string>)
    .map(([id, note]) => [rowIndexById.get(id), note])
    .filter((entry): entry is [number, string] => entry[0] !== undefined))
  tracker.counters = (tracker.counters as Array<{ id: string }>).map(withoutId)
  tracker.sessions = (tracker.sessions as Array<{ id: string }>).map(withoutId)
  tracker.sessionArchives = (tracker.sessionArchives as Array<{ id: string; sessions: Array<{ id: string }> }>).map(archive => ({
    ...withoutId(archive),
    sessions: archive.sessions.map(withoutId),
  }))
  compact.tracker = tracker
  return compact
}

function expandId<T extends object>(value: T) {
  return { id: createStableId(), ...value }
}

function expandSharedProject(value: unknown): StitchProject {
  if (!value || typeof value !== 'object') throw appError('share.invalidProject')
  const source = value as Partial<CompactShareProject>
  if (source.format !== 'stitch-share' || source.version !== 1 || !source.pattern || typeof source.pattern !== 'object') {
    throw appError('share.unsupportedProject')
  }
  const compactPattern = source.pattern
  const colors = compactPattern.colors
  const compactCells = compactPattern.cells
  if (!Array.isArray(colors) || colors.length === 0 || colors.some(color => typeof color !== 'string')
    || !Array.isArray(compactCells) || compactCells.length === 0 || compactCells.length > 500
    || compactCells.some(row => !Array.isArray(row) || row.length === 0 || row.length > 500)) {
    throw appError('share.invalidProject')
  }
  const cells = compactCells.map(row => (row as unknown[]).map(index => {
    if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= colors.length) throw appError('share.invalidProject')
    return colors[index as number] as string
  }))
  const repeatBoxes = compactPattern.repeatBoxes
  const annotations = compactPattern.annotations
  if (!Array.isArray(repeatBoxes) || !Array.isArray(annotations)) throw appError('share.invalidProject')
  const {
    colors: _colors,
    cells: _cells,
    repeatBoxes: _repeatBoxes,
    annotations: _annotations,
    ...patternValues
  } = compactPattern
  const pattern = {
    ...patternValues,
    format: 'stitch-pattern' as const,
    version: 1 as const,
    rows: cells.length,
    columns: cells[0]!.length,
    rowIds: Array.from({ length: cells.length }, createStableId),
    columnIds: Array.from({ length: cells[0]!.length }, createStableId),
    cells,
    repeatBoxes: repeatBoxes.map(box => {
      if (!box || typeof box !== 'object') throw appError('share.invalidProject')
      return expandId(box)
    }),
    annotations: annotations.map(annotation => {
      if (!annotation || typeof annotation !== 'object') throw appError('share.invalidProject')
      return expandId(annotation)
    }),
  }
  const base: StitchProject = { format: 'stitch-project', version: 1, pattern: pattern as StitchProject['pattern'] }
  if (!source.tracker || typeof source.tracker !== 'object') return validateSharedProject(base)

  const validatedPattern = validateSharedProject(base).pattern
  const rendered = renderGrid(
    validatedPattern.cells,
    validatedPattern.horizontalRepeats,
    validatedPattern.verticalRepeats,
    validatedPattern.repeatBoxes,
    validatedPattern.rowIds,
    validatedPattern.columnIds,
  )
  const renderedIds = rendered.cellIds.flat()
  const tracker = structuredClone(source.tracker)
  const progress = tracker.progress as Record<string, unknown>
  const timer = tracker.timer as Record<string, unknown>
  if (!progress || typeof progress !== 'object' || !timer || typeof timer !== 'object') throw appError('share.invalidProject')
  progress.completedCells = decodeCellSet(progress.completedCells, renderedIds)
  timer.sessionStartedCompletedCells = decodeCellSet(timer.sessionStartedCompletedCells, renderedIds)
  if (!tracker.rowNotes || typeof tracker.rowNotes !== 'object' || Array.isArray(tracker.rowNotes)) throw appError('share.invalidProject')
  tracker.rowNotes = Object.fromEntries(Object.entries(tracker.rowNotes).map(([index, note]) => {
    const row = Number(index)
    if (!Number.isInteger(row) || row < 0 || row >= validatedPattern.rowIds.length || typeof note !== 'string') throw appError('share.invalidProject')
    return [validatedPattern.rowIds[row], note]
  }))
  if (!Array.isArray(tracker.counters) || !Array.isArray(tracker.sessions) || !Array.isArray(tracker.sessionArchives)) throw appError('share.invalidProject')
  tracker.counters = tracker.counters.map(counter => expandId(counter as object))
  tracker.sessions = tracker.sessions.map(session => expandId(session as object))
  tracker.sessionArchives = tracker.sessionArchives.map(archive => {
    if (!archive || typeof archive !== 'object' || !Array.isArray((archive as Record<string, unknown>).sessions)) throw appError('share.invalidProject')
    return expandId({
      ...archive,
      sessions: (archive as Record<string, unknown>).sessions as object[],
    })
  }).map(archive => ({ ...archive, sessions: archive.sessions.map(expandId) }))
  return validateSharedProject({ ...base, pattern: validatedPattern, tracker })
}

export async function encodeSharedProject(value: StitchProject): Promise<EncodedSharedProject> {
  const project = validateSharedProject(value)
  const json = JSON.stringify(compactSharedProject(project))
  const bytes = textEncoder.encode(json)
  if (bytes.byteLength > MAX_SHARE_DECOMPRESSED_BYTES) throw appError('share.decompressedTooLarge')
  let compressed: Uint8Array
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(compressionStream('gzip'))
    compressed = new Uint8Array(await new Response(stream).arrayBuffer())
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError') throw error
    throw appError('share.compressionFailed')
  }
  if (compressed.byteLength > MAX_SHARE_COMPRESSED_BYTES) throw appError('share.compressedTooLarge')
  const token = `${TOKEN_PREFIX}.${bytes.byteLength}.${bytesToBase64Url(compressed)}`
  if (token.length > MAX_SHARE_TOKEN_LENGTH) throw appError('share.linkTooLong')
  return { token, json, compressedBytes: compressed.byteLength, decompressedBytes: bytes.byteLength }
}

export async function decodeSharedProject(token: string): Promise<StitchProject> {
  if (!token || token.length > MAX_SHARE_TOKEN_LENGTH) throw appError('share.linkTooLong')
  const parts = token.split('.')
  if (parts[0] !== 'sw1') throw appError('share.unsupportedVersion')
  if (parts[1] !== 'gzip') throw appError('share.unsupportedCompression')
  if (parts.length !== 4 || !/^\d+$/.test(parts[2])) throw appError('share.malformed')
  const expectedBytes = Number(parts[2])
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes <= 0) throw appError('share.malformed')
  if (expectedBytes > MAX_SHARE_DECOMPRESSED_BYTES) throw appError('share.decompressedTooLarge')
  const compressed = base64UrlToBytes(parts[3])
  let decompressed: Uint8Array
  try {
    const stream = new Blob([compressed]).stream().pipeThrough(decompressionStream('gzip'))
    decompressed = await readBoundedStream(stream, expectedBytes)
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError') throw error
    throw appError('share.malformed')
  }
  let value: unknown
  try {
    value = JSON.parse(textDecoder.decode(decompressed))
  } catch {
    throw appError('share.malformed')
  }
  return expandSharedProject(value)
}
