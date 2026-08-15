<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import estoniaFlag from 'flag-icons/flags/4x3/ee.svg'
import unitedKingdomFlag from 'flag-icons/flags/4x3/gb.svg'
import type { AppLocale } from '../i18n'

const { locale, t } = useI18n({ useScope: 'global' })
const root = ref<HTMLElement | null>(null)
const menu = ref<HTMLDetailsElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const locales: Array<{ value: AppLocale; name: string; flag: string }> = [
  { value: 'en', name: 'English', flag: unitedKingdomFlag },
  { value: 'et', name: 'Eesti', flag: estoniaFlag },
]
const currentLocale = computed(() => locales.find((item) => item.value === locale.value) ?? locales[0])

function closeMenu(focusTrigger = false) {
  menu.value?.removeAttribute('open')
  if (focusTrigger) trigger.value?.focus()
}

function changeLocale(nextLocale: AppLocale) {
  locale.value = nextLocale
  closeMenu(true)
}

function closeFromOutside(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) closeMenu()
}

onMounted(() => document.addEventListener('click', closeFromOutside))
onBeforeUnmount(() => document.removeEventListener('click', closeFromOutside))
</script>

<template>
  <div ref="root">
    <details ref="menu" class="dropdown dropdown-end" @keydown.esc.stop.prevent="closeMenu(true)">
      <summary
        ref="trigger"
        class="btn btn-ghost btn-square btn-sm list-none [&::-webkit-details-marker]:hidden"
        :aria-label="t('language.current', { language: currentLocale.name })"
      >
        <img class="h-4 w-6 rounded-[2px] object-cover shadow-sm" :src="currentLocale.flag" alt="" />
      </summary>
      <ul class="menu dropdown-content z-50 mt-2 w-40 rounded-box border border-base-300 bg-base-100 p-1 shadow-lg" :aria-label="t('language.label')">
        <li v-for="item in locales" :key="item.value">
          <button
            type="button"
            :class="{ 'menu-active': locale === item.value }"
            :aria-pressed="locale === item.value"
            @click="changeLocale(item.value)"
          >
            <img class="h-4 w-6 rounded-[2px] object-cover shadow-sm" :src="item.flag" alt="" />
            <span>{{ item.name }}</span>
          </button>
        </li>
      </ul>
    </details>
  </div>
</template>
