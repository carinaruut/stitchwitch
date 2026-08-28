import { ref } from 'vue'

export type NotificationKind = 'success' | 'error' | 'info' | 'warning'
export interface Notification {
  id: number
  kind: NotificationKind
  message: string
}

export function useNotifications() {
  const notifications = ref<Notification[]>([])
  let nextId = 1

  function notify(message: string, kind: NotificationKind = 'info', duration = 3500) {
    const id = nextId++
    notifications.value.push({ id, kind, message })
    window.setTimeout(() => dismiss(id), duration)
  }

  function dismiss(id: number) {
    notifications.value = notifications.value.filter((item) => item.id !== id)
  }

  return { notifications, notify, dismiss }
}
