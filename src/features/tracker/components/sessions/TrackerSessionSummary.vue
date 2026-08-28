<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatSignedTrackerNumber, formatTrackerDuration } from '../../domain/trackerFormatters'

defineProps<{
  totalDuration: number
  totalSessions: number
  totalStitches: number
  startedAt: string | null
  currentDuration: number
  currentProgress: { completed: number; reopened: number; net: number }
  legacyDuration: number
}>()
const { d, n, t } = useI18n({ useScope: 'global' })
const formatSigned = (value: number) => formatSignedTrackerNumber(value, (number) => n(number, 'integer'))
</script>

<template>
  <dl class="grid gap-3 sm:grid-cols-3">
    <div class="app-inset-panel">
      <dt class="text-xs font-semibold uppercase tracking-wide text-base-content/55">
        {{ t('tracker.sessions.totalTime') }}
      </dt>
      <dd class="mt-1 font-mono text-xl font-bold tabular-nums">
        {{ formatTrackerDuration(totalDuration) }}
      </dd>
    </div>
    <div class="app-inset-panel">
      <dt class="text-xs font-semibold uppercase tracking-wide text-base-content/55">
        {{ t('tracker.sessions.totalSessions') }}
      </dt>
      <dd class="mt-1 text-xl font-bold tabular-nums">
        {{ n(totalSessions, 'integer') }}
      </dd>
    </div>
    <div class="app-inset-panel">
      <dt class="text-xs font-semibold uppercase tracking-wide text-base-content/55">
        {{ t('tracker.sessions.totalStitches') }}
      </dt>
      <dd class="mt-1 text-xl font-bold tabular-nums">
        {{ n(totalStitches, 'integer') }}
      </dd>
    </div>
  </dl>

  <div
    v-if="startedAt"
    class="app-settings-panel flex flex-wrap items-center justify-between rounded-box border border-primary/30 bg-primary/10"
  >
    <div>
      <p class="font-semibold text-primary-content">
        {{ t('tracker.sessions.inProgress') }}
      </p>
      <p class="mt-1 text-sm text-base-content/65">
        {{ t('tracker.sessions.started', { date: d(new Date(startedAt), 'short') }) }}
      </p>
    </div>
    <div class="text-right">
      <p class="font-mono font-bold tabular-nums">
        {{ formatTrackerDuration(currentDuration) }}
      </p>
      <p class="text-xs text-base-content/60">
        {{ t('tracker.sessions.sessionProgress', {
          completed: formatSigned(currentProgress.completed),
          reopened: formatSigned(-currentProgress.reopened),
          net: formatSigned(currentProgress.net),
        }) }}
      </p>
    </div>
  </div>

  <div
    v-if="legacyDuration > 0"
    class="alert text-sm"
  >
    <span
      class="mdi mdi-history"
      aria-hidden="true"
    />
    <span>{{ t('tracker.sessions.legacyTime', { duration: formatTrackerDuration(legacyDuration) }) }}</span>
  </div>
</template>
