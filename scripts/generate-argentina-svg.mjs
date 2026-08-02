// Genera src/media/mapa-argentina.svg a partir de mapa/data.json:
// simplifica los polígonos provinciales (Douglas-Peucker) y los colorea
// con la misma escala verde→amarillo→rojo que usa el mapa interactivo,
// según el % real de extranjerización de cada provincia respecto al
// techo legal del 15%.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const { provinceBoundaries, provStats } = JSON.parse(
  readFileSync(resolve(root, 'mapa/data.json'), 'utf8'),
);

const CAP_NACIONAL = 15;
const TOLERANCE_DEG = 0.3; // simplificación: mayor = menos puntos

function sqDist(p, a, b) {
  let x = a[0], y = a[1];
  let dx = b[0] - x, dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = b[0]; y = b[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = p[0] - x; dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyDP(points, tolerance) {
  if (points.length <= 2) return points;
  const sqTol = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDist = 0, index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = sqDist(points[i], points[start], points[end]);
      if (d > maxDist) { maxDist = d; index = i; }
    }
    if (maxDist > sqTol && index !== -1) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function eachRing(geometry, fn) {
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(fn);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((poly) => poly.forEach(fn));
  }
}

// Bounding box global (sobre los anillos ya simplificados)
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
const simplifiedFeatures = provinceBoundaries.features.map((feature) => {
  const rings = [];
  eachRing(feature.geometry, (ring) => {
    // Descarta el reclamo antártico (bajo -58° lat) y las islas del
    // Atlántico Sur muy remotas (Georgias/Sandwich, al este de -55° lon):
    // sin ellos, el resto del territorio (continental + Tierra del Fuego +
    // Malvinas) queda legible y sin espacio vacío de sobra.
    if (ring.some(([lon, lat]) => lat < -58 || (lat < -50 && lon > -55))) return;
    const simplified = simplifyDP(ring, TOLERANCE_DEG);
    simplified.forEach(([lon, lat]) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    rings.push(simplified);
  });
  return { provincia: feature.properties.provincia, rings };
});

const meanLat = (minLat + maxLat) / 2;
const lonCorrection = Math.cos((meanLat * Math.PI) / 180);
const WIDTH = 600;
const PAD = 8;
const spanX = (maxLon - minLon) * lonCorrection;
const spanY = maxLat - minLat;
const scale = (WIDTH - PAD * 2) / spanX;
const HEIGHT = Math.round(spanY * scale + PAD * 2);

function project([lon, lat]) {
  const x = PAD + (lon - minLon) * lonCorrection * scale;
  const y = PAD + (maxLat - lat) * scale;
  return [Math.round(x), Math.round(y)];
}

function colorForPct(pct) {
  const mix = (c1, c2, t) => {
    const a = c1.match(/\w\w/g).map((h) => parseInt(h, 16));
    const b = c2.match(/\w\w/g).map((h) => parseInt(h, 16));
    return (
      '#' +
      a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
    );
  };
  const t = Math.min(pct / CAP_NACIONAL, 1);
  if (t < 0.5) return mix('#1e3a24', '#357a53', t / 0.5);
  if (t < 0.85) return mix('#357a53', '#f4c542', (t - 0.5) / 0.35);
  return mix('#f4c542', '#e23d28', (t - 0.85) / 0.15);
}

const paths = simplifiedFeatures.map(({ provincia, rings }) => {
  const stats = provStats[provincia];
  const pct = stats && stats.tot > 0 ? (stats.ext / stats.tot) * 100 : 0;
  const d = rings
    .map((ring) => {
      const points = ring.map(project);
      return 'M' + points.map((p) => p.join(',')).join('L') + 'Z';
    })
    .join(' ');
  return `<path d="${d}" fill="${colorForPct(pct)}" stroke="#171713" stroke-width="0.6" stroke-linejoin="round"/>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="mapaTitle">
<title id="mapaTitle">Mapa de la Argentina coloreado según el porcentaje de tierra extranjerizada por provincia</title>
${paths.join('\n')}
</svg>
`;

writeFileSync(resolve(root, 'src/media/mapa-argentina.svg'), svg);
console.log(`src/media/mapa-argentina.svg generado (${WIDTH}x${HEIGHT}, ${(svg.length / 1024).toFixed(1)} KB)`);
