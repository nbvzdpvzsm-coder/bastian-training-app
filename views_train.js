import { PLAN, getDay } from "./data.js";
import { getExerciseTarget, saveSessionLog, getLastSessionForExercise, getLastSessionsForDay, getRecentChanges } from "./store.js";
import { updateTargetAfterSession } from "./progression.js";
import { el, repLabel, loadUnitLabel, formatRelative } from "./utils.js";
import { showRestTimer, playIntervalProgram } from "./timer.js";

export function renderDayList(container, navigate) {
  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Training</div>`));
  container.appendChild(el(`<div class="page-subtitle">Wähle deinen heutigen Tag</div>`));

  PLAN.days.forEach((day) => {
    const lastSessions = getLastSessionsForDay(day.id, 1);
    const lastText = lastSessions[0] ? `Zuletzt ${formatRelative(lastSessions[0].dateISO)}` : "Noch nicht trainiert";
    const item = el(`
      <button class="day-list-item" style="width:100%;text-align:left;border:1px solid var(--border);font-family:inherit" data-day="${day.id}">
        <div class="day-num">${day.dayNumber}</div>
        <div class="info">
          <div class="name">${day.title}</div>
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

function targetHint(exercise, movement) {
  const target = getExerciseTarget(exercise.id);
  const last = getLastSessionForExercise(exercise.id);
  const parts = [];
  if (target?.weightKg != null) parts.push(`Ziel: ${target.weightKg} kg`);
  else if (last) {
    const w = last.movements?.[0]?.sets?.slice(-1)[0]?.weight;
    if (w != null) parts.push(`Zuletzt: ${w} kg`);
  }
  parts.push(repLabel(movement));
  return parts.join(" · ");
}

function buildSetRows(exercise, movement, movementIdx, state) {
  const wrap = el(`<table class="set-table"><thead><tr>
      <th></th>
      ${needsWeightInput(movement.loadType || exercise.loadType) ? `<th>${loadUnitLabel(movement.loadType || exercise.loadType)}</th>` : ""}
      <th>Wdh.</th>
      <th></th>
    </tr></thead><tbody></tbody></table>`);
  const tbody = wrap.querySelector("tbody");
  const showWeight = needsWeightInput(movement.loadType || exercise.loadType);
  const target = getExerciseTarget(exercise.id);

  for (let i = 0; i < movement.sets; i++) {
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
    if (weightInput && target?.weightKg != null) weightInput.value = target.weightKg;

    const checkBtn = row.querySelector('[data-role="check"]');
    checkBtn.addEventListener("click", () => {
      const repsVal = row.querySelector('[data-role="reps"]').value;
      const weightVal = weightInput ? weightInput.value : null;
      if (!repsVal) {
        row.querySelector('[data-role="reps"]').focus();
        return;
      }
      state.entries[exercise.id] = state.entries[exercise.id] || { movements: exercise.movements.map(() => ({ sets: [] })) };
      state.entries[exercise.id].movements[movementIdx].sets[i] = {
        reps: Number(repsVal),
        weight: weightVal ? Number(weightVal) : null,
      };
      checkBtn.classList.add("done");
      checkBtn.disabled = true;
      const isLast = i === movement.sets - 1;
      if (!isLast) {
        const pauseSec = exercise.pauseSeconds || 60;
        showRestTimer(pauseSec, {
          label: `Pause · ${exercise.name}`,
          onDone: () => {
            const nextRow = tbody.children[i + 1];
            nextRow?.querySelector('[data-role="weight"], [data-role="reps"]')?.focus();
          },
        });
      }
    });
  }
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
    card.appendChild(el(`<div style="font-size:12px;color:var(--text-faint);margin-bottom:4px">${targetHint(exercise, movement)}</div>`));
    card.appendChild(buildSetRows(exercise, movement, idx, state));
  });

  const pauseText = exercise.chainNext ? "Direkt weiter zur nächsten Übung" : `Pause: ${exercise.pauseLabel}`;
  card.appendChild(el(`<div class="footer-note">→ ${exercise.footerNote}<br/><span style="opacity:0.7">${pauseText}</span></div>`));
  return card;
}

