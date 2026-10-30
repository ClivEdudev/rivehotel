// Tests for booking enquiry rules and the Netlify Function. No network: Resend is mocked.
// Run with: node --disable-warning=ExperimentalWarning scripts/test-booking.mjs
import assert from "node:assert/strict";
import {
  addDays,
  buildCopy,
  composeEnquiryText,
  formatDate,
  maskDMY,
  parseDMY,
  toDMY,
  nightsBetween,
  parseISODate,
  quote,
  todayInZone,
  validateEnquiry,
} from "../src/lib/booking-logic.js";
import { booking, rooms } from "../src/config/hotel.ts";
import { dictionaries } from "../src/i18n/index.ts";

let failures = 0;
const test = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    failures++;
    console.log(`FAIL  ${name}\n      ${error.message.split("\n").join("\n      ")}`);
  }
};

const policy = { minNights: 1, maxNights: 365, maxRooms: 5, minAdvanceDays: 0 };
const today = "2026-10-30";
const validInput = {
  roomType: "standard",
  checkIn: "2026-11-02",
  checkOut: "2026-11-06",
  rooms: "2",
  adults: "2",
  children: "1",
  fullName: "Dilshod Karimov",
  email: "guest@example.com",
  phone: "+998 90 123 45 67",
  specialRequests: "Late arrival",
  website: "",
};
const ctx = (overrides = {}) => ({ rooms, policy, today, ...overrides });

// ----- Dates --------------------------------------------------------------------------------
await test("impossible calendar dates are rejected", () => {
  assert.equal(parseISODate("2026-02-30"), null);
  assert.equal(parseISODate("2026-13-01"), null);
  assert.equal(parseISODate("30.10.2026"), null);
  assert.ok(parseISODate("2026-10-30"));
});

await test("nights are counted exactly, across month boundaries", () => {
  assert.equal(nightsBetween("2026-10-30", "2026-11-03"), 4);
  assert.equal(nightsBetween("2026-02-27", "2026-03-01"), 2); // non-leap year
  assert.equal(nightsBetween("2028-02-28", "2028-03-01"), 2); // leap year
  assert.equal(nightsBetween("2026-11-03", "2026-10-30"), -4);
});

