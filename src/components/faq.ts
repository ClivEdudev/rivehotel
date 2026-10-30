import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { details, stay } from "../config/hotel.ts";
import type { Dictionary } from "../i18n/types.ts";
import { SectionHead, Value } from "./shared.ts";

/**
 * "Good to know": verified stay facts beside an accordion of common questions.
 * Native <details> elements, so the answers open and close without JavaScript.
 */
export const Faq = (t: Dictionary): Safe => {
  const f = t.faq;
  const fact = (label: string, value: string | null) => html`<div><dt>${label}</dt><dd>${Value(value, t)}</dd></div>`;
  return html`
  <section class="section" aria-labelledby="faq">
    <div class="container faq">
      <div class="faq__intro">
        ${SectionHead("faq", f.title, f.intro)}
        <div class="stay-card">
          <h3>${f.stayTitle}</h3>
          <dl>
            ${fact(f.labels.checkIn, stay.checkIn)}
            ${fact(f.labels.checkOut, stay.checkOut)}
            ${fact(f.labels.breakfast, stay.breakfast)}
            ${fact(f.labels.reception, details.hours)}
          </dl>
        </div>
      </div>
      <div class="faq__list">
        ${f.items.map(
          (item, i) => html`<details class="faq-item" ${i === 0 ? html`open` : ""}>
            <summary>${item.q}<span class="faq-item__mark" aria-hidden="true"></span></summary>
            <p>${item.a}</p>
          </details>`,
        )}
      </div>
    </div>
  </section>`;
};
