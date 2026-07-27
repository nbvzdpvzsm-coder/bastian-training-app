// Regelbasierte "Coach"-Logik. Kein Ferntraining/KI-Aufruf — alles nachvollziehbare, lokale Regeln,
// damit jede Anpassung im Änderungsverlauf mit einem verständlichen Grund auftaucht.
import { getExerciseHistory, getExerciseTarget, setExerciseTarget, addChangeLogEntry, getBodyMetrics } from "./store.js";

function primaryMovement(exercise) {
  return exercise.movements[0];
}

function setsSummary(sets, movement) {
  const valid = (sets || []).filter((s) => s && (s.reps || s.reps === 0));
  if (valid.length === 0) return null;
  const reps = valid.map((s) => Number(s.reps));
  const avgReps = reps.reduce((a, b) => a + b, 0) / reps.length;
  const minRepsAchieved = Math.min(...reps);
  const lastWeight = valid[valid.length - 1]?.weight ?? null;

  let allAtOrAboveTarget = false;
  let allBelowTarget = false;
  if (movement.repType === "range") {
    allAtOrAboveTarget = reps.every((r) => r >= movement.repMax);
    allBelowTarget = reps.every((r) => r < movement.repMin);
  } else if (movement.repType === "perSide" || movement.repType === "fixed") {
    const target = movement.repFixed;
    allAtOrAboveTarget = reps.every((r) => r >= target);
    allBelowTarget = reps.every((r) => r < target);
  }
  return { avgReps, minRepsAchieved, lastWeight, allAtOrAboveTarget, allBelowTarget, count: valid.length };
}

function roundToStep(value, step = 1.25) {
  return Math.round(value / step) * step;
}

/**
 * Berechnet den Vorschlag für das NÄCHSTE Training dieser Übung, nachdem ein Log gespeichert wurde.
 * Schreibt bei tatsächlicher Änderung einen changeLog-Eintrag inkl. Begründung.
 */
export function updateTargetAfterSession(exercise, dayId, loggedMovements) {
  const strategy = exercise.progression?.strategy || "tempo-focus";
  const movement = primaryMovement(exercise);
  const loggedSets = loggedMovements?.[0]?.sets || [];
  const summary = setsSummary(loggedSets, movement);
  const prevTarget = getExerciseTarget(exercise.id);
  const currentWeight = summary?.lastWeight ?? prevTarget?.weightKg ?? null;

  if (!summary) return; // nichts geloggt für diese Übung, kein Update

  let nextWeight = currentWeight;
  let reasonNote = null;
  let kind = "progression";

  if (strategy === "range-weight" || strategy === "reps-then-weight" || strategy === "bodyweight-add-weight-at-threshold") {
    const thresholdHit =
      strategy === "bodyweight-add-weight-at-threshold"
        ? summary.minRepsAchieved >= (exercise.progression.thresholdReps ?? movement.repMax ?? 999)
        : summary.allAtOrAboveTarget;

    if (thresholdHit && currentWeight != null) {
      const inc = exercise.progression.addKg ?? exercise.progression.incrementKg ?? 2.5;
      nextWeight = roundToStep(currentWeight + inc, exercise.loadType === "kettlebell" ? 4 : 1.25);
      reasonNote = `Alle Sätze am oberen Wdh.-Ziel erreicht → Gewicht um ${inc} kg erhöht.`;
    } else if (summary.allBelowTarget && prevTarget?.weightKg != null && currentWeight != null) {
      // zwei Sessions in Folge deutlich unter Zielbereich -> leichte Reduktion vorschlagen
      const priorHistory = getExerciseHistory(exercise.id, 2);
      const wasAlsoBelowLastTime = priorHistory.length >= 2;
      if (wasAlsoBelowLastTime) {
        nextWeight = roundToStep(currentWeight * 0.92, 1.25);
        reasonNote = "Wiederholungsziel zweimal in Folge klar verfehlt → Gewicht leicht reduziert, um die Range wieder zu treffen.";
        kind = "deload";
      } else {
        reasonNote = "Wdh.-Ziel knapp verfehlt → Gewicht gleich gelassen, nächstes Mal erneut versuchen.";
      }
    } else {
      reasonNote = null; // im Zielbereich, aber noch nicht am oberen Ende -> Gewicht halten, keine Meldung nötig
    }
  } else if (strategy === "tempo-focus") {
    nextWeight = currentWeight;
  }

  const weightChanged = nextWeight != null && prevTarget?.weightKg != null && nextWeight !== prevTarget.weightKg;
  const firstTimeSet = nextWeight != null && prevTarget?.weightKg == null;

  setExerciseTarget(exercise.id, {
    weightKg: nextWeight,
    repMin: movement.repMin ?? null,
    repMax: movement.repMax ?? null,
  });

  if (reasonNote && (weightChanged || firstTimeSet)) {
    addChangeLogEntry({
      scope: "exercise",
      exerciseId: exercise.id,
      dayId,
      title: `${exercise.name}: ${prevTarget?.weightKg ?? "–"} kg → ${nextWeight} kg`,
      reason: reasonNote,
      kind,
    });
  }
}