await test("date arithmetic does not drift with daylight saving or time zones", () => {
  assert.equal(addDays("2026-10-30", 1), "2026-10-31");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

await test("'today' is computed in the hotel time zone", () => {
  assert.match(todayInZone(booking.timeZone), /^\d{4}-\d{2}-\d{2}$/);
  // 2026-10-29 23:30 UTC is already 2026-10-30 in Tashkent (UTC+5).
  assert.equal(todayInZone("Asia/Tashkent", new Date("2026-10-29T23:30:00Z")), "2026-10-30");
});

await test("one date format is used everywhere", () => {
  assert.equal(formatDate("2026-10-30", "en"), "30/10/2026");
  assert.equal(formatDate("2026-10-30", "ru"), "30/10/2026");
  assert.equal(parseDMY("02/11/2026"), "2026-11-02");
  assert.equal(parseDMY("2/11/2026"), "2026-11-02");
  assert.equal(parseDMY("02.11.2026"), "2026-11-02");
  assert.equal(parseDMY("31/02/2026"), null);
  assert.equal(parseDMY("11/31/2026"), null);
  assert.equal(parseDMY("2026-11-02"), null);
  assert.equal(toDMY("2026-11-02"), "02/11/2026");
  assert.equal(maskDMY("3011"), "30/11");
  assert.equal(maskDMY("30112026"), "30/11/2026");
  assert.equal(maskDMY("30/11/20261"), "30/11/2026");
  assert.equal(formatDate("not-a-date", "en"), "");
});

// ----- Validation ---------------------------------------------------------------------------
await test("a complete, valid enquiry passes and normalises numbers", () => {
  const result = validateEnquiry(validInput, ctx());
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.nights, 4);
  assert.equal(result.data.rooms, 2);
  assert.equal(result.data.children, 1);
});

await test("check-out equal to check-in is rejected", () => {
  const result = validateEnquiry({ ...validInput, checkOut: "2026-11-02" }, ctx());
  assert.equal(result.errors.checkOut, "checkOutMustBeAfterCheckIn");
});

await test("check-out before check-in is rejected", () => {
  const result = validateEnquiry({ ...validInput, checkOut: "2026-11-01" }, ctx());
  assert.equal(result.errors.checkOut, "checkOutMustBeAfterCheckIn");
});

await test("a past check-in date is rejected", () => {
  const result = validateEnquiry({ ...validInput, checkIn: "2026-10-29", checkOut: "2026-10-31" }, ctx());
  assert.equal(result.errors.checkIn, "checkInPast");
});

await test("stay length limits are enforced", () => {
  const long = validateEnquiry({ ...validInput, checkOut: "2028-01-01" }, ctx());
  assert.equal(long.errors.checkOut, "nightsTooLong");
});

await test("room count, adults and children have limits", () => {
  assert.equal(validateEnquiry({ ...validInput, rooms: "0" }, ctx()).errors.rooms, "roomsInvalid");
  assert.equal(validateEnquiry({ ...validInput, rooms: "6" }, ctx()).errors.rooms, "roomsInvalid");
  assert.equal(validateEnquiry({ ...validInput, adults: "0" }, ctx()).errors.adults, "adultsInvalid");
  assert.equal(validateEnquiry({ ...validInput, children: "-1" }, ctx()).errors.children, "childrenInvalid");
  assert.equal(validateEnquiry({ ...validInput, rooms: "2.5" }, ctx()).errors.rooms, "roomsInvalid");
});

await test("room occupancy is enforced when the room has a limit", () => {
  const limited = [{ id: "standard", maxGuests: 2, pricePerNight: null }];
  const result = validateEnquiry({ ...validInput, adults: "3", children: "1", rooms: "1" }, ctx({ rooms: limited }));
  assert.equal(result.errors.adults, "guestsTooMany");
  const fits = validateEnquiry({ ...validInput, adults: "2", children: "2", rooms: "2" }, ctx({ rooms: limited }));
  assert.equal(fits.valid, true);
});

await test("unknown room types and missing fields are rejected", () => {
  assert.equal(validateEnquiry({ ...validInput, roomType: "penthouse" }, ctx()).errors.roomType, "noRoomAvailable");
  const empty = validateEnquiry({}, ctx());
  assert.equal(empty.valid, false);
  assert.equal(empty.errors.fullName, "required");
  assert.equal(empty.errors.email, "required");
});

await test("email and phone formats are checked", () => {
  assert.equal(validateEnquiry({ ...validInput, email: "not-an-email" }, ctx()).errors.email, "emailInvalid");
  assert.equal(validateEnquiry({ ...validInput, phone: "call me" }, ctx()).errors.phone, "phoneInvalid");
  assert.equal(validateEnquiry({ ...validInput, phone: "" }, ctx()).valid, true, "phone is optional");
});

await test("control characters are stripped and long text is refused", () => {
  const result = validateEnquiry({ ...validInput, fullName: "Ali\u0000 Valiyev" }, ctx());
  assert.equal(result.data.fullName, "Ali Valiyev");
  assert.equal(validateEnquiry({ ...validInput, fullName: "A".repeat(101) }, ctx()).errors.fullName, "tooLong");
});

await test("a filled honeypot is flagged", () => {
  assert.equal(validateEnquiry({ ...validInput, website: "http://spam" }, ctx()).errors.website, "honeypot");
});

// ----- Price --------------------------------------------------------------------------------
await test("price = rate x nights x rooms (the documented example: $50 x 4 x 2 = $400)", () => {
  const q = quote({ rate: 50, nights: 4, rooms: 2, taxPercent: null });
  assert.equal(q.known, true);
  assert.equal(q.subtotal, 400);
  assert.equal(q.total, 400);
  assert.equal(q.taxesKnown, false);
});

await test("tax is added only when the hotel has confirmed a rate", () => {
  assert.equal(quote({ rate: 50, nights: 4, rooms: 2, taxPercent: 10 }).total, 440);
  assert.equal(quote({ rate: 33.33, nights: 3, rooms: 1, taxPercent: 0 }).total, 99.99);
});

await test("no price is invented when the rate is not configured", () => {
  const q = quote({ rate: null, nights: 4, rooms: 2, taxPercent: null });
  assert.equal(q.known, false);
  assert.equal(q.total, undefined);
});

// ----- Copy ---------------------------------------------------------------------------------
await test("enquiry text shows the estimate, or 'to be confirmed' without a rate", () => {
  const copy = buildCopy(dictionaries.en.booking, booking.currency);
  const data = validateEnquiry(validInput, ctx()).data;
  const withRate = composeEnquiryText({
    copy,
    data,
    room: { name: "Standard" },
    nights: 4,
    quoted: quote({ rate: 50, nights: 4, rooms: 2, taxPercent: null }),
    locale: "en",
  });
  assert.match(withRate, /Estimated total: \$400\.00/);
  assert.match(withRate, /Check-in date: 02\/11\/2026/);
  const withoutRate = composeEnquiryText({
    copy,
    data,
    room: { name: "Standard" },
    nights: 4,
    quoted: quote({ rate: null, nights: 4, rooms: 2, taxPercent: null }),
    locale: "en",
  });
  assert.match(withoutRate, /Estimated total: To be confirmed/);
});

await test("every language produces enquiry text from its own copy", () => {
  for (const lang of ["uz", "ru", "en"]) {
    const copy = buildCopy(dictionaries[lang].booking, booking.currency);
    const data = validateEnquiry(validInput, ctx()).data;
    const text = composeEnquiryText({
      copy,
      data,
      room: { name: "X" },
      nights: 4,
      quoted: quote({ rate: null, nights: 4, rooms: 2, taxPercent: null }),
      locale: lang,
    });
    assert.ok(text.includes(copy.title), `${lang} title missing`);
    assert.ok(text.includes(dictionaries[lang].booking.messages.priceTbc), `${lang} price text missing`);
  }
});

// ----- Netlify Function (Resend mocked) ------------------------------------------------------
const { default: handler } = await import("../netlify/functions/enquiry.mjs");

const ENV = {
  RESEND_API_KEY: "re_test_key",
  ENQUIRY_TO_EMAIL: "hotel@example.com",
  ENQUIRY_FROM_EMAIL: "RIVA HOTEL <bookings@example.com>",
};
const originalFetch = globalThis.fetch;
const realDate = (() => {
  const offsetDays = 3;
  return addDays(todayInZone(booking.timeZone), offsetDays);
})();
const futureBody = (overrides = {}) => {
  const checkIn = realDate;
  const checkOut = addDays(realDate, 2);
  return { ...validInput, checkIn, checkOut, lang: "en", ...overrides };
};
let ipCounter = 0;
const post = (body, { origin, ip } = {}) => {
  const headers = { "content-type": "application/json", "x-nf-client-connection-ip": ip ?? `test-${ipCounter++}` };
  if (origin) headers.origin = origin;
  return new Request("https://rivehotel.netlify.app/.netlify/functions/enquiry", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
};
const withEnv = async (env, fn) => {
  const saved = {};
  for (const key of ["RESEND_API_KEY", "ENQUIRY_TO_EMAIL", "ENQUIRY_FROM_EMAIL"]) {
    saved[key] = process.env[key];
    if (env[key]) process.env[key] = env[key];
    else delete process.env[key];
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
};
const mockResend = (responder) => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const payload = JSON.parse(init.body);
    calls.push({ url: String(url), payload, headers: init.headers });
    return responder(payload, calls.length);
  };
  return calls;
};

await test("only POST is accepted", async () => {
  const res = await handler(new Request("https://x.test/.netlify/functions/enquiry", { method: "GET" }));
  assert.equal(res.status, 405);
});

await test("malformed JSON is a 400", async () => {
  const res = await withEnv(ENV, () => handler(post("{not json")));
  assert.equal(res.status, 400);
});

await test("requests from other origins are refused", async () => {
  const res = await withEnv(ENV, () => handler(post(futureBody(), { origin: "https://evil.example" })));
  assert.equal(res.status, 403);
});

await test("oversized bodies are refused", async () => {
  const res = await withEnv(ENV, () => handler(post({ ...futureBody(), specialRequests: "x".repeat(9000) })));
  assert.equal(res.status, 413);
});

await test("invalid enquiries return field errors and send nothing", async () => {
  const calls = mockResend(() => new Response("{}", { status: 200 }));
  const res = await withEnv(ENV, () => handler(post(futureBody({ checkOut: futureBody().checkIn }))));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.errors.checkOut, "checkOutMustBeAfterCheckIn");
  assert.equal(calls.length, 0);
  globalThis.fetch = originalFetch;
});

