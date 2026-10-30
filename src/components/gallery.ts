import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { gallery, images } from "../config/hotel.ts";
import type { Dictionary } from "../i18n/types.ts";
import { SectionHead, imageUrl } from "./shared.ts";

export const Gallery = (t: Dictionary): Safe => html`
  <section class="section" aria-labelledby="gallery">
    <div class="container">
      ${SectionHead("gallery", t.gallery.title, t.gallery.intro)}
      <div class="gallery">
        ${gallery.map((item) => {
          const caption = t.gallery.items[item.id];
          return html`
          <button class="tile" type="button" data-gallery data-src="${imageUrl(item.image)}" data-caption="${caption}">
            <img src="${imageUrl(item.image)}" alt="${caption} — ${t.common.illustrative}" width="960" height="720" loading="lazy" decoding="async">
            <span class="tile__caption">${caption}${images.illustrative ? html`<small>${t.common.illustrative}</small>` : ""}</span>
          </button>`;
        })}
      </div>
    </div>
    <dialog class="lightbox" data-lightbox aria-label="${t.gallery.title}">
      <img src="" alt="">
      <div class="lightbox__bar">
        <p data-lightbox-caption></p>
        <div class="lightbox__nav">
          <button class="lightbox__btn" type="button" data-lightbox-prev aria-label="${t.gallery.prev}">&larr;</button>
          <button class="lightbox__btn" type="button" data-lightbox-next aria-label="${t.gallery.next}">&rarr;</button>
          <button class="lightbox__close" type="button" data-lightbox-close>${t.gallery.close}</button>
        </div>
      </div>
    </dialog>
  </section>`;
