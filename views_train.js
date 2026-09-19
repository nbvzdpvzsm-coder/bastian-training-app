import { PLAN, getDay, dayLabel, dayShort } from "./data.js";
import { getExerciseTarget, saveSessionLog, getLastSessionsForDay, getRecentChanges, getExerciseHistory } from "./store.js";
import { updateTargetAfterSession } from "./progression.js";
import { el, repLabel, loadUnitLabel, formatRelative } from "./utils.js";
import { showRestTimer, playIntervalProgram } from "./timer.js";

export function renderDayList(container, navigate) {
  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Training</div>`));
  container.appendChild(el(`<div class="page-subtitle">Wähle deinen heutigen Tag · ${PLAN.cycleLabel}</div>`));

  if (PLAN.overview) {
    container.appendChild(el(`
      <div class="insight-card insight-good">
        ${PLAN.overview.strategy}
        <div style="margin-top:8px;opacity:0.85">${PLAN.overview.schedule.join("<br/>")}</div>
      </div>
    `));
  }

  PLAN.days.forEach((day) => {
    const lastSessions = getLastSessionsForDay(day.id, 1);
    const lastText = lastSessions[0] ? `Zuletzt ${formatRelative(lastSessions[0].dateISO)}` : "Noch nicht trainiert";
    const item = el(`
      <button class="day-list-item" style="width:100%;text-align:left;border:1px solid var(--border);font-family:inherit" data-day="${day.id}">
        <div class="day-num">${dayShort(day)}</div>
        <div class="info">
          <div class="name">${dayLabel(day)} — ${day.title}</div>
          <div class="sub">${day.subtitle}</div>
          <div class="sub" style="margin-top:4px;color:var(--text-faint)">${lastText}</div>
        </div>
        <div class="chevron">›</div>
      </button>
    `);
    item.addEventListener("click", () => navigate(`train/${day.id}`));
    container.appendChild(item);
  });
}

function warmupCard(day) {
  return el(`
    <div class="warmup-card">
      <div class="warmup-title">WARM-UP — ${day.warmup.minutes} MIN</div>
      <ul>${day.warmup.items.map((i) => `<li>${i}</li>`).join("")}</ul>
    </div>
  `);
}

function needsWeightInput(loadType) {
  return ["barbell", "dumbbell", "kettlebell", "bodyweight_loaded"].includes(loadType);
}

// Nach Satzabschluss vergehen realistisch ~15 Sek für Ausführung + Eintragen, bevor die eigentliche
// Erholung beginnt — die angezeigte Pause wird daher um diesen Betrag verkürzt.
function effectiveRestSeconds(pauseSeconds) {
  return Math.max(0, (pauseSeconds || 60) - 15);
}

// Letzte Einheit, in der dieser Bewegung tatsächlich Sätze protokolliert wurden (leere Einträge werden übersprungen).
function getLastMovementSets(recordId, movementIdx) {
  const history = getExerciseHistory(recordId, 10);
  const last = history.find((h) => (h.movements?.[movementIdx]?.sets || []).some(Boolean));
  return last?.movements?.[movementIdx]?.sets || null;
}

// Nur Übungen mit mindestens einem protokollierten Satz speichern, damit leere Einträge
// nicht die Vorbelegung aus dem letzten echten Training verdrängen.
function pruneEntries(entries) {
  const pruned = {};
  Object.entries(entries).forEach(([id, data]) => {
    const hasData = (data.movements || []).some((mv) => (mv.sets || []).some((s) => s && (s.reps != null || s.weight != null)));
    if (hasData) pruned[id] = data;
  });
  return pruned;
}

function targetHint(recordId, movement) {
  const target = getExerciseTarget(recordId);
  const last = getLastMovementSets(recordId, 0);
  const parts = [];
  if (target?.weightKg != null) parts.push(`Ziel: ${target.weightKg} kg`);
  else if (last) {
    const w = last.slice(-1)[0]?.weight;
    if (w != null) parts.push(`Zuletzt: ${w} kg`);
  }
  parts.push(repLabel(movement));
  return parts.join(" · ");
}

// Trägt den Wert von Satz 1 automatisch in alle noch nicht manuell bearbeiteten Folgesätze ein
// (Zeitersparnis), bleibt aber pro Satz überschreibbar — sobald ein Satz manuell geändert wird,
// wird er nicht mehr automatisch überschrieben.
function wireFirstSetPropagation(rows, pristine) {
  const first = rows[0];
  if (!first) return;
  const propagate = () => {
    pristine.forEach((idx) => {
      const row = rows[idx];
      if (!row) return;
      if (row.weightInput && first.weightInput) row.weightInput.value = first.weightInput.value;
      if (row.repsInput && first.repsInput) row.repsInput.value = first.repsInput.value;
    });
  };
  first.weightInput?.addEventListener("input", propagate);
  first.repsInput?.addEventListener("input", propagate);
  rows.forEach((row, idx) => {
    if (idx === 0) return;
    const markDirty = () => pristine.delete(idx);
    row.weightInput?.addEventListener("input", markDirty);
    row.repsInput?.addEventListener("input", markDirty);
  });
}

function buildSetRows(exercise, movement, movementIdx, state, recordId = exercise.id) {
  const loadType = movement.loadType || exercise.loadType;
  const showWeight = needsWeightInput(loadType);
  const wrap = el(`<table class="set-table"><thead><tr>
      <th></th>
      ${showWeight ? `<th>${loadUnitLabel(loadType)}</th>` : ""}
      <th>Wdh.</th>
      <th></th>
    </tr></thead><tbody></tbody></table>`);
  const tbody = wrap.querySelector("tbody");
  const target = getExerciseTarget(recordId);
  const lastSets = getLastMovementSets(recordId, movementIdx);
  const pristine = new Set();
  const rows = [];

  for (let i = 0; i < movement.sets; i++) {
    const lastSet = lastSets?.[i];
    const row = el(`
      <tr class="set-row">
        <td class="set-idx">${i + 1}</td>
        ${showWeight ? `<td><input class="num-input" inputmode="decimal" type="number" step="0.5" placeholder="${target?.weightKg ?? "–"}" data-role="weight" /></td>` : ""}
        <td><input class="num-input" inputmode="numeric" type="number" placeholder="${movement.repType === "range" ? movement.repMax : movement.repFixed || ""}" data-role="reps" /></td>
        <td><button class="set-check" type="button" data-role="check">✓</button></td>
      </tr>
    `);
    tbody.appendChild(row);

    const weightInput = row.querySelector('[data-role="weight"]');
    const repsInput = row.querySelector('[data-role="reps"]');
    const prefWeight = lastSet?.weight ?? target?.weightKg ?? null;
    if (weightInput && prefWeight != null) weightInput.value = prefWeight;
    if (lastSet?.reps != null) repsInput.value = lastSet.reps;
    if (i > 0) pristine.add(i);
    rows.push({ weightInput, repsInput });

    const checkBtn = row.querySelector('[data-role="check"]');
    checkBtn.addEventListener("click", () => {
      const repsVal = repsInput.value;
      const weightVal = weightInput ? weightInput.value : null;
      if (!repsVal) {
        repsInput.focus();
        return;
      }
      state.entries[recordId] = state.entries[recordId] || { movements: exercise.movements.map(() => ({ sets: [] })) };
      state.entries[recordId].movements[movementIdx].sets[i] = {
        reps: Number(repsVal),
        weight: weightVal ? Number(weightVal) : null,
      };
      checkBtn.classList.add("done");
      checkBtn.disabled = true;
      pristine.delete(i);
      const isLast = i === movement.sets - 1;
      if (!isLast) {
        showRestTimer(effectiveRestSeconds(exercise.pauseSeconds), {
          label: `Pause · ${exercise.name}`,
          onDone: () => {
            const nextRow = tbody.children[i + 1];
            nextRow?.querySelector('[data-role="weight"], [data-role="reps"]')?.focus();
          },
        });
      }
    });
  }
  wireFirstSetPropagation(rows, pristine);
  return wrap;
}

function singleExerciseCard(exercise, state) {
  const card = el(`<div class="card card-accent-${exercise.badgeColor}"></div>`);
  const header = el(`
    <div class="ex-header">
      <div class="badge badge-${exercise.badgeColor}">${exercise.badge}</div>
      <div>
        <div class="ex-name">${exercise.name}</div>
        <div class="ex-cue">${exercise.cue}</div>
      </div>
    </div>
  `);
  card.appendChild(header);

  exercise.movements.forEach((movement, idx) => {
    if (movement.name) card.appendChild(el(`<div style="font-size:13px;font-weight:700;color:var(--text-dim);margin:10px 0 4px">${movement.name}</div>`));
    card.appendChild(el(`<div style="font-size:12px;color:var(--text-faint);margin-bottom:4px">${targetHint(exercise.id, movement)}</div>`));
    card.appendChild(buildSetRows(exercise, movement, idx, state));
  });

  const pauseText = exercise.chainNext ? "Direkt weiter zur nächsten Übung" : `Pause: ${exercise.pauseLabel}`;
  card.appendChild(el(`<div class="footer-note">→ ${exercise.footerNote}<br/><span style="opacity:0.7">${pauseText}</span></div>`));
  return card;
}

// Rundenbasierte Karte für Supersätze: pro Runde wird jede Teilübung nacheinander ausgeführt und erst
// NACH der letzten Teilübung der Runde beginnt die Erholungspause. Deckt sowohl A1→A2-Paare (zwei eigene
// Übungs-IDs) als auch Karten mit mehreren Bewegungen einer Übung (z. B. Seitheben + Face Pull) ab.
function renderRoundBasedCard({ parts, pauseSeconds, headerHtml, footerHtml, accentColor, state, pauseLabelText }) {
  const card = el(`<div class="card card-accent-${accentColor}"></div>`);
  card.appendChild(el(headerHtml));

  const seenRecords = new Set();
  parts.forEach((p) => {
    if (seenRecords.has(p.recordId)) return;
    seenRecords.add(p.recordId);
    state.entries[p.recordId] = state.entries[p.recordId] || { movements: Array.from({ length: p.totalMovements }, () => ({ sets: [] })) };
  });

  const hints = parts.map((p) => `${p.label}: ${targetHint(p.recordId, p.movement)}`).join("  ·  ");
  card.appendChild(el(`<div style="font-size:12px;color:var(--text-faint);margin-bottom:4px">${hints}</div>`));

  const rounds = Math.max(...parts.map((p) => p.movement.sets));
  const table = el(`<table class="set-table"><thead><tr>
      <th></th>
      ${parts
        .map((p) => {
          const unit = p.movement.repType === "time" ? "Sek" : "Wdh.";
          return needsWeightInput(p.loadType) ? `<th>${p.label} kg</th><th>${p.label} ${unit}</th>` : `<th>${p.label} ${unit}</th>`;
        })
        .join("")}
      <th></th>
    </tr></thead><tbody></tbody></table>`);
  const tbody = table.querySelector("tbody");

  const partsState = parts.map((p) => ({ pristine: new Set(), rows: [], lastSets: getLastMovementSets(p.recordId, p.movementIdx), target: getExerciseTarget(p.recordId) }));

  for (let i = 0; i < rounds; i++) {
    const row = el(`<tr class="set-row"><td class="set-idx">${i + 1}</td></tr>`);
    const checkCell = document.createElement("td");
    const cellsBeforeCheck = [];

    parts.forEach((p, pIdx) => {
      const active = i < p.movement.sets;
      const showWeight = needsWeightInput(p.loadType);
      const ps = partsState[pIdx];
      const lastSet = active ? ps.lastSets?.[i] : null;
      let weightInput = null;
      if (showWeight) {
        const td = document.createElement("td");
        weightInput = document.createElement("input");
        weightInput.className = "num-input";
        weightInput.type = "number";
        weightInput.step = "0.5";
        weightInput.inputMode = "decimal";
        if (!active) weightInput.disabled = true;
        weightInput.placeholder = ps.target?.weightKg ?? "–";
        const prefWeight = lastSet?.weight ?? ps.target?.weightKg ?? null;
        if (prefWeight != null) weightInput.value = prefWeight;
        td.appendChild(weightInput);
        cellsBeforeCheck.push(td);
      }
      const repsTd = document.createElement("td");
      const repsInput = document.createElement("input");
      repsInput.className = "num-input";
      repsInput.type = "number";
      repsInput.inputMode = "numeric";
      if (!active) repsInput.disabled = true;
      repsInput.placeholder = p.movement.repType === "range" ? p.movement.repMax : p.movement.repFixed || "";
      if (lastSet?.reps != null) repsInput.value = lastSet.reps;
      repsTd.appendChild(repsInput);
      cellsBeforeCheck.push(repsTd);

      if (active) {
        if (i > 0) ps.pristine.add(i);
        ps.rows.push({ weightInput, repsInput });
      }
    });

    cellsBeforeCheck.forEach((td) => row.appendChild(td));

    const checkBtn = el(`<button class="set-check" type="button">✓</button>`);
    checkCell.appendChild(checkBtn);
    row.appendChild(checkCell);
    tbody.appendChild(row);

    checkBtn.addEventListener("click", () => {
      // partsState[pIdx].rows wird pro Teilübung nur für aktive Runden befüllt (fortlaufend, ohne Lücken),
      // daher entspricht Index i in dieser Liste genau der aktuellen Runde.
      const activeEntries = parts.map((p, pIdx) => (i < p.movement.sets ? partsState[pIdx].rows[i] : null));
      const firstMissing = activeEntries.find((e) => e && !e.repsInput.value);
      if (firstMissing) {
        firstMissing.repsInput.focus();
        return;
      }
      parts.forEach((p, pIdx) => {
        if (i >= p.movement.sets) return;
        const entry = activeEntries[pIdx];
        state.entries[p.recordId].movements[p.movementIdx].sets[i] = {
          reps: Number(entry.repsInput.value),
          weight: entry.weightInput?.value ? Number(entry.weightInput.value) : null,
        };
        partsState[pIdx].pristine.delete(i);
      });
      checkBtn.classList.add("done");
      checkBtn.disabled = true;
      const isLast = i === rounds - 1;
      if (!isLast) {
        showRestTimer(effectiveRestSeconds(pauseSeconds), {
          label: pauseLabelText,
          onDone: () => {
            const nextRow = tbody.children[i + 1];
            nextRow?.querySelector("input:not(:disabled)")?.focus();
          },
        });
      }
    });
  }

  parts.forEach((p, pIdx) => wireFirstSetPropagation(partsState[pIdx].rows, partsState[pIdx].pristine));

  card.appendChild(table);
  card.appendChild(el(footerHtml));
  return card;
}

function chainPairCard(ex1, ex2, state) {
  const parts = [
    { recordId: ex1.id, movementIdx: 0, movement: ex1.movements[0], loadType: ex1.loadType, label: ex1.badge, totalMovements: 1 },
    { recordId: ex2.id, movementIdx: 0, movement: ex2.movements[0], loadType: ex2.loadType, label: ex2.badge, totalMovements: 1 },
  ];
  const headerHtml = `
    <div class="ex-header">
      <div class="badge badge-${ex1.badgeColor}">${ex1.badge}</div>
      <div>
        <div class="ex-name">${ex1.name} <span style="color:var(--text-faint);font-weight:600">+</span> ${ex2.name}</div>
        <div class="ex-cue">${ex1.cue}</div>
      </div>
    </div>
  `;
  const footerHtml = `<div class="footer-note">→ ${ex1.footerNote}<br/>→ ${ex2.footerNote}<br/><span style="opacity:0.7">Danach ${ex2.pauseLabel} Pause</span></div>`;
  return renderRoundBasedCard({
    parts,
    pauseSeconds: ex2.pauseSeconds,
    headerHtml,
    footerHtml,
    accentColor: ex1.badgeColor,
    state,
    pauseLabelText: `Pause · ${ex1.name} + ${ex2.name}`,
  });
}

function multiMovementCard(exercise, state) {
  const parts = exercise.movements.map((m, idx) => ({
    recordId: exercise.id,
    movementIdx: idx,
    movement: m,
    loadType: m.loadType || exercise.loadType,
    label: m.name || `Teil ${idx + 1}`,
    totalMovements: exercise.movements.length,
  }));
  const headerHtml = `
    <div class="ex-header">
      <div class="badge badge-${exercise.badgeColor}">${exercise.badge}</div>
      <div>
        <div class="ex-name">${exercise.name}</div>
        <div class="ex-cue">${exercise.cue}</div>
      </div>
    </div>
  `;
  const footerHtml = `<div class="footer-note">→ ${exercise.footerNote}<br/><span style="opacity:0.7">Pause: ${exercise.pauseLabel}</span></div>`;
  return renderRoundBasedCard({
    parts,
    pauseSeconds: exercise.pauseSeconds,
    headerHtml,
    footerHtml,
    accentColor: exercise.badgeColor,
    state,
    pauseLabelText: `Pause · ${exercise.name}`,
  });
}

function buildRenderQueue(exercises) {
  const queue = [];
  const skip = new Set();
  exercises.forEach((ex, i) => {
    if (skip.has(ex.id)) return;
    if (ex.chainNext) {
      const partner = exercises.find((e) => e.id === ex.chainNext);
      if (partner) {
        queue.push({ type: "chainPair", ex1: ex, ex2: partner });
        skip.add(partner.id);
        return;
      }
    }
    if (ex.type === "interval") queue.push({ type: "interval", ex });
    else queue.push({ type: ex.movements.length > 1 ? "multiMovement" : "single", ex });
  });
  return queue;
}

function finishSession(day, state, container, navigate) {
  const entries = pruneEntries(state.entries);
  if (Object.keys(entries).length === 0) {
    navigate("train");
    return;
  }
  saveSessionLog({ dayId: day.id, entries });

  day.exercises.forEach((ex) => {
    if (ex.type === "interval") return;
    const logged = entries[ex.id];
    if (!logged) return;
    updateTargetAfterSession(ex, day.id, logged.movements);
  });

  renderSummary(container, day, navigate);
}

function renderSummary(container, day, navigate) {
  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Training gespeichert ✓</div>`));
  container.appendChild(el(`<div class="page-subtitle">${dayLabel(day)} — gute Arbeit.</div>`));

  const changes = getRecentChanges(6).filter((c) => c.dayId === day.id && Date.now() - new Date(c.dateISO).getTime() < 60000);

  if (changes.length > 0) {
    container.appendChild(el(`<div class="section-title">Was sich für nächstes Mal ändert</div>`));
    const list = el(`<div class="card"></div>`);
    changes.forEach((c) => {
      list.appendChild(el(`
        <div class="change-item">
          <div class="dot" style="background:${c.kind === "deload" ? "var(--red)" : "var(--green)"}"></div>
          <div class="txt">
            <div class="title">${c.title}</div>
            <div class="reason">${c.reason}</div>
          </div>
        </div>
      `));
    });
    container.appendChild(list);
  } else {
    container.appendChild(el(`<div class="insight-card insight-good">Alle Gewichte bleiben gleich — Zielbereich noch nicht ganz erreicht. Weiter so!</div>`));
  }

  const btn = el(`<button class="btn btn-primary" style="margin-top:12px">Zum Dashboard</button>`);
  btn.addEventListener("click", () => navigate("dashboard"));
  container.appendChild(btn);
}

