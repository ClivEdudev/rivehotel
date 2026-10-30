import { html, raw } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import type { Dictionary } from "../i18n/types.ts";

type HighlightId = keyof Dictionary["highlights"]["items"];

/** Simple line icons, drawn with currentColor. */
const icons: Record<HighlightId, string> = {
  reception: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`,
  breakfast: `<path d="M4 10h13v3a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3"/>`,
  pin: `<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>`,
  direct: `<path d="M4 6.5h16v11H4z"/><path d="m4.5 7 7.5 6 7.5-6"/>`,
};

/** Verified facts at a glance, overlapping the bottom of the hero. */
export const Highlights = (t: Dictionary): Safe => {
  const ids = Object.keys(t.highlights.items) as HighlightId[];
  return html`
  <section class="highlights" aria-label="${t.highlights.label}">
    <ul class="container highlights__list">
      ${ids.map((id) => {
        const item = t.highlights.items[id];
        return html`<li class="highlight">
          <svg class="highlight__icon" viewBox="0 0 24 24" aria-hidden="true">${raw(icons[id])}</svg>
          <div><strong>${item.title}</strong><p>${item.text}</p></div>
        </li>`;
      })}
    </ul>
  </section>`;
};
