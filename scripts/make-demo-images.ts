/**
 * Generates the illustrative placeholder images in public/images/demo/.
 * These are abstract drawings, NOT photographs of RIVA HOTEL ANDIJON.
 * Replace the files (keep the names, or edit src/config/hotel.ts) with real photography.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
/** Vector sources live here; the site serves the rasterised WebP files in public/images/demo. */
const out = join(here, "demo-src");
const publicOut = join(here, "..", "public", "images", "demo");
mkdirSync(out, { recursive: true });
mkdirSync(publicOut, { recursive: true });

const C = {
  ink: "#0b2224",
  charcoal: "#143234",
  umber: "#1f4a4a",
  bronze: "#a8613a",
  gold: "#d79062",
  ivory: "#f4f0e8",
  stone: "#d5d6cb",
};

const svg = (w: number, h: number, title: string, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"><title>${title}</title>${body}</svg>\n`;

/** Arched shape: x,y = top-left of bounding box, w = width, h = total height. */
const arch = (x: number, y: number, w: number, h: number): string =>
  `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`;

const grad = (id: string, stops: [number, string, number?][], vertical = true): string =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`)
    .join("")}</linearGradient>`;

const save = (name: string, content: string): void => writeFileSync(join(out, name), content);

// ---------- Hero: arcade at dusk ----------
{
  const stars = [[210, 120], [430, 210], [690, 90], [980, 160], [1240, 110], [1420, 230], [1130, 300], [330, 330]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.4 : 2}" fill="${C.ivory}" opacity=".55"/>`)
    .join("");
  const back = Array.from({ length: 9 }, (_, i) => `<path d="${arch(-40 + i * 200, 520, 150, 330)}" fill="#173a3b"/>`).join("");
  const front = Array.from({ length: 6 }, (_, i) => {
    const x = 40 + i * 270;
    return `<path d="${arch(x, 430, 210, 520)}" fill="${C.ink}"/><path d="${arch(x + 40, 530, 130, 420)}" fill="url(#glow)" opacity="${i % 2 ? 0.8 : 0.3}"/>`;
  }).join("");
  save(
    "hero.svg",
    svg(
      1600,
      1000,
      "Illustration: arched arcade at dusk (placeholder, not a photograph of the hotel)",
      `<defs>${grad("sky", [[0, "#0d2628"], [0.55, C.umber], [0.9, "#8c5a3c"], [1, C.gold]])}${grad("glow", [[0, C.gold], [1, C.bronze]])}
      <radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${C.gold}" stop-opacity=".75"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>${grad("water", [[0, "#071a1b"], [0.4, "#0d2f31"], [1, "#071a1b"]])}</defs>
      <rect width="1600" height="1000" fill="url(#sky)"/>${stars}
      <circle cx="800" cy="640" r="300" fill="url(#sun)"/>
      ${back}${front}
      <rect y="870" width="1600" height="130" fill="url(#water)"/>
      ${Array.from({ length: 14 }, (_, i) => {
        const y = 890 + (i % 7) * 15;
        const x = 60 + ((i * 263) % 1450);
        return `<rect x="${x}" y="${y}" width="${70 + (i % 4) * 30}" height="2" rx="1" fill="${C.gold}" opacity="${0.18 + (i % 3) * 0.1}"/>`;
      }).join("")}`,
    ),
  );
}

// ---------- Rooms (portrait 1000x1250) ----------
interface RoomStyle {
  wall: string;
  wall2: string;
  floor: string;
  bed: string;
  linen: string;
  accent: string;
  lamps: boolean;
  rug: boolean;
  doubleWindow: boolean;
  chandelier: boolean;
}
const room = (name: string, label: string, s: RoomStyle): void => {
  const windows = s.doubleWindow
    ? `<path d="${arch(150, 190, 260, 480)}" fill="url(#view)"/><path d="${arch(590, 190, 260, 480)}" fill="url(#view)"/>`
    : `<path d="${arch(330, 170, 340, 520)}" fill="url(#view)"/><path d="M500 170V690M330 430H670" stroke="${s.wall}" stroke-width="8" opacity=".7"/>`;
  const lamps = s.lamps
    ? [145, 855]
        .map((cx) => `<rect x="${cx - 40}" y="880" width="80" height="140" fill="${s.bed}"/><circle cx="${cx}" cy="830" r="42" fill="${C.gold}" opacity=".9"/>`)
        .join("")
    : "";
  const chandelier = s.chandelier
    ? `<path d="M500 0V90" stroke="${C.gold}" stroke-width="4"/>${[-90, -45, 0, 45, 90].map((dx) => `<circle cx="${500 + dx}" cy="${110 + Math.abs(dx) / 3}" r="14" fill="${C.gold}"/>`).join("")}<path d="M410 120H590" stroke="${C.gold}" stroke-width="4"/>`
    : "";
  save(
    name,
    svg(
      1000,
      1250,
      `Illustration: ${label} interior (placeholder, not a photograph of the hotel)`,
      `<defs>${grad("wall", [[0, s.wall], [1, s.wall2]])}${grad("view", [[0, C.gold], [1, C.ivory]])}</defs>
      <rect width="1000" height="1250" fill="url(#wall)"/>${windows}${chandelier}
      <rect y="1010" width="1000" height="240" fill="${s.floor}"/>
      ${s.rug ? `<ellipse cx="500" cy="1130" rx="400" ry="70" fill="${s.accent}" opacity=".4"/>` : ""}
      <rect x="220" y="650" width="560" height="260" rx="14" fill="${s.bed}"/>
      <rect x="190" y="840" width="620" height="190" rx="18" fill="${s.linen}"/>
      <rect x="190" y="920" width="620" height="110" rx="10" fill="${s.accent}" opacity=".85"/>
      <rect x="260" y="790" width="210" height="80" rx="30" fill="${s.linen}" stroke="${s.accent}" stroke-opacity=".35"/>
      <rect x="530" y="790" width="210" height="80" rx="30" fill="${s.linen}" stroke="${s.accent}" stroke-opacity=".35"/>
      ${lamps}`,
    ),
  );
};
room("room-standard.svg", "standard room", {
  wall: "#e6e5dc", wall2: "#d5d6cb", floor: "#b9bfb3", bed: "#7a8e86", linen: "#f4f0e8", accent: "#a8613a",
  lamps: false, rug: false, doubleWindow: false, chandelier: false,
});
room("room-deluxe.svg", "deluxe room", {
  wall: "#c9cbbd", wall2: "#9ba69a", floor: "#4e6f68", bed: "#1f4a4a", linen: "#f4f0e8", accent: "#7c4a2c",
  lamps: true, rug: true, doubleWindow: false, chandelier: false,
});
room("room-luxe.svg", "luxe room", {
  wall: "#1f4a4a", wall2: "#122d2f", floor: "#0b2224", bed: "#0b2224", linen: "#e6e5dc", accent: "#a8613a",
  lamps: true, rug: true, doubleWindow: true, chandelier: true,
});

// ---------- Landscape scenes (1200x900) ----------
// Lobby: arched wall, reception desk, pendant lamps
{
  const arches = Array.from({ length: 5 }, (_, i) => `<path d="${arch(70 + i * 226, 150, 170, 560)}" fill="url(#lobbyglow)"/>`).join("");
  const pendants = [260, 600, 940].map((x) => `<path d="M${x} 0V140" stroke="${C.gold}" stroke-width="3"/><circle cx="${x}" cy="160" r="26" fill="${C.gold}"/>`).join("");
  save(
    "lobby.svg",
    svg(
      1200,
      900,
      "Illustration: lobby (placeholder, not a photograph of the hotel)",
      `<defs>${grad("lw", [[0, C.umber], [1, C.charcoal]])}${grad("lobbyglow", [[0, "#e3a67b"], [1, C.bronze]])}</defs>
      <rect width="1200" height="900" fill="url(#lw)"/>${arches}${pendants}
      <rect y="710" width="1200" height="190" fill="${C.ink}"/>
      <rect x="380" y="560" width="440" height="170" fill="${C.stone}"/><rect x="370" y="545" width="460" height="22" fill="${C.gold}"/>`,
    ),
  );
}
// Dining: round tables under pendant lamps
{
  const tables = [220, 600, 980].map((x) => `<ellipse cx="${x}" cy="690" rx="120" ry="34" fill="${C.ivory}"/><rect x="${x - 7}" y="690" width="14" height="140" fill="${C.stone}"/>`).join("");
  const pendants = [220, 600, 980].map((x) => `<path d="M${x} 0V220" stroke="${C.gold}" stroke-width="3"/><path d="M${x - 50} 280A50 50 0 0 1 ${x + 50} 280Z" fill="${C.gold}"/>`).join("");
  save(
    "dining.svg",
    svg(
      1200,
      900,
      "Illustration: dining room (placeholder, not a photograph of the hotel)",
      `<defs>${grad("dw", [[0, "#173a3b"], [1, "#2a5654"]])}</defs>
      <rect width="1200" height="900" fill="url(#dw)"/>
      <path d="${arch(430, 250, 340, 450)}" fill="${C.gold}" opacity=".35"/>
      ${pendants}<rect y="760" width="1200" height="140" fill="${C.ink}"/>${tables}`,
    ),
  );
}
// Exterior: building at dusk with lit windows
{
  const windows: string[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 8; c++) {
      const lit = (r * 3 + c * 5) % 4 !== 0;
      windows.push(`<path d="${arch(250 + c * 90, 260 + r * 120, 50, 80)}" fill="${lit ? C.gold : "#2a5654"}" opacity="${lit ? 0.9 : 1}"/>`);
    }
  save(
    "exterior.svg",
    svg(
      1200,
      900,
      "Illustration: building exterior at dusk (placeholder, not a photograph of the hotel)",
      `<defs>${grad("ex", [[0, "#10292b"], [0.7, C.umber], [1, "#b06c42"]])}</defs>
      <rect width="1200" height="900" fill="url(#ex)"/>
      <rect x="200" y="200" width="800" height="600" fill="${C.ink}"/>${windows.join("")}
      <rect y="800" width="1200" height="100" fill="#071a1b"/>`,
    ),
  );
}

// ---------- Rasterise to WebP ----------
// Mobile browsers scroll raster images far more smoothly than large gradient-heavy SVGs,
// and real photographs will be raster anyway. Needs `sharp` (npm i -D sharp).
let sharp: typeof import("sharp") | undefined;
try {
  sharp = (await import("sharp")).default as unknown as typeof import("sharp");
} catch {
  try {
    const { createRequire } = await import("node:module");
    sharp = createRequire(import.meta.url)("/opt/npm-tools/node_modules/sharp");
  } catch {}
}
if (!sharp) {
  console.warn("sharp not installed: wrote SVG sources only. Run `npm i -D sharp` then `npm run images`.");
} else {
  const jobs: [string, string, number][] = [
    ["hero.svg", "hero-1600.webp", 1600],
    ["hero.svg", "hero-800.webp", 800],
    ["room-standard.svg", "room-standard.webp", 800],
    ["room-deluxe.svg", "room-deluxe.webp", 800],
    ["room-luxe.svg", "room-luxe.webp", 800],
    ["lobby.svg", "lobby.webp", 960],
    ["dining.svg", "dining.webp", 960],
    ["exterior.svg", "exterior.webp", 960],
  ];
  for (const [src, dest, width] of jobs) {
    await sharp(join(out, src), { density: 144 }).resize({ width }).webp({ quality: 80 }).toFile(join(publicOut, dest));
  }
}

console.log("Demo image sources:", out, "\nServed images:", publicOut);
