// Project screenshot carousels. Without this script the track is a plain
// scrollable strip. With it, the strip moves only by the previous/next buttons,
// the arrow keys and the group shortcuts; the counter follows.
const carouselReduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
  const track = root.querySelector<HTMLElement>('.car-track');
  const prev = root.querySelector<HTMLButtonElement>('.car-prev');
  const next = root.querySelector<HTMLButtonElement>('.car-next');
  const count = root.querySelector<HTMLElement>('.car-count');
  if (!track || !prev || !next || !count) return;
  const slides = [...track.children] as HTMLElement[];
  const chips = [...root.querySelectorAll<HTMLButtonElement>('.car-groups button')];
  if (slides.length === 0) return;
  root.classList.add('js');

  let index = 0;
  const left = (i: number) => slides[i]!.offsetLeft - slides[0]!.offsetLeft;

  const go = (i: number, smooth = true) => {
    index = Math.max(0, Math.min(slides.length - 1, i));
    const max = track.scrollWidth - track.clientWidth;
    track.scrollTo({ left: Math.min(left(index), max), behavior: smooth && !carouselReduceMotion ? 'smooth' : 'auto' });
    count.textContent = `${index + 1} / ${slides.length}`;
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    let active: HTMLButtonElement | undefined;
    for (const chip of chips) if (Number(chip.dataset.start) <= index) active = chip;
    for (const chip of chips) chip.setAttribute('aria-pressed', chip === active ? 'true' : 'false');
  };

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  for (const chip of chips) chip.addEventListener('click', () => go(Number(chip.dataset.start)));
  track.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    go(index + (e.key === 'ArrowRight' ? 1 : -1));
  });
  // Tabbing to a slide that is out of view moves the strip to it.
  slides.forEach((slide, i) => slide.addEventListener('focusin', () => i !== index && go(i)));
  // Keep the current slide in place when the layout width changes.
  addEventListener('resize', () => go(index, false));
  go(0, false);
});
