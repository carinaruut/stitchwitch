import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export function useScreenWakeLock(keepAwake: Ref<boolean>, onError: () => void) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  let wakeLock: WakeLockSentinel | null = null
  let requestPending = false

  async function requestWakeLock() {
    if (!supported || !keepAwake.value || document.visibilityState !== 'visible' || wakeLock || requestPending) return
    requestPending = true
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      if (!keepAwake.value) {
        await sentinel.release()
        return
      }
      wakeLock = sentinel
      sentinel.addEventListener('release', () => {
        if (wakeLock === sentinel) wakeLock = null
      }, { once: true })
    } catch {
      keepAwake.value = false
      onError()
    } finally {
      requestPending = false
    }
  }

  function releaseWakeLock() {
    const sentinel = wakeLock
    wakeLock = null
    if (sentinel && !sentinel.released) void sentinel.release()
  }

  function setKeepAwake(value: boolean) {
    keepAwake.value = value
    if (keepAwake.value) void requestWakeLock()
    else releaseWakeLock()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && keepAwake.value) void requestWakeLock()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (keepAwake.value) void requestWakeLock()
  })

  onBeforeUnmount(() => {
    keepAwake.value = false
    releaseWakeLock()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return { setKeepAwake, supported }
}
