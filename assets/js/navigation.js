/* Navigation: mobile menu, search panel, section bar, current-section highlight and reveal on scroll. */
(function (P) {
  'use strict';
  if (!P) return;
  var doc = P.doc, root = P.root, lang = P.lang, desktopQuery = P.desktopQuery, TEXT = P.TEXT, $ = P.$, $all = P.$all, show = P.show, isDesktop = P.isDesktop, trapTab = P.trapTab;

  var scriptUrl = doc.currentScript ? doc.currentScript.src : '';

  /* ---------- Mobile menu ---------- */
  var header = $('.site-header');
  var menuButton = $('.menu-toggle');
  var nav = $('#site-nav');

  function closeMenu(returnFocus) {
    if (!header || !header.classList.contains('menu-open')) return;
    header.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuButton.focus();
  }
  function openMenu() {
    closeSearch(false);
    header.classList.add('menu-open');
    menuButton.setAttribute('aria-expanded', 'true');
  }
  if (menuButton && nav && header) {
    show(menuButton);
    menuButton.addEventListener('click', function () {
      if (header.classList.contains('menu-open')) closeMenu(false); else openMenu();
    });
    nav.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(true); });
    menuButton.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(true); });
    $all('a', nav).forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
    doc.addEventListener('click', function (e) {
      if (header.classList.contains('menu-open') && !header.contains(e.target)) closeMenu(false);
    });
  }

  /* ---------- Search ---------- */
  var searchButton = $('.search-toggle');
  var dialog = $('#search');
  var input = $('#search-input');
  var list = $('#search-results');
  var status = $('#search .search__status');
  var closeButton = $('#search .search__close');
  var indexUrl = scriptUrl ? new URL('../../data/' + lang + '-search.json', scriptUrl).href : '';
  var indexState = { state: 'idle', entries: null, promise: null };
  var results = [];
  var active = -1;

  function setStatus(text) { if (status && status.textContent !== text) status.textContent = text; }

  function loadIndex() {
    if (indexState.state === 'ok') return Promise.resolve(indexState.entries);
    if (indexState.state === 'loading') return indexState.promise;
    if (indexState.state === 'error') return Promise.resolve(null); /* retry only after a new open */
    indexState.state = 'loading';
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = window.setTimeout(function () { if (controller) controller.abort(); }, 5000);
    indexState.promise = fetch(indexUrl, controller ? { signal: controller.signal } : undefined)
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (data) {
        var checked = window.PortfolioSearch.validateIndex(data, lang, indexUrl);
        if (!checked.ok) throw new Error(checked.reason);
        indexState.state = 'ok';
        indexState.entries = checked.entries;
        return checked.entries;
      })
      .catch(function () {
        indexState.state = 'error';
        indexState.entries = null;
        return null;
      })
      .then(function (entries) { window.clearTimeout(timer); return entries; });
    return indexState.promise;
  }

  function setActive(i) {
    var options = $all('[role="option"]', list);
    active = i;
    options.forEach(function (opt, n) {
      var on = n === i;
      opt.setAttribute('aria-selected', on ? 'true' : 'false');
      opt.classList.toggle('is-active', on);
    });
    if (i >= 0 && options[i]) {
      input.setAttribute('aria-activedescendant', options[i].id);
      if (options[i].scrollIntoView) options[i].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function render() {
    list.textContent = '';
    active = -1;
    input.removeAttribute('aria-activedescendant');
    var query = input.value;
    if (!window.PortfolioSearch.normalize(query)) {
      results = [];
      input.setAttribute('aria-expanded', 'false');
      setStatus('');
      return;
    }
    if (indexState.state === 'error') {
      results = [];
      input.setAttribute('aria-expanded', 'false');
      setStatus(TEXT.unavailable);
      return;
    }
    if (indexState.state !== 'ok') return;
    results = window.PortfolioSearch.search(indexState.entries, query);
    results.forEach(function (r, i) {
      var li = doc.createElement('li');
      li.setAttribute('role', 'none');
      var a = doc.createElement('a');
      a.id = 'search-option-' + i;
      a.className = 'search__option';
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', 'false');
      a.href = r.href;
      var title = doc.createElement('span');
      title.className = 'search__title';
      title.textContent = r.title;
      a.appendChild(title);
      if (r.context) {
        var context = doc.createElement('span');
        context.className = 'search__context';
        context.textContent = r.context;
        a.appendChild(context);
      }
      li.appendChild(a);
      list.appendChild(li);
    });
    input.setAttribute('aria-expanded', results.length ? 'true' : 'false');
    setStatus(results.length ? '' : TEXT.noResults);
  }

  function onInput() {
    if (!window.PortfolioSearch.normalize(input.value)) { render(); return; }
    loadIndex().then(render);
  }

  function openSearch() {
    closeMenu(false);
    if (indexState.state === 'error') indexState.state = 'idle'; /* retry only on a new explicit open */
    if (isDesktop()) dialog.showModal(); else dialog.show();
    dialog.classList.toggle('search--inline', !isDesktop());
    searchButton.setAttribute('aria-expanded', 'true');
    input.focus();
    if (window.PortfolioSearch.normalize(input.value)) onInput();
  }

  function closeSearch(returnFocus) {
    if (!dialog || !dialog.open) return;
    dialog.close();
    if (returnFocus !== false) searchButton.focus();
  }

  if (searchButton && dialog && input && list && window.PortfolioSearch) {
    show(searchButton);
    searchButton.addEventListener('click', function () {
      if (dialog.open) closeSearch(true); else openSearch();
    });
    closeButton.addEventListener('click', function () { closeSearch(true); });
    dialog.addEventListener('close', function () {
      searchButton.setAttribute('aria-expanded', 'false');
      setActive(-1);
    });
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeSearch(true); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeSearch(true); return; }
      if (dialog.matches(':modal')) trapTab(e, dialog);
    });
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', function (e) {
      var count = $all('[role="option"]', list).length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (count) setActive(active < count - 1 ? active + 1 : count - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (count) setActive(active > 0 ? active - 1 : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (active >= 0 && results[active]) window.location.assign(results[active].href);
      }
    });
    desktopQuery.addEventListener('change', function () { closeSearch(false); closeMenu(false); });
  }

  /* ---------- Sections on case pages ---------- */
  var sectionNav = $('.section-nav');
  var sectionButton = $('.section-nav__toggle');
  function closeSections(returnFocus) {
    if (!sectionNav || !sectionNav.classList.contains('is-open')) return;
    sectionNav.classList.remove('is-open');
    sectionButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) sectionButton.focus();
  }
  if (sectionNav && sectionButton) {
    show(sectionButton);
    sectionButton.addEventListener('click', function () {
      var open = !sectionNav.classList.contains('is-open');
      sectionNav.classList.toggle('is-open', open);
      sectionButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    sectionNav.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSections(true); });
    $all('a[href^="#"]', sectionNav).forEach(function (a) {
      a.addEventListener('click', function () {
        var target = doc.getElementById(a.getAttribute('href').slice(1));
        closeSections(false);
        revealNow(target);
        pinCurrent(a);
        if (target) {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          window.setTimeout(function () { target.focus({ preventScroll: true }); }, 0);
        }
      });
    });
  }

  /* ---------- Current section highlight ---------- */
  var sectionLinks = sectionNav ? $all('a[href^="#"]', sectionNav) : [];
  var sectionHeadings = sectionLinks.map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); });
  var ticking = false;
  var pinned = -1; // the section chosen in the bar stays highlighted while the page glides to it
  var settleTimer = 0;
  function landingLine() {
    return sectionHeadings[0] ? parseFloat(window.getComputedStyle(sectionHeadings[0]).scrollMarginTop) || 0 : 0;
  }
  function pinCurrent(a) {
    pinned = sectionLinks.indexOf(a);
    updateCurrent();
  }
  // Give the page just enough room below the last section that the second-to-last heading can
  // reach the highlight line - instead of a fixed full-screen gap.
  function fitLastSection() {
    var n = sectionHeadings.length;
    if (n < 2 || !sectionHeadings[n - 1] || !sectionHeadings[n - 2]) return;
    var last = sectionHeadings[n - 1].closest('.case-section');
    if (!last) return;
    last.style.marginBottom = '';
    var below = doc.documentElement.scrollHeight - (sectionHeadings[n - 2].getBoundingClientRect().top + window.scrollY);
    var needed = window.innerHeight - landingLine() + 48;
    if (below < needed) last.style.marginBottom = Math.ceil(needed - below) + 'px';
  }
  function updateCurrent() {
    ticking = false;
    if (!sectionHeadings.length) return;
    // A section counts as current once its heading reaches the line where an anchor jump lands it
    // (its scroll-margin-top), so a click in the bar highlights the target without extra scrolling.
    var line = Math.max(sectionNav.getBoundingClientRect().bottom + 24, landingLine() + 4);
    var current = 0;
    sectionHeadings.forEach(function (h, i) { if (h && h.getBoundingClientRect().top <= line) current = i; });
    if (window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 2) current = sectionHeadings.length - 1;
    if (pinned >= 0) current = pinned;
    sectionLinks.forEach(function (a, i) {
      if (i === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  if (sectionHeadings.length) {
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(updateCurrent); }
      // Once the scrolling settles, the position decides again (a pinned choice ends here).
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(function () { pinned = -1; updateCurrent(); }, 160);
    }, { passive: true });
    window.addEventListener('resize', function () { fitLastSection(); updateCurrent(); });
    window.addEventListener('hashchange', updateCurrent);
    fitLastSection();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fitLastSection);
    window.addEventListener('load', fitLastSection);
    updateCurrent();
  }

  /* ---------- Reveal on scroll ---------- */
  var observer = null;
  // An anchor jump must land on the final layout: show the target's section at once,
  // otherwise its 16px slide-up finishes after the scroll and pushes the heading under the sticky bar.
  function revealNow(el) {
    var box = el && el.closest ? el.closest('.reveal-pending') : null;
    if (!box) return;
    box.classList.remove('reveal', 'reveal-pending');
    if (observer) observer.unobserve(box);
  }
  window.addEventListener('hashchange', function () { revealNow(doc.getElementById(location.hash.slice(1))); });
  if (root.classList.contains('motion-ok') && 'IntersectionObserver' in window) {
    var targets = $all('.cards > li, .about__grid > div, #contact .container, .case-section, .diagram');
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-pending');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('reveal', 'reveal-pending');
        observer.observe(el);
      }
    });
  }
})(window.Portfolio);