// Superset-Paare (A1→A2, B1→B2 etc.) werden als eine Karte mit rundenweiser Eingabe gerendert,
// aber weiterhin unter zwei eigenen Übungs-IDs geloggt/progressiert.
function supersetCard(ex1, ex2, state) {
  const card = el(`<div class="card card-accent-${ex1.badgeColor}"></div>`);
  card.appendChild(el(`
    <div class="ex-header">
      <div class="badge badge-${ex1.badgeColor}">${ex1.badge}</div>
      <div>
        <div class="ex-name">${ex1.name} <span style="color:var(--text-faint);font-weight:600">+</span> ${ex2.name}</div>
        <div class="ex-cue">${ex1.cue}</div>
      </div>
    </div>
  `));

  const m1 = ex1.movements[0];
  const m2 = ex2.movements[0];
  const rounds = Math.max(m1.sets, m2.sets);

  state.entries[ex1.id] = state.entries[ex1.id] || { movements: [{ sets: [] }] };
  state.entries[ex2.id] = state.entries[ex2.id] || { movements: [{ sets: [] }] };

  const table = el(`<table class="set-table"><thead><tr>
      <th></th>
      <th>${ex1.badge} kg</th><th>${ex1.badge} Wdh.</th>
      <th>${ex2.badge} kg</th><th>${ex2.badge} Wdh.</th>
      <th></th>
    </tr></thead><tbody></tbody></table>`);
  const tbody = table.querySelector("tbody");

  for (let i = 0; i < rounds; i++) {
    const t1 = getExerciseTarget(ex1.id);
    const t2 = getExerciseTarget(ex2.id);
    const row = el(`
      <tr class="set-row">
        <td class="set-idx">${i + 1}</td>
        <td><input class="num-input" inputmode="decimal" type="number" step="0.5" placeholder="${t1?.weightKg ?? "–"}" data-role="w1" /></td>
        <td><input class="num-input" inputmode="numeric" type="number" placeholder="${m1.repMax || m1.repFixed || ""}" data-role="r1" /></td>
        <td><input class="num-input" inputmode="decimal" type="number" step="0.5" placeholder="${t2?.weightKg ?? "–"}" data-role="w2" /></td>
        <td><input class="num-input" inputmode="numeric" type="number" placeholder="${m2.repMax || m2.repFixed || ""}" data-role="r2" /></td>
        <td><button class="set-check" type="button" data-role="check">✓</button></td>
      </tr>
    `);
    tbody.appendChild(row);
    row.querySelector('[data-role="w1"]').value = t1?.weightKg ?? "";
    row.querySelector('[data-role="w2"]').value = t2?.weightKg ?? "";

    row.querySelector('[data-role="check"]').addEventListener("click", () => {
      const r1 = row.querySelector('[data-role="r1"]').value;
      const r2 = row.querySelector('[data-role="r2"]').value;
      if (!r1 || !r2) return;
      state.entries[ex1.id].movements[0].sets[i] = { reps: Number(r1), weight: Number(row.querySelector('[data-role="w1"]').value) || null };
      state.entries[ex2.id].movements[0].sets[i] = { reps: Number(r2), weight: Number(row.querySelector('[data-role="w2"]').value) || null };
      row.querySelector('[data-role="check"]').classList.add("done");
      row.querySelector('[data-role="check"]').disabled = true;
      const isLast = i === rounds - 1;
      if (!isLast) {
        showRestTimer(ex2.pauseSeconds || 90, {
          label: `Pause · ${ex1.name} + ${ex2.name}`,
          onDone: () => tbody.children[i + 1]?.querySelector('[data-role="w1"], [data-role="r1"]')?.focus(),
        });
      }
    });
  }
  card.appendChild(table);
  card.appendChild(el(`<div class="footer-note">→ ${ex1.footerNote}<br/>→ ${ex2.footerNote}<br/><span style="opacity:0.7">Danach ${ex2.pauseLabel} Pause</span></div>`));
  return card;
}

function buildRenderQueue(exercises) {
  const queue = [];
  const skip = new Set();
  exercises.forEach((ex, i) => {
    if (skip.has(ex.id)) return;
    if (ex.chainNext) {
      const partner = exercises.find((e) => e.id === ex.chainNext);
      if (partner) {
        queue.push({ type: "superset", ex1: ex, ex2: partner });
        skip.add(partner.id);
        return;
      }
    }
    queue.push({ type: "single", ex });
  });
  return queue;
}

function finishSession(day, state, container, navigate) {
  const hadAnyEntry = Object.keys(state.entries).length > 0;
  if (!hadAnyEntry) {
    navigate("train");
    return;
  }
  saveSessionLog({ dayId: day.id, entries: state.entries });

  const changesBefore = [];
  day.exercises.forEach((ex) => {
    const logged = state.entries[ex.id];
    if (!logged) return;
    updateTargetAfterSession(ex, day.id, logged.movements);
  });

  renderSummary(container, day, navigate);
}