// Intervall-Block (Airbike): Karte mit Timer + Ergebnis-Eintrag (geschaffte Runden, Gesamtkalorien) für den
// Wochenvergleich. Nutzt dieselbe {reps, weight}-Struktur wie Kraft-Übungen (reps=Runden, weight=Kalorien),
// damit Verlauf und Vorbelegung wiederverwendet werden. Gespeichert wird nur, was aktiv eingetippt wurde.
function intervalBlockCards(ib, state) {
  const accent = ib.badgeColor || "orange";
  const timerCard = el(`
    <div class="card card-accent-${accent}">
      <div class="ex-header">
        <div class="badge badge-${accent}">${ib.badge}</div>
        <div><div class="ex-name">${ib.label}</div><div class="ex-cue">${ib.cue}</div></div>
      </div>
      <div class="stat-row">
        <div class="stat-box"><div class="stat-label">Dauer</div><div class="stat-value orange">${ib.totalLabel}</div></div>
        <div class="stat-box"><div class="stat-label">Runden</div><div class="stat-value">${ib.baseRounds}</div></div>
        <div class="stat-box"><div class="stat-label">Sprint/Locker</div><div class="stat-value">${ib.workSeconds}/${ib.restSeconds}s</div></div>
      </div>
      <div class="footer-note">→ ${ib.footerNote}</div>
      <button class="btn btn-primary" style="margin-top:12px" data-action="start">Intervall-Timer starten</button>
    </div>
  `);
  timerCard.querySelector('[data-action="start"]').addEventListener("click", () => {
    const phases = [];
    for (let r = 1; r <= ib.baseRounds; r++) {
      phases.push({ label: `Sprint · Runde ${r}/${ib.baseRounds}`, seconds: ib.workSeconds, kind: "work" });
      phases.push({ label: `Locker · Runde ${r}/${ib.baseRounds}`, seconds: ib.restSeconds, kind: "rest" });
    }
    playIntervalProgram(phases, { onAllDone: () => {} });
  });

  const resultCard = el(`<div class="card"></div>`);
  resultCard.appendChild(el(`<div class="ex-name" style="margin-bottom:2px">${ib.label}: Ergebnis eintragen</div>`));
  resultCard.appendChild(el(`<div class="ex-cue" style="margin-bottom:10px">Für den Vergleich zur nächsten Woche</div>`));

  const lastSets = getLastMovementSets(ib.id, 0);
  const row = el(`
    <div class="form-grid" style="margin-bottom:0">
      <div class="field"><label>Geschaffte Runden</label><input type="number" inputmode="numeric" data-role="rounds" placeholder="${ib.baseRounds}" /></div>
      <div class="field"><label>Kalorien gesamt</label><input type="number" inputmode="numeric" data-role="kcal" placeholder="z. B. 140" /></div>
    </div>
  `);
  const roundsInput = row.querySelector('[data-role="rounds"]');
  const kcalInput = row.querySelector('[data-role="kcal"]');
  if (lastSets?.[0]?.reps != null) roundsInput.value = lastSets[0].reps;
  if (lastSets?.[0]?.weight != null) kcalInput.value = lastSets[0].weight;

  const sync = () => {
    state.entries[ib.id] = {
      movements: [
        {
          sets: [
            {
              reps: roundsInput.value ? Number(roundsInput.value) : null,
              weight: kcalInput.value ? Number(kcalInput.value) : null,
            },
          ],
        },
      ],
    };
  };
  roundsInput.addEventListener("input", sync);
  kcalInput.addEventListener("input", sync);
  resultCard.appendChild(row);

  return [timerCard, resultCard];
}

