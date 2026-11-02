// Basis-Trainingsplan (Home Gym) — Ausgangszustand für den jeweiligen Plan.
// Wird zur Laufzeit durch geloggte Trainings automatisch fortgeschrieben (siehe progression.js -> exerciseTargets in store.js).
// repType: "range" (Wdh.-Spanne) | "fixed" (feste Wdh./Zahl) | "perSide" (Wdh. pro Seite) | "max" (bis Versagen) | "time" (Sekunden) | "special21"
// loadType steuert die Eingabefelder in der Trainingsansicht:
//   barbell/dumbbell/kettlebell/cable -> Gewicht + Wdh. je Satz
//   bodyweight -> nur Wdh. (z. B. Bänder, Core)
//   bodyweight_loaded -> Zusatzgewicht + Wdh. (Klimmzüge)
// seedWeightKg: Startgewicht laut Plan — wird beim ersten Laden dieser Plan-Version als Zielvorschlag übernommen (store.js -> adoptPlanIfNeeded).
// movement.seedWeightKg: Startgewicht für weitere Bewegungen einer Karte mit mehreren Bewegungen (die erste nutzt seedWeightKg der Übung).
// progression.role "main" = Übung mit explizitem Wochenziel im Plan (Dashboard-Trend + Stagnations-Check).
// Einträge mit type: "interval" | "circuit" | "finisher" | "endurance" sind Spezialblöcke (Timer + Ergebnis-Eingabe) und werden nicht progressiert.
// Übungs-IDs bleiben über Pläne hinweg stabil, wenn es dieselbe Übung ist — so bleibt die Historie (Vorwochenwerte) erhalten.

export const PLAN_ID = "home-gym-v5-ganzkoerper";

