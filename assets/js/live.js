// /live — projector/TV mode. ES module (loaded with type="module").
// window.SOCIAL_CONFIG and window.SocialData are set by the two regular
// <script> tags loaded before this one in live.html.
(function () {
  'use strict';
  var C = window.SOCIAL_CONFIG || {};
  var D = window.SocialData;
  var PREVIEW = !D.configured();

  var stage = document.getElementById('stage');
  var emptyEl = document.getElementById('live-empty');

  var SLIDE_MS = 7000;
  var REFRESH_MS = 20000; // polling fallback if realtime isn't available

  var ICONS = {
    instagram: '<svg viewBox="0 0 24 24"><path d="M12 2c2.7 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.42.06 4.13s-.01 3.07-.06 4.13c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.42.06-4.12.06s-3.07-.01-4.13-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.07 2 14.71 2 12s.01-3.07.06-4.13c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.44 2.53c.64-.25 1.37-.42 2.43-.47C8.93 2.01 9.29 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M16.6 5.1c-.9-.6-1.5-1.6-1.6-2.7h-3v13.1a2.6 2.6 0 1 1-1.8-2.5V9.8a5.6 5.6 0 1 0 4.8 5.5V9.4a6.9 6.9 0 0 0 4 1.3V7.6c-.9 0-1.7-.3-2.4-.8-.3-.2-.7-.5-1-1.7z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M13.5 21v-7.7h2.6l.4-3h-3V8.3c0-.9.2-1.5 1.5-1.5h1.6V4.1C15.9 4 15 4 14 4c-2.5 0-4.2 1.5-4.2 4.3v2h-2.6v3h2.6V21z"/></svg>',
    other: '<svg viewBox="0 0 24 24"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3-3a3 3 0 0 1 4.2 4.2l-1.5 1.5a1 1 0 1 1-1.4-1.4l1.5-1.5a1 1 0 0 0-1.4-1.4l-3 3a1 1 0 0 1-1.4 0zm2.8-2.8a1 1 0 0 1 0 1.4l-3 3a3 3 0 0 1-4.2-4.2l1.5-1.5a1 1 0 1 1 1.4 1.4l-1.5 1.5a1 1 0 0 0 1.4 1.4l3-3a1 1 0 0 1 1.4 0z"/></svg>'
  };

  var EDITORIAL = [
    'เมาได้ ✦ แต่ห้ามขับ',
    'หลักฐานว่าเราสนุกกันจริงๆ',
    'ใครอยู่ในรูปนี้แล้วจำไม่ได้ — ยินดีด้วย คุณได้ครบสูตร',
    '#JFLoveAtFirstDrink'
  ];

  var MOCK = [
    { id: 'm1', platform: 'instagram', username: '@pang.pn', caption: 'บาร์เปิดตั้งแต่ 6 โมง งานเลิกตี 2', media_type: 'image', thumbnail_url: '', is_pinned: true },
    { id: 'm2', platform: 'tiktok', username: '@boss.rrw', caption: 'พี่เจ้าบ่าวเต้นท่านี้ทั้งคืน', media_type: 'video', thumbnail_url: '' },
    { id: 'm3', platform: 'facebook', username: 'Fon Suphakan', caption: 'ขอบคุณสำหรับงานที่สนุกมากกก', media_type: 'embed', thumbnail_url: '' }
  ];

  var pool = [];       // approved posts currently known
  var queue = [];       // built rotation (posts + editorial markers), rebuilt whenever pool changes
  var qi = 0;
  var timer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function buildQueue() {
    var pinned = pool.filter(function (p) { return p.is_pinned; });
    var rest = pool.filter(function (p) { return !p.is_pinned; });
    var q = [];
    var ei = 0, pi = 0;
    for (var i = 0; i < rest.length; i++) {
      q.push({ type: 'post', post: rest[i] });
      if ((i + 1) % 5 === 0 && pinned.length) {
        q.push({ type: 'post', post: pinned[pi % pinned.length] });
        pi++;
      }
      if ((i + 1) % 4 === 0) {
        q.push({ type: 'text', text: EDITORIAL[ei % EDITORIAL.length] });
        ei++;
      }
    }
    if (!q.length && pinned.length) {
      pinned.forEach(function (p) { q.push({ type: 'post', post: p }); });
    }
    queue = q;
    qi = 0;
  }

  function slideHtml(item) {
    if (item.type === 'text') {
      return '<div class="live__slide"><div class="live__text"><p>' + esc(item.text) + '</p></div></div>';
    }
    var post = item.post;
    var img = post.thumbnail_url || post.media_url;
    var media = img
      ? '<div class="live__card"><img src="' + esc(img) + '" alt=""></div>'
      : '<div class="live__linkcard" data-platform="' + esc(post.platform) + '">' +
        (ICONS[post.platform] || ICONS.other) +
        '<b>VIEW ON ' + esc((post.platform || 'other').toUpperCase()) + '</b></div>';
    var metaBits = [];
    if (post.username) metaBits.push('<b>' + esc(post.username) + '</b>');
    if (post.caption) metaBits.push('<span>' + esc(post.caption) + '</span>');
    return (
      '<div class="live__slide"><div style="position:relative">' +
      media +
      (metaBits.length ? '<div class="live__meta">' + metaBits.join('') + '</div>' : '') +
      '</div></div>'
    );
  }

  function showNext() {
    if (!queue.length) { emptyEl.hidden = false; stage.innerHTML = ''; return; }
    emptyEl.hidden = true;
    var item = queue[qi % queue.length];
    qi++;
    var el = document.createElement('div');
    el.innerHTML = slideHtml(item);
    var slide = el.firstChild;
    stage.appendChild(slide);
    // next frame -> trigger transition in
    requestAnimationFrame(function () { requestAnimationFrame(function () { slide.classList.add('is-active'); }); });

    // clean up previous slides after they've faded
    var prev = Array.prototype.slice.call(stage.children).slice(0, -1);
    prev.forEach(function (p) { p.classList.remove('is-active'); });
    setTimeout(function () {
      prev.forEach(function (p) { if (p.parentNode) p.parentNode.removeChild(p); });
    }, 1300);
  }

  function tick() {
    showNext();
    timer = setTimeout(tick, SLIDE_MS);
  }

  function refreshPool() {
    if (PREVIEW) { pool = MOCK; buildQueue(); return Promise.resolve(); }
    return D.fetchApproved({ limit: 120 }).then(function (posts) {
      pool = posts || [];
      buildQueue();
    }).catch(function (err) { console.warn('[live] failed to refresh posts', err); });
  }

  function startPolling() {
    setInterval(refreshPool, REFRESH_MS);
  }

  function startRealtime() {
    // Best-effort: subscribe via supabase-js so new approvals appear without polling.
    // Falls back silently to polling if the import or connection fails.
    import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(function (mod) {
        var client = mod.createClient(C.supabaseUrl, C.supabaseAnonKey);
        client
          .channel('social_posts_live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, function () {
            refreshPool();
          })
          .subscribe();
      })
      .catch(function (err) {
        console.warn('[live] realtime unavailable, falling back to polling', err);
        startPolling();
      });
  }

  refreshPool().then(function () {
    tick();
    if (!PREVIEW) startRealtime();
    else startPolling(); // harmless no-op refresh loop in preview mode
  });
})();