export function renderDayTrainer(container, dayId, navigate) {
  const day = getDay(dayId);
  if (!day) return renderDayList(container, navigate);

  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">${dayLabel(day)} — ${day.title}</div>`));
  container.appendChild(el(`<div class="page-subtitle">${day.subtitle}${PLAN.cycleLabel ? " · " + PLAN.cycleLabel : ""}</div>`));
  container.appendChild(warmupCard(day));

  const state = { entries: {} };
  const queue = buildRenderQueue(day.exercises);
  queue.forEach((item) => {
    if (item.type === "chainPair") container.appendChild(chainPairCard(item.ex1, item.ex2, state));
    else if (item.type === "multiMovement") container.appendChild(multiMovementCard(item.ex, state));
    else if (item.type === "interval") intervalBlockCards(item.ex, state).forEach((card) => container.appendChild(card));
    else container.appendChild(singleExerciseCard(item.ex, state));
  });

  const notesCard = el(`
    <div class="target-panel">
      <div class="target-title">${day.notesTitle || "PROGRESSIONS-ZIEL"}</div>
      ${day.progressionNotes.map((n) => `<p style="font-size:13px;color:#cfe8d6;margin-bottom:8px">${n}</p>`).join("")}
    </div>
  `);
  container.appendChild(notesCard);

  const finishBtn = el(`<button class="btn btn-primary" style="margin-top:16px">Training abschließen</button>`);
  finishBtn.addEventListener("click", () => finishSession(day, state, container, navigate));
  container.appendChild(finishBtn);
}
