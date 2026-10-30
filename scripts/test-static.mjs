// Static checks on the built output. Run after `npm run build`.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const langs = ["uz", "ru", "en"];
let failures = 0;
const check = (ok, message) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${message}`);
  if (!ok) failures++;
};

// 1. Translation parity: every language has exactly the same keys.
const { dictionaries } = await import("../src/i18n/index.ts");
const flat = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
const base = flat(dictionaries.en).sort();
for (const lang of langs) {
  const keys = flat(dictionaries[lang]).sort();
  check(JSON.stringify(keys) === JSON.stringify(base), `i18n keys match for ${lang}`);
  const empty = keys.filter((k) => !k.split(".").reduce((o, p) => o[p], dictionaries[lang]));
  check(empty.length === 0, `no empty strings in ${lang}`);
}

// 2. Built pages
for (const lang of langs) {
  const file = join(dist, lang, "index.html");
  check(existsSync(file), `/${lang}/index.html exists`);
  const page = readFileSync(file, "utf8");
  check(page.includes(`<html lang="${lang}">`), `${lang}: html lang attribute`);
  check((page.match(/<h1[ >]/g) ?? []).length === 1, `${lang}: exactly one h1`);
  check(langs.every((l) => page.includes(`hreflang="${l}"`)) && page.includes('hreflang="x-default"'), `${lang}: hreflang alternates`);
  check(page.includes(`rel="canonical" href="https://`) && page.includes(`/${lang}/"`), `${lang}: canonical URL`);
  check(/<title>[^<]{10,70}<\/title>/.test(page), `${lang}: title present and sensible length`);
  check(/<meta name="description" content="[^"]{50,170}"/.test(page), `${lang}: meta description length`);
  check(!/href="#"/.test(page), `${lang}: no dead href="#" links`);
  check(!/\b(book now|confirmed booking|rooms? available|available now|sold out|only \d+ left)/i.test(page), `${lang}: no fake booking/availability wording`);
  check(!/\+998\s?\d|@[a-z0-9_]{4,}\b/i.test(page.replace(/<script[\s\S]*?<\/script>/g, "")), `${lang}: no invented phone numbers or handles`);
  check(page.includes("illustrative-tag"), `${lang}: demo images are labelled illustrative`);
  const assets = [...page.matchAll(/(?:href|src)="(\/[^"#?]+)"/g)].map((m) => m[1]).filter((p) => !p.endsWith("/"));
  const missing = assets.filter((p) => !existsSync(join(dist, p)));
  check(missing.length === 0, `${lang}: all local assets exist${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`);
}
for (const f of ["index.html", "sitemap.xml", "robots.txt", "404.html"]) check(existsSync(join(dist, f)), `${f} exists`);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll static checks passed");
process.exit(failures ? 1 : 0);
