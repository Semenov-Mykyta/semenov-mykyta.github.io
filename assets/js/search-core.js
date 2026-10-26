/* Local search core: validates a search index and matches queries.
   No network access here, no HTML parsing of index data. Exposes PortfolioSearch. */
(function (root) {
  'use strict';

  var ID = /^[a-z0-9-]+$/;
  var CATEGORY = { title: 0, technology: 1, heading: 2, description: 3 };

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function normalize(text) {
    return String(text).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /* Resolve an index URL to an absolute URL inside the site, or return null.
     Allowed: "../<lang>/index.html" or "../<lang>/projects/<id>.html" relative to the index file. */
  function resolveEntryUrl(url, lang, indexUrl) {
    if (typeof url !== 'string') return null;
    var prefix = '../' + lang + '/';
    if (url.indexOf(prefix) !== 0) return null;
    if (/[\\\u0000%#?]|^\s|\s$/.test(url) || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(url)) return null;
    var rest = url.slice(prefix.length);
    if (!/^(index|projects\/[a-z0-9-]+)\.html$/.test(rest)) return null;
    var resolved;
    var base;
    try {
      resolved = new URL(url, indexUrl);
      base = new URL('../', indexUrl);
    } catch (e) {
      return null;
    }
    if (resolved.origin !== base.origin) return null;
    if (resolved.pathname !== base.pathname + lang + '/' + rest) return null;
    return resolved.href;
  }

  /* Returns { ok: true, entries } or { ok: false, reason }. Any invalid entry rejects the whole index. */
  function validateIndex(data, lang, indexUrl) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, reason: 'not an object' };
    if (data.version !== 1) return { ok: false, reason: 'unsupported version' };
    if (data.language !== lang) return { ok: false, reason: 'language mismatch' };
    if (!Array.isArray(data.entries)) return { ok: false, reason: 'entries is not an array' };
    var seen = {};
    var entries = [];
    for (var i = 0; i < data.entries.length; i += 1) {
      var e = data.entries[i];
      if (!e || typeof e !== 'object') return { ok: false, reason: 'entry ' + i + ' is not an object' };
      if (typeof e.id !== 'string' || !ID.test(e.id) || seen[e.id]) return { ok: false, reason: 'entry ' + i + ' has an invalid or duplicate id' };
      seen[e.id] = true;
      if (!isNonEmptyString(e.title) || !isNonEmptyString(e.description)) return { ok: false, reason: 'entry ' + i + ' lacks title or description' };
      if (!Array.isArray(e.technologies) || !e.technologies.every(function (t) { return typeof t === 'string'; })) {
        return { ok: false, reason: 'entry ' + i + ' has invalid technologies' };
      }
      if (!Array.isArray(e.headings) || !e.headings.every(function (h) {
        return h && typeof h === 'object' && typeof h.id === 'string' && ID.test(h.id) && isNonEmptyString(h.title);
      })) {
        return { ok: false, reason: 'entry ' + i + ' has invalid headings' };
      }
      var href = resolveEntryUrl(e.url, lang, indexUrl);
      if (!href) return { ok: false, reason: 'entry ' + i + ' has an unsafe url' };
      entries.push({
        id: e.id,
        title: e.title,
        description: e.description,
        technologies: e.technologies.slice(),
        headings: e.headings.map(function (h) { return { id: h.id, title: h.title }; }),
        href: href,
      });
    }
    return { ok: true, entries: entries };
  }

  /* Case-insensitive substring search over title, technologies, headings and description.
     Order: title, technologies, headings, description; index order within a category. */
  function search(entries, query) {
    var q = normalize(query);
    if (!q) return [];
    var results = [];
    entries.forEach(function (entry, index) {
      if (normalize(entry.title).indexOf(q) !== -1) {
        results.push({ category: CATEGORY.title, index: index, title: entry.title, context: '', href: entry.href });
        return;
      }
      var tech = entry.technologies.filter(function (t) { return normalize(t).indexOf(q) !== -1; });
      if (tech.length) {
        results.push({ category: CATEGORY.technology, index: index, title: entry.title, context: tech.join(', '), href: entry.href });
        return;
      }
      var headings = entry.headings.filter(function (h) { return normalize(h.title).indexOf(q) !== -1; });
      if (headings.length) {
        headings.forEach(function (h) {
          results.push({ category: CATEGORY.heading, index: index, title: entry.title, context: h.title, href: entry.href + '#' + h.id });
        });
        return;
      }
      if (normalize(entry.description).indexOf(q) !== -1) {
        results.push({ category: CATEGORY.description, index: index, title: entry.title, context: '', href: entry.href });
      }
    });
    results.sort(function (a, b) { return a.category - b.category || a.index - b.index; });
    return results;
  }

  root.PortfolioSearch = { validateIndex: validateIndex, search: search, normalize: normalize, resolveEntryUrl: resolveEntryUrl };
})(typeof window !== 'undefined' ? window : globalThis);
