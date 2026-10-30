import { html, raw } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { channels, hotelCoordinates, images, mapUrl, site, socials, stay } from "../config/hotel.ts";
import { dictionaries, langMeta, languages, localizedPath } from "../i18n/index.ts";
import type { Lang } from "../i18n/index.ts";

export interface Assets {
  css: string;
  js: string;
  booking: string;
}

/**
 * Runs before first paint: applies the saved theme, or the operating system's preference on a
 * first visit, so dark-mode visitors never see a flash of the light theme.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("riva-theme")}catch(e){var t=null}if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t})();`;

const abs = (path: string): string => `${site.url}${path}`;

const jsonLd = (lang: Lang): string => {
  const t = dictionaries[lang];
  const phone = channels.find((c) => c.id === "phone")?.value;
  const sameAs = socials.flatMap((s) => (s.href ? [s.href] : []));
  const data = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: site.name,
    description: t.meta.description,
    url: abs(localizedPath(lang)),
    address: { "@type": "PostalAddress", addressLocality: site.locality, addressCountry: site.country },
    // Only verified values are published as structured data.
    ...(hotelCoordinates.latitude !== null && hotelCoordinates.longitude !== null
      ? { geo: { "@type": "GeoCoordinates", latitude: hotelCoordinates.latitude, longitude: hotelCoordinates.longitude }, hasMap: mapUrl }
      : {}),
    ...(stay.checkIn ? { checkinTime: stay.checkIn } : {}),
    ...(stay.checkOut ? { checkoutTime: stay.checkOut } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
};

export const Base = (lang: Lang, body: Safe, assets: Assets): Safe => {
  const t = dictionaries[lang];
  const canonical = abs(localizedPath(lang));
  return html`<!doctype html>
<html lang="${langMeta[lang].htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t.meta.title}</title>
  <meta name="description" content="${t.meta.description}">
  <meta name="robots" content="${site.indexable ? "index,follow" : "noindex,nofollow"}">
  <meta name="theme-color" content="#0f2a2b">
  <link rel="canonical" href="${canonical}">
  ${languages.map((code) => html`<link rel="alternate" hreflang="${code}" href="${abs(localizedPath(code))}">`)}
  <link rel="alternate" hreflang="x-default" href="${abs(localizedPath("uz"))}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${site.name}">
  <meta property="og:title" content="${t.meta.title}">
  <meta property="og:description" content="${t.meta.description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:locale" content="${langMeta[lang].ogLocale}">
  ${languages.filter((code) => code !== lang).map((code) => html`<meta property="og:locale:alternate" content="${langMeta[code].ogLocale}">`)}
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230f2a2b' rx='7'/%3E%3Ctext x='16' y='22.5' text-anchor='middle' font-family='Georgia,serif' font-size='18' fill='%23e0a07a'%3ER%3C/text%3E%3C/svg%3E">
  <link rel="preload" as="image" href="${images.base}${images.hero.large}"
        imagesrcset="${images.base}${images.hero.small} 800w, ${images.base}${images.hero.large} 1600w" imagesizes="100vw" fetchpriority="high">
  <script>document.documentElement.classList.add("js")</script>
  <script>${raw(themeScript)}</script>
  <link rel="stylesheet" href="${assets.css}">
  <script type="application/ld+json">${raw(jsonLd(lang))}</script>
</head>
<body>
  <a class="skip-link" href="#main">${t.common.skip}</a>
  ${body}
  <script src="${assets.js}" defer></script>
  <script type="module" src="${assets.booking}"></script>
</body>
</html>
`;
};
