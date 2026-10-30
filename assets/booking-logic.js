/*
 * Booking enquiry rules, shared by the browser, the Netlify Function and the tests.
 *
 * Pure functions only: no DOM, no network. Dates are calendar dates (YYYY-MM-DD) and are
 * handled in UTC, so no time zone can shift a night by one day.
 *
 * This module does NOT check availability and does NOT confirm bookings. It only validates
 * an enquiry and estimates a price from the hotel's configured rates.
 */

export const DAY_MS = 86400000;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

/** Strips control characters and surrounding whitespace. Length limits are checked separately. */
export function clean(value) {
  return String(value ?? "").replace(CONTROL, "").trim();
}

/** Whole number from a number or digit string, otherwise null. */
function toInt(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  const text = clean(value);
  return /^\d+$/.test(text) ? Number(text) : null;
}

/** "YYYY-MM-DD" -> Date at UTC midnight, or null if it is not a real calendar date. */
export function parseISODate(value) {
  if (typeof value !== "string") return null;
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in a named time zone, as "YYYY-MM-DD". */
export function todayInZone(zone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(iso, days) {
  const date = parseISODate(iso);
  return date ? toISODate(new Date(date.getTime() + days * DAY_MS)) : null;
}

/** Nights between two calendar dates. Negative or zero means the range is invalid. */
export function nightsBetween(checkIn, checkOut) {
  const a = parseISODate(checkIn);
  const b = parseISODate(checkOut);
  return a && b ? Math.round((b.getTime() - a.getTime()) / DAY_MS) : null;
}

/** One date format for the whole site, e.g. "Oct 30, 2026" (en) or "30 окт. 2026 г." (ru). */
export function formatDate(iso, locale) {
  const date = parseISODate(iso);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatMoney(amount, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.code, minimumFractionDigits: 2 }).format(amount);
}

const cents = (amount) => Math.round(amount * 100) / 100;

/**
 * Estimated price: nightly rate x nights x rooms, plus tax when the hotel has confirmed a rate.
 * If the rate is not configured, nothing is calculated (known: false).
 */
export function quote({ rate, nights, rooms, taxPercent }) {
  if (typeof rate !== "number" || !Number.isFinite(rate) || !nights || !rooms || nights < 1 || rooms < 1) {
    return { known: false, rate: rate ?? null, nights: nights ?? null, rooms: rooms ?? null };
  }
  const subtotal = cents(rate * nights * rooms);
  const taxesKnown = typeof taxPercent === "number";
  const tax = taxesKnown ? cents((subtotal * taxPercent) / 100) : null;
  return {
    known: true,
    rate,
    nights,
    rooms,
    subtotal,
    taxesKnown,
    tax,
    total: taxesKnown ? cents(subtotal + tax) : subtotal,
  };
}

const ROOM_LIMIT_ADULTS = 10;
const ROOM_LIMIT_CHILDREN = 10;

/**
 * Validates an enquiry. Error codes are keys of `booking.validation` in the dictionaries,
 * so the browser and the server show the same messages.
 * Returns { valid, errors, data, nights }.
 */
export function validateEnquiry(input = {}, { rooms, policy, today }) {
  const errors = {};
  const fail = (field, code) => {
    if (!errors[field]) errors[field] = code;
  };

  // Room type
  const roomType = clean(input.roomType);
  const room = rooms.find((r) => r.id === roomType);
  if (!roomType) fail("roomType", "required");
  else if (!room) fail("roomType", "noRoomAvailable");

  // Dates
  const checkIn = clean(input.checkIn);
  const checkOut = clean(input.checkOut);
  const inDate = parseISODate(checkIn);
  const outDate = parseISODate(checkOut);
  const earliest = addDays(today, policy.minAdvanceDays) ?? today;
  if (!checkIn) fail("checkIn", "required");
  else if (!inDate) fail("checkIn", "dateInvalid");
  else if (checkIn < earliest) fail("checkIn", "checkInPast");

  if (!checkOut) fail("checkOut", "required");
  else if (!outDate) fail("checkOut", "dateInvalid");
  else if (inDate && outDate <= inDate) fail("checkOut", "checkOutMustBeAfterCheckIn");

  let nights = null;
  if (inDate && outDate && outDate > inDate) {
    nights = nightsBetween(checkIn, checkOut);
    if (nights < policy.minNights) fail("checkOut", "nightsTooShort");
    else if (nights > policy.maxNights) fail("checkOut", "nightsTooLong");
  }

  // Rooms and guests
  const roomsCount = toInt(input.rooms);
  if (roomsCount === null || roomsCount < 1 || roomsCount > policy.maxRooms) fail("rooms", "roomsInvalid");

  const adults = toInt(input.adults);
  if (adults === null || adults < 1 || adults > ROOM_LIMIT_ADULTS) fail("adults", "adultsInvalid");

  const children = toInt(input.children);
  if (children === null || children < 0 || children > ROOM_LIMIT_CHILDREN) fail("children", "childrenInvalid");

  if (room && room.maxGuests !== null && roomsCount && adults !== null && children !== null) {
    if (adults + children > room.maxGuests * roomsCount) fail("adults", "guestsTooMany");
  }

  // Contact details
  const fullName = clean(input.fullName);
  if (!fullName) fail("fullName", "required");
  else if (fullName.length > 100) fail("fullName", "tooLong");

  const email = clean(input.email);
  if (!email) fail("email", "required");
  else if (email.length > 254 || !EMAIL.test(email)) fail("email", "emailInvalid");

  const phone = clean(input.phone);
  if (phone && !PHONE.test(phone)) fail("phone", "phoneInvalid");

  const specialRequests = clean(input.specialRequests);
  if (specialRequests.length > 1000) fail("specialRequests", "tooLong");

  // Honeypot: real visitors never fill this in. The server answers bots with a generic error.
  if (clean(input.website)) fail("website", "honeypot");

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    nights,
    data: valid
      ? { roomType, checkIn, checkOut, rooms: roomsCount, adults, children, fullName, email, phone, specialRequests }
      : null,
  };
}

