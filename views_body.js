import { getBodyMetrics, saveBodyMetric, deleteBodyMetric } from "./store.js";
import { el, formatDate } from "./utils.js";
import { lineChartSVG } from "./chart.js";

function nextDueText(metrics) {
  if (metrics.length === 0) return "Noch kein Eintrag — starte jetzt.";
  const last = new Date(metrics[metrics.length - 1].dateISO);
  const due = new Date(last);
  due.setDate(due.getDate() + 14);
  const daysLeft = Math.ceil((due - new Date()) / 86400000);
  if (daysLeft <= 0) return "Nächste Messung fällig — heute eintragen!";
  return `Nächste Messung in ${daysLeft} Tagen (${formatDate(due.toISOString())})`;
}

export function renderBody(container, refresh) {
  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Körpermaße</div>`));
  container.appendChild(el(`<div class="page-subtitle">Alle 2 Wochen messen — Gewicht &amp; Bauchumfang</div>`));

  const metrics = getBodyMetrics();
  container.appendChild(el(`<div class="insight-card insight-good" style="margin-bottom:16px">${nextDueText(metrics)}</div>`));

  const form = el(`
    <div class="card">
      <div class="form-grid">
        <div class="field"><label>Gewicht (kg)</label><input type="number" step="0.1" inputmode="decimal" data-role="weight" placeholder="z. B. 84.5" /></div>
        <div class="field"><label>Bauchumfang (cm)</label><input type="number" step="0.5" inputmode="decimal" data-role="waist" placeholder="z. B. 92" /></div>
      </div>
      <div class="field" style="margin-bottom:12px"><label>Notiz (optional)</label><input type="text" data-role="note" placeholder="z. B. morgens nüchtern" /></div>
      <button class="btn btn-primary" data-action="save">Eintrag speichern</button>
    </div>
  `);
  form.querySelector('[data-action="save"]').addEventListener("click", () => {
    const weightKg = parseFloat(form.querySelector('[data-role="weight"]').value);
    const waistCm = parseFloat(form.querySelector('[data-role="waist"]').value);
    const note = form.querySelector('[data-role="note"]').value;
    if (!weightKg && !waistCm) return;
    saveBodyMetric({ weightKg: weightKg || null, waistCm: waistCm || null, note });
    renderBody(container, refresh);
  });
  container.appendChild(form);

  if (metrics.length >= 2) {
    container.appendChild(el(`<div class="section-title">Verlauf</div>`));
    const weightPoints = metrics.filter((m) => m.weightKg != null).map((m) => ({ value: m.weightKg, label: formatDate(m.dateISO).slice(0, 5) }));
    const waistPoints = metrics.filter((m) => m.waistCm != null).map((m) => ({ value: m.waistCm, label: formatDate(m.dateISO).slice(0, 5) }));

    container.appendChild(el(`
      <div class="chart-wrap">
        <div class="chart-title">Gewicht (kg)</div>
        ${lineChartSVG(weightPoints, { color: "#f2711c", unit: "" })}
      </div>
    `));
    container.appendChild(el(`
      <div class="chart-wrap">
        <div class="chart-title">Bauchumfang (cm)</div>
        ${lineChartSVG(waistPoints, { color: "#8b6cf5", unit: "" })}
      </div>
    `));
  }

  container.appendChild(el(`<div class="section-title">Einträge</div>`));
  if (metrics.length === 0) {
    container.appendChild(el(`<div class="empty-state">Noch keine Einträge.</div>`));
  } else {
    const table = el(`
      <table class="data-table">
        <thead><tr><th>Datum</th><th>Gewicht</th><th>Bauch</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
    `);
    const tbody = table.querySelector("tbody");
    [...metrics].reverse().forEach((m) => {
      const row = el(`
        <tr>
          <td>${formatDate(m.dateISO)}</td>
          <td>${m.weightKg != null ? m.weightKg + " kg" : "–"}</td>
          <td>${m.waistCm != null ? m.waistCm + " cm" : "–"}</td>
          <td><button class="btn btn-ghost btn-sm" data-id="${m.id}">✕</button></td>
        </tr>
      `);
      row.querySelector("button").addEventListener("click", () => {
        deleteBodyMetric(m.id);
        renderBody(container, refresh);
      });
      tbody.appendChild(row);
    });
    container.appendChild(table);
  }
}
