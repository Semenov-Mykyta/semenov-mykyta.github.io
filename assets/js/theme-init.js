/* Runs before first paint: marks JS as available, applies the saved theme (mint|gold,
   default mint) and enables motion only when the visitor has not asked to reduce it. */
(function () {
  var root = document.documentElement;
  var theme = 'mint';
  root.classList.add('js');
  try {
    var saved = window.localStorage.getItem('theme');
    if (saved === 'mint' || saved === 'gold') theme = saved;
  } catch (e) {
    /* Storage unavailable: keep Mint. */
  }
  root.setAttribute('data-theme', theme);
  try {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('motion-ok');
  } catch (e) {
    /* No matchMedia: no decorative motion. */
  }
})();
