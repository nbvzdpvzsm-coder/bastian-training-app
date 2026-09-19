import { el } from "./utils.js";
import { getSettings } from "./store.js";

let audioCtx = null;

// Web Audio auf iOS/Safari startet nur, wenn resume()/start() SYNCHRON innerhalb einer echten Nutzergeste
// aufgerufen wird — und dort zählen "click" und "touchend", nicht "pointerdown"/"touchstart". Die Timer-Pieptöne
// kommen später aus setInterval (keine Geste), deshalb wird der AudioContext hier vorab entsperrt: bei jedem
// Antippen der App (siehe main.js) und beim Start jedes Timers (der selbst aus einem Tipp heraus startet).
export function primeAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    applyAudioSession();
    if (audioCtx.state === "running") return;
    audioCtx.resume();
    // Ein stilles Sample abspielen: das schaltet den Ausgang auf iOS endgültig frei.
    const source = audioCtx.createBufferSource();
    source.buffer = audioCtx.createBuffer(1, 1, 22050);
    source.connect(audioCtx.destination);
    source.start(0);
  } catch (e) {
    /* Web Audio nicht verfügbar — Timer funktionieren trotzdem, nur ohne Ton */
  }
}

// iOS schaltet Web-Audio standardmäßig stumm, wenn der Klingel-Schalter aktiv ist. Mit audioSession "playback"
// (Safari 16.4+) wird der Ton trotzdem ausgegeben — dafür kann er laufende Musik kurz unterbrechen.
function applyAudioSession() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = getSettings().beepInSilentMode === false ? "auto" : "playback";
  } catch (e) {
    /* nicht unterstützt */
  }
}

export function audioStatus() {
  const session = navigator.audioSession ? navigator.audioSession.type : "nicht verfügbar";
  return `AudioContext: ${audioCtx ? audioCtx.state : "nicht gestartet"} · audioSession: ${session}`;
}

function beep(freq = 880, durationMs = 180) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state !== "running") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.6;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch (e) {
    /* Audio nicht verfügbar — Timer läuft trotzdem */
  }
}

// Testton für die Einstellungen: 3 kurze Countdown-Töne + Abschlusston. Muss aus einem Tipp heraus aufgerufen werden.
export function playTestBeeps() {
  primeAudio();
  beep(660, 120);
  setTimeout(() => beep(660, 120), 700);
  setTimeout(() => beep(660, 120), 1400);
  setTimeout(() => beep(1046, 350), 2100);
  return audioStatus();
}

/**
 * Einfacher Countdown-Overlay (Pausentimer zwischen Sätzen).
 * onDone wird aufgerufen, wenn die Zeit abläuft (Ton + Callback).
 */
export function showRestTimer(seconds, { label = "Pause", onDone } = {}) {
  primeAudio();
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
    primeAudio();
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
  primeAudio();
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
    primeAudio();
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
