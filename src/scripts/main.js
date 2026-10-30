// Progressive enhancement only: the page is fully readable without this file.
(() => {
  const root = document.documentElement;
  const headerHeight = 72; // px, matches CSS --header-h

  // Easing function for smooth scroll: cubic-bezier(0.2, 0.7, 0.2, 1)
  const easeScroll = (t) => {
    // Approximation of cubic-bezier(0.2, 0.7, 0.2, 1)
    t = Math.min(1, Math.max(0, t));
    return t < 0.5
      ? 2 * t * t * (1 - t) + t * t
      : 1 - 2 * (1 - t) * (1 - t) * t;
  };

  // Smooth scroll to hash with easing and header offset.
  const smoothScrollTo = (element) => {
    // Layout position (offsetTop ignores the reveal transform the heading may still have).
    let layoutTop = 0;
    for (let el = element; el; el = el.offsetParent) layoutTop += el.offsetTop;
    const targetTop = layoutTop - headerHeight;
    const startTop = window.scrollY;
    const distance = targetTop - startTop;
    const duration = 800; // ms
    const start = performance.now();

    const animate = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeScroll(t);
      window.scrollTo({ top: startTop + distance * eased, behavior: "instant" });
      if (t < 1) requestAnimationFrame(animate);
      else {
        // Focus the target for keyboard nav and a11y
        element.focus({ preventScroll: true });
        if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
      }
    };
    requestAnimationFrame(animate);
  };

  // 1. Anchor links: smooth scroll + history + active nav state.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const hash = link.getAttribute("href");
      const target = document.querySelector(hash);
      if (target) {
        e.preventDefault();
        // Use CSS scroll-behavior if prefers-reduced-motion is not set; else instant fallback.
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced) {
          target.scrollIntoView({ behavior: "instant", block: "start" });
          target.focus({ preventScroll: true });
          if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        } else {
          smoothScrollTo(target);
        }
        // Update hash in address bar.
        history.pushState(null, "", hash);
      }
    });
  });

  // 2. Active nav link state via IntersectionObserver.
  const navLinks = document.querySelectorAll(".site-nav a[href^='#']");
  if (navLinks.length && "IntersectionObserver" in window) {
    const updateActiveNav = () => {
      let active = null;
      navLinks.forEach((link) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (target) {
          const rect = target.getBoundingClientRect();
          // Section is "active" if its top is within headerHeight of viewport top.
          if (rect.top <= headerHeight + 50 && rect.bottom > headerHeight) {
            active = link;
          }
        }
      });
      navLinks.forEach((link) => link.classList.toggle("is-active", link === active));
    };
    // Update on scroll.
    document.addEventListener("scroll", updateActiveNav, { passive: true });
    // Also on load.
    updateActiveNav();
  }

  // 3. Scroll-trigger reveals: fade in headings, rooms, tiles, and contact items as they scroll into view.
  if ("IntersectionObserver" in window) {
    // Elements to observe for reveal
    const reveals = document.querySelectorAll("h2, h3, .room, .tile, .facts > div, .channel, .location__aside > *, .highlight, .faq-item, .facilities li");
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-revealed", "");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -100px 0px" }); // Trigger when element is 100px from bottom

    // Add stagger index to room/tile/channel for per-item animation delay
    let roomI = 0, tileI = 0, channelI = 0;
    reveals.forEach((el) => {
      if (el.classList.contains("room")) {
        el.style.setProperty("--reveal-i", String(roomI++));
      } else if (el.classList.contains("tile")) {
        el.style.setProperty("--reveal-i", String(tileI++));
      } else if (el.classList.contains("channel") || el.classList.contains("highlight") || el.classList.contains("faq-item")) {
        el.style.setProperty("--reveal-i", String(channelI++ % 6));
      }
      revealObserver.observe(el);
    });
  }

  // 4. Header turns solid once the hero scrolls out of view.
  const header = document.querySelector("[data-header]");
  const hero = document.querySelector(".hero");
  if (header) {
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => header.classList.toggle("is-solid", !entry.isIntersecting), {
        rootMargin: "-72px 0px 0px 0px",
      }).observe(hero);
    } else {
      header.classList.add("is-solid");
    }
  }

  // 5. Mobile menu.
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.getElementById("site-nav");
  const setMenu = (open) => {
    root.classList.toggle("menu-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
  };
  if (toggle && nav) {
    toggle.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
    nav.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.classList.contains("menu-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 900px)").addEventListener("change", (m) => m.matches && setMenu(false));
  }

  // 6. Theme toggle. The saved choice lives in localStorage; without one, the system setting is followed.
  const THEME_KEY = "riva-theme";
  const themeButtons = document.querySelectorAll("[data-theme-toggle]");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => (root.dataset.theme === "dark" ? "dark" : "light");
  const reflectTheme = () => {
    const dark = currentTheme() === "dark";
    themeButtons.forEach((button) => {
      const text = dark ? button.dataset.labelDark : button.dataset.labelLight;
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", text);
      const label = button.querySelector(".theme-toggle__label");
      if (label) label.textContent = text;
    });
  };
  const setTheme = (theme, { save }) => {
    // Briefly animate colour changes only; the reduced-motion rules still apply elsewhere.
    root.classList.add("theme-anim");
    root.dataset.theme = theme;
    reflectTheme();
    if (save) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // Storage can be blocked (private mode, strict settings): the choice then lasts for this visit only.
      }
    }
    window.setTimeout(() => root.classList.remove("theme-anim"), 450);
  };
  reflectTheme();
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark", { save: true }));
  });
  // Follow the system setting live, but only while the visitor has not chosen a theme.
  systemDark.addEventListener("change", (event) => {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      saved = null;
    }
    if (saved !== "light" && saved !== "dark") setTheme(event.matches ? "dark" : "light", { save: false });
  });

  // 7. Gallery lightbox (native <dialog>: focus trap and Escape come for free), with previous/next.
  const box = document.querySelector("[data-lightbox]");
  const tiles = [...document.querySelectorAll("[data-gallery]")];
  if (box && typeof box.showModal === "function") {
    const image = box.querySelector("img");
    const caption = box.querySelector("[data-lightbox-caption]");
    let current = 0;
    const show = (index) => {
      current = (index + tiles.length) % tiles.length;
      const tile = tiles[current];
      image.src = tile.dataset.src;
      image.alt = tile.dataset.caption;
      caption.textContent = `${tile.dataset.caption} · ${current + 1}/${tiles.length}`;
    };
    tiles.forEach((tile, i) => {
      tile.addEventListener("click", () => {
        show(i);
        box.showModal();
      });
    });
    box.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => show(current - 1));
    box.querySelector("[data-lightbox-next]")?.addEventListener("click", () => show(current + 1));
    box.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") show(current - 1);
      if (event.key === "ArrowRight") show(current + 1);
    });
    // Swipe on touch screens.
    let startX = null;
    box.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
    box.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
    box.querySelector("[data-lightbox-close]").addEventListener("click", () => box.close());
    box.addEventListener("click", (event) => {
      if (event.target === box) box.close();
    });
  } else {
    tiles.forEach((tile) => (tile.style.cursor = "default"));
  }

  // 8. Copy the Plus Code.
  document.querySelectorAll("[data-copy-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = button.parentElement.querySelector("[data-plus-code]")?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = button.dataset.done;
      } catch {
        // Clipboard blocked: select the text so it can be copied by hand.
        const range = document.createRange();
        range.selectNodeContents(button.parentElement.querySelector("[data-plus-code]"));
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(range);
      }
      window.setTimeout(() => (button.textContent = button.dataset.label), 1800);
    });
  });

  // 9. Phone bottom bar: shown after the hero, hidden while the enquiry section is on screen.
  const bar = document.querySelector("[data-sticky-bar]");
  const reservation = document.getElementById("reservation-section");
  if (bar && hero && reservation && "IntersectionObserver" in window) {
    let pastHero = false;
    let atForm = false;
    const update = () => bar.classList.toggle("is-visible", pastHero && !atForm && !root.classList.contains("menu-open"));
    new IntersectionObserver(([e]) => {
      pastHero = !e.isIntersecting;
      update();
    }).observe(hero);
    new IntersectionObserver(([e]) => {
      atForm = e.isIntersecting;
      update();
    }, { rootMargin: "0px 0px -20% 0px" }).observe(reservation);
  }
})();
