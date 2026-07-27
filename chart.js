// Winziger, abhängigkeitsfreier SVG-Liniendiagramm-Renderer (muss offline ohne CDN funktionieren).
export function lineChartSVG(points, { width = 640, height = 200, color = "#f2711c", unit = "", pad = 28 } = {}) {
  if (!points || points.length === 0) {
    return `<svg viewBox="0 0 ${width} ${height}"></svg>`;
  }
  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const spanPad = (max - min) * 0.15;
  min -= spanPad;
  max += spanPad;

  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const xStep = points.length > 1 ? innerW / (points.length - 1) : 0;

  const xy = (i, v) => {
    const x = pad + i * xStep;
    const y = pad + innerH - ((v - min) / (max - min)) * innerH;
    return [x, y];
  };

  const pathD = points
    .map((p, i) => {
      const [x, y] = xy(i, p.value);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaD = `${pathD} L${(pad + (points.length - 1) * xStep).toFixed(1)},${height - pad} L${pad},${height - pad} Z`;

  const gridLines = [0, 0.5, 1]
    .map((t) => {
      const y = pad + innerH * t;
      const val = max - (max - min) * t;
      return `<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="#2c3446" stroke-width="1" />
              <text x="2" y="${y + 4}" font-size="10" fill="#5c6478">${val.toFixed(1)}${unit}</text>`;
    })
    .join("");

  const dots = points
    .map((p, i) => {
      const [x, y] = xy(i, p.value);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${color}" stroke="#12161f" stroke-width="1.5" />`;
    })
    .join("");

  const labels = points
    .map((p, i) => {
      const [x] = xy(i, p.value);
      if (points.length > 8 && i % Math.ceil(points.length / 6) !== 0 && i !== points.length - 1) return "";
      return `<text x="${x.toFixed(1)}" y="${height - 6}" font-size="10" fill="#8b93a7" text-anchor="middle">${p.label}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" style="display:block">
    <defs>
      <linearGradient id="grad-${color.replace("#", "")}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${color}" stop-opacity="0" />
      </linearGradient>
    </defs>
    ${gridLines}
    <path d="${areaD}" fill="url(#grad-${color.replace("#", "")})" />
    <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    ${dots}
    ${labels}
  </svg>`;
}
