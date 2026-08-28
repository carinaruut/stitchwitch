<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  elapsedMilliseconds: number
  formattedTime: string
  running: boolean
}>()
const emit = defineEmits<{
  reset: []
  toggle: []
}>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200/70 px-3 py-2">
    <div class="flex items-center gap-2">
      <span
        class="mdi mdi-timer-outline text-xl text-primary"
        aria-hidden="true"
      />
      <time
        class="font-mono text-lg font-semibold tabular-nums"
        :aria-label="t('tracker.timer.elapsed', { time: formattedTime })"
      >{{ formattedTime }}</time>
    </div>
    <div class="flex items-center gap-1">
      <button
        class="btn btn-primary btn-sm"
        type="button"
        :aria-label="t(running ? 'tracker.timer.pause' : 'tracker.timer.start')"
        :title="t(running ? 'tracker.timer.pause' : 'tracker.timer.start')"
        @click="emit('toggle')"
      >
        <span
          class="mdi text-xl"
          :class="running ? 'mdi-pause' : 'mdi-play'"
          aria-hidden="true"
        />
      </button>
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :disabled="elapsedMilliseconds === 0"
        :aria-label="t('tracker.timer.reset')"
        :title="t('tracker.timer.reset')"
        @click="emit('reset')"
      >
        <span
          class="mdi mdi-restart text-xl"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>
