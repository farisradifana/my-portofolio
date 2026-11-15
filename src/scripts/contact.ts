// Contact form: client-side validation, then POST to the Worker at /api/contact.
// The Worker validates everything again; this layer is only for quick feedback.
const form = document.getElementById('contact-form') as HTMLFormElement | null;

if (form) {
  const status = form.querySelector<HTMLElement>('.form-status')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const label = submit.querySelector('span')!;

  const rules: Record<string, (v: string) => string> = {
    name: (v) => (v.length < 2 ? 'Enter your name.' : v.length > 100 ? 'Keep the name under 100 characters.' : ''),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254 ? '' : 'Enter a valid email address.'),
    message: (v) => (v.length < 10 ? 'Write at least 10 characters.' : v.length > 5000 ? 'Keep the message under 5,000 characters.' : ''),
  };

  function validate(field: HTMLInputElement | HTMLTextAreaElement): boolean {
    const error = rules[field.name]?.(field.value.trim()) ?? '';
    const slot = document.getElementById(`${field.id}-err`);
    if (slot) slot.textContent = error;
    field.setAttribute('aria-invalid', String(Boolean(error)));
    return !error;
  }

  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-validate]')];
  fields.forEach((f) => f.addEventListener('blur', () => validate(f)));

  const setStatus = (state: 'ok' | 'error' | '', text: string) => {
    status.dataset.state = state;
    status.textContent = text;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = fields.filter((f) => !validate(f));
    if (invalid.length) {
      invalid[0]!.focus();
      setStatus('error', 'Fix the highlighted fields and send again.');
      return;
    }

    submit.disabled = true;
    label.textContent = 'Sending';
    setStatus('', '');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus('ok', 'Message sent. I will reply by email.');
    } catch {
      setStatus('error', 'The message could not be sent. Email me directly instead.');
    } finally {
      submit.disabled = false;
      label.textContent = 'Send message';
    }
  });
}
