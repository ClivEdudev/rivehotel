import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { brand, images } from "../config/hotel.ts";
import type { Dictionary } from "../i18n/types.ts";

/** Visible "to be confirmed" marker for any unverified value. */
export const Placeholder = (t: Dictionary): Safe => html`<span class="tbc">[${t.common.pending}]</span>`;

/** Shows a verified value, or the placeholder when it is still null. */
export const Value = (value: string | null, t: Dictionary): Safe | string => value ?? Placeholder(t);

/** Honest label for demo imagery. Hidden only when images.illustrative is false. */
export const IllustrativeTag = (t: Dictionary): Safe | string =>
  images.illustrative ? html`<p class="illustrative-tag">${t.common.illustrative}</p>` : "";

export const imageUrl = (file: string): string => `${images.base}${file}`;

export const SectionHead = (id: string, title: string, intro: string): Safe => html`
  <div class="section__head">
    <h2 id="${id}">${title}</h2>
    <p class="soft">${intro}</p>
  </div>`;

/**
 * Logo integration point (see `brand` in config/hotel.ts). With no logo files configured,
 * the text wordmark is shown. With a light and/or dark logo, the matching file is shown per theme.
 */
export const Brand = (href: string): Safe =>
  brand.logo.light
    ? html`<a class="brand brand--logo" href="${href}" aria-label="${brand.name}">
        <img class="brand__logo brand__logo--light" src="${brand.logo.light}" alt="" width="${brand.logo.width}" height="${brand.logo.height}">
        ${brand.logo.dark
          ? html`<img class="brand__logo brand__logo--dark" src="${brand.logo.dark}" alt="" width="${brand.logo.width}" height="${brand.logo.height}">`
          : ""}
      </a>`
    : html`<a class="brand" href="${href}" aria-label="${brand.name}">RIVA<span>HOTEL</span></a>`;
