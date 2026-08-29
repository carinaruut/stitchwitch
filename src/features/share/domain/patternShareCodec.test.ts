import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../../editor/domain/patternFactory'
import { createTrackerState } from '../../../utils/project'
import { AppError } from '../../../utils/appError'
import { renderGrid } from '../../../utils/grid'
import type { StitchProject } from '../../../types/tracker'
import {
  decodeSharedProject,
  encodeSharedProject,
  MAX_SHARE_DECOMPRESSED_BYTES,
  MAX_SHARE_TOKEN_LENGTH,
  validateSharedProject,
} from './patternShareCodec'

function project(): StitchProject {
  const pattern = createDefaultProject()
  pattern.name = 'Õmbleja shared pattern'
  const tracker = createTrackerState()
  tracker.projectNote = 'Recipient notes remain in the shared project.'
  tracker.counters.push({ id: crypto.randomUUID(), name: 'Rows', value: 7 })
  return { format: 'stitch-project', version: 1, pattern, tracker }
}

async function expectAppError(action: () => unknown | Promise<unknown>, translationKey: string) {
  try {
    await action()
    throw new Error('Expected an AppError')
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).translationKey).toBe(translationKey)
  }
}

function base64Url(bytes: Uint8Array) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

describe('pattern share codec', () => {
  it('round trips pattern and Tracker data through a Base64URL token', async () => {
    const source = project()
    const encoded = await encodeSharedProject(source)
    const decoded = await decodeSharedProject(encoded.token)

    expect(encoded.token).toMatch(/^sw1\.gzip\.\d+\.[A-Za-z0-9_-]+$/)
    expect(encoded.token).not.toMatch(/[+/=]/)
    expect(decoded.pattern.name).toBe(source.pattern.name)
    expect(decoded.tracker?.projectNote).toBe(source.tracker?.projectNote)
    expect(decoded.tracker?.counters.map(({ name, value }) => ({ name, value }))).toEqual(
      source.tracker?.counters.map(({ name, value }) => ({ name, value })),
    )
  })

  it('rejects unsupported, malformed, and truncated tokens', async () => {
    await expectAppError(() => decodeSharedProject('sw9.gzip.1.AA'), 'errors.share.unsupportedVersion')
    await expectAppError(() => decodeSharedProject('sw1.br.1.AA'), 'errors.share.unsupportedCompression')
    await expectAppError(() => decodeSharedProject('sw1.gzip.x.AA'), 'errors.share.malformed')
    const encoded = await encodeSharedProject(project())
    const parts = encoded.token.split('.')
    parts[2] = String(Number(parts[2]) + 1)
    await expectAppError(() => decodeSharedProject(parts.join('.')), 'errors.share.truncated')
  })

  it('rejects declared and encoded payloads before excessive allocation', async () => {
    await expectAppError(
      () => decodeSharedProject(`sw1.gzip.${MAX_SHARE_DECOMPRESSED_BYTES + 1}.AA`),
      'errors.share.decompressedTooLarge',
    )
    await expectAppError(() => decodeSharedProject('x'.repeat(MAX_SHARE_TOKEN_LENGTH + 1)), 'errors.share.linkTooLong')
  })

  it('stops decompression bombs before output can exceed the declared limit', async () => {
    const oversized = new TextEncoder().encode('a'.repeat(MAX_SHARE_DECOMPRESSED_BYTES + 1))
    const compressed = new Uint8Array(await new Response(
      new Blob([oversized]).stream().pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer())
    expect(compressed.byteLength).toBeLessThan(6_000)
    await expectAppError(
      () => decodeSharedProject(`sw1.gzip.${MAX_SHARE_DECOMPRESSED_BYTES}.${base64Url(compressed)}`),
      'errors.share.decompressedTooLarge',
    )
  })

  it('rejects projects whose expanded pattern is unsafe to render', () => {
    const source = project()
    source.pattern.horizontalRepeats = 100
    source.pattern.verticalRepeats = 100
    expect(() => validateSharedProject(source)).toThrowError(expect.objectContaining({
      translationKey: 'errors.share.renderedTooLarge',
    }))
  })

  it('does not accept legacy bare pattern documents in share links', () => {
    expect(() => validateSharedProject(createDefaultProject())).toThrowError(expect.objectContaining({
      translationKey: 'errors.share.unsupportedProject',
    }))
  })

  it('classifies high-entropy projects as too large for link sharing', async () => {
    const source = project()
    source.pattern.palette = Array.from({ length: 120 }, (_, index) => ({
      color: `#${index.toString(16).padStart(6, '0')}`,
      name: `Color ${index} ${crypto.randomUUID()}`,
      brand: crypto.randomUUID(),
      code: crypto.randomUUID(),
      notes: Array.from({ length: 12 }, () => crypto.randomUUID()).join(' '),
    }))
    await expectAppError(() => encodeSharedProject(source), 'errors.share.compressedTooLarge')
  })

  it('keeps a fully tracked 49 by 49 pattern within the safe URL budget', async () => {
    const source = project()
    source.pattern.rows = 49
    source.pattern.columns = 49
    source.pattern.rowIds = Array.from({ length: 49 }, () => crypto.randomUUID())
    source.pattern.columnIds = Array.from({ length: 49 }, () => crypto.randomUUID())
    source.pattern.cells = Array.from({ length: 49 }, () => Array<string>(49).fill('#ffffff'))
    const rendered = renderGrid(
      source.pattern.cells,
      source.pattern.horizontalRepeats,
      source.pattern.verticalRepeats,
      source.pattern.repeatBoxes,
      source.pattern.rowIds,
      source.pattern.columnIds,
    )
    source.tracker!.progress.completedCells = rendered.cellIds.flat()

    const encoded = await encodeSharedProject(source)
    const decoded = await decodeSharedProject(encoded.token)

    expect(encoded.token.length).toBeLessThan(3_000)
    expect(decoded.pattern.cells).toHaveLength(49)
    expect(decoded.tracker?.progress.completedCells).toHaveLength(49 * 49)
  })
})
