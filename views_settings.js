import { getSettings, updateSettings, exportData, importData } from "./store.js";
import { el } from "./utils.js";

export function renderSettings(container, navigate) {
  container.innerHTML = "";
  container.appendChild(el(`<div class="page-title">Einstellungen</div>`));
  container.appendChild(el(`<div class="page-subtitle">App-Verhalten &amp; Datensicherung</div>`));

  const settings = getSettings();
  const tvRow = el(`
    <div class="card">
      <div class="settings-row">
        <div>
          <div style="font-weight:700;font-size:15px">TV-Modus</div>
          <div style="color:var(--text-dim);font-size:12.5px;margin-top:2px">Größere Schrift für Screen-Mirroring</div>
        </div>
        <button class="switch ${settings.tvMode ? "on" : ""}" data-action="toggle-tv"><span class="knob"></span></button>
      </div>
    </div>
  `);
  tvRow.querySelector('[data-action="toggle-tv"]').addEventListener("click", () => {
    const next = !getSettings().tvMode;
    updateSettings({ tvMode: next });
    document.body.classList.toggle("tv-mode", next);
    renderSettings(container, navigate);
  });
  container.appendChild(tvRow);

  container.appendChild(el(`<div class="section-title">Datensicherung</div>`));
  const backupCard = el(`
    <div class="card">
      <p style="font-size:13px;color:var(--text-dim);margin-bottom:12px">Alle Daten liegen nur lokal auf diesem iPhone. Exportiere regelmäßig ein Backup, z. B. bevor du die App neu installierst.</p>
      <button class="btn btn-secondary" data-action="export" style="margin-bottom:10px">Backup exportieren (JSON)</button>
      <input type="file" accept="application/json" data-role="import-file" style="display:none" />
      <button class="btn btn-secondary" data-action="import">Backup importieren</button>
    </div>
  `);
  backupCard.querySelector('[data-action="export"]').addEventListener("click", () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  const fileInput = backupCard.querySelector('[data-role="import-file"]');
  backupCard.querySelector('[data-action="import"]').addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result);
        alert("Backup importiert.");
        navigate("dashboard");
      } catch (e) {
        alert("Datei konnte nicht gelesen werden.");
      }
    };
    reader.readAsText(file);
  });
  container.appendChild(backupCard);

  container.appendChild(el(`
    <div class="insight-card insight-good" style="margin-top:8px">
      Tipp: Für den Fernseher einfach über die iPhone-Bildschirmsynchronisierung (AirPlay/Bildschirmspiegelung) spiegeln — die App läuft dabei ganz normal auf dem Handy weiter.
    </div>
  `));
}
