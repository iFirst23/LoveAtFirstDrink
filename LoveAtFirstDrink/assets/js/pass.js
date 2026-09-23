(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  // Keep this list in sync with #mtr-list in index.html (name / desc / colours per level).
  // logo: the "Love AT FIRST DRINK" wordmark asset that reads cleanly against that level's bg.
  var LEVELS = [
    { n: 1, name: 'จิบพอเป็นพิธี', bg: '#FEE299', fg: '#2E1416', logo: 'assets/img/logo-wordmark-ink.png' },
    { n: 2, name: 'เมานิด สนิทหมด', bg: '#B3A35F', fg: '#2E1416', logo: 'assets/img/logo-wordmark-ink.png' },
    { n: 3, name: 'เมาได้ใจ', bg: '#C05A2C', fg: '#FFF0CC', logo: 'assets/img/logo-wordmark-cream.png' },
    { n: 4, name: 'จำได้ว่ามา', bg: '#DC3B44', fg: '#FFF0CC', logo: 'assets/img/logo-wordmark-cream.png' }
  ];
  var F_DISP = '"Bricolage Grotesque","Prompt",sans-serif', F_MONO = '"IBM Plex Mono","IBM Plex Sans Thai",monospace';

  function pad2(n) { n = '' + n; return n.length < 2 ? '0' + n : n; }

  var params = new URLSearchParams(location.search);
  var name = (params.get('name') || '').trim();
  var code = (params.get('code') || '').trim();
  var lvN = Math.min(4, Math.max(1, parseInt(params.get('lv'), 10) || 1));
  var drink = (params.get('drink') || '').trim() || 'เซอร์ไพรส์วันงาน';
  var song = (params.get('song') || '').trim() || 'เพลย์ลิสต์เจ้าบ่าวเจ้าสาว';
  var L = LEVELS[lvN - 1];

  var hasData = !!(name && code);
  $('#pp-has').hidden = !hasData;
  $('#pp-empty').hidden = hasData;
  if (!hasData) return;

  var model = { name: name, code: code, drink: drink, song: song, lv: L };

  // ---------- on-page card ----------
  var card = $('#pass-card');
  card.style.setProperty('--pc', L.bg);
  card.style.setProperty('--pt', L.fg);
  $('#pass-logo').src = L.logo;
  $('#pass-lv').textContent = pad2(L.n);
  $('#pass-lvname').textContent = L.name;
  $('#pass-name').textContent = name;
  $('#pass-code').textContent = code;
  $('#pass-drink').textContent = drink;
  $('#pass-song').textContent = song;

  // ---------- canvas render (used only for the saved/shared image) ----------
  function hexToRgba(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function splitWords(t) {
    try { return Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(t)).map(function (x) { return x.segment; }); }
    catch (e) { return t.split(/(\s+)/); }
  }
  function wrapText(ctx, text, maxW) {
    var out = [], cur = '';
    function push(line) {
      while (ctx.measureText(line).width > maxW && line.length > 1) {
        var k = line.length; while (k > 1 && ctx.measureText(line.slice(0, k)).width > maxW) k--;
        out.push(line.slice(0, k)); line = line.slice(k);
      }
      out.push(line);
    }
    splitWords(text).forEach(function (w) {
      var t = cur + w;
      if (!cur || ctx.measureText(t).width <= maxW) cur = t;
      else { push(cur.replace(/\s+$/, '')); cur = w.replace(/^\s+/, ''); }
    });
    if (cur) push(cur.replace(/\s+$/, ''));
    return out;
  }
  // rounded-rect path helper (border-radius has no native canvas API in every browser we support)
  function roundedRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // a small random-alpha noise tile, repeated as a fill pattern — mirrors the CSS ::after grain on the on-page card
  function makeNoisePattern(ctx) {
    var s = 96, nc = document.createElement('canvas'); nc.width = nc.height = s;
    var nctx = nc.getContext('2d'), img = nctx.createImageData(s, s), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = 128 + (Math.random() - 0.5) * 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.random() * 50;
    }
    nctx.putImageData(img, 0, 0);
    return ctx.createPattern(nc, 'repeat');
  }
  // pass H = 0 to measure, H > 0 to paint. Returns the total height.
  function layoutPass(ctx, W, m, H) {
    var M = 46, R = 26, x0 = M, x1 = W - M, iw = x1 - x0, paint = H > 0, y = M, labelC = hexToRgba(m.lv.fg, .74);
    ctx.textBaseline = 'alphabetic';
    if (paint) {
      // soft drop shadow behind the rounded card
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 46; ctx.shadowOffsetY = 22;
      roundedRectPath(ctx, 0, 0, W, H, R); ctx.fillStyle = m.lv.bg; ctx.fill();
      ctx.restore();
      // fill + a faint paper-grain texture, clipped to the rounded card
      ctx.save(); roundedRectPath(ctx, 0, 0, W, H, R); ctx.clip();
      ctx.fillStyle = m.lv.bg; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = .16; ctx.fillStyle = makeNoisePattern(ctx); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      ctx.restore();
    }
    function text(str, x, yy, font, color, align) { if (!paint) return; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.fillText(str, x, yy); }
    function rule(yy) {
      if (!paint) return;
      ctx.save(); ctx.setLineDash([9, 7]); ctx.strokeStyle = m.lv.fg; ctx.globalAlpha = .4; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); ctx.restore();
    }
    // brand: logo wordmark image (ink/cream variant chosen per level), level circle top-right
    var logoImg = m.logoImg, lw = 168, lh = (logoImg && logoImg.naturalWidth) ? Math.round(lw * (logoImg.naturalHeight / logoImg.naturalWidth)) : 108;
    if (paint && logoImg) ctx.drawImage(logoImg, x0, y, lw, lh);
    y += lh;
    var cx2 = x1 - 34, cy2 = M + 34, r = 34;
    if (paint) { ctx.save(); ctx.strokeStyle = m.lv.fg; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    text(pad2(m.lv.n), cx2, cy2 + 12, '800 32px ' + F_DISP, m.lv.fg, 'center');
    y = Math.max(y, cy2 + r) + 30;
    wrapText(ctx, m.lv.name, iw).forEach(function (ln) { text(ln, x0, y, '700 22px ' + F_MONO, m.lv.fg, 'left'); y += 28; });
    y += 6; rule(y); y += 40;
    function row(k, v) {
      text(k, x0, y, '600 15px ' + F_MONO, labelC, 'left');
      ctx.font = '800 21px ' + F_DISP;
      if (ctx.measureText(v).width <= iw) { text(v, x1, y, '800 21px ' + F_DISP, m.lv.fg, 'right'); y += 40; }
      else { y += 30; wrapText(ctx, v, iw).forEach(function (ln) { text(ln, x1, y, '800 21px ' + F_DISP, m.lv.fg, 'right'); y += 30; }); y += 10; }
    }
    row('ชื่อ', m.name);
    row('เลขที่', m.code);
    y += 4; rule(y); y += 40;
    row('เครื่องดื่มโปรด', m.drink);
    row('เพลงโปรด', m.song);
    y += 14;
    text('26 DEC 2026 · 18:00 · UNDERCLOUD', x0, y, '700 15px ' + F_MONO, labelC, 'left');
    y += M;
    return y;
  }
  function loadFonts(m) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var sample = m.name + m.code + m.drink + m.song + m.lv.name + 'Love AT FIRST DRINK ชื่อ เลขที่ เครื่องดื่มโปรด เพลงโปรด 26 DEC 2026 18:00 UNDERCLOUD 0123456789';
    return Promise.all([
      '800 32px "Bricolage Grotesque"', '800 32px "Prompt"', '600 20px "IBM Plex Mono"', '700 20px "IBM Plex Mono"',
      '400 20px "IBM Plex Sans Thai"', '600 20px "IBM Plex Sans Thai"', '700 20px "IBM Plex Sans Thai"', '800 20px "IBM Plex Sans Thai"'
    ].map(function (f) { return document.fonts.load(f, sample).catch(function () { return null; }); }));
  }
  function loadLogo(src) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { res(null); }; // missing logo shouldn't block the whole card export
      img.src = src;
    });
  }
  function makePassBlob(m) {
    return Promise.all([loadFonts(m), loadLogo(m.lv.logo)]).then(function (r) {
      m.logoImg = r[1];
      // PAD leaves room around the card for its drop shadow; the canvas stays transparent outside
      // the rounded card, so the saved PNG looks like a floating sticker rather than a hard-edged screenshot.
      var W = 640, PAD = 40, S = 2, meas = document.createElement('canvas').getContext('2d');
      var H = Math.ceil(layoutPass(meas, W, m, 0));
      var totalW = W + PAD * 2, totalH = H + PAD * 2;
      var cv = document.createElement('canvas'); cv.width = totalW * S; cv.height = totalH * S;
      var ctx = cv.getContext('2d'); ctx.scale(S, S); ctx.translate(PAD, PAD);
      layoutPass(ctx, W, m, H);
      return new Promise(function (res, rej) { cv.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob')); }, 'image/png'); });
    });
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  var FILE = 'love-at-first-drink-guest-pass.png';
  var saveBtn = $('#save-pass'), statusEl = $('#pp-status');
  var blobP = makePassBlob(model); blobP.catch(function () {}); // prepare now so "save" answers instantly

  saveBtn.addEventListener('click', function () {
    statusEl.hidden = true;
    saveBtn.disabled = true;
    blobP.then(function (blob) {
      var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches, file = null;
      try { file = new File([blob], FILE, { type: 'image/png' }); } catch (e) {}
      if (coarse && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file] }).catch(function (e) { if (!e || e.name !== 'AbortError') downloadBlob(blob, FILE); });
      }
      downloadBlob(blob, FILE);
    }).catch(function () {
      statusEl.textContent = 'เซฟภาพไม่สำเร็จ ลองใหม่อีกครั้งนะ'; statusEl.hidden = false;
    }).then(function () { saveBtn.disabled = false; });
  });
})();
