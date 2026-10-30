// Netlify Function: POST /.netlify/functions/enquiry
//
// Receives a booking ENQUIRY (not a booking). It:
//   1. checks the origin, body size and a simple per-instance rate limit,
//   2. validates every field with the same rules as the browser,
//   3. recalculates the estimated price from config (the browser total is never trusted),
//   4. emails the hotel and, only after the hotel's email was accepted, a copy to the guest.
//
// It never claims a booking is confirmed and never checks availability.
//
// Environment variables (set in Netlify, never in the source code):
//   RESEND_API_KEY        Resend API key (server-side only)
//   ENQUIRY_TO_EMAIL      hotel inbox that receives enquiries
//   ENQUIRY_FROM_EMAIL    sender address on a domain verified in Resend, e.g. "RIVA HOTEL <bookings@yourdomain.uz>"
//   SITE_URL              (optional) canonical site URL, used for the origin check
// Netlify provides URL and DEPLOY_PRIME_URL automatically; both are accepted for the origin check.

import { addDays, buildCopy, composeEnquiryText, quote, todayInZone, validateEnquiry } from "../../src/lib/booking-logic.js";
import { booking, rooms, site } from "../../src/config/hotel.ts";
import { dictionaries, defaultLang, languages } from "../../src/i18n/index.ts";

const MAX_BODY_BYTES = 8000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 5;
// Per warm function instance only. Serverless instances do not share memory, so this is a
// first line of defence, not a guarantee. Add Netlify rate limiting or Cloudflare Turnstile
// for stronger protection before launch (see README).
const recentRequests = new Map();

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const overRateLimit = (key) => {
  const now = Date.now();
  const times = (recentRequests.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  times.push(now);
  recentRequests.set(key, times);
  return times.length > RATE_MAX_REQUESTS;
};

const allowedOrigins = () =>
  [site.url, process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.SITE_URL, "http://localhost:4321"]
    .filter(Boolean)
    .map((u) => u.replace(/\/$/, ""));

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const makeReference = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `TMH-${stamp}-${random}`;
};

/** Sends one email through Resend. Returns true only when Resend accepted it. */
const sendEmail = async (env, { to, subject, text, replyTo, idempotencyKey }) => {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        from: env.ENQUIRY_FROM_EMAIL,
        to: [to],
        subject,
        text,
        html: `<pre style="font-family:Georgia,serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "method" });

  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins().includes(origin.replace(/\/$/, ""))) return json(403, { error: "origin" });

  const ip = request.headers.get("x-nf-client-connection-ip") ?? "unknown";
  if (overRateLimit(ip)) return json(429, { error: "rate_limited" });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "too_large" });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (!body || typeof body !== "object") return json(400, { error: "invalid_body" });

  const lang = languages.includes(body.lang) ? body.lang : defaultLang;
  const dict = dictionaries[lang];

  const policy = {
    minNights: booking.minNights,
    maxNights: booking.maxNights,
    maxRooms: booking.maxRooms,
    minAdvanceDays: booking.minAdvanceDays,
  };
  const today = todayInZone(booking.timeZone);
  const result = validateEnquiry(body, { rooms, policy, today });

  // A filled honeypot means a bot: refuse without saying which field tripped the check.
  if (result.errors.website) return json(400, { error: "invalid" });
  if (!result.valid) return json(422, { error: "invalid", errors: result.errors });

  const env = process.env;
  if (!env.RESEND_API_KEY || !env.ENQUIRY_TO_EMAIL || !env.ENQUIRY_FROM_EMAIL) {
    return json(503, { error: "not_configured" });
  }

  const data = result.data;
  const room = rooms.find((r) => r.id === data.roomType);
  const quoted = quote({ rate: room.pricePerNight, nights: result.nights, rooms: data.rooms, taxPercent: booking.taxPercent });
  const copy = buildCopy(dict.booking, booking.currency);
  const roomName = dict.rooms.tiers[room.id].name;
  const enquiryText = composeEnquiryText({ copy, data, room: { name: roomName }, nights: result.nights, quoted, locale: lang });

  const reference = makeReference();
  const adminSent = await sendEmail(env, {
    to: env.ENQUIRY_TO_EMAIL,
    subject: `${dict.booking.email.adminSubject} · ${reference}`,
    text: `${reference}\n\n${enquiryText}`,
    replyTo: data.email,
    idempotencyKey: `${reference}-hotel`,
  });
  if (!adminSent) return json(502, { error: "provider" });

  const guestText = [
    dict.booking.email.guestIntro,
    "",
    `${dict.booking.status.referenceLabel}: ${reference}`,
    "",
    enquiryText,
    "",
    dict.booking.email.guestFooter,
    `${site.url}/${lang}/`,
  ].join("\n");
  const guestSent = await sendEmail(env, {
    to: data.email,
    subject: dict.booking.email.guestSubject,
    text: guestText,
    idempotencyKey: `${reference}-guest`,
  });

  return json(200, { ok: true, reference, guestEmail: guestSent ? "sent" : "not_sent" });
};
