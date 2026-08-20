import { el } from "./utils.js";

let audioCtx = null;

// iOS/Safari lässt AudioContext nur innerhalb einer echten Nutzergeste starten. Wird bei der ersten
// Berührung der App aufgerufen (siehe main.js), damit die Pieptöne der Timer später zuverlässig zu hören sind.
export function unlockAudioOnFirstInteraction() {
  const unlock = () => {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) {
      /* Web Audio nicht verfügbar — Timer funktionieren trotzdem, nur ohne Ton */
    }
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
}

function beep(freq = 880, durationMs = 180) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch (e) {
    /* Audio evtl. gesperrt bis erste Nutzerinteraktion — kein Problem, Timer läuft trotzdem */
  }
}

/**
 * Einfacher Countdown-Overlay (Pausentimer zwischen Sätzen).
 * onDone wird aufgerufen, wenn die Zeit abläuft (Ton + Callback).
 */
export function showRestTimer(seconds, { label = "Pause", onDone } = {}) {
  let remaining = seconds;
  const overlay = el(`
    <div class="timer-overlay">
      <div class="timer-label">${label}</div>
      <div class="timer-clock">${remaining}</div>
      <div class="timer-actions">
        <button class="btn btn-ghost" data-action="minus">−15s</button>
        <button class="btn btn-secondary" data-action="skip">Überspringen</button>
        <button class="btn btn-ghost" data-action="plus">+15s</button>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  const clockEl = overlay.querySelector(".timer-clock");

  let intervalId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(intervalId);
      beep(1046, 300);
      overlay.remove();
      onDone && onDone();
      return;
    }
    if (remaining <= 3) beep(660, 100);
    clockEl.textContent = remaining;
  }, 1000);

  overlay.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "skip") {
      clearInterval(intervalId);
      overlay.remove();
      onDone && onDone();
    } else if (action === "plus") {
      remaining += 15;
      clockEl.textContent = remaining;
    } else if (action === "minus") {
      remaining = Math.max(1, remaining - 15);
      clockEl.textContent = remaining;
    }
  });

  return () => {
    clearInterval(intervalId);
    overlay.remove();
  };
}

/**
 * Auto-fortlaufender Intervall-Player für Circuit/Metabolic-Blöcke.
 * phases: [{ label, seconds, kind: 'work'|'rest', sub }]
 */
export function playIntervalProgram(phases, { onAllDone } = {}) {
  let idx = 0;
  let remaining = phases[0].seconds;
  const overlay = el(`
    <div class="timer-overlay">
      <div class="timer-label" data-role="phase-label"></div>
      <div class="timer-clock" data-role="clock"></div>
      <div class="timer-next" data-role="next"></div>
      <div class="timer-actions">
        <button class="btn btn-ghost" data-action="prev">⏮</button>
        <button class="btn btn-secondary" data-action="pause">Pause</button>
        <button class="btn btn-ghost" data-action="next">⏭</button>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  const clockEl = overlay.querySelector('[data-role="clock"]');
  const labelEl = overlay.querySelector('[data-role="phase-label"]');
  const nextEl = overlay.querySelector('[data-role="next"]');
  const pauseBtn = overlay.querySelector('[data-action="pause"]');

  let paused = false;

  function render() {
    const phase = phases[idx];
    labelEl.textContent = phase.label;
    clockEl.textContent = remaining;
    clockEl.classList.toggle("work", phase.kind === "work");
    const next = phases[idx + 1];
    nextEl.textContent = next ? `Danach: ${next.label}` : "Letzte Phase";
  }

  function advance() {
    idx += 1;
    if (idx >= phases.length) {
      clearInterval(intervalId);
      beep(1200, 400);
      overlay.remove();
      onAllDone && onAllDone();
      return;
    }
    remaining = phases[idx].seconds;
    beep(phases[idx].kind === "work" ? 880 : 440, 220);
    render();
  }

  render();

  let intervalId = setInterval(() => {
    if (paused) return;
    remaining -= 1;
    if (remaining <= 0) {
      advance();
      return;
    }
    if (remaining <= 3) beep(660, 90);
    clockEl.textContent = remaining;
  }, 1000);

  overlay.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "pause") {
      paused = !paused;
      pauseBtn.textContent = paused ? "Weiter" : "Pause";
    } else if (action === "next") {
      advance();
    } else if (action === "prev") {
      idx = Math.max(0, idx - 1);
      remaining = phases[idx].seconds;
      render();
    }
  });

  return () => {
    clearInterval(intervalId);
    overlay.remove();
  };
}
