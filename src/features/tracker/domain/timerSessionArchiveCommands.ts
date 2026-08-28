import { MAX_TRACKER_SESSION_ARCHIVES, MAX_TRACKER_SESSIONS, type TrackerDailyGoal } from '../../../types/tracker'
import { completeTrackerSession } from '../../../utils/tracker'
import type { TrackerCommandContext } from './trackerCommandContext'

export function createTimerSessionArchiveCommands(context: TrackerCommandContext) {
  const { tracker, completedCount, ensureTracker, changed } = context

  function startTimer() {
    const state = ensureTracker()
    if (state.timer.startedAt) return
    state.timer.startedAt = new Date().toISOString()
    state.timer.sessionStartedCompletedCount = completedCount.value
    state.timer.sessionStartedCompletedCells = [...state.progress.completedCells]
    changed()
  }

  function pauseTimer() {
    if (!tracker.value || !completeTrackerSession(tracker.value, tracker.value.progress.completedCells)) return
    changed()
  }

  function resetTimer() {
    const state = ensureTracker()
    const archivedAt = new Date()
    if (state.timer.startedAt) completeTrackerSession(state, state.progress.completedCells, archivedAt)
    if (state.timer.elapsedMilliseconds > 0 || state.sessions.length > 0) {
      state.sessionArchives.push({
        id: crypto.randomUUID(),
        archivedAt: archivedAt.toISOString(),
        elapsedMilliseconds: state.timer.elapsedMilliseconds,
        sessions: state.sessions.map((session) => ({ ...session })),
      })
      if (state.sessionArchives.length > MAX_TRACKER_SESSION_ARCHIVES) state.sessionArchives.shift()
    }
    state.timer = { elapsedMilliseconds: 0, startedAt: null, sessionStartedCompletedCount: null, sessionStartedCompletedCells: null }
    state.sessions = []
    changed()
  }

  function removeSession(id: string) {
    const state = tracker.value
    const session = state?.sessions.find((item) => item.id === id)
    if (!state || !session) return
    state.sessions = state.sessions.filter((item) => item.id !== id)
    state.timer.elapsedMilliseconds = Math.max(0, state.timer.elapsedMilliseconds - session.durationMilliseconds)
    changed()
  }

  function removeSessionArchive(id: string) {
    const state = tracker.value
    if (!state || !state.sessionArchives.some((archive) => archive.id === id)) return
    state.sessionArchives = state.sessionArchives.filter((archive) => archive.id !== id)
    changed()
  }

  function restoreLastSessionArchive() {
    const state = tracker.value
    const archive = state?.sessionArchives.at(-1)
    if (!state || !archive) return
    const sessions = new Map([...archive.sessions, ...state.sessions].map((session) => [session.id, session]))
    state.sessions = [...sessions.values()]
      .sort((first, second) => Date.parse(first.startedAt) - Date.parse(second.startedAt))
      .slice(-MAX_TRACKER_SESSIONS)
      .map((session) => ({ ...session }))
    state.timer.elapsedMilliseconds = Math.min(Number.MAX_SAFE_INTEGER, state.timer.elapsedMilliseconds + archive.elapsedMilliseconds)
    state.sessionArchives = state.sessionArchives.slice(0, -1)
    changed()
  }

  function restoreArchivedSession(archiveId: string, sessionId: string) {
    const state = tracker.value
    const archive = state?.sessionArchives.find((item) => item.id === archiveId)
    const session = archive?.sessions.find((item) => item.id === sessionId)
    if (!state || !archive || !session) return
    if (!state.sessions.some((item) => item.id === session.id)) {
      state.sessions = [...state.sessions, { ...session }]
        .sort((first, second) => Date.parse(first.startedAt) - Date.parse(second.startedAt))
        .slice(-MAX_TRACKER_SESSIONS)
      state.timer.elapsedMilliseconds = Math.min(Number.MAX_SAFE_INTEGER, state.timer.elapsedMilliseconds + session.durationMilliseconds)
    }
    archive.sessions = archive.sessions.filter((item) => item.id !== sessionId)
    archive.elapsedMilliseconds = Math.max(0, archive.elapsedMilliseconds - session.durationMilliseconds)
    if (archive.sessions.length === 0 && archive.elapsedMilliseconds === 0) {
      state.sessionArchives = state.sessionArchives.filter((item) => item.id !== archiveId)
    }
    changed()
  }

  function setDailyGoal(goal: TrackerDailyGoal | null) {
    const state = ensureTracker()
    state.dailyGoal = goal ? { ...goal } : null
    changed()
  }

  return { startTimer, pauseTimer, resetTimer, removeSession, removeSessionArchive, restoreLastSessionArchive, restoreArchivedSession, setDailyGoal }
}