export const PLAN = {
  id: PLAN_ID,
  name: "Ganzkörper-Plan",
  cycle: 4,
  cycleLabel: "Ganzkörper-Plan",
  startDate: "2026-11-02",
  overview: {
    strategy: "Neuer Plan ab 02.11.2026: Ganzkörper A/B, Ausdauer + Core und Oberkörper + Arme.",
    schedule: ["Mo Ganzkörper A · Di Ausdauer + Core", "Do Ganzkörper B · Fr Oberkörper + Arme", "Mittwoch: Ruhetag"],
  },
  changeNotes: [
    {
      scope: "plan",
      title: "Neuer Plan: Ganzkörper A/B + Ausdauer/Core + Oberkörper (ab 02.11.2026)",
      reason: "Weniger Supersätze bei schweren Lifts, Zone-2-Ausdauer statt HIIT. Bisherige Gewichte bleiben als Vorbelegung erhalten.",
      kind: "note",
    },
  ],
  days: [
    {
      id: "gk-a",
      dayNumber: 1,
      label: "Tag 1 · Mo",
      short: "Mo",
      title: "Ganzkörper A",
      subtitle: "Kraftfokus • Brust • Rücken • Arme",
      durationLabel: "60 MIN",
      accent: "orange",
      warmup: {
        minutes: "8",
        items: [
          "3 Min Echo Bike locker",
          "10 Kniebeugen ohne Gewicht • 10 Hüftbeugen",
          "12 Band Pull-Aparts • 8 Scapula Push-ups",
          "2 progressive Aufwärmsätze Kniebeuge",
        ],
      },
      exercises: [
        {
          id: "beine-kniebeuge",
          badge: "1",
          badgeColor: "orange",
          name: "Kniebeuge (LH)",
          cue: "Grundübung",
          footerNote: "2–3 RIR zum Einstieg",
          loadType: "barbell",
          pauseLabel: "150 s",
          pauseSeconds: 150,
          movements: [{ sets: 3, repType: "range", repMin: 4, repMax: 6 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "main" },
        },
        {
          id: "push-bankdruecken",
          badge: "2",
          badgeColor: "orange",
          name: "Bankdrücken (LH)",
          cue: "Grundübung",
          footerNote: "2–3 RIR zum Einstieg",
          loadType: "barbell",
          pauseLabel: "120 s",
          pauseSeconds: 120,
          movements: [{ sets: 3, repType: "range", repMin: 4, repMax: 6 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "main" },
        },
        {
          id: "pull-klimmzuege",
          badge: "3",
          badgeColor: "purple",
          name: "Klimmzüge",
          cue: "Grundübung",
          footerNote: "2–3 RIR zum Einstieg",
          loadType: "bodyweight_loaded",
          pauseLabel: "120 s",
          pauseSeconds: 120,
          movements: [{ sets: 3, repType: "range", repMin: 6, repMax: 8 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "main" },
        },
        {
          id: "beine-rdl",
          badge: "4",
          badgeColor: "purple",
          name: "Rumänisches Kreuzheben",
          cue: "Grundübung",
          footerNote: "2–3 RIR zum Einstieg",
          loadType: "barbell",
          pauseLabel: "120 s",
          pauseSeconds: 120,
          movements: [{ sets: 2, repType: "range", repMin: 6, repMax: 8 }],
          progression: { strategy: "tempo-focus", role: "assist" },
        },
        {
          id: "pull-ez-curl",
          badge: "5a",
          badgeColor: "green",
          name: "SZ-Bizepscurls",
          cue: "Superset — direkt zu 5.b",
          loadType: "barbell",
          pauseLabel: "→ 5b",
          chainNext: "arme-kabel-pushdown",
          movements: [{ sets: 3, repType: "range", repMin: 8, repMax: 12 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "arme-kabel-pushdown",
          badge: "5b",
          badgeColor: "green",
          name: "Trizepsdrücken Kabel",
          cue: "Superset — 75 s nach 5.b",
          loadType: "cable",
          pauseLabel: "75 s",
          pauseSeconds: 75,
          movements: [{ sets: 3, repType: "range", repMin: 10, repMax: 12 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
      ],
      cooldown: { minutes: "5", items: ["2 Min locker gehen • 3 Min Hüfte/Brustwirbelsäule mobilisieren"] },
      notesTitle: "HINWEIS",
      progressionNotes: ["Grundübungen: 2–3 RIR zum Einstieg.", "Keine Supersätze bei schweren Lifts."],
    },

    {
      id: "ausdauer-core",
      dayNumber: 2,
      label: "Tag 2 · Di",
      short: "Di",
      title: "Ausdauer + Core",
      subtitle: "Zone 2 • Rumpfstabilität • Mobility",
      durationLabel: "57 MIN",
      accent: "orange",
      warmup: { minutes: "5", items: ["5 Min Echo Bike / Rudergerät, langsam steigern"] },
      exercises: [
        {
          type: "endurance",
          id: "ausdauer-zone2",
          badge: "1",
          badgeColor: "orange",
          label: "Zone 2: Echo Bike, Rudern oder lockeres Laufen",
          cue: "35 Min durchgehend; Sprechtest: ganze Sätze möglich",
          footerNote: "Orientierung 115–135 bpm, individuell anpassen",
          minutes: 35,
          targetLabel: "115–135 bpm",
        },
        {
          id: "pull-hanging-raise",
          badge: "2a",
          badgeColor: "purple",
          name: "Hanging Knee Raises",
          cue: "Core-Superset — direkt zu 2.b",
          loadType: "bodyweight",
          pauseLabel: "→ 2b",
          chainNext: "core-pallof-press",
          movements: [{ sets: 3, repType: "range", repMin: 10, repMax: 15 }],
          progression: { strategy: "reps-then-weight", role: "assist" },
        },
        {
          id: "core-pallof-press",
          badge: "2b",
          badgeColor: "purple",
          name: "Pallof Press",
          cue: "Core-Superset — 45 s nach 2.b",
          loadType: "cable",
          pauseLabel: "45 s",
          pauseSeconds: 45,
          movements: [{ sets: 3, repType: "perSide", repFixed: 10 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "core-side-plank",
          badge: "3",
          badgeColor: "green",
          name: "Side Plank",
          cue: "je Seite",
          loadType: "bodyweight",
          pauseLabel: "–",
          pauseSeconds: 0,
          movements: [{ sets: 2, repType: "time", repMin: 30, repMax: 40 }],
          progression: { strategy: "tempo-focus", role: "assist" },
        },
      ],
      cooldown: { minutes: "5", items: ["Locker bewegen • Hüftbeuger, Waden, Brustwirbelsäule"] },
      notesTitle: "HINWEIS",
      progressionNotes: ["Keine HIIT-Intervalle.", "Bauchtraining stärkt den Rumpf, verbrennt kein lokales Bauchfett."],
    },

    {
      id: "gk-b",
      dayNumber: 4,
      label: "Tag 4 · Do",
      short: "Do",
      title: "Ganzkörper B",
      subtitle: "Beine • Rücken • Brust • Schultern",
      durationLabel: "60 MIN",
      accent: "orange",
      warmup: {
        minutes: "8",
        items: [
          "3 Min Rudern locker",
          "10 Glute Bridges • 8 Ausfallschritte je Seite",
          "12 Band Pull-Aparts",
          "2 progressive Aufwärmsätze Split Squat",
        ],
      },
      exercises: [
        {
          id: "beine-bulgarian-split-squat",
          badge: "1",
          badgeColor: "orange",
          name: "Bulgarian Split Squats",
          cue: "pro Bein",
          loadType: "dumbbell",
          pauseLabel: "90 s",
          pauseSeconds: 90,
          movements: [{ sets: 3, repType: "range", repMin: 6, repMax: 8 }],
          progression: { strategy: "range-weight", incrementKg: 2, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "pull-langhantelrudern",
          badge: "2",
          badgeColor: "orange",
          name: "Langhantelrudern",
          cue: "",
          loadType: "barbell",
          pauseLabel: "120 s",
          pauseSeconds: 120,
          movements: [{ sets: 3, repType: "range", repMin: 6, repMax: 8 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "push-schraegbank-kh",
          badge: "3",
          badgeColor: "purple",
          name: "Schrägbankdrücken (KH)",
          cue: "",
          loadType: "dumbbell",
          pauseLabel: "90 s",
          pauseSeconds: 90,
          movements: [{ sets: 3, repType: "range", repMin: 8, repMax: 10 }],
          progression: { strategy: "range-weight", incrementKg: 2, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "beine-hip-thrust",
          badge: "4",
          badgeColor: "purple",
          name: "Hip Thrust (LH)",
          cue: "",
          loadType: "barbell",
          pauseLabel: "75 s",
          pauseSeconds: 75,
          movements: [{ sets: 3, repType: "range", repMin: 8, repMax: 10 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "push-kh-seitheben",
          badge: "5a",
          badgeColor: "green",
          name: "Seitheben (KH)",
          cue: "Superset — direkt zu 5.b",
          footerNote: "In Runde 3 nur 5.a ausführen",
          loadType: "dumbbell",
          pauseLabel: "→ 5b",
          chainNext: "arme-hammer-curl",
          movements: [{ sets: 3, repType: "range", repMin: 12, repMax: 15 }],
          progression: { strategy: "range-weight", incrementKg: 1, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "arme-hammer-curl",
          badge: "5b",
          badgeColor: "green",
          name: "Hammer Curls",
          cue: "Superset — 60 s nach 5.b",
          loadType: "dumbbell",
          pauseLabel: "60 s",
          pauseSeconds: 60,
          movements: [{ sets: 2, repType: "range", repMin: 10, repMax: 12 }],
          progression: { strategy: "range-weight", incrementKg: 1, cadenceWeeks: 2, role: "assist" },
        },
      ],
      cooldown: { minutes: "5", items: ["Locker gehen • Hüfte und Schultern mobilisieren"] },
      notesTitle: "HINWEIS",
      progressionNotes: ["Kontrollierte Exzentrik.", "1–2 RIR bei Nebenübungen, 2 RIR bei schweren Lifts."],
    },

    {
      id: "ok-arme",
      dayNumber: 5,
      label: "Tag 5 · Fr",
      short: "Fr",
      title: "Oberkörper + Arme",
      subtitle: "Hypertrophie • Schultern • Armvolumen",
      durationLabel: "60 MIN",
      accent: "orange",
      warmup: {
        minutes: "7",
        items: [
          "3 Min Echo Bike locker",
          "12 Band-Außenrotationen • 12 leichte Face Pulls",
          "10 Liegestütze • 1 Aufwärmsatz Schulterdrücken",
        ],
      },
      exercises: [
        {
          id: "schulter-kh-schulterdruecken",
          badge: "1",
          badgeColor: "orange",
          name: "Schulterdrücken (KH)",
          cue: "",
          loadType: "dumbbell",
          pauseLabel: "90 s",
          pauseSeconds: 90,
          movements: [{ sets: 3, repType: "range", repMin: 6, repMax: 8 }],
          progression: { strategy: "range-weight", incrementKg: 2, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "pull-neutralgriff-klimmzuege",
          badge: "2",
          badgeColor: "orange",
          name: "Neutralgriff-Klimmzüge",
          cue: "",
          footerNote: "Falls kein Neutralgriff: schmerzfreie Klimmzug- oder Ring-Row-Variante",
          loadType: "bodyweight_loaded",
          pauseLabel: "90 s",
          pauseSeconds: 90,
          movements: [{ sets: 3, repType: "range", repMin: 6, repMax: 10 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "push-kh-bankdruecken",
          badge: "3",
          badgeColor: "purple",
          name: "Kurzhantel-Bankdrücken",
          cue: "",
          loadType: "dumbbell",
          pauseLabel: "75 s",
          pauseSeconds: 75,
          movements: [{ sets: 3, repType: "range", repMin: 8, repMax: 10 }],
          progression: { strategy: "range-weight", incrementKg: 2, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "schulter-kabel-seitheben",
          badge: "4a",
          badgeColor: "purple",
          name: "Kabel-Seitheben",
          cue: "Superset — direkt zu 4.b",
          footerNote: "In Runde 3 nur 4.a ausführen",
          loadType: "cable",
          pauseLabel: "→ 4b",
          chainNext: "schulter-facepull",
          movements: [{ sets: 3, repType: "range", repMin: 12, repMax: 15 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "schulter-facepull",
          badge: "4b",
          badgeColor: "purple",
          name: "Face Pulls",
          cue: "Superset — 60 s nach 4.b",
          loadType: "cable",
          pauseLabel: "60 s",
          pauseSeconds: 60,
          movements: [{ sets: 2, repType: "range", repMin: 15, repMax: 20 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "arme-kabel-bizepscurls",
          badge: "5a",
          badgeColor: "green",
          name: "Kabel-Bizepscurls",
          cue: "Superset — direkt zu 5.b",
          loadType: "cable",
          pauseLabel: "→ 5b",
          chainNext: "arme-ueberkopf-trizeps-kabel",
          movements: [{ sets: 3, repType: "range", repMin: 10, repMax: 12 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "arme-ueberkopf-trizeps-kabel",
          badge: "5b",
          badgeColor: "green",
          name: "Überkopf-Trizeps am Kabel",
          cue: "Superset — 75 s nach 5.b",
          footerNote: "3 Durchgänge",
          loadType: "cable",
          pauseLabel: "75 s",
          pauseSeconds: 75,
          movements: [{ sets: 3, repType: "range", repMin: 10, repMax: 15 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
      ],
      cooldown: {
        minutes: "5",
        items: [
          "2 Minuten: Lockeres Gehen oder sehr leichtes AirBike.",
          "1 Minute: Brust- und Schulterdehnung, jeweils 30 Sekunden pro Seite.",
          "1 Minute: Sanfte Bizeps- und Trizepsdehnung.",
          "1 Minute: Lockerung und Mobilisation der Schultergelenke.",
        ],
      },
      notesTitle: "HINWEIS",
      progressionNotes: ["Falls kein Neutralgriff: schmerzfreie Klimmzug- oder Ring-Row-Variante."],
    },
  ],
};

export function getDay(dayId) {
  return PLAN.days.find((d) => d.id === dayId);
}

export function getExercise(dayId, exerciseId) {
  const day = getDay(dayId);
  return day?.exercises.find((e) => e.id === exerciseId);
}

// Sucht eine Übung bzw. einen Block (auch Circuit-Übungen) im aktuellen Plan — für die Verlaufsanzeige.
// kind: "exercise" | "interval" | "finisher" | "circuitEx"
export function findExerciseById(exerciseId, preferDayId) {
  const days = [...PLAN.days].sort((a, b) => (b.id === preferDayId) - (a.id === preferDayId));
  for (const day of days) {
    for (const ex of day.exercises) {
      if (ex.id === exerciseId) return { ex, day, kind: ex.type || "exercise" };
      if (ex.type === "circuit") {
        const inner = ex.exercises.find((e) => e.id === exerciseId);
        if (inner) return { ex: inner, day, kind: "circuitEx" };
      }
    }
  }
  return null;
}

export function dayLabel(day) {
  return day.label || `Tag ${day.dayNumber}`;
}

export function dayShort(day) {
  return day.short || String(day.dayNumber);
}

export function allStrengthExercises() {
  return PLAN.days.flatMap((d) => d.exercises.filter((e) => !e.type).map((e) => ({ ...e, dayId: d.id, dayTitle: d.title })));
}
