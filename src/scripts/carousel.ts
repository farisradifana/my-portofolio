// Project screenshot carousels. The track is a native scroll-snap list, so it
// works by touch, trackpad and keyboard without this script; the script adds the
// previous/next buttons, the counter and the group shortcuts.
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

  const left = (i: number) => slides[i].offsetLeft - slides[0].offsetLeft;
  const current = () => {
    const x = track.scrollLeft;
    let best = 0;
    for (let i = 1; i < slides.length; i++) if (Math.abs(left(i) - x) < Math.abs(left(best) - x)) best = i;
    return best;
  };
  const go = (i: number) => {
    const target = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: left(target), behavior: carouselReduceMotion ? 'auto' : 'smooth' });
  };

  const update = () => {
    const i = current();
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    count.textContent = `${i + 1} / ${slides.length}`;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = atEnd;
    let active: HTMLButtonElement | undefined;
    for (const chip of chips) if (Number(chip.dataset.start) <= i) active = chip;
    for (const chip of chips) chip.setAttribute('aria-pressed', chip === active ? 'true' : 'false');
  };

  let queued = false;
  track.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  }, { passive: true });

  prev.addEventListener('click', () => go(current() - 1));
  next.addEventListener('click', () => go(current() + 1));
  for (const chip of chips) chip.addEventListener('click', () => go(Number(chip.dataset.start)));
  update();
});
