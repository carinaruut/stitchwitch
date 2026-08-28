import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const saved = localStorage.getItem('stitch-theme')
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = ref<Theme>(saved === 'dark' || saved === 'light' ? saved : systemDark ? 'dark' : 'light')

  watch(
    theme,
    (value) => {
      document.documentElement.dataset.theme = value
      localStorage.setItem('stitch-theme', value)
    },
    { immediate: true },
  )

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  return { theme, toggleTheme }
}
