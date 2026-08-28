export function formatTrackerDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function formatSignedTrackerNumber(value: number, formatNumber: (value: number) => string) {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value)
}
