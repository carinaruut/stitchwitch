<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TrackerDailyGoal } from '../../../../types/tracker'
import { MIN_ESTIMATE_STITCHES } from '../../domain/trackerAnalytics'
import { formatTrackerDuration } from '../../domain/trackerFormatters'

defineProps<{
  goal: TrackerDailyGoal | null
  remainingStitches: number
  estimatedWorkRemaining: number | null
  estimatedCompletion: Date | null
  estimatedGoalDays: number | null
  estimatedActiveDays: number | null
}>()
const { d, n, t } = useI18n({ useScope: 'global' })
</script>

<template>
  <section class="rounded-box border border-base-300 bg-base-200/40 p-4">
    <div class="flex items-start gap-3">
      <span
        class="mdi mdi-calendar-clock-outline text-2xl text-secondary"
        aria-hidden="true"
      />
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wide text-base-content/55">
          {{ t('tracker.goals.estimate') }}
        </p>
        <template v-if="estimatedWorkRemaining !== null && estimatedCompletion">
          <p class="mt-1 font-semibold">
            {{ remainingStitches === 0
              ? t('tracker.goals.complete')
              : t('tracker.goals.estimatedCompletion', { date: d(estimatedCompletion, 'short') }) }}
          </p>
          <p
            v-if="remainingStitches > 0"
            class="mt-0.5 text-xs text-base-content/60"
          >
            {{ goal
              ? t('tracker.goals.workRemaining', { duration: formatTrackerDuration(estimatedWorkRemaining), days: n(estimatedGoalDays ?? 0, 'integer') })
              : t('tracker.goals.workRemainingActiveDays', { duration: formatTrackerDuration(estimatedWorkRemaining), days: n(estimatedActiveDays ?? 0, 'integer') }) }}
          </p>
          <p class="mt-1 text-xs text-base-content/50">
            {{ t(goal ? 'tracker.goals.estimateBasis' : 'tracker.goals.activeDayBasis') }}
          </p>
        </template>
        <p
          v-else
          class="mt-1 text-xs text-base-content/60"
        >
          {{ t('tracker.goals.needsSessions', { count: n(MIN_ESTIMATE_STITCHES, 'integer') }) }}
        </p>
      </div>
    </div>
  </section>
</template>
