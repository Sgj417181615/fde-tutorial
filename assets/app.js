/* FDE 教程前端：全部离线，无 fetch / XHR / ES module。 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ---------- 主题 ---------- */
  var themeBtn = doc.getElementById('theme-toggle');
  function setTheme(theme) {
    root.dataset.theme = theme;
    try { localStorage.setItem('fde-theme', theme); } catch (e) {}
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- 移动目录 ---------- */
  var navToggle = doc.getElementById('nav-toggle');
  var scrim = doc.getElementById('scrim');
  function setNav(open) {
    doc.body.classList.toggle('nav-open', open);
    if (navToggle) navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (scrim) scrim.hidden = !open;
  }
  if (navToggle) navToggle.addEventListener('click', function () {
    setNav(!doc.body.classList.contains('nav-open'));
  });
  if (scrim) scrim.addEventListener('click', function () { setNav(false); });

  /* ---------- 阅读进度 ---------- */
  var progress = doc.getElementById('read-progress');
  function updateProgress() {
    if (!progress) return;
    var h = doc.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.min(100, Math.max(0, (window.scrollY / h) * 100)) : 0;
    progress.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* ---------- 右侧目录高亮 ---------- */
  var tocLinks = Array.prototype.slice.call(doc.querySelectorAll('.toc-list a[href^="#"]'));
  var linkById = {};
  tocLinks.forEach(function (a) { linkById[a.getAttribute('href').slice(1)] = a; });
  var observed = Array.prototype.slice.call(doc.querySelectorAll('.prose h2[id], .prose h3[id]'));
  if ('IntersectionObserver' in window && observed.length) {
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0;
      });
      var best = null, bestScore = -1;
      observed.forEach(function (el) {
        var s = visible[el.id] || 0;
        if (s > bestScore) { bestScore = s; best = el.id; }
      });
      if (best && linkById[best]) {
        tocLinks.forEach(function (a) { a.classList.remove('active'); });
        linkById[best].classList.add('active');
      }
    }, { rootMargin: '-72px 0px -62% 0px', threshold: [0, 0.2, 0.5, 1] });
    observed.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 代码复制 ---------- */
  Array.prototype.slice.call(doc.querySelectorAll('.prose pre')).forEach(function (pre) {
    if (pre.parentElement && pre.parentElement.classList.contains('pre-wrap')) return;
    var wrap = doc.createElement('div');
    wrap.className = 'pre-wrap';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = '复制';
    btn.addEventListener('click', function () {
      var text = pre.innerText;
      function done() {
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = '复制'; }, 1400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = doc.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        doc.body.appendChild(ta);
        ta.select();
        try { doc.execCommand('copy'); done(); } catch (e) {}
        doc.body.removeChild(ta);
      }
    });
    wrap.appendChild(btn);
  });

  /* ---------- 模板弹窗 ---------- */
  var tplModal = doc.getElementById('tpl-modal');
  var tplFrame = doc.getElementById('tpl-frame');
  var tplTitle = doc.getElementById('tpl-title');
  var tplOpen = doc.getElementById('tpl-open');
  var tplCloseBtn = doc.getElementById('tpl-close');
  var tplLastFocus = null;

  function openTemplate(link) {
    if (!tplModal || !tplFrame) return;
    var href = link.getAttribute('href') || '';
    if (!href) return;
    var title = link.getAttribute('data-template-title') || link.textContent || '模板';
    tplLastFocus = link;
    if (tplTitle) tplTitle.textContent = title;
    if (tplOpen) tplOpen.href = href;
    tplFrame.src = href;
    tplModal.hidden = false;
    doc.body.classList.add('modal-open');
    if (tplCloseBtn) tplCloseBtn.focus();
  }

  function closeTemplate() {
    if (!tplModal || tplModal.hidden) return;
    tplModal.hidden = true;
    doc.body.classList.remove('modal-open');
    if (tplFrame) tplFrame.src = 'about:blank';
    if (tplLastFocus && tplLastFocus.focus) tplLastFocus.focus();
  }

  if (tplCloseBtn) tplCloseBtn.addEventListener('click', closeTemplate);
  if (tplModal) tplModal.addEventListener('click', function (e) {
    if (e.target === tplModal) closeTemplate();
  });
  doc.addEventListener('click', function (e) {
    var el = e.target;
    var link = el && el.closest ? el.closest('a[data-template-view]') : null;
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openTemplate(link);
  });

  /* ---------- 搜索 ---------- */
  var modal = doc.getElementById('search-modal');
  var input = doc.getElementById('search-input');
  var results = doc.getElementById('search-results');
  var openBtn = doc.getElementById('search-open');
  var closeBtn = doc.getElementById('search-close');
  var data = window.__FDE_SEARCH__ || [];
  var activeIndex = -1;
  var lastFocus = null;
  var siteBase = '';
  var selfScript = doc.currentScript;
  if (selfScript && selfScript.src) {
    var src = selfScript.src.split('?')[0].split('#')[0];
    var marker = 'assets/app.js';
    var cut = src.lastIndexOf(marker);
    if (cut >= 0) siteBase = src.slice(0, cut);
  }

  function normalize(s) { return String(s || '').toLowerCase(); }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function highlight(text, q) {
    var safe = escapeHtml(text);
    if (!q) return safe;
    var idx = normalize(text).indexOf(q);
    if (idx < 0) return safe;
    var before = escapeHtml(text.slice(0, idx));
    var hit = escapeHtml(text.slice(idx, idx + q.length));
    var after = escapeHtml(text.slice(idx + q.length));
    return before + '<span class="hit">' + hit + '</span>' + after;
  }

  function scoreEntry(entry, q) {
    var score = 0;
    var title = normalize(entry.title);
    var summary = normalize(entry.summary + ' ' + (entry.question || ''));
    if (title === q) score += 60;
    else if (title.indexOf(q) >= 0) score += 30;
    var hitHeading = null;
    (entry.headings || []).forEach(function (h) {
      if (normalize(h.text).indexOf(q) >= 0) {
        score += 12;
        if (!hitHeading) hitHeading = h;
      }
    });
    if (summary.indexOf(q) >= 0) score += 8;
    (entry.keywords || []).forEach(function (k) {
      if (normalize(k).indexOf(q) >= 0) score += 6;
    });
    if ((entry.id || '').toLowerCase().indexOf(q) >= 0) score += 10;
    (entry.artifacts || []).forEach(function (a) {
      if (a.toLowerCase().indexOf(q) >= 0) score += 5;
    });
    return { score: score, heading: hitHeading };
  }

  function renderResults(q) {
    if (!results) return;
    q = normalize(q).trim();
    if (!q) {
      results.innerHTML = '<p class="search-empty">输入关键词，搜索概念、产物编号、模板或方法卡。</p>';
      activeIndex = -1;
      return;
    }
    var hits = [];
    data.forEach(function (entry) {
      var r = scoreEntry(entry, q);
      if (r.score > 0) hits.push({ entry: entry, score: r.score, heading: r.heading });
    });
    hits.sort(function (a, b) { return b.score - a.score || a.entry.title.localeCompare(b.entry.title); });
    hits = hits.slice(0, 24);
    if (!hits.length) {
      results.innerHTML = '<p class="search-empty">没有找到“' + escapeHtml(q) + '”。试试产物编号（A02-04）或英文名。</p>';
      activeIndex = -1;
      return;
    }
    var html = '';
    var group = '';
    hits.forEach(function (hit, i) {
      if (hit.entry.group !== group) {
        group = hit.entry.group;
        html += '<p class="search-group">' + escapeHtml(group) + '</p>';
      }
      var url = siteBase + hit.entry.url + (hit.heading ? '#' + hit.heading.id : '');
      var sub = hit.heading ? hit.heading.text : (hit.entry.summary || '');
      html += '<a class="search-result" data-index="' + i + '" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
        '<strong>' + highlight(hit.entry.title, q) + '</strong>' +
        '<small>' + highlight(sub, q) + '</small></a>';
    });
    results.innerHTML = html;
    activeIndex = 0;
    setActive(0);
  }

  function setActive(i) {
    var items = results ? results.querySelectorAll('.search-result') : [];
    if (!items.length) return;
    if (i < 0) i = items.length - 1;
    if (i >= items.length) i = 0;
    items.forEach(function (el) { el.classList.remove('active'); });
    items[i].classList.add('active');
    activeIndex = i;
  }

  function openSearch() {
    if (!modal) return;
    lastFocus = doc.activeElement;
    modal.hidden = false;
    if (input) { input.value = ''; input.focus(); }
    renderResults('');
  }
  function closeSearch() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (openBtn) openBtn.addEventListener('click', openSearch);
  if (closeBtn) closeBtn.addEventListener('click', closeSearch);
  if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) closeSearch(); });
  if (input) input.addEventListener('input', function () { renderResults(input.value); });

  doc.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((doc.activeElement || {}).tagName || '');
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.key === 'Escape') {
      if (tplModal && !tplModal.hidden) { closeTemplate(); return; }
      if (modal && !modal.hidden) { closeSearch(); return; }
      if (doc.body.classList.contains('nav-open')) { setNav(false); return; }
    }
    if (modal && !modal.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setActive(activeIndex + (e.key === 'ArrowDown' ? 1 : -1));
    }
    if (modal && !modal.hidden && e.key === 'Enter') {
      var items = results ? results.querySelectorAll('.search-result') : [];
      if (items[activeIndex]) { items[activeIndex].click(); }
    }
  });
})();
