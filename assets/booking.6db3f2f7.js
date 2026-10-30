// Booking enquiry form. Progressive enhancement: without this module the form stays hidden
// (class "needs-js") and the channel links remain available.
//
// The browser estimates the price for display only. The Netlify Function validates the enquiry
// again and recalculates the total before any email is sent.
import {
  addDays,
  buildCopy,
  composeEnquiryText,
  formatMoney,
  nightsBetween,
  quote,
  todayInZone,
  validateEnquiry,
} from "/assets/booking-logic.js";

const host = document.querySelector("[data-booking]");
const configEl = document.getElementById("booking-config");

if (host && configEl) {
  const cfg = JSON.parse(configEl.textContent || "{}");
  const text = cfg.booking;
  const policy = cfg.policy;
  const copy = buildCopy(text, policy.currency);
  const form = host.querySelector("form");
  const statusEl = host.querySelector("[data-status]");
  const previewEl = host.querySelector("[data-preview]");
  const submitBtn = host.querySelector("[data-submit]");
  const checkIn = form.elements.namedItem("checkIn");
  const checkOut = form.elements.namedItem("checkOut");
  const money = (amount) => formatMoney(amount, policy.currency);
  const today = () => todayInZone(policy.timeZone);

  const field = (name) => form.elements.namedItem(name)?.value ?? "";

  const readForm = () => {
    const checked = form.querySelector('input[name="roomType"]:checked');
    return {
      roomType: checked ? checked.value : "",
      checkIn: field("checkIn"),
      checkOut: field("checkOut"),
      rooms: field("rooms"),
      adults: field("adults"),
      children: field("children"),
      fullName: field("fullName"),
      email: field("email"),
      phone: field("phone"),
      specialRequests: field("specialRequests"),
      website: field("website"),
    };
  };

  const validate = () => validateEnquiry(readForm(), { rooms: cfg.rooms, policy, today: today() });

  // ----- Live estimate -------------------------------------------------------------------
  const setSummary = (key, value) => {
    const el = host.querySelector(`[data-summary="${key}"]`);
    if (el) el.textContent = value;
  };

  const updateSummary = () => {
    const d = readForm();
    const room = cfg.rooms.find((r) => r.id === d.roomType);
    const nights = nightsBetween(d.checkIn, d.checkOut);
    const validNights = nights !== null && nights > 0 ? nights : null;
    const roomCount = Number(d.rooms);
    const guests = Number(d.adults) + Number(d.children);

    // Earliest check-out is one night after check-in.
    const base = d.checkIn && nightsBetween(today(), d.checkIn) !== null ? d.checkIn : today();
    checkOut.min = addDays(base, 1) ?? "";
    checkIn.min = today();

    setSummary("nights", validNights ?? "—");
    setSummary("guests", Number.isFinite(guests) && guests > 0 ? String(guests) : "—");

    const q = room
      ? quote({ rate: room.rate, nights: validNights, rooms: roomCount > 0 ? roomCount : null, taxPercent: policy.taxPercent })
      : { known: false };

    if (q.known) {
      setSummary("rate", money(q.rate));
      setSummary("subtotal", `${money(q.subtotal)} (${q.nights} × ${q.rooms})`);
      setSummary("taxes", q.taxesKnown ? money(q.tax) : text.messages.taxesTbc);
      setSummary("total", q.taxesKnown ? money(q.total) : `${money(q.total)} · ${text.messages.taxesTbc}`);
    } else {
      setSummary("rate", room && room.rate !== null ? money(room.rate) : text.messages.priceTbc);
      setSummary("subtotal", "—");
      setSummary("taxes", text.messages.taxesTbc);
      setSummary("total", text.messages.priceTbc);
    }
  };

  // Room rates in the room picker.
  cfg.rooms.forEach((room) => {
    const el = host.querySelector(`[data-rate="${room.id}"]`);
    if (el && room.rate !== null) el.textContent = money(room.rate);
  });

  // ----- Errors -------------------------------------------------------------------------
  const clearErrors = () => {
    host.querySelectorAll("[data-error-for]").forEach((el) => (el.textContent = ""));
    host.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  };

  const showErrors = (errors) => {
    clearErrors();
    let first = null;
    for (const [name, code] of Object.entries(errors)) {
      if (name === "website") continue; // honeypot: never shown to visitors
      const message = text.validation[code] ?? text.validation.required;
      const errorEl = host.querySelector(`[data-error-for="${name}"]`);
      if (errorEl) errorEl.textContent = message;
      const input = form.querySelector(`[name="${name}"]`);
      if (input) {
        input.setAttribute("aria-invalid", "true");
        if (!first) first = input;
      }
    }
    first?.focus();
  };

  const setStatus = (message, tone = "") => {
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
  };

  // ----- Message text (copy, channels) ------------------------------------------------
  const buildMessage = (result) => {
    const room = cfg.rooms.find((r) => r.id === result.data.roomType);
    const quoted = quote({
      rate: room.rate,
      nights: result.nights,
      rooms: result.data.rooms,
      taxPercent: policy.taxPercent,
    });
    return composeEnquiryText({
      copy,
      data: result.data,
      room: { name: room.name },
      nights: result.nights,
      quoted,
      locale: cfg.lang,
    });
  };

  const showPreview = (message) => {
    previewEl.textContent = message;
    previewEl.hidden = false;
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Older browsers and some embedded views: fall back to a hidden textarea.
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      area.remove();
      return ok;
    }
  };

  // ----- Submit -------------------------------------------------------------------------
  form.addEventListener("input", () => {
    updateSummary();
    submitBtn.disabled = false;
  });
  // Explain a bad date pair as soon as it is picked, not only on submit.
  const dateHint = () => {
    const d = readForm();
    const errorEl = host.querySelector('[data-error-for="checkOut"]');
    if (!errorEl || !d.checkIn || !d.checkOut) return;
    const nightCount = nightsBetween(d.checkIn, d.checkOut);
    if (nightCount !== null && nightCount <= 0) {
      errorEl.textContent = text.validation.checkOutMustBeAfterCheckIn;
      checkOut.setAttribute("aria-invalid", "true");
    } else if (errorEl.textContent === text.validation.checkOutMustBeAfterCheckIn) {
      errorEl.textContent = "";
      checkOut.removeAttribute("aria-invalid");
    }
  };
  form.addEventListener("change", () => {
    updateSummary();
    dateHint();
  });
  form.addEventListener("reset", () => {
    setTimeout(() => {
      clearErrors();
      previewEl.hidden = true;
      setStatus("");
      updateSummary();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitBtn.disabled) return; // blocks double submission while a request is running

    const result = validate();
    if (!result.valid) {
      showErrors(result.errors);
      setStatus(text.status.invalidForm, "error");
      return;
    }
    clearErrors();

    submitBtn.disabled = true;
    setStatus(text.status.sending, "busy");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...readForm(), lang: cfg.lang }),
        signal: controller.signal,
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));

      if (response.ok && body.ok) {
        const guestNote = body.guestEmail === "sent" ? text.status.successGuestCopy : text.status.successNoGuestCopy;
        setStatus(`${text.status.success} ${text.status.referenceLabel}: ${body.reference}. ${guestNote}`, "success");
        form.reset();
        submitBtn.disabled = true; // re-enabled as soon as the form changes again
      } else if (response.status === 422) {
        showErrors(body.errors ?? {});
        setStatus(text.status.invalidForm, "error");
        submitBtn.disabled = false;
      } else if (response.status === 429) {
        setStatus(text.status.rateLimited, "error");
        submitBtn.disabled = false;
      } else if (response.status === 404 || response.status === 503) {
        setStatus(text.status.notConfigured, "error");
        submitBtn.disabled = false;
      } else {
        setStatus(text.status.providerError, "error");
        submitBtn.disabled = false;
      }
    } catch {
      setStatus(text.status.networkError, "error");
      submitBtn.disabled = false;
    } finally {
      clearTimeout(timer);
    }
  });

  // ----- Copy and channel buttons ------------------------------------------------------
  host.querySelector("[data-copy]").addEventListener("click", async () => {
    const result = validate();
    if (!result.valid) {
      showErrors(result.errors);
      setStatus(text.status.invalidForm, "error");
      return;
    }
    const message = buildMessage(result);
    showPreview(message);
    const ok = await copyText(message);
    setStatus(ok ? text.messages.copied : text.messages.copyFailed, ok ? "success" : "error");
  });

  host.querySelectorAll("[data-channel]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.channel;
      const channel = cfg.channels.find((c) => c.id === id);
      if (!channel?.href) return;

      const result = validate();
      if (!result.valid) {
        showErrors(result.errors);
        setStatus(text.status.invalidForm, "error");
        return;
      }
      const message = buildMessage(result);
      showPreview(message);

      if (id === "phone") {
        window.location.href = channel.href;
      } else if (id === "email") {
        const subject = encodeURIComponent(copy.title);
        window.location.href = `${channel.href}?subject=${subject}&body=${encodeURIComponent(message)}`;
      } else if (id === "whatsapp") {
        const url = new URL(channel.href);
        url.searchParams.set("text", message);
        window.open(url.toString(), "_blank", "noopener");
      } else {
        // Telegram and other chats cannot take prefilled text from a link: open first, then copy.
        window.open(channel.href, "_blank", "noopener");
        const ok = await copyText(message);
        setStatus(ok ? text.messages.copiedChannel : text.messages.copyFailed, ok ? "success" : "error");
      }
    });
  });

  updateSummary();
}
