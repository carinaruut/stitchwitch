import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue(), VueI18nPlugin({ include: resolve(import.meta.dirname, './src/locales/**') })],
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
})
