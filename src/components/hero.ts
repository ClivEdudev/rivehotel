import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { images } from "../config/hotel.ts";
import type { Dictionary } from "../i18n/types.ts";
import { IllustrativeTag, imageUrl } from "./shared.ts";

export const Hero = (t: Dictionary): Safe => html`
  <section class="hero" aria-labelledby="hero-title">
    <img class="hero__image" src="${imageUrl(images.hero.large)}"
         srcset="${imageUrl(images.hero.small)} 800w, ${imageUrl(images.hero.large)} 1600w" sizes="100vw"
         alt="" width="1600" height="1000" fetchpriority="high" decoding="async">
    <div class="hero__shade"></div>
    <div class="container hero__content">
      <p class="hero__chip" style="--i:0"><span class="hero__dot" aria-hidden="true"></span>${t.hero.eyebrow}</p>
      <p class="hero__place" style="--i:1">${t.hero.place}</p>
      <h1 id="hero-title" style="--i:2">${t.hero.title}</h1>
      <p class="lead" style="--i:3">${t.hero.lead}</p>
      <div class="hero__actions" style="--i:4">
        <a class="btn btn--primary" href="#reservation">${t.hero.primary}</a>
        <a class="btn btn--ghost" href="#rooms">${t.hero.secondary}</a>
      </div>
    </div>
    ${IllustrativeTag(t)}
  </section>`;
