import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import enControls from './locales/en/controls.yaml'
import enCore from './locales/en/core.yaml'
import enEditor from './locales/en/editor.yaml'
import enErrors from './locales/en/errors.yaml'
import enGuidePrint from './locales/en/guide-print.yaml'
import enTracker from './locales/en/tracker.yaml'
import etControls from './locales/et/controls.yaml'
import etCore from './locales/et/core.yaml'
import etEditor from './locales/et/editor.yaml'
import etErrors from './locales/et/errors.yaml'
import etGuidePrint from './locales/et/guide-print.yaml'
import etTracker from './locales/et/tracker.yaml'

export const supportedLocales = ['en', 'et'] as const
export type AppLocale = typeof supportedLocales[number]

const STORAGE_KEY = 'stitch-locale'

function isLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && supportedLocales.includes(value as AppLocale)
}

function initialLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    // Locale selection still works when browser storage is unavailable.
  }
  if (typeof navigator === 'undefined') return 'en'
  return navigator.languages[0]?.toLowerCase().startsWith('et') ? 'et' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: {
    en: { ...enCore, ...enControls, ...enEditor, ...enGuidePrint, ...enTracker, errors: enErrors },
    et: { ...etCore, ...etControls, ...etEditor, ...etGuidePrint, ...etTracker, errors: etErrors },
  },
  datetimeFormats: {
    en: { short: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } },
    et: { short: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } },
  },
  numberFormats: {
    en: { integer: { maximumFractionDigits: 0 }, percent: { style: 'percent', maximumFractionDigits: 0 } },
    et: { integer: { maximumFractionDigits: 0 }, percent: { style: 'percent', maximumFractionDigits: 0 } },
  },
})

export function translate(key: string, values?: Record<string, unknown>) {
  const composer = i18n.global as unknown as { t: (key: string, values?: Record<string, unknown>) => string }
  return composer.t(key, values)
}

watch(i18n.global.locale, (locale) => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.title = translate('meta.title')
  document.querySelector('meta[name="description"]')?.setAttribute('content', translate('meta.description'))
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Keep the in-memory selection when browser storage is unavailable.
  }
}, { immediate: true })
