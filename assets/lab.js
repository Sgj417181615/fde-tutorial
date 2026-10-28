/* 实验室页：把练习草稿存在本机，刷新不丢；不上传任何数据。 */
(function () {
  'use strict';
  var page = document.body.className.match(/page-([A-Za-z0-9_-]+)/);
  var prefix = 'fde-lab:' + (page ? page[1] : location.pathname) + ':';

  function save(key, value) {
    try { localStorage.setItem(prefix + key, value); } catch (e) {}
  }
  function load(key) {
    try { return localStorage.getItem(prefix + key); } catch (e) { return null; }
  }

  Array.prototype.slice.call(document.querySelectorAll('textarea[data-lab]')).forEach(function (ta) {
    var key = ta.getAttribute('data-lab') || 'draft';
    var saved = load(key);
    if (saved !== null && !ta.value) ta.value = saved;
    var status = document.createElement('p');
    status.className = 'muted small lab-status';
    status.textContent = '草稿只保存在本机浏览器。';
    ta.insertAdjacentElement('afterend', status);
    var timer = null;
    function update() {
      save(key, ta.value);
      var n = ta.value.replace(/\s/g, '').length;
      status.textContent = '已保存到本机 · ' + n + ' 字 · 不会上传';
    }
    ta.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(update, 400);
    });
    update();
  });

  Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"][data-lab]')).forEach(function (box) {
    var key = box.getAttribute('data-lab');
    box.checked = load(key) === '1';
    box.addEventListener('change', function () { save(key, box.checked ? '1' : '0'); });
  });
})();
