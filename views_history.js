import { getState } from "./store.js";
import { getDay, getExercise, findExerciseById, dayLabel } from "./data.js";
import { el, formatDate } from "./utils.js";

// Macht aus einer ID einen lesbaren Namen (z. B. "beine-sumo-deadlift" -> "Sumo Deadlift"), falls die Übung
// oder der Tag inzwischen aus dem aktuellen Plan entfernt wurde. Alte Trainings bleiben so im Verlauf sichtbar,
// auch wenn sich der Plan später ändert.
function prettifyId(id, dayId) {
  let label = id;
  const dayPrefix = dayId ? dayId.split("-").slice(1).join("-") : "";
  if (dayPrefix && label.startsWith(dayPrefix + "-")) label = label.slice(dayPrefix.length + 1);
  return label
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatSets(sets) {
  return sets.map((s) => (s.weight != null ? `${s.weight}kg×${s.reps}` : `${s.reps}`)).join(", ");
}

// Baut die Detailzeile(n) zu einem geloggten Eintrag. Liefert null, wenn nichts anzuzeigen ist.
function entryBlock(log, exId, data) {
  const day = getDay(log.dayId);
  const local = day ? getExercise(log.dayId, exId) : null;
  const found = local ? { ex: local } : findExerciseById(exId);
  const ex = found?.ex;

  let name;
  let rows;
  let orphan = false;

  if (ex?.type === "interval") {
    const s = (data.movements?.[0]?.sets || []).filter(Boolean)[0];
    if (!s) return null;
    name = ex.label;
    rows = [`${s.reps ?? "–"} Runden · ${s.weight ?? "–"} kcal`];
  } else if (ex) {
    name = ex.name;
    rows = (data.movements || [])
      .map((mv, i) => {
        const sets = (mv.sets || []).filter(Boolean);
        if (sets.length === 0) return null;
        const mvName = ex.movements?.[i]?.name ? `${ex.movements[i].name}: ` : "";
        return `${mvName}${formatSets(sets)}`;
      })
      .filter(Boolean);
  } else {
    const sets = (data.movements || []).flatMap((mv) => (mv.sets || []).filter(Boolean));
    if (sets.length === 0) return null;
    name = prettifyId(exId, log.dayId);
    rows = [formatSets(sets)];
    orphan = true;
  }
  if (!rows || rows.length === 0) return null;

  return el(`
    <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:8px">
      <b style="font-size:13.5px">${name}</b>
      ${orphan ? `<span class="pill pill-red" style="margin-left:6px;vertical-align:middle">nicht mehr im Plan</span>` : ""}
      ${rows.map((r) => `<div style="font-size:13px;color:var(--text-dim);padding:4px 0">${r}</div>`).join("")}
    </div>
  `);
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
    const title = day ? `${dayLabel(day)} — ${day.title}` : prettifyId(log.dayId.replace(/^tag\d+-/, ""));
    const details = el(`<div class="card" style="cursor:pointer"></div>`);
    details.appendChild(el(`
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="ex-name">${title}</div>
          <div class="ex-cue">${formatDate(log.dateISO)}</div>
        </div>
        <span class="pill pill-orange">${Object.keys(log.entries || {}).length} Übungen</span>
      </div>
    `));

    const body = el(`<div style="display:none;margin-top:12px"></div>`);
    Object.entries(log.entries || {}).forEach(([exId, data]) => {
      const block = entryBlock(log, exId, data);
      if (block) body.appendChild(block);
    });
    details.appendChild(body);

    details.addEventListener("click", () => {
      body.style.display = body.style.display === "none" ? "block" : "none";
    });

    container.appendChild(details);
  });
}
