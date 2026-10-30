// Browser checks for the booking form, dark mode and in-page navigation.
// Serves dist/ (run `npm run build` first). Needs Playwright, like test-responsive.mjs.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shots = join(root, "test-output");
mkdirSync(shots, { recursive: true });

const require = createRequire(import.meta.url);
let playwright;
for (const id of ["playwright", "/opt/npm-tools/node_modules/playwright"]) {
  try {
    playwright = require(id);
    break;
  } catch {}
}
if (!playwright) {
  console.error("Playwright not found. Install it with: npm i -D playwright && npx playwright install chromium");
  process.exit(2);
}

const PORT = 4398;
const BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", join(root, "scripts/serve.ts")], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});
await new Promise((resolve) => setTimeout(resolve, 900));

let failures = 0;
const check = (ok, message) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${message}`);
  if (!ok) failures++;
};

const browser = await playwright.chromium.launch();
try {
  // ----- Booking form: visibility with and without JavaScript ---------------------------
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await noJs.newPage();
  await plain.goto(`${BASE}/en/`, { waitUntil: "domcontentloaded" });
  const formHiddenWithoutJs = await plain.locator("[data-booking]").isHidden();
  check(formHiddenWithoutJs, "booking form is hidden without JavaScript");
  const channelsVisibleWithoutJs = await plain.locator(".channels").isVisible();
  check(channelsVisibleWithoutJs, "channel contacts stay visible without JavaScript");
  await noJs.close();

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "en-US" });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  await page.goto(`${BASE}/en/`, { waitUntil: "load" });

  // ----- Booking form: live estimate and validation -------------------------------------
  const form = page.locator("#booking-form");
  check(await form.isVisible(), "booking form is visible with JavaScript");

  const minIn = await page.locator('[data-picker-for="checkIn"]').getAttribute("min");
  check(/^\d{4}-\d{2}-\d{2}$/.test(minIn ?? ""), `check-in has a minimum date (${minIn})`);

  check((await page.locator("#bk-checkin").getAttribute("placeholder")) === "dd/mm/yyyy", "date fields show the dd/mm/yyyy format");
  // Typing digits only: the slashes are inserted automatically.
  await page.locator("#bk-checkin").pressSequentially(dmy(addDaysFromToday(3)).replace(/\//g, ""));
  check((await page.locator("#bk-checkin").inputValue()) === dmy(addDaysFromToday(3)), "typed digits are formatted as dd/mm/yyyy");
  await page.locator("#bk-checkout").fill(dmy(addDaysFromToday(3)));
  const checkoutErr = await page.locator('[data-error-for="checkOut"]').textContent();
  check(/at least one night/.test(checkoutErr), "same-day check-out is blocked with a clear message");

  await page.locator("#bk-checkout").fill(dmy(addDaysFromToday(7)));
  const nights = await page.locator('[data-summary="nights"]').textContent();
  check(nights.trim() === "4", `nights are calculated (got ${nights.trim()})`);

  await page.locator('input[name="roomType"][value="standard"]').check({ force: true });
  const total = await page.locator('[data-summary="total"]').textContent();
  check(total.trim() === "To be confirmed", `no price is invented before rates are set (got "${total.trim()}")`);

  // Submitting an incomplete form must not send anything.
  let requested = false;
  page.on("request", (r) => r.url().includes("/.netlify/functions/") && (requested = true));
  await page.locator("[data-submit]").click();
  const fieldErr = await page.locator('[data-error-for="fullName"]').textContent();
  check(fieldErr.trim().length > 0, "missing name shows an inline error");
  check(!requested, "an invalid form is not sent to the server");

  // Complete form. Locally there is no Netlify Function, so the honest "not active" message must show.
  await page.locator("#bk-name").fill("Test Guest");
  await page.locator("#bk-email").fill("guest@example.com");
  await page.locator("[data-submit]").click();
  await page.waitForTimeout(800);
  const status = await page.locator("[data-status]").textContent();
  check(requested, "a valid form is sent to the enquiry endpoint");
  check(/not active|could not be sent|Connection problem/i.test(status), `local preview says enquiries are not live (got "${status.trim().slice(0, 70)}")`);
  check(!/confirmed|reserved|booked/i.test(status), "status never claims a booking is confirmed");

  // Copy text: the preview shows the enquiry in English without any fake confirmation.
  await page.locator("[data-copy]").click();
  await page.waitForTimeout(200);
  const preview = await page.locator("[data-preview]").textContent();
  check(/Estimated total: To be confirmed/.test(preview), "enquiry text includes the honest estimate line");
  check(!/confirmed booking|reservation confirmed|room is booked/i.test(preview), "enquiry text makes no booking claim");
  await page.screenshot({ path: join(shots, "booking-mobile.png"), fullPage: false, animations: "disabled" });
  await page.locator("#booking-form").scrollIntoViewIfNeeded();

  // ----- Dark mode -----------------------------------------------------------------------
  // On phones the toggle lives inside the menu; on wider screens it sits in the header.
  const toggleTheme = async () => {
    if ((await page.locator("[data-theme-toggle]:visible").count()) > 0) {
      await page.locator("[data-theme-toggle]:visible").first().click();
    } else {
      await page.locator(".menu-toggle").click();
      await page.waitForTimeout(350);
      await page.locator(".theme-toggle--menu").click();
      await page.waitForTimeout(350);
      await page.locator(".menu-toggle").click();
      await page.waitForTimeout(350);
    }
  };
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await toggleTheme();
  await page.waitForTimeout(500);
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(lightBg !== darkBg, `dark theme changes the page colour (${lightBg} -> ${darkBg})`);
  const saved = await page.evaluate(() => localStorage.getItem("riva-theme"));
  check(saved === "dark", "theme choice is saved in localStorage");
  await page.reload({ waitUntil: "load" });
  const restored = await page.evaluate(() => document.documentElement.dataset.theme);
  check(restored === "dark", "saved theme persists after reload");
  const restoredBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(restoredBg === darkBg, "the reloaded page uses the dark colours immediately");

  // Mobile menu panel in dark mode, for review.
  await page.locator(".menu-toggle").click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(shots, "menu-dark-mobile.png"), animations: "disabled" });
  await page.locator(".menu-toggle").click();
  await page.waitForTimeout(300);

  // Dark theme on the booking section, for review.
  await page.locator("#reservation").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(shots, "booking-dark-mobile.png"), fullPage: false, animations: "disabled" });

  // Back to light, and no saved choice means the system preference is followed.
  await toggleTheme();
  await page.waitForTimeout(300);
  check((await page.evaluate(() => document.documentElement.dataset.theme)) === "light", "switching back to light works");

  // ----- Smooth navigation from the menu ---------------------------------------------------
  await page.evaluate(() => localStorage.removeItem("riva-theme"));
  await page.goto(`${BASE}/en/`, { waitUntil: "load" });
  await page.locator(".menu-toggle").click();
  await page.locator('.site-nav a[href="#location"]').click();
  await page.waitForTimeout(1200);
  const landing = await page.evaluate(() => {
    const target = document.getElementById("location");
    const header = document.querySelector(".site-header").getBoundingClientRect().height;
    return Math.round(target.getBoundingClientRect().top - header);
  });
  check(Math.abs(landing) <= 24, `menu link lands the section just below the header (offset ${landing}px)`);
  const hash = await page.evaluate(() => location.hash);
  check(hash === "#location", "the URL hash updates to the section");
  const menuClosed = await page.evaluate(() => !document.documentElement.classList.contains("menu-open"));
  check(menuClosed, "the mobile menu closes after choosing a section");

  // The local server has no Netlify Function, so the enquiry request returns 404 by design.
  const unexpected = consoleErrors.filter((e) => !/status of 404/.test(e));
  check(unexpected.length === 0, `no console errors during these checks${consoleErrors.length ? `: ${consoleErrors.join(" | ")}` : ""}`);
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
}

console.log(failures ? `\n${failures} interaction check(s) failed` : "\nAll interaction checks passed");
process.exit(failures ? 1 : 0);

function dmy(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function addDaysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
