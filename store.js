// Persistenz-Layer: alles liegt lokal auf dem Gerät (localStorage). Kein Server, kein Sync.
const STORAGE_KEY = "fitnessApp_state_v1";

function emptyState() {
  return {
    sessionLogs: [], // { id, dateISO, dayId, entries: { [exerciseId]: { movements: [{ sets: [{weight, reps}] }], rpe, note } } }
    bodyMetrics: [], // { id, dateISO, weightKg, waistCm, note }
    exerciseTargets: {}, // { [exerciseId]: { weightKg, repMinOverride, repMaxOverride, updatedAt } } — aktueller Vorschlag/Zielwert
    changeLog: [], // { id, dateISO, scope: 'exercise'|'plan', exerciseId?, dayId?, title, reason, kind: 'progression'|'deload'|'swap'|'note' }
    settings: { tvMode: false, unit: "kg" },
    planId: null,
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return { ...emptyState(), ...parsed };
  } catch (e) {
    console.error("Konnte gespeicherte Daten nicht laden, starte leer.", e);
    return emptyState();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Session Logs ----
export function saveSessionLog({ dayId, entries, note }) {
  const log = {
    id: uid(),
    dateISO: new Date().toISOString(),
    dayId,
    entries,
    note: note || "",
  };
  state.sessionLogs.push(log);
  persist();
  notify();
  return log;
}

export function getLastSessionsForDay(dayId, count = 5) {
  return state.sessionLogs
    .filter((s) => s.dayId === dayId)
    .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))
    .slice(0, count);
}

export function getLastSessionForExercise(exerciseId, excludeSessionId = null) {
  const sessions = state.sessionLogs
    .filter((s) => s.entries && s.entries[exerciseId] && s.id !== excludeSessionId)
    .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  return sessions[0] || null;
}

export function getExerciseHistory(exerciseId, count = 10) {
  return state.sessionLogs
    .filter((s) => s.entries && s.entries[exerciseId])
    .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))
    .slice(0, count)
    .map((s) => ({ dateISO: s.dateISO, ...s.entries[exerciseId] }));
}

// ---- Body Metrics ----
export function saveBodyMetric({ weightKg, waistCm, note, dateISO }) {
  const entry = { id: uid(), dateISO: dateISO || new Date().toISOString(), weightKg, waistCm, note: note || "" };
  state.bodyMetrics.push(entry);
  state.bodyMetrics.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  persist();
  notify();
  return entry;
}

export function deleteBodyMetric(id) {
  state.bodyMetrics = state.bodyMetrics.filter((m) => m.id !== id);
  persist();
  notify();
}

export function getBodyMetrics() {
  return [...state.bodyMetrics].sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
}

// ---- Exercise Targets (aktuelle Empfehlung fürs nächste Training) ----
export function getExerciseTarget(exerciseId) {
  return state.exerciseTargets[exerciseId] || null;
}

export function setExerciseTarget(exerciseId, target) {
  state.exerciseTargets[exerciseId] = { ...target, updatedAt: new Date().toISOString() };
  persist();
  notify();
}

// ---- Plan-Version ----
// Wird beim App-Start aufgerufen. Wenn sich die Plan-ID geändert hat (neuer Zyklus), übernimmt sie die im
// Plan hinterlegten Startgewichte als aktuelle Zielwerte, damit die Trainingsansicht sofort sinnvolle Werte
// zeigt, auch bevor der erste Satz des neuen Zyklus geloggt wurde. Bereits vorhandene Historie bleibt erhalten.
export function adoptPlanIfNeeded(plan) {
  if (state.planId === plan.id) return false;

  const isFirstEverLoad = state.planId === null && state.sessionLogs.length === 0 && Object.keys(state.exerciseTargets).length === 0;

  plan.days.forEach((day) => {
    day.exercises.forEach((ex) => {
      if (ex.seedWeightKg == null) return;
      const movement = ex.movements[0];
      state.exerciseTargets[ex.id] = {
        weightKg: ex.seedWeightKg,
        repMin: movement.repMin ?? null,
        repMax: movement.repMax ?? null,
        updatedAt: new Date().toISOString(),
      };
    });
  });

  if (!isFirstEverLoad) {
    addChangeLogEntry({
      scope: "plan",
      title: `Neuer Trainingsplan übernommen: ${plan.cycleLabel || plan.name}`,
      reason: "Zielgewichte wurden mit den im Plan hinterlegten Startwerten aktualisiert.",
      kind: "note",
    });
    if (plan.id === "home-gym-v2") {
      addChangeLogEntry({
        scope: "exercise",
        dayId: "tag4-beine",
        exerciseId: "beine-hip-thrust",
        title: "Beine: Hip Thrust ersetzt KB Swing Single-Hand",
        reason: "Wegen Belastung der Bizepssehne — Hip Thrust ist die sicherere Alternative fürs Gesäß-Training.",
        kind: "swap",
      });
    }
  }

  state.planId = plan.id;
  persist();
  notify();
  return true;
}

// ---- Change Log (Plan-Anpassungen mit Begründung) ----
export function addChangeLogEntry({ scope, exerciseId, dayId, title, reason, kind }) {
  const entry = { id: uid(), dateISO: new Date().toISOString(), scope, exerciseId, dayId, title, reason, kind };
  state.changeLog.push(entry);
  persist();
  notify();
  return entry;
}

export function getRecentChanges(count = 8) {
  return [...state.changeLog].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO)).slice(0, count);
}

// ---- Settings ----
export function getSettings() {
  return state.settings;
}
export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  persist();
  notify();
}

// ---- Export / Import (Backup, da nur lokal gespeichert) ----
export function exportData() {
  return JSON.stringify(state, null, 2);
}
export function importData(json) {
  const parsed = JSON.parse(json);
  state = { ...emptyState(), ...parsed };
  persist();
  notify();
}
