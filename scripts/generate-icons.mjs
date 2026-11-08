/**
 * Genera todos los iconos de public/icons/ a partir de SVG embebidos.
 *
 * Uso: node scripts/generate-icons.mjs
 *
 * Estilo: iconos de línea (contorno) en morado #3730ba sobre fondo
 * transparente, igual que la app Mi Argentina original.
 *
 * Los tamaños "out" son múltiplos del display en pantalla (retina); como los
 * <img> tienen max-width/max-height en CSS, el tamaño natural solo afecta a
 * la nitidez, no al tamaño final.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons');

const PURPLE = '#3730ba';
const GRAY = '#9e9e9e';

const svgTag = (vbW, vbH, outW, outH, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${vbW} ${vbH}">${body}</svg>`;

/** Glyph en trazo (sin relleno), centrado en el lienzo. */
const line = (stroke, width, glyph) =>
  `<g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`;

/** Icono de servicio: lienzo 132×132, trazo morado. */
const service = (glyph) => line(PURPLE, 5.5, glyph);

const icons = [
  // ================= Servicios del home =================
  // Documentos -> tarjeta DNI
  { name: 'serv-tramites', vb: [132, 132], out: [200, 200], body: service(
    '<rect x="20" y="34" width="92" height="64" rx="10"/>' +
    '<circle cx="50" cy="60" r="10"/>' +
    '<path d="M36 86 a14 14 0 0 1 28 0"/>' +
    '<path d="M76 58 h24"/><path d="M76 72 h24"/><path d="M76 86 h16"/>') },

  // Vehículos -> auto
  { name: 'serv-vehiculos', vb: [132, 132], out: [200, 200], body: service(
    '<path d="M24 92 V82 a8 8 0 0 1 8 -8 h8 l10 -15 a10 10 0 0 1 8 -4 h24 a10 10 0 0 1 8 4 l10 15 h8 a8 8 0 0 1 8 8 v10 a6 6 0 0 1 -6 6 H30 a6 6 0 0 1 -6 -6 z"/>' +
    '<circle cx="46" cy="101" r="9"/>' +
    '<circle cx="86" cy="101" r="9"/>') },

  // Trabajo -> maletín
  { name: 'serv-trabajo', vb: [132, 132], out: [200, 200], body: service(
    '<path d="M32 56 h68 a8 8 0 0 1 8 8 v32 a8 8 0 0 1 -8 8 H32 a8 8 0 0 1 -8 -8 V64 a8 8 0 0 1 8 -8 z"/>' +
    '<path d="M52 56 v-6 a8 8 0 0 1 8 -8 h12 a8 8 0 0 1 8 8 v6"/>' +
    '<path d="M58 78 h16"/>') },

  // Salud -> corazón
  { name: 'serv-salud', vb: [132, 132], out: [200, 200], body: service(
    '<path d="M66 102 C 20 74 18 48 38 40 C 52 34 62 42 66 50 C 70 42 80 34 94 40 C 114 48 112 74 66 102 z"/>') },

  // Cobros -> peso dentro de recuadro
  { name: 'serv-cobros', vb: [132, 132], out: [200, 200], body: service(
    '<path d="M44 30 h44 a14 14 0 0 1 14 14 v44 a14 14 0 0 1 -14 14 H44 a14 14 0 0 1 -14 -14 V44 a14 14 0 0 1 14 -14 z"/>' +
    '<path d="M66 46 v40"/>' +
    '<path d="M75 55 a10 10 0 0 0 -9 -5 c -6 0 -10 4 -10 9 c 0 10 19 6 19 16 c 0 5 -4 8 -10 8 a11 11 0 0 1 -11 -7"/>') },

  // Trámites -> documento con líneas
  { name: 'serv-documentos', vb: [132, 132], out: [200, 200], body: service(
    '<path d="M42 26 h32 l24 24 v56 a6 6 0 0 1 -6 6 H42 a6 6 0 0 1 -6 -6 V32 a6 6 0 0 1 6 -6 z"/>' +
    '<path d="M74 26 v24 h24"/>' +
    '<path d="M48 66 h34"/><path d="M48 80 h34"/><path d="M48 94 h20"/>') },

  // Turnos -> ticket numerado (001)
  { name: 'serv-turnos', vb: [132, 132], out: [200, 200], body: service(
    '<path d="M34 40 h64 a8 8 0 0 1 8 8 v8 a8 8 0 0 0 0 16 v8 a8 8 0 0 1 -8 8 H34 a8 8 0 0 1 -8 -8 v-8 a8 8 0 0 0 0 -16 v-8 a8 8 0 0 1 8 -8 z"/>' +
    '<circle cx="52" cy="66" r="8"/>' +
    '<circle cx="74" cy="66" r="8"/>' +
    '<path d="M92 58 v14"/><path d="M88 72 h8"/>') },

  // Hijos -> dos personas
  { name: 'serv-hijos', vb: [132, 132], out: [200, 200], body: service(
    '<circle cx="50" cy="52" r="13"/>' +
    '<path d="M28 98 a22 22 0 0 1 44 0"/>' +
    '<circle cx="90" cy="66" r="10"/>' +
    '<path d="M76 98 a14 14 0 0 1 28 0"/>') },

  // ================= Barra de navegación =================
  // Inicio (activo -> morado)
  { name: 'logo-CASA', vb: [48, 48], out: [96, 96], body: line(PURPLE, 4,
    '<path d="M6 24 L24 7 L42 24"/>' +
    '<path d="M11 21 V40 a4 4 0 0 0 4 4 h18 a4 4 0 0 0 4 -4 V21"/>' +
    '<path d="M20 44 v-11 a4 4 0 0 1 8 0 v11"/>') },

  // Novedades -> campana
  { name: 'logo-NOVEDADES', vb: [160, 74], out: [320, 148], body: line(GRAY, 5,
    '<path d="M64 58 V42 a16 16 0 0 1 32 0 v16 l7 9 H57 z"/>' +
    '<path d="M74 71 q6 8 12 0"/>' +
    '<circle cx="80" cy="24" r="4"/>') },

  // Teléfonos -> celular
  { name: 'logo-TELEFONO', vb: [100, 74], out: [200, 148], body: line(GRAY, 5,
    '<path d="M44 14 h12 a6 6 0 0 1 6 6 v34 a6 6 0 0 1 -6 6 H44 a6 6 0 0 1 -6 -6 V20 a6 6 0 0 1 6 -6 z"/>' +
    '<path d="M47 21 h6"/><path d="M47 53 h6"/>') },

  // Usuario
  { name: 'logo-USUARIO', vb: [48, 48], out: [96, 96], body: line(GRAY, 4,
    '<circle cx="24" cy="17" r="9"/>' +
    '<path d="M8 42 a16 16 0 0 1 32 0"/>') },

  // ================= Acciones (admin / listas) =================
  { name: 'logo-ojo', vb: [48, 48], out: [96, 96], body: line('#616161', 5,
    '<path d="M3 24 C 12 12 36 12 45 24 C 36 36 12 36 3 24 z"/>' +
    '<circle cx="24" cy="24" r="6" fill="#616161" stroke="none"/>') },

  { name: 'logo-X', vb: [34, 48], out: [68, 96], body: line('#e53935', 6,
    '<path d="M7 7 L27 41 M27 7 L7 41"/>') },

  { name: 'logo-QR', vb: [44, 44], out: [88, 88], body:
    '<g fill="none" stroke="#212121" stroke-width="4">' +
    '<rect x="3" y="3" width="14" height="14" rx="2"/>' +
    '<rect x="27" y="3" width="14" height="14" rx="2"/>' +
    '<rect x="3" y="27" width="14" height="14" rx="2"/></g>' +
    '<g fill="#212121">' +
    '<rect x="8" y="8" width="4" height="4"/>' +
    '<rect x="32" y="8" width="4" height="4"/>' +
    '<rect x="8" y="32" width="4" height="4"/>' +
    '<rect x="27" y="27" width="5" height="5"/>' +
    '<rect x="34" y="27" width="4" height="4"/>' +
    '<rect x="27" y="34" width="4" height="4"/>' +
    '<rect x="34" y="34" width="4" height="4"/></g>' },
];

