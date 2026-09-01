import { getState } from "./store.js";
import { getDay, getExercise } from "./data.js";
import { el, formatDate, repLabel } from "./utils.js";

// Für Circuit-Tage (Metabolic) gibt es keine "echten" Übungen in day.exercises, sondern
// Intervall-Ergebnis, Circuit-Wdh.-Log und Finisher-Zeiten. Löst deren IDs für die Verlaufsanzeige auf.
function resolveCircuitLogLabel(day, exId) {
  if (day.intervalBlock?.id === exId) {
    return { name: day.intervalBlock.label, formatSet: (s) => `${s.reps ?? "–"} Runden · ${s.weight ?? "–"} kcal` };
  }
  const circuitEx = day.circuitBlock?.exercises.find((e) => e.id === exId);
  if (circuitEx) {
    return { name: `${circuitEx.badge} ${circuitEx.name}`, formatSet: (s, i) => `Runde ${i + 1}: ${s.reps ?? "–"} Wdh.` };
  }
  if (day.finisher?.id === exId) {
    return { name: day.finisher.label, formatSet: (s, i) => `${i + 1}. ${day.finisher.distanceLabel}: ${s.reps ?? "–"} Sek` };
  }
  return null;
}

// Macht aus einer Übungs-ID einen lesbaren Namen (z. B. "beine-sumo-deadlift" -> "Sumo Deadlift"),
// falls die Übung inzwischen aus dem aktuellen Plan entfernt wurde. Alte Trainings bleiben so im
// Verlauf sichtbar, auch wenn sich der Plan später ändert.
function prettifyExerciseId(dayId, exId) {
  const dayPrefix = dayId.split("-").slice(1).join("-");
  let label = exId;
  if (dayPrefix && label.startsWith(dayPrefix + "-")) label = label.slice(dayPrefix.length + 1);
  return label
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function renderHistory(container) {
  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Verlauf</div>`));
  container.appendChild(el(`<div class="page-subtitle">Alle protokollierten Trainings</div>`));

  const logs = [...getState().sessionLogs].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  if (logs.length === 0) {
    container.appendChild(el(`<div class="empty-state">Noch keine Trainings gespeichert.</div>`));
    return;
  }

  logs.forEach((log) => {
    const day = getDay(log.dayId);
    const details = el(`<div class="card" style="cursor:pointer"></div>`);
    details.appendChild(el(`
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="ex-name">${day ? day.title : log.dayId}</div>
          <div class="ex-cue">${formatDate(log.dateISO)}</div>
        </div>
        <span class="pill pill-orange">${Object.keys(log.entries || {}).length} Übungen</span>
      </div>
    `));

    const body = el(`<div style="display:none;margin-top:12px"></div>`);
    Object.entries(log.entries || {}).forEach(([exId, data]) => {
      const ex = getExercise(log.dayId, exId);
      if (ex) {
        const rows = data.movements
          .map((mv, i) => {
            const sets = (mv.sets || []).filter(Boolean);
            if (sets.length === 0) return "";
            const setsStr = sets.map((s) => (s.weight != null ? `${s.weight}kg×${s.reps}` : `${s.reps}`)).join(", ");
            const mvName = ex.movements[i]?.name ? `${ex.movements[i].name}: ` : "";
            return `<div style="font-size:13px;color:var(--text-dim);padding:4px 0">${mvName}${setsStr}</div>`;
          })
          .join("");
        body.appendChild(el(`<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:8px"><b style="font-size:13.5px">${ex.name}</b>${rows}</div>`));
        return;
      }
      const circuitLabel = day ? resolveCircuitLogLabel(day, exId) : null;
      if (circuitLabel) {
        const sets = (data.movements?.[0]?.sets || []).filter(Boolean);
        if (sets.length === 0) return;
        const setsStr = sets.map((s, i) => circuitLabel.formatSet(s, i)).join(" · ");
        body.appendChild(el(`<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:8px"><b style="font-size:13.5px">${circuitLabel.name}</b><div style="font-size:13px;color:var(--text-dim);padding:4px 0">${setsStr}</div></div>`));
        return;
      }
      // Übung existiert nicht mehr im aktuellen Plan (z. B. nach einer Plan-Anpassung) —
      // Daten trotzdem anzeigen, statt sie kommentarlos verschwinden zu lassen.
      const fallbackSets = (data.movements || []).flatMap((mv) => (mv.sets || []).filter(Boolean));
      if (fallbackSets.length === 0) return;
      const fallbackStr = fallbackSets.map((s) => (s.weight != null ? `${s.weight}kg×${s.reps}` : `${s.reps}`)).join(", ");
      body.appendChild(el(`
        <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:8px">
          <b style="font-size:13.5px">${prettifyExerciseId(log.dayId, exId)}</b>
          <span class="pill pill-red" style="margin-left:6px;vertical-align:middle">nicht mehr im Plan</span>
          <div style="font-size:13px;color:var(--text-dim);padding:4px 0">${fallbackStr}</div>
        </div>
      `));
    });
    details.appendChild(body);

    details.addEventListener("click", () => {
      body.style.display = body.style.display === "none" ? "block" : "none";
    });

    container.appendChild(details);
  });
}
