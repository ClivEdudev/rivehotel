import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { channels, details, hotelCoordinates, mapUrl } from "../config/hotel.ts";
import type { Channel, ChannelId } from "../config/hotel.ts";
import type { Lang } from "../i18n/index.ts";
import type { Dictionary } from "../i18n/types.ts";
import { BookingForm } from "./booking.ts";
import { Placeholder, SectionHead, Value } from "./shared.ts";

const channel = (id: ChannelId): Channel => {
  const found = channels.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown channel: ${id}`);
  return found;
};

/** Text for a channel: linked when verified, placeholder otherwise. */
const ChannelValue = (c: Channel, t: Dictionary): Safe | string =>
  c.value && c.href ? html`<a href="${c.href}">${c.value}</a>` : Value(c.value, t);

/** Exact coordinates when confirmed; otherwise a Google Maps search for the city, labelled as such. */
const directionsUrl = (): string => {
  const { latitude, longitude } = hotelCoordinates;
  return latitude !== null && longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : "https://www.google.com/maps/search/?api=1&query=Andijan%2C+Uzbekistan";
};

/**
 * Interactive map (OpenStreetMap embed: pan and zoom) centred on the confirmed coordinates.
 * With no confirmed coordinates, no pin is shown.
 */
const MapBlock = (t: Dictionary): Safe => {
  const { latitude, longitude } = hotelCoordinates;
  if (latitude === null || longitude === null) {
    return html`<div class="map map--pending"><p class="soft">${t.location.noPin}</p></div>`;
  }
  const d = 0.0035;
  const bbox = [longitude - d, latitude - d, longitude + d, latitude + d].map((n) => n.toFixed(6)).join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  return html`<iframe class="map" src="${src}" title="${t.location.mapTitle}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
};

export const Location = (t: Dictionary): Safe => {
  const fact = (label: string, value: Safe | string) => html`<div><dt>${label}</dt><dd>${value}</dd></div>`;
  return html`
  <section class="section" aria-labelledby="location">
    <div class="container location">
      <div>
        <p class="place-name" aria-hidden="true">${t.location.city}</p>
        <div class="section__head">
          <h2 id="location">${t.location.title}</h2>
          <p class="soft">${t.location.intro}</p>
        </div>
        <dl class="facts">
          ${fact(t.location.labels.address, Value(details.address, t))}
          ${fact(t.location.labels.phone, ChannelValue(channel("phone"), t))}
          ${fact(t.location.labels.email, ChannelValue(channel("email"), t))}
          ${fact(t.location.labels.hours, Value(details.hours, t))}
          ${fact(
            t.location.labels.plusCode,
            html`<span class="plus-code"><span data-plus-code>${details.plusCode}</span>
              <button class="copy-btn needs-js-inline" type="button" data-copy-code data-label="${t.location.copy}" data-done="${t.location.copied}">${t.location.copy}</button></span>`,
          )}
        </dl>
      </div>
      <div class="location__aside">
        ${MapBlock(t)}
        <p class="soft measure">${t.location.note}</p>
        <div class="location__links">
          <a class="btn btn--quiet" href="${directionsUrl()}" target="_blank" rel="noopener noreferrer">${t.location.directions}</a>
          <a class="btn btn--ghost" href="${mapUrl}" target="_blank" rel="noopener noreferrer">${t.location.map}</a>
        </div>
      </div>
    </div>
  </section>`;
};

export const Reservation = (t: Dictionary, lang: Lang): Safe => html`
  <section class="section band" aria-labelledby="reservation" id="reservation-section">
    <div class="container">
      ${SectionHead("reservation", t.reservation.title, t.reservation.intro)}
      ${BookingForm(t, lang)}
      <ul class="channels">
        ${channels.map(
          (c) => html`<li class="channel">
            <strong>${t.reservation.channels[c.id]}</strong>
            <span>${c.value ? c.value : Placeholder(t)}</span>
            ${c.href
              ? html`<a class="channel__link" href="${c.href}" rel="noopener noreferrer">${t.reservation.open}<span class="sr-only"> — ${t.reservation.channels[c.id]}</span></a>`
              : html`<span class="soft">${t.common.linkSoon}</span>`}
          </li>`,
        )}
      </ul>
      <p class="notice">${t.reservation.notice}</p>
    </div>
  </section>`;
