/* Theme switch: Mint / Gold, remembered in localStorage; the colours blend in CSS. */
(function (P) {
  'use strict';
  if (!P) return;
  var root = P.root, $ = P.$, show = P.show;

  /* ---------- Theme ---------- */
  var themeButton = $('.theme-toggle');
  function currentTheme() { return root.getAttribute('data-theme') === 'gold' ? 'gold' : 'mint'; }
  /* The switch is "Gold theme": on = Gold, off = Mint (role="switch"). */
  function labelTheme() {
    if (themeButton) themeButton.setAttribute('aria-checked', currentTheme() === 'gold' ? 'true' : 'false');
  }
  if (themeButton) {
    show(themeButton);
    labelTheme();
    var applyTheme = function (next) {
      root.setAttribute('data-theme', next);
      try { window.localStorage.setItem('theme', next); } catch (e) { /* not persisted */ }
    };
    var morphTimer = 0;
    themeButton.addEventListener('click', function () {
      var next = currentTheme() === 'gold' ? 'mint' : 'gold';
      themeButton.setAttribute('aria-checked', next === 'gold' ? 'true' : 'false'); /* knob starts sliding now */
      if (root.classList.contains('motion-ok')) {
        /* The CSS blends every theme colour in 600 ms; components pause their own transitions meanwhile. */
        root.classList.add('theme-morphing');
        window.clearTimeout(morphTimer);
        morphTimer = window.setTimeout(function () { root.classList.remove('theme-morphing'); }, 700);
      }
      applyTheme(next);
    });
  }
})(window.Portfolio);
