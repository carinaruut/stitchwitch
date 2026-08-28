<script setup lang="ts">
import { computed } from 'vue'
import type { TrackerController } from '../composables/useTracker'
import type { TrackerDailyGoal } from '../../../types/tracker'
import { calculateTrackerAnalytics } from '../domain/trackerAnalytics'
import TrackerDailyGoalCard from './sessions/TrackerDailyGoalCard.vue'
import TrackerEstimateCard from './sessions/TrackerEstimateCard.vue'
import TrackerSessionArchives from './sessions/TrackerSessionArchives.vue'
import TrackerSessionList from './sessions/TrackerSessionList.vue'
import TrackerSessionSummary from './sessions/TrackerSessionSummary.vue'

const props = defineProps<{ now: number; state: TrackerController }>()
const activeTracker = computed(() => props.state.tracker.value!)
const sessions = computed(() => [...activeTracker.value.sessions].reverse())
const archives = computed(() => [...activeTracker.value.sessionArchives].reverse())
const latestArchiveId = computed(() => activeTracker.value.sessionArchives.at(-1)?.id ?? null)
const analytics = computed(() => calculateTrackerAnalytics({
  now: props.now,
  sessions: activeTracker.value.sessions,
  sessionArchives: activeTracker.value.sessionArchives,
  timer: activeTracker.value.timer,
  completedCells: activeTracker.value.progress.completedCells,
  dailyGoal: activeTracker.value.dailyGoal,
  totalCount: props.state.totalCount.value,
  completedCount: props.state.completedCount.value,
}))

function saveGoal(goal: TrackerDailyGoal) {
  props.state.setDailyGoal(goal)
}

function removeGoal() {
  props.state.setDailyGoal(null)
}

function restoreArchivedSession(archiveId: string, sessionId: string) {
  props.state.restoreArchivedSession(archiveId, sessionId)
}

function removeSession(sessionId: string) {
  props.state.removeSession(sessionId)
}

function restoreLatestArchive() {
  props.state.restoreLastSessionArchive()
}

function removeArchive(archiveId: string) {
  props.state.removeSessionArchive(archiveId)
}
</script>

<template>
  <div class="space-y-5">
    <TrackerDailyGoalCard
      :goal="activeTracker.dailyGoal"
      :today-duration="analytics.todayDuration"
      :today-stitches="analytics.todayStitches"
      :goal-progress="analytics.goalProgress"
      :goal-target-value="analytics.goalTargetValue"
      :goal-percentage="analytics.goalPercentage"
      @save="saveGoal"
      @remove="removeGoal"
    />
    <TrackerEstimateCard
      :goal="activeTracker.dailyGoal"
      :remaining-stitches="analytics.remainingStitches"
      :estimated-work-remaining="analytics.estimatedWorkRemaining"
      :estimated-completion="analytics.estimatedCompletion"
      :estimated-goal-days="analytics.estimatedGoalDays"
      :estimated-active-days="analytics.estimatedActiveDays"
    />
    <TrackerSessionSummary
      :total-duration="analytics.totalDuration"
      :total-sessions="analytics.totalSessions"
      :total-stitches="analytics.totalStitches"
      :started-at="activeTracker.timer.startedAt"
      :current-duration="analytics.currentDuration"
      :current-progress="analytics.currentProgress"
      :legacy-duration="analytics.legacyDuration"
    />
    <TrackerSessionList
      :sessions="sessions"
      @remove="removeSession"
    />
    <TrackerSessionArchives
      :archives="archives"
      :latest-archive-id="latestArchiveId"
      @restore-latest="restoreLatestArchive"
      @remove="removeArchive"
      @restore-session="restoreArchivedSession"
    />
  </div>
</template>
