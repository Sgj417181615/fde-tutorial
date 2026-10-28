/* 交互图：产物链、档案档位、阶段门、五天节奏、D1 六步、FR 槽位。
   数据来自构建期生成的 assets/viz-data.js；无网络请求，file:// 可用。 */
(function () {
  'use strict';

  var doc = document;
  var data = window.__FDE_VIZ__ || {};
  var siteBase = '';
  var selfScript = doc.currentScript;
  if (selfScript && selfScript.src) {
    var src = selfScript.src.split('?')[0].split('#')[0];
    var marker = 'assets/viz.js';
    var cut = src.lastIndexOf(marker);
    if (cut >= 0) siteBase = src.slice(0, cut);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byId(list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function pageLink(item) {
    return '<a href="' + esc(siteBase + item.href) + '" target="_blank" rel="noopener" title="' +
      esc(item.title) + '">' + esc(item.short) + '</a>';
  }
  function pageList(items, empty) {
    if (!items || !items.length) return '<span class="muted">' + empty + '</span>';
    return items.map(pageLink).join('、');
  }
  function tplLink(item) {
    if (!item) return '';
    return '<a class="template-link" href="' + esc(siteBase + item.href) +
      '" data-template-view data-template-title="' + esc(item.title) + '">' + esc(item.title) + '</a>';
  }
  function setPressed(buttons, active) {
    Array.prototype.forEach.call(buttons, function (btn) {
      var on = btn === active;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function detailHead(id, name, gate) {
    return '<div class="viz-detail-head"><span class="viz-detail-id">' + esc(id) + '</span>' +
      '<h4>' + esc(name) + '</h4>' +
      (gate ? '<span class="gate-tag">' + esc(gate) + '</span>' : '') + '</div>';
  }
  function row(label, value) {
    return '<div class="viz-detail-row"><span>' + esc(label) + '</span><div>' + value + '</div></div>';
  }
  function tierTags(tiers) {
    var list = [['field', '现场包'], ['min', '最小档案'], ['all', '完整档案']];
    return list.map(function (t) {
      var on = (tiers || []).indexOf(t[0]) >= 0;
      return '<span class="viz-tier-tag' + (on ? ' is-on' : '') + '">' + t[1] + '</span>';
    }).join('');
  }

  /* ---------- 产物链 ---------- */
  function initChain(rootEl) {
    var nodes = rootEl.querySelectorAll('.viz-node');
    var chips = rootEl.querySelectorAll('.viz-chip');
    var detail = rootEl.querySelector('.viz-chain-detail');
    var current = null;
    var tier = 'all';

    function show(id) {
      var art = byId(data.artifacts, id);
      if (!art || !detail) return;
      current = id;
      Array.prototype.forEach.call(nodes, function (n) {
        var on = n.getAttribute('data-art') === id;
        n.classList.toggle('is-active', on);
        n.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      detail.innerHTML = detailHead(art.id, art.name, art.gate) +
        row('谁写', pageList(art.producer, '暂无登记')) +
        row('谁读', pageList(art.consumers, '下一轮项目启动（教程外）')) +
        row('归档路径', '<code>' + esc(art.path) + '</code>') +
        row('档案档位', tierTags(art.tiers)) +
        '<div class="viz-detail-links">' + tplLink(art.template) +
        (art.golden ? ' · ' + tplLink(art.golden) : '') + '</div>';
    }

    function applyTier(next) {
      tier = next;
      setPressed(chips, null);
      Array.prototype.forEach.call(chips, function (c) {
        var on = c.getAttribute('data-tier') === tier;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      Array.prototype.forEach.call(nodes, function (n) {
        var tiers = (n.getAttribute('data-tiers') || '').split(' ');
        n.classList.toggle('is-dim', tiers.indexOf(tier) < 0);
      });
      if (current) show(current);
    }

    Array.prototype.forEach.call(nodes, function (n) {
      n.addEventListener('click', function () { show(n.getAttribute('data-art')); });
    });
    Array.prototype.forEach.call(chips, function (c) {
      c.addEventListener('click', function () { applyTier(c.getAttribute('data-tier')); });
    });
    if (nodes.length) show(nodes[0].getAttribute('data-art'));
  }

  /* ---------- 三档档案 ---------- */
  function initTiers(rootEl) {
    var cells = rootEl.querySelectorAll('.viz-cell');
    var chips = rootEl.querySelectorAll('.viz-chip');
    var summary = rootEl.querySelector('.viz-summary');
    var names = { field: '90 分钟现场包', min: '最小可交付档案', all: '完整档案' };

    function apply(tier) {
      var ids = (data.tiers || {})[tier] || [];
      Array.prototype.forEach.call(chips, function (c) {
        var on = c.getAttribute('data-tier') === tier;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      Array.prototype.forEach.call(cells, function (cell) {
        var tiers = (cell.getAttribute('data-tiers') || '').split(' ');
        cell.classList.toggle('is-dim', tiers.indexOf(tier) < 0);
      });
      if (summary) {
        summary.innerHTML = '<strong>' + esc(names[tier] || tier) + '：' + ids.length + ' 份</strong> ' +
          esc(ids.join('、')) + '。' +
          (tier === 'all' ? '完整档案用于交接、审计或复用；第一次做项目不要从这里开始。'
            : '其余产物仍然存在，只是这一档不要求先填。');
      }
    }
    Array.prototype.forEach.call(chips, function (c) {
      c.addEventListener('click', function () { apply(c.getAttribute('data-tier')); });
    });
    apply('field');
  }

  /* ---------- 阶段门 ---------- */
  function initGates(rootEl) {
    var cards = rootEl.querySelectorAll('.viz-gate-card');
    var detail = rootEl.querySelector('.viz-gate-detail');

    function show(gid) {
      var gate = byId(data.gates, gid);
      if (!gate || !detail) return;
      setPressed(cards, null);
      Array.prototype.forEach.call(cards, function (c) {
        var on = c.getAttribute('data-gate') === gid;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var arts = gate.artifacts.map(function (id) {
        var art = byId(data.artifacts, id);
        return art ? '<code>' + esc(id) + '</code> ' + esc(art.name) : '<code>' + esc(id) + '</code>';
      }).join('、');
      var checks = gate.checks.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
      var owner = gate.ownerHref
        ? '<a href="' + esc(siteBase + gate.ownerHref) + '" target="_blank" rel="noopener">' +
          esc(gate.ownerShort) + '</a>'
        : '<span class="muted">未登记</span>';
      detail.innerHTML = detailHead(gate.id, gate.name, '') +
        row('这一门问什么', esc(gate.question)) +
        row('必查产物', arts) +
        row('什么算通过', esc(gate.pass)) +
        row('不过时怎么办', esc(gate.fail)) +
        row('逐项检查', '<ul class="viz-check-list">' + checks + '</ul>') +
        row('主责页面', owner);
    }
    Array.prototype.forEach.call(cards, function (c) {
      c.addEventListener('click', function () { show(c.getAttribute('data-gate')); });
    });
    if (cards.length) show('G3');
  }

  /* ---------- 五天节奏 ---------- */
  function initDays(rootEl) {
    var cards = rootEl.querySelectorAll('.viz-day-card');
    var detail = rootEl.querySelector('.viz-day-detail');

    function show(day) {
      var item = null;
      (data.fiveDays || []).forEach(function (d) { if (d.day === day) item = d; });
      if (!item || !detail) return;
      setPressed(cards, null);
      Array.prototype.forEach.call(cards, function (c) {
        var on = c.getAttribute('data-day') === day;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var arts = item.artifacts.map(function (id) {
        var art = byId(data.artifacts, id);
        return art ? '<code>' + esc(id) + '</code> ' + esc(art.name) : '<code>' + esc(id) + '</code>';
      }).join('、');
      detail.innerHTML = detailHead(item.day, item.theme, '') +
        row('当天目标', esc(item.goal)) +
        row('可展示增量', esc(item.increment)) +
        row('停止条件', esc(item.stop)) +
        row('相关产物', arts) +
        row('详细步骤', '<a href="' + esc(siteBase + item.page) + '" target="_blank" rel="noopener">打开当天说明</a>');
    }
    Array.prototype.forEach.call(cards, function (c) {
      c.addEventListener('click', function () { show(c.getAttribute('data-day')); });
    });
    if (cards.length) show('Day 1');
  }

  /* ---------- D1 六步 ---------- */
  function initSteps(rootEl) {
    var cards = rootEl.querySelectorAll('.viz-step-card');
    var detail = rootEl.querySelector('.viz-step-detail');

    function show(n) {
      var item = null;
      (data.day1 || []).forEach(function (s) { if (String(s.n) === String(n)) item = s; });
      if (!item || !detail) return;
      setPressed(cards, null);
      Array.prototype.forEach.call(cards, function (c) {
        var on = c.getAttribute('data-step') === String(n);
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var art = byId(data.artifacts, item.artifact);
      detail.innerHTML = detailHead('第 ' + item.n + ' 步', item.title, item.gate) +
        row('做什么', esc(item.action)) +
        row('落到哪里', '<code>' + esc(item.output) + '</code>') +
        row('停下来确认', esc(item.stop)) +
        row('相关产物', art ? '<code>' + esc(art.id) + '</code> ' + esc(art.name) : esc(item.artifact)) +
        row('详细说明', '<a href="' + esc(siteBase + item.page) + '" target="_blank" rel="noopener">打开这一页</a>');
    }
    Array.prototype.forEach.call(cards, function (c) {
      c.addEventListener('click', function () { show(c.getAttribute('data-step')); });
    });
    if (cards.length) show(2);
  }

  /* ---------- FR 槽位 ---------- */
  function initFr(rootEl) {
    var slots = rootEl.querySelectorAll('.viz-slot');
    var detail = rootEl.querySelector('.viz-fr-detail');

    function show(i) {
      var item = (data.fr || [])[Number(i)];
      if (!item || !detail) return;
      setPressed(slots, null);
      Array.prototype.forEach.call(slots, function (s) {
        var on = s.getAttribute('data-slot') === String(i);
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      detail.innerHTML = detailHead('槽位', item.label, '') +
        row('要回答什么', esc(item.question)) +
        row('合格写法', esc(item.example)) +
        row('常见反例', esc(item.bad));
    }
    Array.prototype.forEach.call(slots, function (s) {
      s.addEventListener('click', function () { show(s.getAttribute('data-slot')); });
    });
    if (slots.length) show(4);
  }

  function init() {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-viz]'), function (rootEl) {
      var kind = rootEl.getAttribute('data-viz');
      if (kind === 'artifact-chain') initChain(rootEl);
      else if (kind === 'dossier-tiers') initTiers(rootEl);
      else if (kind === 'gate-ladder') initGates(rootEl);
      else if (kind === 'five-days') initDays(rootEl);
      else if (kind === 'day1-chain') initSteps(rootEl);
      else if (kind === 'fr-formula') initFr(rootEl);
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