await test("a filled honeypot is refused without sending anything", async () => {
  const calls = mockResend(() => new Response("{}", { status: 200 }));
  const res = await withEnv(ENV, () => handler(post(futureBody({ website: "spam" }))));
  assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
  globalThis.fetch = originalFetch;
});

await test("without configured email, the function says so and sends nothing", async () => {
  const calls = mockResend(() => new Response("{}", { status: 200 }));
  const res = await withEnv({}, () => handler(post(futureBody())));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, "not_configured");
  assert.equal(calls.length, 0);
  globalThis.fetch = originalFetch;
});

await test("a valid enquiry emails the hotel, then the guest, and reports both", async () => {
  const calls = mockResend(() => new Response("{}", { status: 200 }));
  const res = await withEnv(ENV, () => handler(post(futureBody())));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.match(body.reference, /^TMH-[0-9A-Z]+-[0-9A-F]{6}$/);
  assert.equal(body.guestEmail, "sent");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].payload.to[0], ENV.ENQUIRY_TO_EMAIL);
  assert.equal(calls[0].payload.reply_to, "guest@example.com");
  assert.equal(calls[1].payload.to[0], "guest@example.com");
  assert.match(calls[1].payload.text, /not a booking confirmation/);
  assert.match(calls[0].payload.text, /Estimated total: To be confirmed/);
  assert.equal(calls[0].headers.authorization, `Bearer ${ENV.RESEND_API_KEY}`);
  globalThis.fetch = originalFetch;
});

