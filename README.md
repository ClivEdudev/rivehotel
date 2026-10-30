# RIVA HOTEL ANDIJON — website

Mobile-first, three-language (uz / ru / en) website for RIVA HOTEL ANDIJON (Plus Code Q8VW+WJ Andijan), Uzbekistan.
Built on the RIVA HOTEL codebase, with a new design system and extra sections: an "at a glance" strip,
"Good to know" (stay facts + FAQ), a working map pin with a copyable Plus Code, gallery previous/next and swipe,
and a bottom enquiry bar on phones.
Static pages built from TypeScript components, hand-written CSS with design tokens, optional JavaScript
for the booking enquiry form, the menu, dark mode and the gallery. One Netlify Function receives booking enquiries.

> The project has **no npm dependencies** at runtime or build time. Dependencies are only needed for the optional
> image generator and the test tools (see Setup).

## Setup

Requires Node 22.18 or newer (the build runs TypeScript natively).

```bash
npm run build       # writes dist/ with /uz/, /ru/, /en/, sitemap.xml, robots.txt
npm run serve       # http://localhost:4321/  (serves dist/; the enquiry endpoint is not available here)
npm run images      # optional: regenerate demo images (needs `npm i -D sharp`)
```

Set the real domain for canonical links, hreflang and the sitemap at build time:

```bash
SITE_URL=https://your-domain.uz npm run build
```

## Deployment (Netlify + GitHub)

`netlify.toml` tells Netlify to run `npm run build` and publish `dist/`. Every push to the connected GitHub branch
rebuilds and redeploys the site. The enquiry endpoint lives in `netlify/functions/enquiry.mjs`.

Set these **environment variables in Netlify** (Site configuration → Environment variables). Never put them in the code:

| Variable | Example | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_…` | Resend API key for sending email (server-side only) |
| `ENQUIRY_TO_EMAIL` | `bookings@your-domain.uz` | Hotel inbox that receives enquiries |
| `ENQUIRY_FROM_EMAIL` | `RIVA HOTEL <bookings@your-domain.uz>` | Sender; the domain must be verified in Resend |
| `SITE_URL` | `https://rivehotel.netlify.app` | Optional. Used for the origin check and the build |

Until the three email variables are set, the form shows an honest message that online enquiries are not active,
and the channel links keep working.

Also set `NODE_VERSION` (already `22` in `netlify.toml`).

## What the booking form does — and does not do

The booking form sends an **enquiry**. It never checks room availability, never confirms a booking, and never
shows a price that the hotel has not configured.

- **Dates:** typed as dd/mm/yyyy (slashes are added while typing; a calendar button opens the phone or browser date picker), sent to the server as YYYY-MM-DD, and shown as dd/mm/yyyy in emails. Check-in cannot be in the past; check-out must be at least one night after check-in. "Today" is taken
  in the hotel's time zone (`booking.timeZone`), not the visitor's. Dates are calendar dates handled in UTC, so no
  time zone can shift a night.
- **Price:** `nightly rate × nights × rooms`, plus tax only when `booking.taxPercent` is set. With no rate configured
  the form shows "To be confirmed" and calculates nothing.
- **Server check:** the Netlify Function validates every field again, recalculates the price from
  `src/config/hotel.ts`, and ignores any total sent by the browser.
- **Email:** the hotel gets the enquiry (reply-to the guest). The guest gets a copy only after Resend accepts the
  hotel's email, and the text says it is not a booking confirmation. If the guest copy fails, the visitor is told so.
- **Protection:** field limits, a hidden honeypot field, a per-instance rate limit (5 requests per 10 minutes),
  a duplicate-click guard, and an origin check. The rate limit is per serverless instance, so for stronger
  protection add Netlify rate limiting or Cloudflare Turnstile before launch.
- **Storage:** nothing is stored in a database. Enquiries travel by email through Resend to the hotel. Keep the
  hotel inbox access restricted to authorised staff.

Shared rules live in `src/lib/booking-logic.js`, used by the browser, the Netlify Function and the tests.

## Dark mode

A toggle in the header (on phones: in the menu) switches between light and dark themes. The choice is saved in
`localStorage`. On a first visit the system setting is followed. If storage is blocked, the choice lasts for the
visit only. The theme is applied before first paint, so there is no flash.

## Verified facts already filled in