/**
 * Erkennt Stagnation bei Hauptübungen (role: 'main'): letzte 3 Einträge ohne Gewichtssteigerung
 * und ohne verbesserten Wdh.-Schnitt. Gibt eine Empfehlung zurück (Deload), ohne den Plan automatisch zu ändern.
 */
export function detectStagnation(exercise) {
  if (exercise.progression?.role !== "main") return null;
  const history = getExerciseHistory(exercise.id, 3);
  if (history.length < 3) return null;

  const movement = primaryMovement(exercise);
  const weights = history.map((h) => {
    const sets = h.movements?.[0]?.sets || [];
    const s = setsSummary(sets, movement);
    return s?.lastWeight ?? null;
  });
  const avgRepsSeries = history.map((h) => {
    const sets = h.movements?.[0]?.sets || [];
    const s = setsSummary(sets, movement);
    return s?.avgReps ?? null;
  });

  if (weights.some((w) => w == null)) return null;
  const weightFlat = new Set(weights).size === 1;
  const repsNotImproving = avgRepsSeries[0] <= avgRepsSeries[avgRepsSeries.length - 1] + 0.25;

  if (weightFlat && repsNotImproving) {
    return {
      exerciseId: exercise.id,
      message: `${exercise.name} stagniert seit 3 Einheiten bei ${weights[0]} kg. Ein Deload (–10 % für 1 Training) oder eine Übungsvariante könnte helfen.`,
    };
  }
  return null;
}

/**
 * Einfache, transparente Interpretation der Körpermaß-Trends (letzte 2 Einträge = ca. 4 Wochen bei 2-Wochen-Rhythmus).
 */
export function bodyCompositionInsight() {
  const metrics = getBodyMetrics();
  if (metrics.length < 2) return null;
  const last = metrics[metrics.length - 1];
  const prev = metrics[metrics.length - 2];
  if (last.weightKg == null || prev.weightKg == null || last.waistCm == null || prev.waistCm == null) return null;

  const weightDeltaPct = ((last.weightKg - prev.weightKg) / prev.weightKg) * 100;
  const waistDelta = last.waistCm - prev.waistCm;

  if (weightDeltaPct > 1.5 && waistDelta > 1) {
    return {
      level: "warn",
      message:
        "Gewicht und Bauchumfang steigen beide spürbar. Kalorienüberschuss evtl. zu hoch — Ernährung prüfen oder eine zusätzliche Metabolic-Runde (Tag 3) einbauen.",
    };
  }
  if (weightDeltaPct < -1.5 && waistDelta >= -0.3) {
    return {
      level: "warn",
      message:
        "Gewicht sinkt deutlich, Bauchumfang kaum. Risiko von Muskelverlust — Proteinzufuhr und Kalorien gegenchecken, ggf. Volumen nicht weiter erhöhen.",
    };
  }
  if (last.weightKg >= prev.weightKg && waistDelta <= 0) {
    return { level: "good", message: "Gewicht stabil/steigend bei gleichem oder kleinerem Bauchumfang — sieht nach sauberem Muskelaufbau aus." };
  }
  if (last.weightKg <= prev.weightKg && waistDelta < 0) {
    return { level: "good", message: "Gewicht und Bauchumfang sinken gemeinsam — gute Fortschritte Richtung Definition." };
  }
  return null;
}
