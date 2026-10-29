// All the page interactions. Astro swaps pages without a full reload (view transitions),
// so everything is set up again on every "astro:page-load" and torn down before the swap.

type Cleanup = () => void;
let cleanups: Cleanup[] = [];
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

function on<K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void): void;
function on(target: EventTarget, type: string, fn: (e: any) => void): void;
function on(target: EventTarget, type: string, fn: (e: any) => void) {
  target.addEventListener(type, fn, { passive: true });
  cleanups.push(() => target.removeEventListener(type, fn));
}

// Fade sections in as they scroll into view, a few at a time.
function reveal() {
  const items = document.querySelectorAll<HTMLElement>(".reveal");
  if (reducedMotion() || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }),
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  items.forEach((el) => {
    if (!el.style.getPropertyValue("--delay")) {
      const index = [...(el.parentElement?.children ?? [])].indexOf(el);
      el.style.setProperty("--delay", `${(index % 6) * 80}ms`);
    }
    io.observe(el);
  });
  cleanups.push(() => io.disconnect());
}

// Live clock in the top bar, in my time zone.
function clock() {
  const el = document.querySelector<HTMLElement>(".clock");
  if (!el) return;
  const format = new Intl.DateTimeFormat("en-GB", { timeZone: el.dataset.tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tick = () => { el.textContent = format.format(new Date()) + " MYT"; };
  tick();
  const timer = setInterval(tick, 1000);
  cleanups.push(() => clearInterval(timer));
}

// Background light follows the mouse; panels light up under it and project cards tilt.
function pointer() {
  if (!finePointer()) return;
  const backdrop = document.querySelector<HTMLElement>(".cursor-light");
  const tilt = !reducedMotion();
  on(window, "pointermove", (e: PointerEvent) => {
    backdrop?.style.setProperty("--cx", `${e.clientX}px`);
    backdrop?.style.setProperty("--cy", `${e.clientY}px`);
    const card = (e.target as Element).closest?.<HTMLElement>(".spot");
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
    if (tilt && card.classList.contains("tilt")) {
      card.style.transform = `perspective(1000px) rotateX(${((0.5 - y / r.height) * 6).toFixed(2)}deg) rotateY(${((x / r.width - 0.5) * 8).toFixed(2)}deg) translateY(-4px)`;
    }
  });
  document.querySelectorAll<HTMLElement>(".tilt").forEach((card) => {
    on(card, "pointerleave", () => { card.style.transform = ""; });
  });
}

// Numbers count up from zero the first time they are seen.
function counters() {
  const els = document.querySelectorAll<HTMLElement>("[data-count]");
  if (!els.length) return;
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.count) || 0;
    if (reducedMotion()) { el.textContent = String(target); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { run(e.target as HTMLElement); io.unobserve(e.target); }
  }));
  els.forEach((el) => { el.textContent = "0"; io.observe(el); });
  cleanups.push(() => io.disconnect());
}

// Types out each word, then deletes it and moves to the next.
function typer() {
  const el = document.querySelector<HTMLElement>("[data-words]");
  if (!el || reducedMotion()) return;
  const words: string[] = JSON.parse(el.dataset.words || "[]");
  if (words.length < 2) return;
  let word = 0;
  let chars = words[0].length;
  let deleting = true;
  let timer = window.setTimeout(step, 2000);
  function step() {
    chars += deleting ? -1 : 1;
    if (deleting && chars <= 0) { deleting = false; word = (word + 1) % words.length; chars = 0; }
    el!.textContent = words[word].slice(0, chars);
    const done = !deleting && chars >= words[word].length;
    if (done) deleting = true;
    timer = window.setTimeout(step, done ? 1800 : deleting ? 35 : 75);
  }
  cleanups.push(() => clearTimeout(timer));
}

// Dark / light switch, remembered on this device.
function themeToggle() {
  document.querySelectorAll<HTMLButtonElement>(".theme-toggle").forEach((btn) => {
    on(btn, "click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch { /* private mode */ }
    });
  });
}

// Tag filter on the Work page.
function projectFilter() {
  const bar = document.querySelector<HTMLElement>("[data-filter]");
  if (!bar) return;
  const cards = document.querySelectorAll<HTMLElement>("[data-tags]");
  const apply = (tag: string) => {
    bar.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tag === tag)));
    cards.forEach((card) => {
      const show = tag === "All" || card.dataset.tags!.split("|").includes(tag);
      card.hidden = !show;
      if (show) { card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop"); }
    });
  };
  bar.querySelectorAll<HTMLButtonElement>("button").forEach((b) => on(b, "click", () => apply(b.dataset.tag!)));
  const fromUrl = new URLSearchParams(location.search).get("tag");
  if (fromUrl) apply(fromUrl);
}

// Image gallery on a project page.
function gallery() {
  const root = document.querySelector<HTMLElement>("[data-gallery]");
  if (!root) return;
  const main = root.querySelector<HTMLImageElement>(".gallery-main img")!;
  const thumbs = [...root.querySelectorAll<HTMLButtonElement>(".gallery-thumbs button")];
  let index = 0;
  const show = (i: number) => {
    index = (i + thumbs.length) % thumbs.length;
    const src = thumbs[index].dataset.src!;
    main.style.opacity = "0";
    setTimeout(() => { main.src = src; main.style.opacity = "1"; }, 150);
    thumbs.forEach((t, n) => t.setAttribute("aria-current", String(n === index)));
  };
  thumbs.forEach((t, i) => on(t, "click", () => show(i)));
  root.querySelector(".gallery-prev")?.addEventListener("click", () => show(index - 1));
  root.querySelector(".gallery-next")?.addEventListener("click", () => show(index + 1));
}

document.addEventListener("astro:page-load", () => {
  [reveal, clock, pointer, counters, typer, themeToggle, projectFilter, gallery].forEach((fn) => fn());
});
document.addEventListener("astro:before-swap", () => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});
// The new page's <html> arrives without the theme; copy it over during the swap.
document.addEventListener("astro:before-swap", (e) => {
  const ev = e as Event & { newDocument: Document };
  ev.newDocument.documentElement.dataset.theme = document.documentElement.dataset.theme;
  ev.newDocument.documentElement.classList.add("js");
});
