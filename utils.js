export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export function formatRelative(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "heute";
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "vor 1 Woche";
  return `vor ${weeks} Wochen`;
}

export function repLabel(movement) {
  if (movement.repType === "range") return `${movement.repMin}–${movement.repMax} Wdh.`;
  if (movement.repType === "perSide") return `${movement.repFixed}/Seite`;
  if (movement.repType === "fixed") return movement.repFixedLabel || `${movement.repFixed} Wdh.`;
  if (movement.repType === "special21") return "21 Wdh.";
  if (movement.repType === "time") return `${movement.repFixed} Sek`;
  return "";
}

export function loadUnitLabel(loadType) {
  if (loadType === "kettlebell") return "KB (kg)";
  if (loadType === "dumbbell") return "KH (kg)";
  if (loadType === "barbell") return "Stange (kg)";
  if (loadType === "bodyweight_loaded") return "Zusatz (kg)";
  return "kg";
}

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function qs(root, sel) {
  return root.querySelector(sel);
}
export function qsa(root, sel) {
  return Array.from(root.querySelectorAll(sel));
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
