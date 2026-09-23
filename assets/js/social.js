(function () {
  'use strict';
  var C = window.SOCIAL_CONFIG || {};
  var D = window.SocialData;
  var PREVIEW = !D.configured();

  var wallEl = document.getElementById('wall');
  var emptyEl = document.getElementById('empty');
  var moreWrap = document.getElementById('more-wrap');
  var loadMoreBtn = document.getElementById('load-more');
  var filtersEl = document.getElementById('filters');

  var PAGE = 24;
  var offset = 0;
  var activePlatform = '';
  var allLoaded = [];

  // ---------------------------------------------------------------
  // preview-mode sample data, so the page looks right before Supabase
  // credentials are wired in (assets/js/social-config.js is empty)
  // ---------------------------------------------------------------
  var MOCK = [
    { id: 'm1', platform: 'instagram', username: '@pang.pn', caption: 'บาร์เปิดตั้งแต่ 6 โมง งานเลิกตี 2 ทำเลขคณิตเอาเองนะ', media_type: 'image', thumbnail_url: '', is_pinned: true, created_at: new Date().toISOString() },
    { id: 'm2', platform: 'tiktok', username: '@boss.rrw', caption: 'พี่เจ้าบ่าวเต้นท่านี้ทั้งคืน', media_type: 'video', thumbnail_url: '', is_pinned: false, created_at: new Date().toISOString() },
    { id: 'm3', platform: 'facebook', username: 'Fon Suphakan', caption: 'ขอบคุณสำหรับงานที่สนุกมากกก', media_type: 'embed', thumbnail_url: '', is_pinned: false, created_at: new Date().toISOString() },
    { id: 'm4', platform: 'instagram', username: '@kwang_kk', caption: '', media_type: 'image', thumbnail_url: '', is_pinned: false, created_at: new Date().toISOString() },
    { id: 'm5', platform: 'other', username: '', caption: 'ใครถ่ายคลิปตอนโยนดอกไม้ไว้บ้าง ส่งมาเลย!!', media_type: 'embed', thumbnail_url: '', is_pinned: false, created_at: new Date().toISOString() },
    { id: 'm6', platform: 'tiktok', username: '@nueng.tk', caption: 'GRWM ไปงานแต่งเพื่อน', media_type: 'video', thumbnail_url: '', is_pinned: false, created_at: new Date().toISOString() }
  ];

  var EDITORIAL = [
    'ใครถือแก้วเปล่ามาถ่ายรูป กรุณาไปเติมก่อน',
    'มีคนร้องไห้ตอนกล่าวคำสาบาน แล้วก็มีคนร้องไห้ตอนเทควิลาหมด — ยังไม่ชัวร์ว่าใครร้องเพราะอะไร',
    'เมาได้ ✦ แต่ห้ามขับ',
    'หลักฐานว่าเรามันสนุกกันจริงๆ อยู่ตรงนี้ทั้งหมด',
    'ถ้าคุณอยู่ในรูปนี้แล้วจำไม่ได้ว่าถ่ายตอนไหน — ยินดีด้วย คุณได้ครบสูตร'
  ];

  var ICONS = {
    instagram: '<svg viewBox="0 0 24 24"><path d="M12 2c2.7 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.42.06 4.13s-.01 3.07-.06 4.13c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.42.06-4.12.06s-3.07-.01-4.13-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.07 2 14.71 2 12s.01-3.07.06-4.13c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.44 2.53c.64-.25 1.37-.42 2.43-.47C8.93 2.01 9.29 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M16.6 5.1c-.9-.6-1.5-1.6-1.6-2.7h-3v13.1a2.6 2.6 0 1 1-1.8-2.5V9.8a5.6 5.6 0 1 0 4.8 5.5V9.4a6.9 6.9 0 0 0 4 1.3V7.6c-.9 0-1.7-.3-2.4-.8-.3-.2-.7-.5-1-1.7z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M13.5 21v-7.7h2.6l.4-3h-3V8.3c0-.9.2-1.5 1.5-1.5h1.6V4.1C15.9 4 15 4 14 4c-2.5 0-4.2 1.5-4.2 4.3v2h-2.6v3h2.6V21z"/></svg>',
    other: '<svg viewBox="0 0 24 24"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3-3a3 3 0 0 1 4.2 4.2l-1.5 1.5a1 1 0 1 1-1.4-1.4l1.5-1.5a1 1 0 0 0-1.4-1.4l-3 3a1 1 0 0 1-1.4 0zm2.8-2.8a1 1 0 0 1 0 1.4l-3 3a3 3 0 0 1-4.2-4.2l1.5-1.5a1 1 0 1 1 1.4 1.4l-1.5 1.5a1 1 0 0 0 1.4 1.4l3-3a1 1 0 0 1 1.4 0z"/></svg>'
  };
  var PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sizeClass(post, i) {
    if (post.is_pinned) return 'wcard--pin';
    if (i % 7 === 3) return 'wcard--wide';
    if (i % 5 === 2) return 'wcard--tall';
    return '';
  }

  function cardHtml(post, i) {
    var size = sizeClass(post, i);
    var img = post.thumbnail_url || post.media_url;
    var mediaHtml = img
      ? '<div class="wcard__media"><img src="' + esc(img) + '" alt="" loading="lazy"></div>'
      : '<div class="wcard__media wcard__media--link"><div class="wcard__linktxt">' +
        (ICONS[post.platform] || ICONS.other) +
        '<br>VIEW ON ' + esc((post.platform || 'other').toUpperCase()) +
        '<small>แตะเพื่อดูโพสต์จริง ↗</small></div></div>';

    return (
      '<article class="wcard ' + size + '" data-platform="' + esc(post.platform) + '">' +
      mediaHtml +
      '<span class="wcard__badge">' + (ICONS[post.platform] || ICONS.other) + '</span>' +
      (post.is_pinned ? '<span class="wcard__pin">PINNED</span>' : '') +
      (post.media_type === 'video' ? '<span class="wcard__play">' + PLAY + '</span>' : '') +
      '<div class="wcard__meta">' +
      (post.username ? '<p class="wcard__u">' + esc(post.username) + '</p>' : '') +
      (post.caption ? '<p class="wcard__cap">' + esc(post.caption) + '</p>' : '') +
      '<a class="wcard__go" href="' + esc(post.original_url || '#') + '" target="_blank" rel="noopener">View Original ↗</a>' +
      '</div></article>'
    );
  }

  function editorialHtml(i) {
    var alt = i % 3 === 1 ? 'alt' : i % 3 === 2 ? 'alt2' : '';
    var txt = EDITORIAL[Math.floor(i / 6) % EDITORIAL.length];
    return '<div class="wcard wcard--text ' + alt + '"><p>' + esc(txt) + '</p></div>';
  }

  function render(posts, append) {
    var html = '';
    var editorialEvery = 6;
    for (var i = 0; i < posts.length; i++) {
      var globalIdx = offset - posts.length + i;
      if (globalIdx > 0 && globalIdx % editorialEvery === 0) html += editorialHtml(globalIdx);
      html += cardHtml(posts[i], globalIdx);
    }
    if (append) wallEl.insertAdjacentHTML('beforeend', html);
    else wallEl.innerHTML = html;
  }

  // tap-to-reveal on touch devices (hover doesn't exist there)
  wallEl.addEventListener('click', function (e) {
    var card = e.target.closest('.wcard');
    if (!card || card.classList.contains('wcard--text')) return;
    if (e.target.closest('a')) return; // let the real link through
    if (!card.classList.contains('is-open')) {
      e.preventDefault();
      document.querySelectorAll('.wcard.is-open').forEach(function (c) { c.classList.remove('is-open'); });
      card.classList.add('is-open');
    }
  });

  function load(reset) {
    if (reset) { offset = 0; allLoaded = []; }
    var opts = { platform: activePlatform || null, limit: PAGE, offset: offset };

    var p = PREVIEW
      ? Promise.resolve(activePlatform ? MOCK.filter(function (m) { return m.platform === activePlatform; }) : MOCK)
      : D.fetchApproved(opts);

    p.then(function (posts) {
      posts = posts || [];
      offset += posts.length;
      allLoaded = allLoaded.concat(posts);
      render(posts, !reset);
      emptyEl.hidden = allLoaded.length > 0;
      moreWrap.hidden = PREVIEW || posts.length < PAGE;
    }).catch(function (err) {
      console.warn('[social] failed to load posts', err);
      emptyEl.hidden = allLoaded.length > 0;
    });
  }

  filtersEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-f]');
    if (!btn) return;
    filtersEl.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-on'); });
    btn.classList.add('is-on');
    activePlatform = btn.getAttribute('data-f');
    load(true);
  });

  loadMoreBtn.addEventListener('click', function () { load(false); });

  // ---------------------------------------------------------------
  // bottom sheet: manual submission
  // ---------------------------------------------------------------
  var scrim = document.getElementById('scrim');
  var sheet = document.getElementById('sheet');
  var formWrap = document.getElementById('sheet-form-wrap');
  var doneWrap = document.getElementById('sheet-done');
  var form = document.getElementById('sheet-form');
  var statusEl = document.getElementById('sheet-status');

  function openSheet() {
    formWrap.hidden = false; doneWrap.hidden = true;
    scrim.classList.add('show'); sheet.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    scrim.classList.remove('show'); sheet.classList.remove('show');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-open-sheet]').forEach(function (b) { b.addEventListener('click', openSheet); });
  document.getElementById('sheet-close').addEventListener('click', closeSheet);
  scrim.addEventListener('click', closeSheet);
  document.getElementById('sheet-done-close').addEventListener('click', closeSheet);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var data = {
      platform: fd.get('platform'),
      original_url: (fd.get('url') || '').trim(),
      username: (fd.get('username') || '').trim(),
      caption: (fd.get('caption') || '').trim(),
      thumbnail_url: (fd.get('thumbnail') || '').trim()
    };
    if (!/^https?:\/\//i.test(data.original_url)) {
      statusEl.hidden = false; statusEl.className = 'sheet__status err';
      statusEl.textContent = 'ใส่ลิงก์ให้ถูกต้อง (ขึ้นต้นด้วย https://)';
      return;
    }
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    statusEl.hidden = true;

    if (PREVIEW) {
      if (window.console) console.warn('[social] preview mode — submission not saved', data);
      setTimeout(function () { btn.disabled = false; formWrap.hidden = true; doneWrap.hidden = false; form.reset(); }, 300);
      return;
    }

    D.submitPost(data).then(function () {
      formWrap.hidden = true; doneWrap.hidden = false; form.reset();
    }).catch(function (err) {
      console.warn('[social] submit failed', err);
      statusEl.hidden = false; statusEl.className = 'sheet__status err';
      statusEl.textContent = 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง';
    }).finally(function () { btn.disabled = false; });
  });

  load(true);
})();
