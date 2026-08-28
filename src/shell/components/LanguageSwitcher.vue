<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import estoniaFlag from 'flag-icons/flags/4x3/ee.svg'
import unitedKingdomFlag from 'flag-icons/flags/4x3/gb.svg'
import type { AppLocale } from '../../i18n'
import AppDropdown from '../../shared/ui/AppDropdown.vue'

const { locale, t } = useI18n({ useScope: 'global' })
const locales: Array<{ value: AppLocale; name: string; flag: string }> = [
  { value: 'en', name: 'English', flag: unitedKingdomFlag },
  { value: 'et', name: 'Eesti', flag: estoniaFlag },
]
const currentLocale = computed(() => locales.find((item) => item.value === locale.value) ?? locales[0])

function changeLocale(nextLocale: AppLocale, close: (focusAnchor?: boolean) => void) {
  locale.value = nextLocale
  close(true)
}
</script>

<template>
  <AppDropdown
    :label="t('language.label')"
    align="right"
    panel-role="menu"
  >
    <template #trigger="{ open, panelId }">
      <button
        class="btn btn-ghost btn-square btn-sm"
        type="button"
        :aria-label="t('language.current', { language: currentLocale.name })"
        aria-haspopup="menu"
        :aria-controls="panelId"
        :aria-expanded="open"
      >
        <img
          class="h-4 w-6 rounded-[2px] object-cover shadow-sm"
          :src="currentLocale.flag"
          alt=""
        >
      </button>
    </template>
    <template #default="{ close }">
      <ul
        class="menu w-40 p-1"
        :aria-label="t('language.label')"
      >
        <li
          v-for="item in locales"
          :key="item.value"
        >
          <button
            type="button"
            :class="{ 'menu-active': locale === item.value }"
            :aria-pressed="locale === item.value"
            @click="changeLocale(item.value, close)"
          >
            <img
              class="h-4 w-6 rounded-[2px] object-cover shadow-sm"
              :src="item.flag"
              alt=""
            >
            <span>{{ item.name }}</span>
          </button>
        </li>
      </ul>
    </template>
  </AppDropdown>
</template>
