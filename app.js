/* ============================================================
   naiwa-hub
   一个页面里装下几个奶蛙小游戏。
   游戏清单在 games.json —— 那是你唯一需要自己改的文件。
   ============================================================ */

(function () {
  'use strict';

  var RECENT_KEY = 'naiwa-hub:recent';   // 最近玩过存在浏览器本地，不上传
  var RECENT_KEEP = 10;
  var LOADING_TIMEOUT = 25000;           // 兜底：再慢也在 25 秒后收起载入画面

  var state = { games: [], site: {}, current: null, timer: 0 };

  function $(id) { return document.getElementById(id); }

  var ui = {
    nav:         $('nav'),
    cards:       $('cards'),
    viewHome:    $('view-home'),
    viewGame:    $('view-game'),
    title:       $('tb-title'),
    frame:       $('game-frame'),
    frameBox:    $('frame'),
    loading:     $('loading'),
    loadingTile: $('loading-tile'),
    loadingText: $('loading-text'),
    popover:     $('popover'),
    btnFs:       $('btn-fs'),
    exitFs:      $('exit-fs'),
    boot:        $('boot'),
    error:       $('error')
  };

  var SVG = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M4 10.6 12 4.2l8 6.4V19a1 1 0 0 1-1 1h-4.2v-5.4H9.2V20H5a1 1 0 0 1-1-1z"/></svg>',
    ext:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M14 4.8h5.2V10"/><path d="M19.2 4.8 11.5 12.5"/>' +
          '<path d="M18 14v4.4a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.4V7.6A1.6 1.6 0 0 1 5.6 6H10"/></svg>'
  };

  /* ---------------------------------------------------------
     数据
     --------------------------------------------------------- */

  function load() {
    return fetch('games.json', { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function recentList() {
    try {
      var v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function touch(id) {
    var list = recentList().filter(function (x) { return x && x.id !== id; });
    list.unshift({ id: id, t: Date.now() });
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_KEEP))); } catch (e) {}
  }

  /* 玩过的排前面；没玩过的保持 games.json 里的顺序 */
  function orderedGames() {
    var rank = {};
    recentList().forEach(function (x, i) {
      if (x && rank[x.id] === undefined) rank[x.id] = i;
    });
    return state.games.slice().sort(function (a, b) {
      var ra = rank[a.id] === undefined ? Infinity : rank[a.id];
      var rb = rank[b.id] === undefined ? Infinity : rank[b.id];
      return ra === rb ? 0 : (ra < rb ? -1 : 1);
    });
  }

  function byId(id) {
    for (var i = 0; i < state.games.length; i++) {
      if (state.games[i].id === id) return state.games[i];
    }
    return null;
  }

  /* ---------------------------------------------------------
     渲染
     --------------------------------------------------------- */

  function renderNav() {
    ui.nav.textContent = '';

    var home = document.createElement('button');
    home.type = 'button';
    home.className = 'nav__item';
    home.setAttribute('data-act', 'home');
    home.innerHTML = SVG.home;
    home.appendChild(document.createTextNode('主页'));
    ui.nav.appendChild(home);

    state.games.forEach(function (game) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav__item';
      b.setAttribute('data-game', game.id);

      var dot = document.createElement('span');
      dot.className = 'nav__dot';
      dot.style.background = game.color || '#123e38';
      dot.textContent = game.mark || '';

      b.appendChild(dot);
      b.appendChild(document.createTextNode(game.title));
      ui.nav.appendChild(b);
    });
  }

  function renderCards() {
    ui.cards.textContent = '';

    var isRecent = {};
    recentList().forEach(function (x) { if (x) isRecent[x.id] = true; });

    orderedGames().forEach(function (game) {
      ui.cards.appendChild(buildCard(game, !!isRecent[game.id]));
    });
  }

  function buildCard(game, showBadge) {
    var wrap = document.createElement('div');
    wrap.className = 'card-wrap';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.setAttribute('data-game', game.id);

    var tile = document.createElement('span');
    tile.className = 'card__tile';
    tile.style.background = game.color || '#123e38';
    tile.textContent = game.mark || '';

    var body = document.createElement('span');
    body.className = 'card__body';

    var title = document.createElement('span');
    title.className = 'card__title';
    title.appendChild(document.createTextNode(game.title));
    if (showBadge) {
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = '最近';
      title.appendChild(badge);
    }

    var desc = document.createElement('span');
    desc.className = 'card__desc';
    desc.textContent = game.desc || '';

    body.appendChild(title);
    body.appendChild(desc);
    btn.appendChild(tile);
    btn.appendChild(body);

    /* 「新窗口打开」是一个真正的链接，和卡片按钮并列而不是嵌套（嵌套按钮是无效 HTML） */
    var ext = document.createElement('a');
    ext.className = 'card__ext';
    ext.href = game.url;
    ext.target = '_blank';
    ext.rel = 'noopener';
    ext.title = '在新窗口打开「' + game.title + '」';
    ext.setAttribute('aria-label', ext.title);
    ext.innerHTML = SVG.ext;

    wrap.appendChild(btn);
    wrap.appendChild(ext);
    return wrap;
  }

  function setActive(id) {
    var items = ui.nav.querySelectorAll('[data-game], [data-act="home"]');
    for (var i = 0; i < items.length; i++) {
      var key = items[i].hasAttribute('data-game') ? items[i].getAttribute('data-game') : '';
      if (key === id) items[i].setAttribute('aria-current', 'true');
      else items[i].removeAttribute('aria-current');
    }
  }

  /* ---------------------------------------------------------
     页面切换
     --------------------------------------------------------- */

  function route() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var id = raw ? decodeURIComponent(raw) : '';
    var game = id ? byId(id) : null;
    if (game) showGame(game);
    else showHome();
  }

  function showGame(game) {
    state.current = game;

    ui.title.textContent = game.title;
    ui.viewHome.hidden = true;
    ui.viewGame.hidden = false;

    setActive(game.id);
    closeMenu();
    touch(game.id);

    beginLoading(game);
    ui.frame.src = game.url;     // 每次进入都是全新载入，避免游戏在后台偷偷出声
  }

  function showHome() {
    state.current = null;

    ui.viewGame.hidden = true;
    ui.viewHome.hidden = false;

    unloadFrame();
    setActive('');
    renderCards();               // 顺序按「最近玩过」刷新
    closeMenu();
    leaveFullscreen();
  }

  function beginLoading(game) {
    clearTimeout(state.timer);
    ui.loading.classList.remove('is-done');
    ui.loadingTile.style.background = game.color || '#123e38';
    ui.loadingTile.textContent = game.mark || '';
    ui.loadingText.textContent = '正在载入 ' + game.title + '…';
    state.timer = setTimeout(function () {
      ui.loading.classList.add('is-done');
    }, LOADING_TIMEOUT);
  }

  function unloadFrame() {
    clearTimeout(state.timer);
    ui.loading.classList.remove('is-done');
    ui.frame.src = 'about:blank';
  }

  function go(id) {
    var next = '#/' + id;
    if (location.hash === next) route();
    else location.hash = next;
  }

  function goRandom() {
    var pool = state.games.filter(function (x) {
      return !state.current || x.id !== state.current.id;
    });
    if (!pool.length) pool = state.games;
    if (!pool.length) return;
    go(pool[Math.floor(Math.random() * pool.length)].id);
  }

  function reloadGame() {
    if (!state.current) return;
    var game = state.current;
    unloadFrame();
    beginLoading(game);
    setTimeout(function () { ui.frame.src = game.url; }, 60);
  }

  /* ---------------------------------------------------------
     全屏（iOS 上元素全屏不被支持，退到"沉浸模式"）
     --------------------------------------------------------- */

  function inFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement) ||
           document.body.classList.contains('immersive');
  }

  function syncFsButton() {
    var on = inFullscreen();
    ui.exitFs.hidden = !on;
    ui.btnFs.classList.toggle('is-on', on);
    ui.btnFs.setAttribute('aria-label', on ? '退出全屏' : '全屏');
    ui.btnFs.title = on ? '退出全屏' : '全屏';
  }

  function setImmersive(on) {
    document.body.classList.toggle('immersive', !!on);
    syncFsButton();
  }

  function leaveFullscreen() {
    var doc = document;
    var el = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (el) {
      var exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) { try { exit.call(doc); } catch (e) {} }
    }
    setImmersive(false);
  }

  function toggleFullscreen() {
    var doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      var exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) { try { exit.call(doc); } catch (e) {} }
      return;
    }
    if (document.body.classList.contains('immersive')) { setImmersive(false); return; }

    var box = ui.frameBox;
    var req = box.requestFullscreen || box.webkitRequestFullscreen;
    if (!req) { setImmersive(true); return; }

    try {
      var p = req.call(box, { navigationUI: 'hide' });
      if (p && typeof p.then === 'function') p.then(null, function () { setImmersive(true); });
    } catch (e) {
      setImmersive(true);
    }
  }

  /* ---------------------------------------------------------
     菜单
     --------------------------------------------------------- */

  function openMenu(force) {
    var show = typeof force === 'boolean' ? force : ui.popover.hidden;
    ui.popover.hidden = !show;
  }
  function closeMenu() { ui.popover.hidden = true; }

  function handleAction(act, node) {
    if (act === 'home') { location.hash = '#/'; }
    else if (act === 'random') { closeMenu(); goRandom(); }
    else if (act === 'reload') { closeMenu(); reloadGame(); }
    else if (act === 'fullscreen') { closeMenu(); toggleFullscreen(); }
    else if (act === 'menu') { openMenu(); }
    else if (act === 'external') {
      closeMenu();
      var url = (node && node.getAttribute('data-url')) || (state.current && state.current.url);
      if (url) window.open(url, '_blank', 'noopener');
    }
  }

  /* ---------------------------------------------------------
     事件
     --------------------------------------------------------- */

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var actEl = t.closest('[data-act]');
    if (actEl) { handleAction(actEl.getAttribute('data-act'), actEl); return; }

    if (!ui.popover.hidden) closeMenu();

    var cardEl = t.closest('[data-game]');
    if (cardEl) go(cardEl.getAttribute('data-game'));
  });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') { closeMenu(); return; }
    var n = parseInt(e.key, 10);
    if (!isNaN(n) && n >= 1 && n <= state.games.length) go(state.games[n - 1].id);
  });

  ui.frame.addEventListener('load', function () {
    var src = ui.frame.getAttribute('src') || '';
    if (!src || src === 'about:blank') return;
    clearTimeout(state.timer);
    ui.loading.classList.add('is-done');
    /* 把键盘焦点交给游戏：街舞要用方向键，不这样做得先点一下画面 */
    try { ui.frame.focus(); } catch (e) {}
  });

  window.addEventListener('hashchange', route);

  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, syncFsButton);
  });

  /* ---------------------------------------------------------
     启动
     --------------------------------------------------------- */

  function showError(err) {
    ui.boot.hidden = true;
    ui.error.hidden = false;
    ui.error.textContent = '';

    var b = document.createElement('b');
    b.textContent = '读不到游戏清单（games.json）';

    var p1 = document.createElement('p');
    p1.textContent = '这个页面必须通过网址访问，直接双击 index.html 是不行的——浏览器出于安全原因，不允许本地文件去读旁边的 games.json。';
    p1.appendChild(document.createElement('br'));
    p1.appendChild(document.createTextNode('本地预览：双击同目录下的「预览.cmd」。线上的话直接用 Cloudflare 给你的网址。'));

    var p2 = document.createElement('p');
    var code = document.createElement('code');
    code.textContent = String((err && err.message) || err);
    p2.appendChild(code);

    ui.error.appendChild(b);
    ui.error.appendChild(p1);
    ui.error.appendChild(p2);
  }

  load().then(function (data) {
    state.site = (data && data.site) || {};
    state.games = ((data && data.games) || []).filter(function (x) {
      return x && x.id && x.url;
    });

    var taglines = document.querySelectorAll('[data-tagline]');
    for (var i = 0; i < taglines.length; i++) {
      taglines[i].textContent = state.site.tagline || '';
    }

    ui.boot.hidden = true;
    renderNav();
    renderCards();
    syncFsButton();
    route();
  }).catch(showError);

})();