function renderSummary(container, day, navigate) {
  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Training gespeichert ✓</div>`));
  container.appendChild(el(`<div class="page-subtitle">${day.title} — gute Arbeit.</div>`));

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

function renderCircuitDay(container, day, navigate) {
  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Tag ${day.dayNumber} — ${day.title}</div>`));
  container.appendChild(el(`<div class="page-subtitle">${day.subtitle}${PLAN.cycleLabel ? " · " + PLAN.cycleLabel : ""}</div>`));
  container.appendChild(warmupCard(day));

  const ib = day.intervalBlock;
  const prevCount = getLastSessionsForDay(day.id, 99).length;
  const useAdvanced = prevCount >= ib.advanced.afterSessions;
  const cfg = useAdvanced ? ib.advanced : { rounds: ib.baseRounds, workSeconds: ib.workSeconds, restSeconds: ib.restSeconds };

  const blockACard = el(`
    <div class="card card-accent-orange">
      <div class="ex-header">
        <div class="badge badge-orange">A</div>
        <div><div class="ex-name">${ib.label}</div><div class="ex-cue">${ib.cue}</div></div>
      </div>
      <div class="stat-row">
        <div class="stat-box"><div class="stat-label">Dauer</div><div class="stat-value orange">${ib.totalLabel}</div></div>
        <div class="stat-box"><div class="stat-label">Runden</div><div class="stat-value">${cfg.rounds}${useAdvanced ? ` (${ib.advanced.badge})` : ""}</div></div>
        <div class="stat-box"><div class="stat-label">Sprint/Locker</div><div class="stat-value">${cfg.workSeconds}/${cfg.restSeconds}s</div></div>
      </div>
      <div class="footer-note">→ ${ib.footerNote}</div>
      <button class="btn btn-primary" style="margin-top:12px" data-action="start-a">Intervall-Timer starten</button>
    </div>
  `);
  blockACard.querySelector('[data-action="start-a"]').addEventListener("click", () => {
    const phases = [];
    for (let r = 1; r <= cfg.rounds; r++) {
      phases.push({ label: `Sprint · Runde ${r}/${cfg.rounds}`, seconds: cfg.workSeconds, kind: "work" });
      phases.push({ label: `Locker · Runde ${r}/${cfg.rounds}`, seconds: cfg.restSeconds, kind: "rest" });
    }
    playIntervalProgram(phases, { onAllDone: () => {} });
  });
  container.appendChild(blockACard);

  const cb = day.circuitBlock;
  const blockBCard = el(`
    <div class="card card-accent-purple">
      <div class="ex-header">
        <div class="badge badge-purple">B</div>
        <div><div class="ex-name">Circuit · ${cb.rounds} Runden</div><div class="ex-cue">Ohne Pause durch B1–B5, danach ${cb.roundRestSeconds}s Pause</div></div>
      </div>
      <div class="circuit-exlist">
        ${cb.exercises.map((e) => `<div class="row"><div class="badge badge-${e.badgeColor}" style="width:28px;height:28px;font-size:11px">${e.badge}</div><div><b>${e.name}</b> <span style="color:var(--text-faint)">— ${e.loadLabel}</span><div style="color:var(--text-dim);font-size:12px">${e.cue}</div></div></div>`).join("")}
      </div>
      <button class="btn btn-primary" style="margin-top:12px" data-action="start-b">Circuit-Timer starten</button>
    </div>
  `);
  blockBCard.querySelector('[data-action="start-b"]').addEventListener("click", () => {
    const phases = [];
    for (let r = 1; r <= cb.rounds; r++) {
      cb.exercises.forEach((e) => phases.push({ label: `${e.badge} · ${e.name} (Runde ${r}/${cb.rounds})`, seconds: e.workSeconds, kind: "work" }));
      if (r < cb.rounds) phases.push({ label: `Pause vor Runde ${r + 1}`, seconds: cb.roundRestSeconds, kind: "rest" });
    }
    playIntervalProgram(phases, { onAllDone: () => {} });
  });
  container.appendChild(blockBCard);

  container.appendChild(el(`
    <div class="card">
      <div class="ex-name">${day.finisher.label}</div>
      <div class="footer-note" style="margin-top:6px">${day.finisher.detail}</div>
    </div>
  `));

  const finishBtn = el(`<button class="btn btn-secondary" style="margin-top:6px">Training abschließen</button>`);
  finishBtn.addEventListener("click", () => {
    saveSessionLog({ dayId: day.id, entries: {} });
    navigate("dashboard");
  });
  container.appendChild(finishBtn);
}

export function renderDayTrainer(container, dayId, navigate) {
  const day = getDay(dayId);
  if (!day) return renderDayList(container, navigate);

  if (day.isCircuitDay) return renderCircuitDay(container, day, navigate);

  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Tag ${day.dayNumber} — ${day.title}</div>`));
  container.appendChild(el(`<div class="page-subtitle">${day.subtitle}${PLAN.cycleLabel ? " · " + PLAN.cycleLabel : ""}</div>`));
  container.appendChild(warmupCard(day));

  const state = { entries: {} };
  const queue = buildRenderQueue(day.exercises);
  queue.forEach((item) => {
    container.appendChild(item.type === "single" ? singleExerciseCard(item.ex, state) : supersetCard(item.ex1, item.ex2, state));
  });

  const notesCard = el(`
    <div class="target-panel">
      <div class="target-title">PROGRESSIONS-ZIEL</div>
      ${day.progressionNotes.map((n) => `<p style="font-size:13px;color:#cfe8d6;margin-bottom:8px">${n}</p>`).join("")}
    </div>
  `);
  container.appendChild(notesCard);

  const finishBtn = el(`<button class="btn btn-primary" style="margin-top:16px">Training abschließen</button>`);
  finishBtn.addEventListener("click", () => finishSession(day, state, container, navigate));
  container.appendChild(finishBtn);
}
