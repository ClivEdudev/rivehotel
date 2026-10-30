import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { dictionaries } from "../i18n/index.ts";
import type { Lang } from "../i18n/index.ts";
import { Facilities } from "../components/facilities.ts";
import { Faq } from "../components/faq.ts";
import { Highlights } from "../components/highlights.ts";
import { Footer } from "../components/footer.ts";
import { Gallery } from "../components/gallery.ts";
import { Header } from "../components/header.ts";
import { Hero } from "../components/hero.ts";
import { Location, Reservation } from "../components/contact.ts";
import { Rooms } from "../components/rooms.ts";

/** Page composition. Each section is its own component; copy comes from src/i18n. */
export const HomePage = (lang: Lang): Safe => {
  const t = dictionaries[lang];
  return html`
  ${Header(t, lang)}
  <main id="main">
    ${Hero(t)}
    ${Highlights(t)}
    ${Rooms(t)}
    ${Facilities(t)}
    ${Gallery(t)}
    ${Faq(t)}
    ${Location(t)}
    ${Reservation(t, lang)}
  </main>
  <div class="sticky-bar" data-sticky-bar>
    <p><span class="hero__dot" aria-hidden="true"></span>${t.sticky.text}</p>
    <a class="btn btn--primary" href="#reservation">${t.sticky.action}</a>
  </div>
  ${Footer(t, lang)}`;
};
