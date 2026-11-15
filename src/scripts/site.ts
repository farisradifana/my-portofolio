// Site-wide behavior: theme toggle, mobile menu, scroll reveal, stat counters, hero parallax.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

// Theme toggle, persisted in localStorage (read back by /theme-init.js before paint).
const themeBtn = document.getElementById('theme-toggle');
const syncThemeLabel = () =>
  themeBtn?.setAttribute('aria-label', `Switch to ${root.dataset.theme === 'light' ? 'dark' : 'light'} theme`);
syncThemeLabel();
themeBtn?.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {
    // Private mode: the choice just will not persist.
  }
  syncThemeLabel();
  document.dispatchEvent(new CustomEvent('themechange'));
});

// Mobile menu.
const menuBtn = document.getElementById('menu-btn');
const links = document.getElementById('nav-links');
const setMenu = (open: boolean) => {
  links?.classList.toggle('open', open);
  menuBtn?.setAttribute('aria-expanded', String(open));
  menuBtn?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
menuBtn?.addEventListener('click', () => setMenu(!links?.classList.contains('open')));
links?.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('a')) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && links?.classList.contains('open')) {
    setMenu(false);
    menuBtn?.focus();
  }
});

// Reveal on scroll.
const revealIo = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      revealIo.unobserve(entry.target);
    }
  },
  { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
);
document.querySelectorAll('.reveal, .bar').forEach((el) => revealIo.observe(el));

// Stat counters. The final value is already in the HTML, so there is no layout
// shift and nothing breaks without JS; the count-up only replays it.
const format = new Intl.NumberFormat('en-US');
function countUp(el: HTMLElement) {
  const target = Number(el.dataset.count);
  if (reduceMotion || !Number.isFinite(target)) return;
  const start = performance.now();
  const duration = 1200;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format.format(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const countIo = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      countUp(entry.target as HTMLElement);
      countIo.unobserve(entry.target);
    }
  },
  { threshold: 0.6 },
);
document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => countIo.observe(el));

// Hero parallax: the portrait drifts a few pixels slower than the page.
const portrait = document.querySelector<HTMLElement>('[data-parallax]');
if (portrait && !reduceMotion) {
  let queued = false;
  addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (scrollY < innerHeight) portrait.style.transform = `translate3d(0, ${Math.round(scrollY * 0.08)}px, 0)`;
      });
    },
    { passive: true },
  );
}

// Mark the nav link of the section in view.
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.nav-links a[href*="#"]')];
const byId = new Map(navLinks.map((a) => [a.hash.slice(1), a]));
const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      navLinks.forEach((a) => a.removeAttribute('aria-current'));
      byId.get(entry.target.id)?.setAttribute('aria-current', 'true');
    }
  },
  { rootMargin: '-45% 0px -50% 0px' },
);
byId.forEach((_, id) => {
  const section = document.getElementById(id);
  if (section) spy.observe(section);
});
