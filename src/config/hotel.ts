/**
 * Hotel facts and structure — RIVA HOTEL ANDIJON.
 *
 * RULE: nothing here is verified unless a value is filled in.
 * `null` renders as a visible "to be confirmed" placeholder on the site.
 * Replace nulls only with details confirmed by the hotel.
 */

export const site = {
  name: "RIVA HOTEL",
  /** Set SITE_URL at build time, e.g. SITE_URL=https://rivehotel.uz npm run build */
  url: (process.env.SITE_URL ?? "https://rivehotel.netlify.app").replace(/\/$/, ""),
  /** Keep false while placeholders exist. Flip to true at launch to allow indexing. */
  indexable: false,
  locality: "Andijan",
  country: "UZ",
} as const;

/** Logo integration point. Put files in public/brand/ and set the paths. null = text wordmark. */
export const brand: {
  name: string;
  logo: { light: string | null; dark: string | null; width: number; height: number };
} = {
  name: "RIVA HOTEL",
  logo: { light: null, dark: null, width: 160, height: 48 },
};

/** Verified postal address and hours. null = placeholder. */
export const details: { address: string | null; hours: string | null; plusCode: string } = {
  /** Google lists only "170100, Andijan" — the street address is still to be confirmed. */
  address: null,
  /** Reception hours, from the hotel's Google Maps listing (open 24 hours). */
  hours: "24/7",
  /** Google Plus Code of the building, as given by the hotel owner. */
  plusCode: "Q8VW+WJ Andijan",
};

/**
 * Stay details. Breakfast hours come from the hotel's Google Maps listing.
 * null = to be confirmed with the hotel.
 */
export const stay: { checkIn: string | null; checkOut: string | null; breakfast: string | null } = {
  checkIn: null,
  checkOut: null,
  breakfast: "07:00–10:00",
};

/**
 * Exact coordinates of the hotel. null = not confirmed yet: the map shows a placeholder
 * and no pin is invented. Fill both values from a verified source (e.g. Google Maps "Share" link).
 */
export const hotelCoordinates: { latitude: number | null; longitude: number | null } = {
  latitude: 40.794777,
  longitude: 72.3466,
};

/** Opens the exact Plus Code in Google Maps. */
export const mapUrl = "https://www.google.com/maps/search/?api=1&query=Q8VW%2BWJ%20Andijan";

export type ChannelId = "phone" | "telegram" | "whatsapp" | "email";
export interface Channel {
  id: ChannelId;
  /** Text shown to guests, e.g. "+998 …" or "@handle". null = placeholder. */
  value: string | null;
  /** tel:, mailto:, or https:// link. null = placeholder (no link rendered). */
  href: string | null;
}
export const channels: Channel[] = [
  { id: "phone", value: null, href: null },
  { id: "telegram", value: null, href: null },
  { id: "whatsapp", value: null, href: null },
  { id: "email", value: null, href: null },
];

export type SocialId = "instagram" | "telegram" | "facebook";
export const socials: { id: SocialId; href: string | null }[] = [
  { id: "instagram", href: null },
  { id: "telegram", href: null },
  { id: "facebook", href: null },
];

export type RoomId = "standard" | "deluxe" | "luxe";
export const rooms: {
  id: RoomId;
  image: string;
  size: string | null;
  guests: string | null;
  rate: string | null;
  /** Price per night in USD. null = "To be confirmed"; no price is shown or calculated. */
  pricePerNight: number | null;
  /** Maximum guests per room of this type. null = not enforced. */
  maxGuests: number | null;
}[] = [
  { id: "standard", image: "room-standard.webp", size: null, guests: null, rate: null, pricePerNight: null, maxGuests: null },
  { id: "deluxe", image: "room-deluxe.webp", size: null, guests: null, rate: null, pricePerNight: null, maxGuests: null },
  { id: "luxe", image: "room-luxe.webp", size: null, guests: null, rate: null, pricePerNight: null, maxGuests: null },
];

export type FacilityId = "reception" | "breakfast" | "wifi" | "climate" | "parking" | "transfer" | "restaurant" | "laundry";
/**
 * Facilities. `confirmed: true` only for what the hotel's public listing states;
 * everything else is a template until the hotel confirms it. `detail` is shown beside the name.
 */
export const facilities: { id: FacilityId; confirmed: boolean; detail?: string }[] = [
  { id: "reception", confirmed: true, detail: "24/7" },
  { id: "breakfast", confirmed: true, detail: "07:00–10:00" },
  { id: "wifi", confirmed: false },
  { id: "climate", confirmed: false },
  { id: "parking", confirmed: false },
  { id: "transfer", confirmed: false },
  { id: "restaurant", confirmed: false },
  { id: "laundry", confirmed: false },
];

export type GalleryId = "lobby" | "standard" | "deluxe" | "luxe" | "dining" | "exterior";
/** Demo images. Swap files in public/images/demo (or change `image`) for real photography. */
export const gallery: { id: GalleryId; image: string }[] = [
  { id: "lobby", image: "lobby.webp" },
  { id: "standard", image: "room-standard.webp" },
  { id: "deluxe", image: "room-deluxe.webp" },
  { id: "luxe", image: "room-luxe.webp" },
  { id: "dining", image: "dining.webp" },
  { id: "exterior", image: "exterior.webp" },
];

export const images = {
  /** Hero comes in two widths so phones download the small one. */
  hero: { small: "hero-800.webp", large: "hero-1600.webp" },
  base: "/images/demo/",
  /** Set to false once every image above is a real photograph, to drop the "Illustrative" labels. */
  illustrative: true,
} as const;

/**
 * Booking enquiry rules. The server (netlify/functions/enquiry.mjs) enforces the same rules
 * and recalculates every price itself; the browser never decides the total.
 */
export const booking = {
  minNights: 1,
  maxNights: 365,
  maxRooms: 5,
  /** Earliest check-in, in days from today (0 = today). */
  minAdvanceDays: 0,
  /** "Today" for date checks is taken in the hotel's time zone, not the visitor's. */
  timeZone: "Asia/Tashkent",
  currency: { code: "USD", symbol: "$" },
  /** Tax or service charge in percent. null = not confirmed; totals are then shown as "before taxes and fees". */
  taxPercent: null as number | null,
  defaults: { rooms: 1, adults: 2, children: 0 },
} as const;
