<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Theme } from '../composables/useTheme'

defineProps<{ theme: Theme }>()
defineEmits<{ toggle: [] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <button class="btn btn-ghost btn-sm" type="button" :aria-label="t(theme === 'light' ? 'editor.theme.switchToDark' : 'editor.theme.switchToLight')" @click="$emit('toggle')">
    <span class="mdi text-lg" :class="theme === 'light' ? 'mdi-weather-night' : 'mdi-white-balance-sunny'" aria-hidden="true"></span>
  </button>
</template>
