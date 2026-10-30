import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { socials } from "../config/hotel.ts";
import { localizedPath } from "../i18n/index.ts";
import type { Lang } from "../i18n/index.ts";
import type { Dictionary } from "../i18n/types.ts";
import { Brand } from "./shared.ts";
import { LanguageSwitch } from "./header.ts";

export const Footer = (t: Dictionary, lang: Lang): Safe => html`
  <footer class="site-footer on-dark">
    <div class="container">
      <div class="site-footer__grid">
        <div>
          ${Brand(localizedPath(lang))}
          <p class="soft" style="margin-top:1.5rem">${t.footer.social}</p>
          <ul class="socials">
            ${socials.map((s) => {
              const label = t.footer.socials[s.id];
              return s.href
                ? html`<li><a href="${s.href}" rel="noopener noreferrer" target="_blank">${label}</a></li>`
                : html`<li><span class="tbc" title="${t.common.linkSoon}">${label} — ${t.common.linkSoon}</span></li>`;
            })}
          </ul>
        </div>
        ${LanguageSwitch(t, lang)}
      </div>
      <small>${t.footer.rights} ${t.footer.note}</small>
    </div>
  </footer>`;
