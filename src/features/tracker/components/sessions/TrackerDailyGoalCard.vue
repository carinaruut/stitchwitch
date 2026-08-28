<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MAX_TRACKER_DAILY_STITCH_GOAL, MAX_TRACKER_DAILY_TIME_GOAL_MINUTES, type TrackerDailyGoal } from '../../../../types/tracker'
import { formatTrackerDuration } from '../../domain/trackerFormatters'

const props = defineProps<{
  goal: TrackerDailyGoal | null
  todayDuration: number
  todayStitches: number
  goalProgress: number
  goalTargetValue: number
  goalPercentage: number
}>()
const emit = defineEmits<{
  save: [goal: TrackerDailyGoal]
  remove: []
}>()
const { n, t } = useI18n({ useScope: 'global' })
const goalType = ref<TrackerDailyGoal['type']>(props.goal?.type ?? 'stitches')
const goalTarget = ref(props.goal?.type === 'time' ? props.goal.targetMinutes : props.goal?.targetStitches ?? 100)
const goalTargetMaximum = computed(() => goalType.value === 'stitches' ? MAX_TRACKER_DAILY_STITCH_GOAL : MAX_TRACKER_DAILY_TIME_GOAL_MINUTES)
const goalTargetValid = computed(() => Number.isSafeInteger(Number(goalTarget.value))
  && Number(goalTarget.value) >= 1
  && Number(goalTarget.value) <= goalTargetMaximum.value)

watch(() => props.goal, (goal) => {
  if (!goal) return
  goalType.value = goal.type
  goalTarget.value = goal.type === 'time' ? goal.targetMinutes : goal.targetStitches
})

function saveGoal() {
  if (!goalTargetValid.value) return
  const target = Number(goalTarget.value)
  emit('save', goalType.value === 'time'
    ? { type: 'time', targetMinutes: target }
    : { type: 'stitches', targetStitches: target })
}
</script>

<template>
  <section class="app-settings-panel rounded-box border border-primary/25 bg-primary/10">
    <div class="flex items-start gap-3">
      <span
        class="mdi mdi-target text-2xl text-primary"
        aria-hidden="true"
      />
      <div class="min-w-0 flex-1">
        <h3 class="font-semibold">
          {{ t('tracker.goals.title') }}
        </h3>
        <p class="mt-1 text-xs text-base-content/60">
          {{ t('tracker.goals.description') }}
        </p>
      </div>
    </div>

    <form
      class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      @submit.prevent="saveGoal"
    >
      <label class="app-field">
        <span class="app-field-label">{{ t('tracker.goals.metric') }}</span>
        <select
          v-model="goalType"
          class="select select-bordered select-sm w-full"
        >
          <option value="stitches">{{ t('tracker.goals.stitches') }}</option>
          <option value="time">{{ t('tracker.goals.time') }}</option>
        </select>
      </label>
      <label class="app-field">
        <span class="app-field-label">{{ t(goalType === 'time' ? 'tracker.goals.minutesPerDay' : 'tracker.goals.stitchesPerDay') }}</span>
        <input
          v-model.number="goalTarget"
          class="input input-bordered input-sm w-full"
          type="number"
          min="1"
          :max="goalTargetMaximum"
          step="1"
          required
        >
      </label>
      <button
        class="btn btn-primary btn-sm"
        type="submit"
        :disabled="!goalTargetValid"
      >
        {{ t(goal ? 'tracker.goals.update' : 'tracker.goals.set') }}
      </button>
    </form>

    <template v-if="goal">
      <div class="flex items-end justify-between gap-3 text-sm">
        <div>
          <p class="font-semibold">
            {{ t('tracker.goals.today') }}
          </p>
          <p class="mt-0.5 text-xs text-base-content/60">
            {{ goal.type === 'time'
              ? t('tracker.goals.timeProgress', { current: formatTrackerDuration(todayDuration), target: formatTrackerDuration(goalTargetValue) })
              : t('tracker.goals.stitchProgress', { current: n(todayStitches, 'integer'), target: n(goalTargetValue, 'integer') }) }}
          </p>
        </div>
        <span class="font-bold tabular-nums">{{ n(goalPercentage, 'percent') }}</span>
      </div>
      <progress
        class="progress progress-primary w-full"
        :value="goalProgress"
        :max="goalTargetValue"
      />
      <div class="app-settings-section flex justify-end border-primary/20">
        <button
          class="btn btn-ghost btn-sm text-error"
          type="button"
          @click="emit('remove')"
        >
          {{ t('tracker.goals.remove') }}
        </button>
      </div>
    </template>
  </section>
</template>