/** Icono de la app (PWA + favicon): fondo morado con tarjeta DNI. */
const appIcon = () =>
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="#4f4ae0"/><stop offset="1" stop-color="#3730ba"/>' +
  '</linearGradient></defs>' +
  '<rect width="192" height="192" rx="42" fill="url(#g)"/>' +
  '<rect x="44" y="58" width="104" height="76" rx="12" fill="none" stroke="#ffffff" stroke-width="7"/>' +
  '<circle cx="74" cy="86" r="11" fill="none" stroke="#ffffff" stroke-width="7"/>' +
  '<path d="M58 112 a16 16 0 0 1 32 0" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>' +
  '<path d="M104 82 h30 M104 98 h22" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>';

icons.push(
  { name: 'icon-192', vb: [192, 192], out: [192, 192], body: appIcon() },
  { name: 'icon-512', vb: [192, 192], out: [512, 512], body: appIcon() },
);

await mkdir(outDir, { recursive: true });

for (const icon of icons) {
  const [vbW, vbH] = icon.vb;
  const [outW, outH] = icon.out;
  const svg = svgTag(vbW, vbH, outW, outH, icon.body);
  const file = path.join(outDir, `${icon.name}.png`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
  console.log(`OK ${icon.name}.png (${outW}x${outH})`);
}

// favicon.svg (lo referencia src/app/layout.tsx)
const favicon = svgTag(192, 192, 192, 192, appIcon());
await writeFile(path.join(outDir, 'favicon.svg'), `<?xml version="1.0" encoding="UTF-8"?>\n${favicon}\n`, 'utf8');
console.log('OK favicon.svg');

console.log(`Listo: ${icons.length + 1} archivos en public/icons/`);
