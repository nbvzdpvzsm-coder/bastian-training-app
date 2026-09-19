// Basis-Trainingsplan (Home Gym) — Ausgangszustand für den jeweiligen Plan.
// Wird zur Laufzeit durch geloggte Trainings automatisch fortgeschrieben (siehe progression.js -> exerciseTargets in store.js).
// repType: "range" (Wdh.-Spanne) | "fixed" (feste Wdh./Zahl) | "perSide" (Wdh. pro Seite) | "time" (Sekunden, z. B. Plank) | "special21" (21er-Methode)
// loadType steuert die Eingabefelder in der Trainingsansicht:
//   barbell/dumbbell/kettlebell -> Gewicht + Wdh. je Satz
//   bodyweight -> nur Wdh. (z. B. Bänder, deren Widerstand sich nicht in kg beziffern lässt)
//   bodyweight_loaded -> Zusatzgewicht + Wdh. (Klimmzüge, Dips)
// seedWeightKg: Startgewicht laut Plan — wird beim ersten Laden dieser Plan-Version als Zielvorschlag übernommen,
// damit die Trainingsansicht auch vor dem ersten geloggten Satz sinnvolle Werte zeigt (siehe store.js -> adoptPlanIfNeeded).
// progression.strategy siehe progression.js für die jeweilige Berechnung.
// progression.role "main" = Übung mit explizitem Wochenziel im Plan (Dashboard-Trend + Stagnations-Check).
// Einträge mit type: "interval" sind Intervall-Blöcke (Airbike) innerhalb einer Einheit; sie werden mit Timer und
// Ergebnis-Eingabe (Runden + Kalorien) gerendert und nicht progressiert.
// Übungs-IDs bleiben über Pläne hinweg stabil, wenn es dieselbe Übung ist — so bleibt die Historie (Vorwochenwerte) erhalten.

export const PLAN_ID = "home-gym-v3-oktoberfest";

