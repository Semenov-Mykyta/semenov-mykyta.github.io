/* Shared helpers and EN/DE texts for theme.js, navigation.js and media.js. Every feature is optional:
   without JavaScript the pages, links, navigation and language switch work as plain HTML. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var lang = root.lang === 'de' ? 'de' : 'en';
  var desktopQuery = window.matchMedia('(min-width: 1024px)');

  var TEXT = {
    en: {
      noResults: 'No results', unavailable: 'Search unavailable',
      enlarge: 'Enlarge diagram', zoomIn: 'Zoom in', zoomOut: 'Zoom out', close: 'Close',
    },
    de: {
      noResults: 'Keine Ergebnisse', unavailable: 'Suche nicht verfügbar',
      enlarge: 'Diagramm vergrößern', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', close: 'Schließen',
    },
  }[lang];

  function $(selector, scope) { return (scope || doc).querySelector(selector); }
  function $all(selector, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(selector)); }
  function show(el) { if (el) el.hidden = false; }
  function isDesktop() { return desktopQuery.matches; }

  function focusable(scope) {
    return $all('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', scope)
      .filter(function (el) { return !el.hidden && el.getClientRects().length > 0; });
  }

  /* Keep Tab inside a modal dialog. Focus is moved explicitly so the
     cycle is the same in every engine (WebKit skips links on plain Tab by default). */
  function trapTab(event, container) {
    if (event.key !== 'Tab') return;
    var items = focusable(container);
    if (!items.length) return;
    event.preventDefault();
    var i = items.indexOf(doc.activeElement);
    var next = event.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === -1 || i === items.length - 1 ? 0 : i + 1);
    items[next].focus();
  }

  window.Portfolio = {
    doc: doc, root: root, lang: lang, desktopQuery: desktopQuery, TEXT: TEXT,
    $: $, $all: $all, show: show, isDesktop: isDesktop, trapTab: trapTab,
  };
})();