/** Copy used to build enquiry text. `text` is the dictionary's `booking` section. */
export function buildCopy(text, currency) {
  return { ...text.messages, title: text.title, labels: text.labels, currency };
}

/** Plain-text enquiry, used for the admin email, the guest copy, and the message sent via channels. */
export function composeEnquiryText({ copy, data, room, nights, quoted, locale }) {
  const L = copy.labels;
  const row = (label, value) => `${label}: ${value}`;
  const money = (amount) => formatMoney(amount, copy.currency);

  const lines = [
    copy.title,
    "",
    row(L.roomType, room.name),
    row(L.checkIn, formatDate(data.checkIn, locale)),
    row(L.checkOut, formatDate(data.checkOut, locale)),
    row(L.nights, nights),
    row(L.rooms, data.rooms),
    row(L.adults, data.adults),
    row(L.children, data.children),
    "",
    row(L.fullName, data.fullName),
    row(L.email, data.email),
    row(L.phone, data.phone || copy.notProvided),
  ];
  if (data.specialRequests) lines.push(row(L.specialRequests, data.specialRequests));

  lines.push("");
  if (quoted.known) {
    lines.push(row(L.pricePerNight, money(quoted.rate)));
    lines.push(row(L.subtotal, `${money(quoted.subtotal)} (${quoted.nights} × ${quoted.rooms})`));
    if (quoted.taxesKnown) {
      lines.push(row(L.taxes, money(quoted.tax)));
      lines.push(row(L.estimatedTotal, `${money(quoted.total)} (${copy.estimateNote})`));
    } else {
      lines.push(row(L.estimatedTotal, `${money(quoted.total)} (${copy.estimateNote}; ${copy.taxesTbc})`));
    }
  } else {
    lines.push(row(L.estimatedTotal, copy.priceTbc));
  }
  return lines.join("\n");
}
