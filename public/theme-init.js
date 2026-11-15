// Runs before first paint so the stored theme applies without a flash.
// Kept as a tiny external file because the CSP forbids inline scripts.
(function () {
  var root = document.documentElement;
  var theme = 'dark';
  try {
    if (localStorage.getItem('theme') === 'light') theme = 'light';
  } catch (e) {}
  root.dataset.theme = theme;
  root.classList.add('js');
})();
