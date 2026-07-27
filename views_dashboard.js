import { PLAN } from "./data.js";
import { getState, getExerciseTarget, getExerciseHistory, getRecentChanges, getBodyMetrics } from "./store.js";
import { bodyCompositionInsight, detectStagnation } from "./progression.js";
import { el, formatRelative, formatDateShort } from "./utils.js";

function nextDay() {
  const logs = getState().sessionLogs;
  if (logs.length === 0) return PLAN.days[0];
  const last = [...logs].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))[0];
  const idx = PLAN.days.findIndex((d) => d.id === last.dayId);
  return PLAN.days[(idx + 1) % PLAN.days.length];
}

function computeStreak() {
  const logs = [...getState().sessionLogs].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  if (logs.length === 0) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const daySet = new Set(logs.map((l) => new Date(l.dateISO).toDateString()));
  for (let i = 0; i < 60; i++) {
    if (daySet.has(cursor.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function renderDashboard(container, navigate) {
  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Dashboard</div>`));
  container.appendChild(el(`<div class="page-subtitle">Dein Fortschritt auf einen Blick</div>`));

  const nd = nextDay();
  const hero = el(`
    <div class="hero-card">
      <div class="label">Nächstes Training</div>
      <div class="title">Tag ${nd.dayNumber} — ${nd.title}</div>
      <div class="sub">${nd.subtitle}</div>
      <button class="btn btn-primary" style="margin-top:14px" data-action="start">Jetzt starten</button>
    </div>
  `);
  hero.querySelector('[data-action="start"]').addEventListener("click", () => navigate(`train/${nd.id}`));
  container.appendChild(hero);

  const logs = getState().sessionLogs;
  const metrics = getBodyMetrics();
  const streak = computeStreak();
  const grid = el(`
    <div class="metric-grid">
      <div class="metric-card"><div class="num">${logs.length}</div><div class="lbl">Trainings gesamt</div></div>
      <div class="metric-card"><div class="num">${streak}</div><div class="lbl">Tage in Folge</div></div>
    </div>
  `);
  container.appendChild(grid);

  const insight = bodyCompositionInsight();
  if (insight) {
    container.appendChild(el(`<div class="insight-card insight-${insight.level}">${insight.message}</div>`));
  } else if (metrics.length < 2) {
    container.appendChild(el(`<div class="insight-card insight-warn">Noch keine 2 Körpermaß-Einträge vorhanden — trag alle 2 Wochen Gewicht & Bauchumfang ein, damit hier Trends erscheinen.</div>`));
  }

  // Stagnations-Hinweise für Hauptübungen
  const mains = PLAN.days.flatMap((d) => d.exercises.filter((e) => e.progression?.role === "main"));
  const stagnations = mains.map((e) => detectStagnation(e)).filter(Boolean);
  stagnations.forEach((s) => {
    container.appendChild(el(`<div class="insight-card insight-warn">${s.message}</div>`));
  });

  container.appendChild(el(`<div class="section-title">Kraft-Trends</div>`));
  const trendCard = el(`<div class="card"></div>`);
  let anyTrend = false;
  mains.forEach((ex) => {
    const hist = getExerciseHistory(ex.id, 2);
    if (hist.length === 0) return;
    anyTrend = true;
    const latestSets = hist[0].movements?.[0]?.sets || [];
    const latestWeight = latestSets.slice(-1)[0]?.weight;
    const prevSets = hist[1]?.movements?.[0]?.sets || [];
    const prevWeight = prevSets.slice(-1)[0]?.weight;
    let deltaHtml = `<span class="delta flat">–</span>`;
    if (latestWeight != null && prevWeight != null) {
      const diff = latestWeight - prevWeight;
      if (diff > 0) deltaHtml = `<span class="delta up">▲ +${diff.toFixed(2).replace(/\.00$/, "")} kg</span>`;
      else if (diff < 0) deltaHtml = `<span class="delta down">▼ ${diff.toFixed(2).replace(/\.00$/, "")} kg</span>`;
      else deltaHtml = `<span class="delta flat">= gleich</span>`;
    }
    trendCard.appendChild(el(`
      <div class="change-item">
        <div class="dot" style="background:var(--orange)"></div>
        <div class="txt" style="flex:1">
          <div class="title">${ex.name}</div>
          <div class="reason">${latestWeight != null ? latestWeight + " kg" : "–"} · zuletzt ${formatRelative(hist[0].dateISO)}</div>
        </div>
        ${deltaHtml}
      </div>
    `));
  });
  if (!anyTrend) trendCard.appendChild(el(`<div class="empty-state">Noch keine Daten — starte dein erstes Training.</div>`));
  container.appendChild(trendCard);

  container.appendChild(el(`<div class="section-title">Zuletzt geändert am Plan</div>`));
  const changes = getRecentChanges(6);
  const changeCard = el(`<div class="card"></div>`);
  if (changes.length === 0) {
    changeCard.appendChild(el(`<div class="empty-state">Noch keine automatischen Anpassungen.</div>`));
  } else {
    changes.forEach((c) => {
      changeCard.appendChild(el(`
        <div class="change-item">
          <div class="dot" style="background:${c.kind === "deload" ? "var(--red)" : "var(--green)"}"></div>
          <div class="txt">
            <div class="title">${c.title}</div>
            <div class="reason">${c.reason}</div>
            <div class="date">${formatDateShort(c.dateISO)}</div>
          </div>
        </div>
      `));
    });
  }
  container.appendChild(changeCard);
}
