<script setup lang="ts">
import type { Theme } from '../composables/useTheme'

defineProps<{ theme: Theme }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button class="btn btn-ghost btn-sm" type="button" :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`" @click="$emit('toggle')">
    <span aria-hidden="true">{{ theme === 'light' ? 'Moon' : 'Sun' }}</span>
  </button>
</template>
