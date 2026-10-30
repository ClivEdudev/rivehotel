import { html } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { rooms } from "../config/hotel.ts";
import type { Dictionary } from "../i18n/types.ts";
import { IllustrativeTag, SectionHead, Value, imageUrl } from "./shared.ts";

type RoomConfig = (typeof rooms)[number];

export const RoomCard = (room: RoomConfig, t: Dictionary): Safe => {
  const copy = t.rooms.tiers[room.id];
  const row = (label: string, value: string | null) =>
    html`<div><dt>${label}</dt><dd>${Value(value, t)}</dd></div>`;
  return html`
    <article class="room">
      <div class="room__media">
        <img src="${imageUrl(room.image)}" alt="${copy.name} — ${t.common.illustrative}" width="800" height="1000" loading="lazy" decoding="async">
        ${IllustrativeTag(t)}
      </div>
      <div>
        <h3>${copy.name}</h3>
        <p class="room__tagline">${copy.tagline}</p>
      </div>
      <p class="soft">${copy.description}</p>
      <dl>
        ${row(t.rooms.labels.size, room.size)}
        ${row(t.rooms.labels.guests, room.guests)}
        ${row(t.rooms.labels.rate, room.rate)}
      </dl>
      <a class="btn btn--quiet" href="#reservation">${t.rooms.enquire}</a>
    </article>`;
};

export const Rooms = (t: Dictionary): Safe => html`
  <section class="section" aria-labelledby="rooms" id="rooms-section">
    <div class="container">
      ${SectionHead("rooms", t.rooms.title, t.rooms.intro)}
      <div class="rooms">${rooms.map((room) => RoomCard(room, t))}</div>
    </div>
  </section>`;
