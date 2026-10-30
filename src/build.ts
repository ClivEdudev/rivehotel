import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { site } from "./config/hotel.ts";
import { defaultLang, languages, localizedPath } from "./i18n/index.ts";
import { Base } from "./layouts/base.ts";
import type { Assets } from "./layouts/base.ts";
import { HomePage } from "./pages/home.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const write = (rel: string, content: string): void => {
  const file = join(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

const hashed = (name: string, ext: string, content: string): string =>
  `/assets/${name}.${createHash("sha256").update(content).digest("hex").slice(0, 8)}.${ext}`;

// Fresh output
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
if (existsSync(join(root, "public"))) cpSync(join(root, "public"), dist, { recursive: true });

// Assets (comments and blank runs stripped; selectors untouched)
const css = readFileSync(join(root, "src/styles/global.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
const js = readFileSync(join(root, "src/scripts/main.js"), "utf8");
const bookingJs = readFileSync(join(root, "src/scripts/booking.js"), "utf8");
// booking.js imports the shared rules from a fixed path, so the logic file is copied unhashed.
const bookingLogic = readFileSync(join(root, "src/lib/booking-logic.js"), "utf8");
const assets: Assets = {
  css: hashed("styles", "css", css),
  js: hashed("main", "js", js),
  booking: hashed("booking", "js", bookingJs),
};
write(assets.css, css);
write(assets.js, js);
write(assets.booking, bookingJs);
write("/assets/booking-logic.js", bookingLogic);

// One static page per language: /uz/, /ru/, /en/
for (const lang of languages) {
  write(`${lang}/index.html`, Base(lang, HomePage(lang), assets).toString());
}

// Root: tiny language router. Crawlers get hreflang + canonical to the default language.
const alternates = languages
  .map((l) => `<link rel="alternate" hreflang="${l}" href="${site.url}${localizedPath(l)}">`)
  .join("\n  ");
write(
  "index.html",
  `<!doctype html>
<html lang="${defaultLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RIVA HOTEL</title>
  <meta name="robots" content="${site.indexable ? "index,follow" : "noindex,nofollow"}">
  <link rel="canonical" href="${site.url}${localizedPath(defaultLang)}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${site.url}${localizedPath(defaultLang)}">
  <meta http-equiv="refresh" content="0; url=${localizedPath(defaultLang)}">
  <script>
    var l = (navigator.language || "").slice(0, 2);
    location.replace("/" + (l === "ru" ? "ru" : l === "en" ? "en" : "${defaultLang}") + "/");
  </script>
</head>
<body>
  <p>${languages.map((l) => `<a href="${localizedPath(l)}">${l.toUpperCase()}</a>`).join(" · ")}</p>
</body>
</html>
`,
);

write(
  "404.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>404 — RIVA HOTEL</title></head><body style="font-family:Georgia,serif;background:#f4f0e8;color:#15292a;padding:3rem 1.5rem"><h1>404</h1><p>${languages.map((l) => `<a href="${localizedPath(l)}">${l.toUpperCase()}</a>`).join(" · ")}</p></body></html>`,
);

// SEO files
const urls = languages
  .map(
    (lang) => `  <url>
    <loc>${site.url}${localizedPath(lang)}</loc>
${languages.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${site.url}${localizedPath(l)}"/>`).join("\n")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${site.url}${localizedPath(defaultLang)}"/>
  </url>`,
  )
  .join("\n");
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`,
);
write("robots.txt", `User-agent: *\n${site.indexable ? "Allow: /" : "Disallow: /"}\nSitemap: ${site.url}/sitemap.xml\n`);

console.log(`Built ${languages.length} languages -> ${dist}`);