export const PLAN = {
  id: PLAN_ID,
  name: "Oktoberfest-Wochen",
  cycle: 2.5,
  cycleLabel: "Oktoberfest-Wochen",
  overview: {
    strategy:
      "Kein 5-Tage-Split möglich — 3 Ganzkörper-Einheiten mit den wichtigsten Grundübungen. Ziel: Kraft-Signal aufrechterhalten trotz Alkohol und schlechter Ernährung. Kein Muskelkater-Ziel, kein Volumen-Max. Min. 150 g Protein täglich — auch im Bierzelt.",
    schedule: [
      "Woche 1: Mo Einheit A · Mi Einheit B · Do Einheit C",
      "Woche 2: Di Einheit A · Mi Einheit B · Do Einheit C",
      "Fr–So: Oktoberfest, kein Training — danach Zyklus 3",
    ],
  },
  changeNotes: [
    {
      scope: "plan",
      title: "Oktoberfest-Plan: 3 Ganzkörper-Einheiten",
      reason: "Zwei Wochen lang Kraft-Signal erhalten (Einheit A/B/C), kein Volumen-Max. Min. 150 g Protein täglich.",
      kind: "note",
    },
    {
      scope: "exercise",
      dayId: "einheit-b",
      exerciseId: "okt-goblet-squat",
      title: "Einheit B: Goblet Squat ersetzt KB Swing",
      reason: "Schont die Bizepssehne.",
      kind: "swap",
    },
  ],
  days: [
    {
      id: "einheit-a",
      dayNumber: 1,
      label: "Einheit A",
      short: "A",
      title: "Push + Pull",
      subtitle: "Push + Pull kompakt • Kraft-Signal erhalten",
      accent: "orange",
      warmup: {
        minutes: "8",
        items: [
          "5 Min Airbike (locker, Puls ~120)",
          "10× Shoulder Pass-Throughs • 10× Scapular Pull-Ups",
          "2 Aufwärmsätze Bankdrücken: 70 kg × 3, 82,5 kg × 2",
          "2 Aufwärmsätze Klimmzüge: 3× KG, 3× +7,5 kg",
        ],
      },
      exercises: [
        {
          id: "push-bankdruecken",
          badge: "1",
          badgeColor: "orange",
          name: "Bankdrücken (Langhantel)",
          cue: "3 Sek negativ, RPE 8–9",
          footerNote: "87,5–90 kg; kein Versagen",
          loadType: "barbell",
          seedWeightKg: 87.5,
          pauseLabel: "2,5 Min",
          pauseSeconds: 150,
          movements: [{ sets: 4, repType: "range", repMin: 4, repMax: 5 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "main" },
        },
        {
          id: "pull-klimmzuege",
          badge: "2",
          badgeColor: "orange",
          name: "Gewichtete Klimmzüge",
          cue: "Untergriff, volles ROM",
          footerNote: "+12,5 kg; Kinn über Stange",
          loadType: "bodyweight_loaded",
          seedWeightKg: 12.5,
          pauseLabel: "2,5 Min",
          pauseSeconds: 150,
          movements: [{ sets: 4, repType: "range", repMin: 4, repMax: 5 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "main" },
        },
        {
          id: "pull-pendlay-row",
          badge: "3",
          badgeColor: "purple",
          name: "Pendlay Row (Langhantel)",
          cue: "Stab berührt Boden",
          footerNote: "72,5–75 kg; explosiv ziehen",
          loadType: "barbell",
          seedWeightKg: 72.5,
          pauseLabel: "2 Min",
          pauseSeconds: 120,
          movements: [{ sets: 3, repType: "range", repMin: 5, repMax: 6 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "push-military-press",
          badge: "4",
          badgeColor: "purple",
          name: "Military Press sitzend (LH)",
          cue: "Core aktiv, kein Schwung",
          footerNote: "38–40 kg; explosiv drücken",
          loadType: "barbell",
          seedWeightKg: 38,
          pauseLabel: "90 Sek",
          pauseSeconds: 90,
          movements: [{ sets: 3, repType: "range", repMin: 6, repMax: 8 }],
          progression: { strategy: "range-weight", incrementKg: 2, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "pull-ez-curl",
          badge: "5a",
          badgeColor: "green",
          name: "EZ Curl",
          cue: "Superset mit Skull Crushers — 3 Sek negativ",
          footerNote: "37,5 kg; 2 Sek oben halten",
          loadType: "barbell",
          seedWeightKg: 37.5,
          pauseLabel: "→ 5b",
          chainNext: "okt-skull-crushers",
          movements: [{ sets: 3, repType: "fixed", repFixed: 8 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "okt-skull-crushers",
          badge: "5b",
          badgeColor: "green",
          name: "Skull Crushers (EZ)",
          cue: "Superset mit Curl",
          footerNote: "38–40 kg; Ellenbogen fixiert",
          loadType: "barbell",
          seedWeightKg: 38,
          pauseLabel: "75 Sek",
          pauseSeconds: 75,
          movements: [{ sets: 3, repType: "range", repMin: 8, repMax: 10 }],
          progression: { strategy: "range-weight", incrementKg: 1.25, cadenceWeeks: 2, role: "assist" },
        },
      ],
      progressionNotes: ["Kraft-Signal erhalten — kein Versagen, RPE 8–9."],
    },

    {
      id: "einheit-b",
      dayNumber: 2,
      label: "Einheit B",
      short: "B",
      title: "Beine + Metabolic",
      subtitle: "Beine + Metabolic • Beine + HIIT",
      accent: "orange",
      warmup: {
        minutes: "8",
        items: [
          "5 Min Rudergerät (mittleres Tempo)",
          "10× Bodyweight Squat tief • 10× Glute Bridge",
          "2 Aufwärmsätze Kniebeuge: 60 kg × 3, 75 kg × 2",
          "10× Leg Swing vor/zurück + seitlich (pro Seite)",
        ],
      },
      exercises: [
        {
          id: "beine-kniebeuge",
          badge: "1",
          badgeColor: "orange",
          name: "Kniebeuge (Langhantel)",
          cue: "RPE 9, sauber und tief",
          footerNote: "85–87,5 kg; Oberschenkel parallel+",
          loadType: "barbell",
          seedWeightKg: 85,
          pauseLabel: "3 Min",
          pauseSeconds: 180,
          movements: [{ sets: 4, repType: "range", repMin: 4, repMax: 5 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 1.5, role: "main" },
        },
        {
          id: "beine-rdl",
          badge: "2",
          badgeColor: "orange",
          name: "Romanian Deadlift (Langhantel)",
          cue: "3 Sek negativ",
          footerNote: "70 kg; Hüfte zurück, Rücken neutral",
          loadType: "barbell",
          seedWeightKg: 70,
          pauseLabel: "90 Sek",
          pauseSeconds: 90,
          movements: [{ sets: 4, repType: "range", repMin: 6, repMax: 8 }],
          progression: { strategy: "tempo-focus", role: "assist" },
        },
        {
          id: "beine-hip-thrust",
          badge: "3",
          badgeColor: "purple",
          name: "Hip Thrust (Langhantel)",
          cue: "Pause + Squeeze oben",
          footerNote: "45–50 kg; Schultern auf Bank",
          loadType: "barbell",
          seedWeightKg: 45,
          pauseLabel: "75 Sek",
          pauseSeconds: 75,
          movements: [{ sets: 3, repType: "range", repMin: 8, repMax: 10 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          type: "interval",
          id: "block-a",
          badge: "4",
          badgeColor: "purple",
          label: "Airbike Intervalle",
          cue: "25 Sek Sprint / 35 Sek locker × 10 Runden",
          footerNote: "Max. Intensität bei Sprints — Watt notieren",
          totalLabel: "~12 Min",
          baseRounds: 10,
          workSeconds: 25,
          restSeconds: 35,
        },
        {
          id: "okt-goblet-squat",
          badge: "5",
          badgeColor: "green",
          name: "KB Goblet Squat",
          cue: "Ersetzt KB Swing — schont Bizepssehne",
          footerNote: "KB 24 kg; Knie über Zehen, Brust hoch, tief",
          loadType: "kettlebell",
          seedWeightKg: 24,
          pauseLabel: "60 Sek",
          pauseSeconds: 60,
          movements: [{ sets: 3, repType: "fixed", repFixed: 15 }],
          progression: { strategy: "range-weight", incrementKg: 4, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "okt-plank-deadbug",
          badge: "6",
          badgeColor: "green",
          name: "Plank + Dead Bug (Supersatz)",
          cue: "Core-Finisher",
          footerNote: "45 Sek Plank direkt zu 10× Dead Bug",
          pauseLabel: "60 Sek",
          pauseSeconds: 60,
          loadType: "bodyweight",
          movements: [
            { name: "Plank", sets: 3, repType: "time", repFixed: 45, loadType: "bodyweight" },
            { name: "Dead Bug", sets: 3, repType: "fixed", repFixed: 10, loadType: "bodyweight" },
          ],
          progression: { strategy: "tempo-focus", role: "assist" },
        },
      ],
      progressionNotes: [
        "Kniebeuge: RPE 9, sauber und tief.",
        "Airbike: maximale Intensität bei den Sprints — Watt notieren.",
        "Goblet Squat ersetzt KB Swing (Bizepssehne schonen).",
      ],
    },

    {
      id: "einheit-c",
      dayNumber: 3,
      label: "Einheit C",
      short: "C",
      title: "Arme + Oberkörper",
      subtitle: "Arme + Oberkörper",
      accent: "orange",
      warmup: {
        minutes: "6",
        items: [
          "3 Min Airbike (locker)",
          "2× 12 Wdh. EZ Curl ohne Gewicht • 10× Arm Circles",
          "10× Band Pull-Apart • 10× Face Pull leicht",
          "Dead Hang 30 Sek + 10× Scapular Pull-Ups",
        ],
      },
      exercises: [
        {
          id: "arme-ez-curl-superset",
          badge: "1a",
          badgeColor: "orange",
          name: "EZ Curl",
          cue: "Superset — A1 direkt zu A2, dann 90 Sek",
          footerNote: "EZ 40 kg; 3 Sek negativ",
          loadType: "barbell",
          seedWeightKg: 40,
          pauseLabel: "→ 1b",
          chainNext: "arme-skull-crushers",
          movements: [{ sets: 4, repType: "fixed", repFixed: 8 }],
          progression: { strategy: "range-weight", incrementKg: 2.5, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "arme-skull-crushers",
          badge: "1b",
          badgeColor: "orange",
          name: "Skull Crushers (EZ)",
          cue: "Superset — A1 direkt zu A2, dann 90 Sek",
          footerNote: "Skull 40 kg; 3 Sek negativ",
          loadType: "barbell",
          seedWeightKg: 40,
          pauseLabel: "90 Sek",
          pauseSeconds: 90,
          movements: [{ sets: 4, repType: "fixed", repFixed: 8 }],
          progression: { strategy: "range-weight", incrementKg: 1.25, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "arme-incline-curl-45",
          badge: "2a",
          badgeColor: "orange",
          name: "Incline KH Curl",
          cue: "Superset — B1 direkt zu B2, dann 90 Sek",
          footerNote: "Incline 15 kg",
          loadType: "dumbbell",
          seedWeightKg: 15,
          pauseLabel: "→ 2b",
          chainNext: "arme-overhead-triceps-kh",
          movements: [{ sets: 4, repType: "fixed", repFixed: 12 }],
          progression: { strategy: "range-weight", incrementKg: 1, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "arme-overhead-triceps-kh",
          badge: "2b",
          badgeColor: "orange",
          name: "Overhead Trizeps (KH)",
          cue: "Superset — B1 direkt zu B2, dann 90 Sek",
          footerNote: "OH-Tri 17,5 kg",
          loadType: "dumbbell",
          seedWeightKg: 17.5,
          pauseLabel: "90 Sek",
          pauseSeconds: 90,
          movements: [{ sets: 4, repType: "fixed", repFixed: 12 }],
          progression: { strategy: "range-weight", incrementKg: 1, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "pull-chest-supported-row",
          badge: "3",
          badgeColor: "purple",
          name: "Chest-Supported Row (KH auf Bank)",
          cue: "Rücken ohne Schwung",
          footerNote: "KH 2× 22,5 kg; Schulterblätter zusammen",
          loadType: "dumbbell",
          seedWeightKg: 22.5,
          pauseLabel: "75 Sek",
          pauseSeconds: 75,
          movements: [{ sets: 3, repType: "range", repMin: 12, repMax: 15 }],
          progression: { strategy: "range-weight", incrementKg: 2, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "push-seitheben-facepull",
          badge: "4",
          badgeColor: "purple",
          name: "Seitheben + Face Pull (Supersatz)",
          cue: "Laterale + hintere Schulter",
          footerNote: "KH 12,5 kg + Band; direkt hintereinander",
          pauseLabel: "60 Sek",
          pauseSeconds: 60,
          movements: [
            { name: "Seitheben", sets: 3, repType: "fixed", repFixed: 15, loadType: "dumbbell" },
            { name: "Face Pull mit Band", sets: 3, repType: "fixed", repFixed: 20, loadType: "bodyweight" },
          ],
          loadType: "dumbbell",
          seedWeightKg: 12.5,
          progression: { strategy: "range-weight", incrementKg: 1, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "arme-hammer-curl",
          badge: "5",
          badgeColor: "green",
          name: "Hammer Curl (KH)",
          cue: "Brachialis + Unterarm",
          footerNote: "KH 20 kg; Neutralgriff, 2 Sek senken",
          loadType: "dumbbell",
          seedWeightKg: 20,
          pauseLabel: "60 Sek",
          pauseSeconds: 60,
          movements: [{ sets: 3, repType: "fixed", repFixed: 12 }],
          progression: { strategy: "range-weight", incrementKg: 1, cadenceWeeks: 2, role: "assist" },
        },
        {
          id: "arme-band-pushdown",
          badge: "6",
          badgeColor: "green",
          name: "Band Trizeps Pushdown (Finisher)",
          cue: "Pump-Abschluss",
          footerNote: "Ellenbogen fixiert; kurze Pause bei Streckung",
          loadType: "bodyweight",
          pauseLabel: "45 Sek",
          pauseSeconds: 45,
          movements: [{ sets: 3, repType: "fixed", repFixed: 20 }],
          progression: { strategy: "reps-then-weight", role: "assist" },
        },
      ],
      notesTitle: "HINWEIS",
      progressionNotes: [
        "Nach dem Training heute: Protein-Shake trinken, bevor du ins Bierzelt gehst. Auch 2 Maß überleben Muskeln besser mit 30–40 g Protein davor.",
      ],
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

// Sucht eine Übung im gesamten aktuellen Plan — für alte Trainings, die zu einem früheren Tag/Plan gehören.
export function findExerciseById(exerciseId) {
  for (const day of PLAN.days) {
    const ex = day.exercises.find((e) => e.id === exerciseId);
    if (ex) return { ex, day };
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
  return PLAN.days.flatMap((d) => d.exercises.filter((e) => e.type !== "interval").map((e) => ({ ...e, dayId: d.id, dayTitle: d.title })));
}
