import type { FacilityId, GalleryId, ChannelId, RoomId, SocialId } from "../config/hotel.ts";

export interface RoomCopy {
  name: string;
  tagline: string;
  description: string;
}

/** Every language must satisfy this shape; missing keys fail the type check and the static tests. */
export interface Dictionary {
  meta: { title: string; description: string };
  common: {
    skip: string;
    pending: string;
    illustrative: string;
    illustrativeNote: string;
    linkSoon: string;
    theme: { toDark: string; toLight: string };
  };
  nav: {
    label: string;
    menu: string;
    language: string;
    rooms: string;
    facilities: string;
    gallery: string;
    location: string;
    faq: string;
    reserve: string;
  };
  hero: { place: string; eyebrow: string; title: string; lead: string; primary: string; secondary: string };
  /** Short verified facts shown right under the hero. */
  highlights: {
    label: string;
    items: Record<"reception" | "breakfast" | "pin" | "direct", { title: string; text: string }>;
  };
  rooms: {
    title: string;
    intro: string;
    labels: { size: string; guests: string; rate: string };
    enquire: string;
    tiers: Record<RoomId, RoomCopy>;
  };
  facilities: { title: string; intro: string; items: Record<FacilityId, string> };
  gallery: { title: string; intro: string; close: string; prev: string; next: string; items: Record<GalleryId, string> };
  /** "Good to know": stay facts plus frequently asked questions. */
  faq: {
    title: string;
    intro: string;
    stayTitle: string;
    labels: { checkIn: string; checkOut: string; breakfast: string; reception: string };
    items: { q: string; a: string }[];
  };
  location: {
    title: string;
    city: string;
    intro: string;
    labels: { address: string; phone: string; email: string; hours: string; plusCode: string };
    copy: string;
    copied: string;
    map: string;
    note: string;
    directions: string;
    mapTitle: string;
    noPin: string;
  };
  reservation: {
    title: string;
    intro: string;
    notice: string;
    open: string;
    channels: Record<ChannelId, string>;
  };
  booking: {
    title: string;
    intro: string;
    labels: {
      roomType: string;
      checkIn: string;
      checkOut: string;
      datePlaceholder: string;
      dateFormat: string;
      pickDate: string;
      nights: string;
      rooms: string;
      adults: string;
      children: string;
      totalGuests: string;
      fullName: string;
      email: string;
      phone: string;
      specialRequests: string;
      pricePerNight: string;
      subtotal: string;
      taxes: string;
      estimatedTotal: string;
    };
    buttons: { submit: string; reset: string; copy: string };
    validation: {
      required: string;
      emailInvalid: string;
      phoneInvalid: string;
      checkInPast: string;
      dateInvalid: string;
      checkOutMustBeAfterCheckIn: string;
      nightsTooShort: string;
      nightsTooLong: string;
      roomsInvalid: string;
      adultsInvalid: string;
      childrenInvalid: string;
      guestsTooMany: string;
      noRoomAvailable: string;
      tooLong: string;
    };
    messages: {
      totalCalculated: string;
      requestSummary: string;
      copied: string;
      copyFailed: string;
      copiedChannel: string;
      sendVia: string;
      selectChannel: string;
      priceTbc: string;
      taxesTbc: string;
      notProvided: string;
      estimateNote: string;
    };
    status: {
      sending: string;
      success: string;
      referenceLabel: string;
      successGuestCopy: string;
      successNoGuestCopy: string;
      invalidForm: string;
      notConfigured: string;
      rateLimited: string;
      providerError: string;
      networkError: string;
    };
    /** Subjects and bodies of the emails the Netlify Function sends. */
    email: { adminSubject: string; guestSubject: string; guestIntro: string; guestFooter: string };
    notice: string;
  };
  /** Bottom bar on phones. */
  sticky: { text: string; action: string };
  footer: { social: string; rights: string; note: string; socials: Record<SocialId, string> };
}
