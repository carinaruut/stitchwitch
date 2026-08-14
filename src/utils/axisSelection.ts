export function parseAxisSelection(value: string, count: number): number[] | null {
  const parts = value.replace(/\s+/g, '').split(';')
  if (parts.length === 0 || parts.some((part) => part === '')) return null
  const indices = new Set<number>()
  for (const part of parts) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part)
    if (!match) return null
    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])
    if (start < 1 || end < start || end > count) return null
    for (let index = start; index <= end; index += 1) indices.add(index - 1)
  }
  return [...indices].sort((a, b) => a - b)
}
