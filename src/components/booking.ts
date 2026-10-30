import { html, raw } from "../lib/html.ts";
import type { Safe } from "../lib/html.ts";
import { booking, channels, rooms } from "../config/hotel.ts";
import type { Lang } from "../i18n/index.ts";
import type { Dictionary } from "../i18n/types.ts";

/** Serverless endpoint (netlify/functions/enquiry.mjs). Only reachable on the deployed Netlify site. */
export const ENQUIRY_ENDPOINT = "/.netlify/functions/enquiry";

/**
 * Booking enquiry form. Hidden without JavaScript (class `needs-js`), because submitting it
 * needs the browser module in assets/booking.js. The channel list elsewhere on the page stays
 * visible for everyone.
 *
 * This form never shows availability and never confirms a booking. The price is an estimate,
 * recalculated on the server before any email is sent.
 */
export const BookingForm = (t: Dictionary, lang: Lang): Safe => {
  const b = t.booking;
  const config = {
    lang,
    endpoint: ENQUIRY_ENDPOINT,
    policy: {
      minNights: booking.minNights,
      maxNights: booking.maxNights,
      maxRooms: booking.maxRooms,
      minAdvanceDays: booking.minAdvanceDays,
      timeZone: booking.timeZone,
      taxPercent: booking.taxPercent,
      currency: booking.currency,
    },
    rooms: rooms.map((r) => ({ id: r.id, name: t.rooms.tiers[r.id].name, rate: r.pricePerNight, maxGuests: r.maxGuests })),
    channels: channels.map((c) => ({ id: c.id, href: c.href })),
    booking: b,
  };
  // Escape "<" so the JSON cannot close its own <script> tag.
  const json = JSON.stringify(config).replace(/</g, "\\u003c");

  return html`
  <div class="booking needs-js" data-booking>
    <h3 class="booking__title">${b.title}</h3>
    <p class="soft booking__intro">${b.intro}</p>

    <form class="booking-form" id="booking-form" novalidate>
      <fieldset class="field field--wide" data-field="roomType">
        <legend>${b.labels.roomType}</legend>
        <div class="room-options">
          ${rooms.map((room) => html`
            <label class="room-option">
              <input type="radio" name="roomType" value="${room.id}">
              <span class="room-option__name">${t.rooms.tiers[room.id].name}</span>
              <span class="room-option__rate" data-rate="${room.id}">${b.messages.priceTbc}</span>
            </label>`)}
        </div>
        <p class="field__error" data-error-for="roomType"></p>
      </fieldset>

      <div class="form-row">
        <div class="field">
          <label for="bk-checkin">${b.labels.checkIn}</label>
          <div class="date-field">
            <input class="form-control" type="text" id="bk-checkin" name="checkIn" required aria-required="true"
                   placeholder="${b.labels.datePlaceholder}" inputmode="numeric" autocomplete="off" maxlength="10"
                   data-date-input aria-describedby="bk-date-format">
            <button class="date-field__btn" type="button" data-date-picker="checkIn" aria-label="${b.labels.pickDate} — ${b.labels.checkIn}">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>
            </button>
            <input class="date-field__native" type="date" tabindex="-1" aria-hidden="true" data-picker-for="checkIn">
          </div>
          <p class="field__error" data-error-for="checkIn"></p>
        </div>
        <div class="field">
          <label for="bk-checkout">${b.labels.checkOut}</label>
          <div class="date-field">
            <input class="form-control" type="text" id="bk-checkout" name="checkOut" required aria-required="true"
                   placeholder="${b.labels.datePlaceholder}" inputmode="numeric" autocomplete="off" maxlength="10"
                   data-date-input aria-describedby="bk-date-format">
            <button class="date-field__btn" type="button" data-date-picker="checkOut" aria-label="${b.labels.pickDate} — ${b.labels.checkOut}">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>
            </button>
            <input class="date-field__native" type="date" tabindex="-1" aria-hidden="true" data-picker-for="checkOut">
          </div>
          <p class="field__error" data-error-for="checkOut"></p>
        </div>
      </div>

      <p class="field__hint" id="bk-date-format">${b.labels.dateFormat}</p>

      <div class="form-row form-row--counts">
        <div class="field">
          <label for="bk-rooms">${b.labels.rooms}</label>
          <input class="form-control" type="number" id="bk-rooms" name="rooms" min="1" max="${booking.maxRooms}" step="1" value="${booking.defaults.rooms}" inputmode="numeric">
          <p class="field__error" data-error-for="rooms"></p>
        </div>
        <div class="field">
          <label for="bk-adults">${b.labels.adults}</label>
          <input class="form-control" type="number" id="bk-adults" name="adults" min="1" max="10" step="1" value="${booking.defaults.adults}" inputmode="numeric">
          <p class="field__error" data-error-for="adults"></p>
        </div>
        <div class="field">
          <label for="bk-children">${b.labels.children}</label>
          <input class="form-control" type="number" id="bk-children" name="children" min="0" max="10" step="1" value="${booking.defaults.children}" inputmode="numeric">
          <p class="field__error" data-error-for="children"></p>
        </div>
      </div>

      <div class="summary" aria-live="polite">
        <div class="summary__row"><span>${b.labels.nights}</span><strong data-summary="nights">—</strong></div>
        <div class="summary__row"><span>${b.labels.totalGuests}</span><strong data-summary="guests">—</strong></div>
        <div class="summary__row"><span>${b.labels.pricePerNight}</span><span data-summary="rate">${b.messages.priceTbc}</span></div>
        <div class="summary__row"><span>${b.labels.subtotal}</span><span data-summary="subtotal">—</span></div>
        <div class="summary__row"><span>${b.labels.taxes}</span><span data-summary="taxes">${b.messages.taxesTbc}</span></div>
        <div class="summary__row summary__row--total"><span>${b.labels.estimatedTotal}</span><strong data-summary="total">${b.messages.priceTbc}</strong></div>
        <p class="summary__note">${b.messages.totalCalculated}</p>
      </div>

      <div class="field">
        <label for="bk-name">${b.labels.fullName}</label>
        <input class="form-control" type="text" id="bk-name" name="fullName" autocomplete="name" maxlength="100" required aria-required="true">
        <p class="field__error" data-error-for="fullName"></p>
      </div>

      <div class="form-row">
        <div class="field">
          <label for="bk-email">${b.labels.email}</label>
          <input class="form-control" type="email" id="bk-email" name="email" autocomplete="email" maxlength="254" required aria-required="true">
          <p class="field__error" data-error-for="email"></p>
        </div>
        <div class="field">
          <label for="bk-phone">${b.labels.phone}</label>
          <input class="form-control" type="tel" id="bk-phone" name="phone" autocomplete="tel" maxlength="20" placeholder="+">
          <p class="field__error" data-error-for="phone"></p>
        </div>
      </div>

      <div class="field">
        <label for="bk-requests">${b.labels.specialRequests}</label>
        <textarea class="form-control" id="bk-requests" name="specialRequests" rows="3" maxlength="1000"></textarea>
        <p class="field__error" data-error-for="specialRequests"></p>
      </div>

      <div class="hp" aria-hidden="true">
        <label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      </div>

      <div class="form-actions">
        <button class="btn btn--primary" type="submit" data-submit>${b.buttons.submit}</button>
        <button class="btn btn--ghost" type="reset">${b.buttons.reset}</button>
      </div>

      <p class="booking__status" role="status" aria-live="polite" data-status></p>

      <div class="booking__send">
        <p class="soft booking__hint">${b.messages.selectChannel}</p>
        <div class="channel-buttons">
          ${channels.map((c) => {
            const label = t.reservation.channels[c.id];
            return c.href
              ? html`<button class="btn btn--quiet" type="button" data-channel="${c.id}">${b.messages.sendVia} ${label}</button>`
              : html`<button class="btn btn--quiet" type="button" disabled title="${t.common.linkSoon}">${label} — ${t.common.linkSoon}</button>`;
          })}
          <button class="btn btn--ghost" type="button" data-copy>${b.buttons.copy}</button>
        </div>
        <pre class="booking__preview" data-preview hidden></pre>
      </div>
    </form>

    <p class="notice">${b.notice}</p>
    ${raw(`<script type="application/json" id="booking-config">${json}</script>`)}
  </div>`;
};
