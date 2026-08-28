import { computed, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { TrackerTimer } from '../../../types/tracker'
import { trackerElapsedMilliseconds } from '../../../utils/tracker'

export function useTrackerClock(timer: MaybeRefOrGetter<TrackerTimer | undefined>) {
  const now = ref(Date.now())
  const running = computed(() => toValue(timer)?.startedAt != null)
  const elapsedMilliseconds = computed(() => {
    const value = toValue(timer)
    return value ? trackerElapsedMilliseconds(value, now.value) : 0
  })
  const formattedTime = computed(() => {
    const milliseconds = Math.max(0, Math.floor(elapsedMilliseconds.value))
    const hours = Math.floor(milliseconds / 3_600_000)
    const minutes = Math.floor(milliseconds / 60_000) % 60
    const seconds = Math.floor(milliseconds / 1_000) % 60
    const centiseconds = Math.floor(milliseconds / 10) % 100
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
  })
  let frame: number | null = null

  function update() {
    now.value = Date.now()
    frame = requestAnimationFrame(update)
  }

  watch(running, (value) => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
    now.value = Date.now()
    if (value) frame = requestAnimationFrame(update)
  }, { immediate: true })

  onBeforeUnmount(() => {
    if (frame !== null) cancelAnimationFrame(frame)
  })

  return { elapsedMilliseconds, formattedTime, now, running }
}
