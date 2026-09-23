(function () {
  'use strict';

  var loginEl = document.getElementById('login');
  var dashEl = document.getElementById('dash');
  var loginForm = document.getElementById('login-form');
  var loginErr = document.getElementById('login-err');
  var listEl = document.getElementById('list');
  var listEmpty = document.getElementById('list-empty');
  var tabsEl = document.querySelector('.adm-tabs');

  var ICONS = {
    instagram: '<svg viewBox="0 0 24 24"><path d="M12 2c2.7 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.42.06 4.13s-.01 3.07-.06 4.13c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.42.06-4.12.06s-3.07-.01-4.13-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.07 2 14.71 2 12s.01-3.07.06-4.13c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.44 2.53c.64-.25 1.37-.42 2.43-.47C8.93 2.01 9.29 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M16.6 5.1c-.9-.6-1.5-1.6-1.6-2.7h-3v13.1a2.6 2.6 0 1 1-1.8-2.5V9.8a5.6 5.6 0 1 0 4.8 5.5V9.4a6.9 6.9 0 0 0 4 1.3V7.6c-.9 0-1.7-.3-2.4-.8-.3-.2-.7-.5-1-1.7z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M13.5 21v-7.7h2.6l.4-3h-3V8.3c0-.9.2-1.5 1.5-1.5h1.6V4.1C15.9 4 15 4 14 4c-2.5 0-4.2 1.5-4.2 4.3v2h-2.6v3h2.6V21z"/></svg>',
    other: '<svg viewBox="0 0 24 24"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3-3a3 3 0 0 1 4.2 4.2l-1.5 1.5a1 1 0 1 1-1.4-1.4l1.5-1.5a1 1 0 0 0-1.4-1.4l-3 3a1 1 0 0 1-1.4 0zm2.8-2.8a1 1 0 0 1 0 1.4l-3 3a3 3 0 0 1-4.2-4.2l1.5-1.5a1 1 0 1 1 1.4 1.4l-1.5 1.5a1 1 0 0 0 1.4 1.4l3-3a1 1 0 0 1 1.4 0z"/></svg>'
  };

  var allPosts = [];
  var activeTab = 'pending';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function api(path, opts) {
    return fetch(path, Object.assign({ credentials: 'include' }, opts)).then(function (res) {
      if (res.status === 401) { showLogin('เซสชันหมดอายุ ล็อกอินใหม่อีกครั้ง'); throw new Error('unauthorized'); }
      return res.json().then(function (json) {
        if (!res.ok || json.ok === false) throw new Error(json.error || ('HTTP ' + res.status));
        return json;
      });
    });
  }

  function showLogin(err) {
    dashEl.hidden = true; loginEl.hidden = false;
    loginErr.textContent = err || '';
  }
  function showDash() {
    loginEl.hidden = true; dashEl.hidden = false;
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = document.getElementById('pw').value;
    var btn = loginForm.querySelector('button');
    btn.disabled = true; loginErr.textContent = '';
    api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
      .then(function () { showDash(); loadPosts(); })
      .catch(function () { loginErr.textContent = 'รหัสผ่านไม่ถูกต้อง'; })
      .finally(function () { btn.disabled = false; });
  });

  document.getElementById('logout').addEventListener('click', function () {
    api('/api/admin/logout', { method: 'POST' }).finally(function () { showLogin(); });
  });

  function loadPosts() {
    api('/api/admin/posts').then(function (json) {
      allPosts = json.posts || [];
      renderCounts();
      renderList();
    }).catch(function (err) {
      if (err.message !== 'unauthorized') console.warn('[admin] load failed', err);
    });
  }

  function bucketOf(p) {
    if (p.status === 'pending') return 'pending';
    if (p.status === 'rejected') return 'rejected';
    if (p.status === 'approved') return p.is_pinned ? 'pinned' : 'approved';
    return 'pending';
  }

  function renderCounts() {
    var counts = { pending: 0, approved: 0, pinned: 0, rejected: 0 };
    allPosts.forEach(function (p) {
      var b = bucketOf(p);
      counts[b] = (counts[b] || 0) + 1;
    });
    // "Published" badge = all approved posts, pinned ones included — the
    // buckets above are mutually exclusive (pinned approved posts land in
    // the 'pinned' bucket, not 'approved'), so add them back in here
    // rather than inside the loop above, which was double-counting.
    var publishedTotal = (counts.approved || 0) + (counts.pinned || 0);
    document.getElementById('c-pending').textContent = counts.pending || '';
    document.getElementById('c-approved').textContent = publishedTotal || '';
    document.getElementById('c-pinned').textContent = counts.pinned || '';
    document.getElementById('c-rejected').textContent = counts.rejected || '';
  }

  function cardHtml(p) {
    var img = p.thumbnail_url || p.media_url;
    var thumb = img
      ? '<img src="' + esc(img) + '" alt="">'
      : (ICONS[p.platform] || ICONS.other);
    var actions = [];
    if (p.status === 'pending') {
      actions.push('<button class="go" data-act="approve" data-id="' + p.id + '">✓ Approve</button>');
      actions.push('<button class="stop" data-act="reject" data-id="' + p.id + '">✕ Reject</button>');
    } else if (p.status === 'approved') {
      actions.push(p.is_pinned
        ? '<button data-act="unpin" data-id="' + p.id + '">Unpin</button>'
        : '<button class="pin" data-act="pin" data-id="' + p.id + '">📌 Pin</button>');
      actions.push('<button class="stop" data-act="unpublish" data-id="' + p.id + '">Unpublish</button>');
    } else if (p.status === 'rejected') {
      actions.push('<button class="go" data-act="approve" data-id="' + p.id + '">✓ Approve anyway</button>');
    }
    return (
      '<article class="adm-card">' +
      '<div class="adm-card__thumb">' + thumb + '</div>' +
      '<div class="adm-card__b">' +
      '<div class="adm-card__top"><span class="adm-card__plat">' + esc(p.platform) + '</span><span class="adm-card__time">' + esc(fmtTime(p.created_at)) + '</span></div>' +
      (p.username ? '<p class="adm-card__u">' + esc(p.username) + '</p>' : '') +
      (p.caption ? '<p class="adm-card__cap">' + esc(p.caption) + '</p>' : '') +
      '<a class="adm-card__link" href="' + esc(p.original_url) + '" target="_blank" rel="noopener">ดูโพสต์จริง ↗</a>' +
      '<div class="adm-card__actions">' + actions.join('') + '</div>' +
      '</div></article>'
    );
  }

  function renderList() {
    var items = allPosts.filter(function (p) { return bucketOf(p) === activeTab; });
    listEl.innerHTML = items.map(cardHtml).join('');
    listEmpty.hidden = items.length > 0;
  }

  tabsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    tabsEl.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-on'); });
    btn.classList.add('is-on');
    activeTab = btn.getAttribute('data-tab');
    renderList();
  });

  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    var action = btn.getAttribute('data-act');
    btn.disabled = true;
    api('/api/admin/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, action: action }) })
      .then(function (json) {
        var idx = allPosts.findIndex(function (p) { return p.id === id; });
        if (idx > -1 && json.post) allPosts[idx] = json.post;
        renderCounts();
        renderList();
      })
      .catch(function (err) {
        if (err.message !== 'unauthorized') alert('ทำรายการไม่สำเร็จ: ' + err.message);
        btn.disabled = false;
      });
  });

  // on load: try posts endpoint; 401 -> show login, otherwise show dashboard straight away
  api('/api/admin/posts').then(function (json) {
    allPosts = json.posts || [];
    showDash(); renderCounts(); renderList();
  }).catch(function () { showLogin(); });
})();
