import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { languages, langMeta, localizedPath } from "../i18n/index.ts";
import type { Lang } from "../i18n/index.ts";
import type { Dictionary } from "../i18n/types.ts";
import { Brand } from "./shared.ts";

export const LanguageSwitch = (t: Dictionary, current: Lang): Safe => html`
  <ul class="lang" aria-label="${t.nav.language}">
    ${languages.map(
      (code) => html`<li>
        <a href="${localizedPath(code)}" lang="${code}" hreflang="${code}"
           aria-label="${langMeta[code].name}" ${code === current ? html`aria-current="page"` : ""}>${code.toUpperCase()}</a>
      </li>`,
    )}
  </ul>`;

/**
 * Sun and moon icons. CSS shows the one that matches the theme it would switch to.
 * Two copies: "header" beside the language switch on wide screens, and "menu" inside the
 * full-screen menu on phones, where the header has no room for a third 40px control.
 */
const ThemeToggle = (t: Dictionary, variant: "header" | "menu"): Safe => html`
  <button class="theme-toggle theme-toggle--${variant}" type="button" aria-pressed="false"
          aria-label="${t.common.theme.toDark}" data-theme-toggle
          data-label-dark="${t.common.theme.toLight}" data-label-light="${t.common.theme.toDark}">
    <svg class="icon icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>
    <svg class="icon icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"/></svg>
    ${variant === "menu" ? html`<span class="theme-toggle__label">${t.common.theme.toDark}</span>` : ""}
  </button>`;

export const Header = (t: Dictionary, lang: Lang): Safe => {
  const links: [string, string][] = [
    ["#rooms", t.nav.rooms],
    ["#facilities", t.nav.facilities],
    ["#gallery", t.nav.gallery],
    ["#faq", t.nav.faq],
    ["#location", t.nav.location],
    ["#reservation", t.nav.reserve],
  ];
  return html`
  <header class="site-header" data-header>
    <div class="container site-header__bar">
      ${Brand(localizedPath(lang))}
      <nav id="site-nav" class="site-nav" aria-label="${t.nav.label}">
        <ul>${links.map(([href, label]) => html`<li><a href="${href}">${label}</a></li>`)}</ul>
        ${ThemeToggle(t, "menu")}
      </nav>
      <div class="site-header__tools">
        ${LanguageSwitch(t, lang)}
        ${ThemeToggle(t, "header")}
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-toggle>
          <span class="sr-only">${t.nav.menu}</span><span class="menu-toggle__bars" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  </header>`;
};
