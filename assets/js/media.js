/* Media: diagram Lightbox, continuous hero motion with its pause button, and card covers. */
(function (P) {
  'use strict';
  if (!P) return;
  var doc = P.doc, root = P.root, TEXT = P.TEXT, $ = P.$, $all = P.$all, show = P.show, trapTab = P.trapTab;

  /* ---------- Lightbox for diagrams ---------- */
  var diagrams = $all('figure.diagram');
  if (diagrams.length && typeof HTMLDialogElement === 'function') {
    var box = doc.createElement('dialog');
    box.className = 'lightbox';
    box.innerHTML =
      '<div class="lightbox__bar">' +
      '<button type="button" class="icon-btn lightbox__zoom-out"></button>' +
      '<button type="button" class="icon-btn lightbox__zoom-in"></button>' +
      '<button type="button" class="icon-btn lightbox__close"></button>' +
      '</div><div class="lightbox__stage" tabindex="0"></div>';
    doc.body.appendChild(box);
    var stage = $('.lightbox__stage', box);
    var zoomLevels = [1, 1.5, 2, 3];
    var zoom = 0;
    var opener = null;
    [['.lightbox__zoom-out', TEXT.zoomOut, '−'], ['.lightbox__zoom-in', TEXT.zoomIn, '+'], ['.lightbox__close', TEXT.close, '×']]
      .forEach(function (b) {
        var btn = $(b[0], box);
        btn.setAttribute('aria-label', b[1]);
        btn.textContent = b[2];
      });
    function applyZoom() {
      var svg = $('svg', stage);
      if (svg) svg.style.width = (zoomLevels[zoom] * 100) + '%';
      box.setAttribute('data-zoom', String(zoomLevels[zoom]));
    }
    $('.lightbox__zoom-in', box).addEventListener('click', function () { zoom = Math.min(zoom + 1, zoomLevels.length - 1); applyZoom(); });
    $('.lightbox__zoom-out', box).addEventListener('click', function () { zoom = Math.max(zoom - 1, 0); applyZoom(); });
    $('.lightbox__close', box).addEventListener('click', function () { box.close(); });
    box.addEventListener('keydown', function (e) { trapTab(e, box); });
    box.addEventListener('close', function () {
      stage.textContent = '';
      if (opener) opener.focus();
    });
    diagrams.forEach(function (figure) {
      var button = $('.diagram__open', figure);
      var svg = $('svg', figure);
      if (!button || !svg) return;
      show(button);
      button.addEventListener('click', function () {
        opener = button;
        var copy = svg.cloneNode(true);
        $all('[id]', copy).forEach(function (el) { el.removeAttribute('id'); });
        copy.removeAttribute('aria-labelledby');
        copy.setAttribute('aria-label', figure.querySelector('figcaption').textContent.trim());
        stage.textContent = '';
        stage.appendChild(copy);
        box.setAttribute('aria-label', TEXT.enlarge);
        zoom = 0;
        applyZoom();
        box.showModal();
        $('.lightbox__close', box).focus();
      });
    });
  }
  /* ---------- Hero loop, pause button and card covers ---------- */
  var motionOk = function () { return root.classList.contains('motion-ok'); };

  // Phases, so the towers, pulses and lights do not move in step.
  $all('.hx-stage, .cover').forEach(function (art) {
    ['.hx-pulse', '.hx-led', '.hx-spark', '.hx-float'].forEach(function (sel) {
      $all(sel, art).forEach(function (el, i) { el.style.setProperty('--k', i); });
    });
    $all('.hx-bob', art).forEach(function (el, i) { el.style.setProperty('--k', i); });
  });

  // One pause choice for all pages of the visit (sessionStorage; falls back to running).
  var PAUSE_KEY = 'hx-paused';
  var paused = false;
  try { paused = window.sessionStorage.getItem(PAUSE_KEY) === '1'; } catch (e) { /* not available */ }
  var stages = $all('.hx-stage');
  var pauseButtons = stages.map(function (s) { return $('.hx-pause', s); });
  function renderPause() {
    stages.forEach(function (s) { s.classList.toggle('is-paused', paused); });
    pauseButtons.forEach(function (b) { if (b) b.setAttribute('aria-pressed', paused ? 'true' : 'false'); });
  }
  pauseButtons.forEach(function (b) {
    if (!b) return;
    if (motionOk()) show(b);
    b.addEventListener('click', function () {
      paused = !paused;
      try { window.sessionStorage.setItem(PAUSE_KEY, paused ? '1' : '0'); } catch (e) { /* this page only */ }
      renderPause();
    });
  });
  renderPause();
  if (stages.length && 'IntersectionObserver' in window) {
    var stageObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-offscreen', !en.isIntersecting); });
    });
    stages.forEach(function (s) { stageObserver.observe(s); });
  }

  // Covers: float from rest while hovered or focused; on leaving, glide back from where they are.
  $all('.card').forEach(function (card) {
    var floats = $all('.cover .hx-float', card);
    if (!floats.length || typeof floats[0].animate !== 'function') return;
    var loops = [];
    var settleTimer = 0;
    function enter() {
      if (!motionOk() || loops.length) return;
      loops = floats.map(function (f, i) {
        return f.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }],
          { duration: 3200, delay: i * 350, iterations: Infinity, easing: 'ease-in-out' });
      });
    }
    function leave() {
      floats.forEach(function (f, i) {
        var y = new window.DOMMatrix(window.getComputedStyle(f).transform).m42;
        if (loops[i]) loops[i].cancel();
        if (Math.abs(y) > 0.05) f.animate([{ transform: 'translateY(' + y + 'px)' }, { transform: 'translateY(0)' }], { duration: 450, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' });
      });
      loops = [];
      card.classList.add('is-settling');
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(function () { card.classList.remove('is-settling'); }, 600);
    }
    card.addEventListener('mouseenter', enter);
    card.addEventListener('focusin', enter);
    card.addEventListener('mouseleave', leave);
    card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) leave(); });
  });
})(window.Portfolio);
