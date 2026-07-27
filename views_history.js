import { getState } from "./store.js";
import { getDay, getExercise } from "./data.js";
import { el, formatDate, repLabel } from "./utils.js";

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
      if (!ex) return;
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
    });
    details.appendChild(body);

    details.addEventListener("click", () => {
      body.style.display = body.style.display === "none" ? "block" : "none";
    });

    container.appendChild(details);
  });
}
