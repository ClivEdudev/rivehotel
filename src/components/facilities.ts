import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { facilities } from "../config/hotel.ts";
import type { Dictionary } from "../i18n/types.ts";
import { SectionHead } from "./shared.ts";

export const Facilities = (t: Dictionary): Safe => html`
  <section class="section on-dark" aria-labelledby="facilities">
    <div class="container">
      ${SectionHead("facilities", t.facilities.title, t.facilities.intro)}
      <ul class="facilities">
        ${facilities.map(
          (item) => html`<li class="${item.confirmed ? "is-confirmed" : ""}">
            <strong>${t.facilities.items[item.id]}</strong>
            ${item.confirmed
              ? item.detail ? html`<span class="facility__detail">${item.detail}</span>` : ""
              : html`<span class="tbc">[${t.common.pending}]</span>`}
          </li>`,
        )}
      </ul>
    </div>
  </section>`;