await test("if the hotel's email fails, the guest is never told the enquiry was sent", async () => {
  const calls = mockResend(() => new Response("{}", { status: 500 }));
  const res = await withEnv(ENV, () => handler(post(futureBody())));
  assert.equal(res.status, 502);
  assert.equal(calls.length, 1, "no guest email after a failed hotel email");
  globalThis.fetch = originalFetch;
});

await test("if only the guest copy fails, the response says so honestly", async () => {
  mockResend((payload, n) => (n === 1 ? new Response("{}", { status: 200 }) : new Response("{}", { status: 500 })));
  const res = await withEnv(ENV, () => handler(post(futureBody())));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.guestEmail, "not_sent");
  globalThis.fetch = originalFetch;
});

await test("the server ignores any total sent by the browser", async () => {
  const calls = mockResend(() => new Response("{}", { status: 200 }));
  const res = await withEnv(ENV, () => handler(post(futureBody({ total: 1, price: 1 }))));
  assert.equal(res.status, 200);
  assert.ok(!calls[0].payload.text.includes("$1.00"));
  globalThis.fetch = originalFetch;
});

await test("repeated submissions from one client are rate limited", async () => {
  mockResend(() => new Response("{}", { status: 200 }));
  const ip = "rate-test-ip";
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    const res = await withEnv(ENV, () => handler(post(futureBody(), { ip })));
    statuses.push(res.status);
  }
  assert.deepEqual(statuses.slice(0, 5), [200, 200, 200, 200, 200]);
  assert.equal(statuses[5], 429);
  globalThis.fetch = originalFetch;
});

console.log(failures ? `\n${failures} booking test(s) failed` : "\nAll booking tests passed");
process.exit(failures ? 1 : 0);
