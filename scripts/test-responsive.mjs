// Responsive test: serves dist/ and checks layout in a real browser at several widths.
// Needs Playwright (npm i -D playwright && npx playwright install chromium).
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

const PORT = 4399;
const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", join(root, "scripts/serve.ts")], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 800));

const viewports = [
  { name: "mobile-360", width: 360, height: 740 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "wide-1536", width: 1536, height: 900 },
];
let failures = 0;
const check = (ok, message) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${message}`);
  if (!ok) failures++;
};

const browser = await playwright.chromium.launch();
try {
  for (const lang of ["en", "ru", "uz"]) {
    for (const vp of viewports) {
      if (lang !== "en" && vp.width !== 360 && vp.width !== 1280) continue; // longest copy at narrow + wide
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "no-preference" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(`http://localhost:${PORT}/${lang}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1800); // let the hero entrance finish before screenshots
      const tag = `${lang}@${vp.name}`;

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(overflow <= 0, `${tag}: no horizontal scroll (overflow ${overflow}px)`);

      // The lightbox <img> is empty until a tile is clicked, so it is excluded.
      const brokenImages = await page.evaluate(async () => {
        const imgs = [...document.images].filter((i) => !i.closest("dialog"));
        imgs.forEach((i) => (i.loading = "eager"));
        await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
        return imgs.filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute("src"));
      });
      check(brokenImages.length === 0, `${tag}: all images load${brokenImages.length ? ` (broken: ${brokenImages.join(", ")})` : ""}`);

      const small = await page.evaluate(() =>
        [...document.querySelectorAll("a.btn, button, .lang a, .site-nav a")]
          .filter((el) => el.offsetParent !== null)
          .filter((el) => { const r = el.getBoundingClientRect(); return r.height < 40 || r.width < 40; })
          .map((el) => el.textContent.trim().slice(0, 20)),
      );
      check(small.length === 0, `${tag}: tap targets >= 40px${small.length ? ` (small: ${small.join(", ")})` : ""}`);
      check(errors.length === 0, `${tag}: no console errors${errors.length ? ` (${errors[0]})` : ""}`);

      if (vp.width < 900 && lang === "en") {
        await page.screenshot({ path: join(shots, `${tag}-hero.png`) });
        const toggle = page.locator("[data-menu-toggle]");
        check(await toggle.isVisible(), `${tag}: menu button visible`);
        await toggle.click();
        await page.waitForTimeout(450);
        check((await toggle.getAttribute("aria-expanded")) === "true", `${tag}: menu opens (aria-expanded)`);
        check(await page.locator("#site-nav a", { hasText: "Rooms" }).isVisible(), `${tag}: nav links visible when open`);
        await page.screenshot({ path: join(shots, `${tag}-menu.png`) });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(450);
        check((await toggle.getAttribute("aria-expanded")) === "false", `${tag}: Escape closes menu`);
      }
      if (vp.width >= 900) {
        check(!(await page.locator("[data-menu-toggle]").isVisible()), `${tag}: menu button hidden on desktop`);
        check(await page.locator(".site-nav a").first().isVisible(), `${tag}: inline nav visible on desktop`);
      }

      await page.screenshot({ path: join(shots, `${tag}-full.png`), fullPage: true });
      await context.close();
    }
  }

  // Language switching changes the URL and the document language
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/en/`);
    await page.locator('.site-header .lang a[hreflang="ru"]').click();
    await page.waitForURL("**/ru/");
    check((await page.getAttribute("html", "lang")) === "ru", "language switch: EN -> RU updates URL and html lang");
    await context.close();
  }

  // Reduced motion: no animations or transitions on the hero
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/en/`);
    const names = await page.evaluate(() => [
      getComputedStyle(document.querySelector(".hero h1")).animationName,
      getComputedStyle(document.querySelector(".hero__image")).animationName,
    ]);
    check(names.every((n) => n === "none"), `reduced motion: hero animations disabled (${names.join(", ")})`);
    await context.close();
  }

  // Gallery lightbox opens and closes
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/en/`);
    await page.locator("[data-gallery]").first().scrollIntoViewIfNeeded();
    await page.locator("[data-gallery]").first().click();
    check(await page.locator("dialog[open]").count() === 1, "gallery: lightbox opens");
    await page.keyboard.press("Escape");
    check(await page.locator("dialog[open]").count() === 0, "gallery: Escape closes lightbox");
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll responsive checks passed");
console.log(`Screenshots: ${shots}`);
process.exit(failures ? 1 : 0);