From the hotel's Google Maps listing: coordinates `40.794777, 72.3466` (Plus Code Q8VW+WJ), reception open 24 hours,
breakfast 07:00–10:00. Everything else (address, phone, rates, check-in/out, other amenities) is still a placeholder.

## Map and location

The map is placed by coordinates. Fill `hotelCoordinates` in `src/config/hotel.ts` with the exact latitude and
longitude from a verified source (e.g. a Google Maps "Share" link). Until then the map area shows a placeholder and
no pin is invented. The map is interactive (pan and zoom) and the "Get directions in Google Maps" link uses the
coordinates when they are set. Clicking a marker does not open a popup in this embedded map.

## Logo

Put logo files in `public/brand/` and set `brand.logo.light` (and optionally `brand.logo.dark`) in
`src/config/hotel.ts`. The header and footer then show the logo, and the dark logo is used in dark mode. With no
files set, the text wordmark is shown.

## Tests

```bash
npm test            # build, booking rules and function tests, static checks, responsive and interaction checks
```

- `scripts/test-booking.mjs`: date and night calculation, validation rules, price calculation, enquiry text,
  and the Netlify Function (Resend is mocked, nothing is sent).
- `scripts/test-static.mjs`: translation key parity, one `<h1>`, hreflang, canonical, metadata length, no dead links,
  no fake booking or availability wording, no invented phone numbers, illustrative labels.
- `scripts/test-responsive.mjs`: 360 / 390 / 768 / 1280 / 1536 px: no horizontal scroll, images load, tap targets
  at least 40 px, mobile menu, language switching, reduced motion, gallery lightbox. Screenshots go to `test-output/`.
- `scripts/test-interactions.mjs`: booking form with and without JavaScript, live estimate, validation messages,
  dark mode with saved preference, and menu navigation landing below the header.

Playwright is needed for the two browser tests: `npm i -D playwright && npx playwright install chromium`.
`npm run typecheck` needs `npm i` (TypeScript and `@types/node`).

## Structure

```
src/config/hotel.ts          facts, rates, booking rules, coordinates, logo (null = to be confirmed)
src/i18n/{uz,ru,en}.ts       all copy; types.ts forces every language to have every key
src/lib/booking-logic.js     shared booking rules (dates, validation, price, enquiry text)
src/lib/html.ts              escaping template helper
src/components/*.ts          Header, Hero, Rooms, Facilities, Gallery, Location, Booking form, Footer
src/layouts/base.ts          <head>, SEO, hreflang, JSON-LD, theme before first paint
src/pages/home.ts            page composition
src/styles/global.css        design tokens (light and dark), styles
src/scripts/main.js          menu, header state, smooth anchors, reveals, theme toggle, lightbox
src/scripts/booking.js       booking form behaviour (module)
netlify/functions/enquiry.mjs  enquiry endpoint: validation, price check, email
netlify.toml                 build, publish, functions, security headers
scripts/                     image generator, dev server, tests
```

## Before launch checklist

1. Fill `src/config/hotel.ts` with **verified** values: address, hours, phone / Telegram / WhatsApp / email
   (`value` + `href`), social links, room sizes, guests, rates (`pricePerNight`, `maxGuests`), tax rate
   (`booking.taxPercent`), coordinates (`hotelCoordinates`), and set each facility to `confirmed: true`.
2. Set the Netlify environment variables listed above, and verify the sending domain in Resend.
3. Send a real test enquiry from the deployed site and check both emails arrive.
4. Replace the demo images in `public/images/demo/` with real photographs and set `images.illustrative` to `false`.
5. Have native speakers review the Uzbek and Russian copy (drafted, not professionally translated).
6. Set `site.indexable` to `true`. Until then pages are `noindex` and `robots.txt` disallows crawling.
7. Add rate limiting or Turnstile for the enquiry form, and an `og:image` once a real photo exists.
8. Confirm the privacy wording with the hotel: enquiries contain personal data (name, email, phone).

## Design system

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| page | `#F4F0E8` sand | `#0C1E1F` | background |
| ink | `#15292A` | `#E5E8E1` | text |
| night | `#0F2A2B` river teal | `#071415` | dark sections, hero |
| accent | `#94492A` copper | `#E0A07A` copper | links and buttons on the page |

Shapes: pill buttons, 14px cards, arched room images (echoing the arcade in the hero).

Type: system serif stack for headings, system sans for body. Motion: one hero entrance, scroll reveals, and smooth
anchor scrolling; everything is disabled under `prefers-reduced-motion`.
