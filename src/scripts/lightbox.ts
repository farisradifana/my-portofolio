// Gallery lightbox. A native <dialog> gives the focus trap, Esc to close and
// inert background; Embla handles swipe. Thumbnails are plain links to the full
// image, so the gallery still works without JS.
import EmblaCarousel, { type EmblaCarouselType } from 'embla-carousel';

const dialog = document.getElementById('lightbox') as HTMLDialogElement | null;
if (dialog) {
  const viewport = dialog.querySelector<HTMLElement>('.lb-viewport')!;
  const track = dialog.querySelector<HTMLElement>('.lb-track')!;
  const caption = dialog.querySelector<HTMLElement>('.lb-caption')!;
  const count = dialog.querySelector<HTMLElement>('.lb-count')!;
  const prev = dialog.querySelector<HTMLButtonElement>('.lb-prev')!;
  const next = dialog.querySelector<HTMLButtonElement>('.lb-next')!;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let embla: EmblaCarouselType | undefined;
  let items: HTMLAnchorElement[] = [];
  let opener: HTMLElement | null = null;

  const update = () => {
    if (!embla) return;
    const i = embla.selectedScrollSnap();
    const img = items[i]?.querySelector('img');
    caption.textContent = img?.alt ?? '';
    count.textContent = `${i + 1} / ${items.length}`;
    prev.disabled = !embla.canScrollPrev();
    next.disabled = !embla.canScrollNext();
  };

  function open(link: HTMLAnchorElement) {
    const gallery = link.closest('[data-gallery]');
    if (!gallery) return;
    items = [...gallery.querySelectorAll<HTMLAnchorElement>('a[data-full]')];
    opener = link;

    track.replaceChildren(
      ...items.map((a) => {
        const slide = document.createElement('div');
        slide.className = 'lb-slide';
        const img = document.createElement('img');
        img.src = a.href;
        img.alt = a.querySelector('img')?.alt ?? '';
        img.width = Number(a.dataset.w);
        img.height = Number(a.dataset.h);
        img.loading = 'lazy';
        img.decoding = 'async';
        slide.append(img);
        return slide;
      }),
    );

    dialog!.showModal();
    embla = EmblaCarousel(viewport, { startIndex: items.indexOf(link), duration: reduceMotion ? 0 : 22 });
    embla.on('select', update);
    update();
  }

  function cleanup() {
    embla?.destroy();
    embla = undefined;
    track.replaceChildren();
    opener?.focus();
  }

  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-full]');
    // Let modified clicks open the image in a new tab as usual.
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || (e as MouseEvent).button !== 0) return;
    e.preventDefault();
    open(link);
  });

  prev.addEventListener('click', () => embla?.scrollPrev());
  next.addEventListener('click', () => embla?.scrollNext());
  dialog.querySelector('.lb-close')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', cleanup);
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') embla?.scrollPrev();
    if (e.key === 'ArrowRight') embla?.scrollNext();
  });
  // Click on the dark area around the image closes.
  dialog.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('lb-slide')) dialog.close();
  });
}
