(function () {
  'use strict';
  var C = window.WEDDING_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---------- nav background on scroll ---------- */
  var nav = $('.nav');
  function onScroll() { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- reveal on scroll (with a safety net so content never stays hidden) ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else { reveals.forEach(function (el) { el.classList.add('in'); }); }
  setTimeout(function () { reveals.forEach(function (el) { el.classList.add('in'); }); }, 4000);

  /* ---------- map links ---------- */
  if (C.mapUrl) $$('[data-map]').forEach(function (a) { a.href = C.mapUrl; });
  if (C.mapUrl) $$('[data-mapnav]').forEach(function (a) { a.href = C.mapUrl; a.target = '_blank'; a.rel = 'noopener'; });

  /* ---------- add to calendar (opens Google Calendar with the event pre-filled) ---------- */
  (function () {
    var ev = C.event || {};
    if (!ev.startUtc || !ev.endUtc) return;
    var details = (ev.description || '') + (C.mapUrl ? '\nแผนที่ / Map: ' + C.mapUrl : '');
    var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(ev.title || '') +
      '&dates=' + encodeURIComponent(ev.startUtc + '/' + ev.endUtc) +
      '&details=' + encodeURIComponent(details) +
      '&location=' + encodeURIComponent(ev.location || '') +
      '&ctz=' + encodeURIComponent('Asia/Bangkok');
    $$('[data-gcal]').forEach(function (a) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; });
  })();

  /* ---------- countdown to the wedding ---------- */
  (function () {
    var ev = C.event || {};
    var box = $('#countdown');
    if (!box || !ev.startUtc) return;
    var iso = ev.startUtc.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z');
    var target = new Date(iso).getTime();
    if (isNaN(target)) return;
    var dEl = $('[data-cd="d"]', box), hEl = $('[data-cd="h"]', box),
        mEl = $('[data-cd="m"]', box), sEl = $('[data-cd="s"]', box);
    function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        box.classList.add('cdn--done');
        dEl.textContent = hEl.textContent = mEl.textContent = sEl.textContent = '00';
        return;
      }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      dEl.textContent = pad(d); hEl.textContent = pad(h); mEl.textContent = pad(m); sEl.textContent = pad(s);
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------- sticky mobile RSVP bar ----------
     Shows once the hero CTA has scrolled away; hides again while the RSVP form
     (or footer) is on screen, or after a successful submit. */
  var sticky = $('#sticky'), heroCta = $('.hero__cta'), rsvpSec = $('#rsvp'), footer = $('.ft');
  var stickyState = { hero: true, rsvp: false, foot: false, sent: false };
  function syncSticky() {
    if (!sticky) return;
    sticky.classList.toggle('show', !stickyState.hero && !stickyState.rsvp && !stickyState.foot && !stickyState.sent);
  }
  if (sticky && 'IntersectionObserver' in window) {
    var watch = function (el, key) {
      if (!el) { stickyState[key] = false; return; }
      new IntersectionObserver(function (en) { stickyState[key] = en[0].isIntersecting; syncSticky(); }).observe(el);
    };
    watch(heroCta, 'hero'); watch(rsvpSec, 'rsvp'); watch(footer, 'foot');
  }

  /* ---------- RSVP form ---------- */
  var form = $('#rsvp-form');
  if (!form) return;
  var done = $('#done'), status = $('#status'), receipt = $('#receipt');
  var nameEl = $('#f-name'), errName = $('#e-name');
  var contactEl = $('#f-contact'), errContact = $('#e-contact');
  var dietEl = $('#f-diet'), errDiet = $('#e-diet');
  var songEl = $('#f-song');
  var guests = $('#f-guests'), slider = $('#f-slider'), thumb = $('#f-thumb'), rl = $('#f-rl');
  var yesBlocks = $$('[data-yes]', form);

  function flag(input, err, bad) {
    if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    err.hidden = !bad;
  }

  // stepper (1-6)
  $$('[data-step]', form).forEach(function (b) {
    b.addEventListener('click', function () {
      var n = Math.min(6, Math.max(1, (parseInt(guests.textContent, 10) || 1) + parseInt(b.dataset.step, 10)));
      guests.textContent = n;
    });
  });

  /* ---------- Drunk-o-Meter (มาตรเมา) ----------
     The four levels (name + line of text + colour) are read from the left-hand meter in index.html,
     so the meter, the slider readout and the receipt always use the very same words.
     The slider starts UNSET: nothing is saved unless the guest actually moves / taps it. */
  var mlist = $$('#mtr-list li');
  var LEVELS = mlist.map(function (li) {
    return { n: +li.dataset.n, name: $('b', li).textContent.trim(), desc: $('small', li).textContent.trim(),
             c: li.style.getPropertyValue('--c'), t: li.style.getPropertyValue('--t') };
  });
  var pin = $('#mtr-pin'), rd = $('#f-rd'), rdesc = $('#f-rdesc'), rlsr = $('#f-rl-sr'), rclr = $('#f-rclr');
  // Custom slider (no native <input type=range>, so it looks and works the same in every browser).
  // lvl: 0 = not chosen, 1-4 = level. Tap / click / drag on the bar, or use the arrow keys.
  var lvl = 1, lastLvl = 1, drag = null; // default to level 1 selected on load
  function chosenLevel() { return lvl ? LEVELS[lvl - 1] || null : null; }
  function syncReady() {
    var L = chosenLevel();
    thumb.classList.toggle('is-unset', !L);
    rd.dataset.on = L ? '1' : '0';
    rclr.hidden = !L;
    if (L) {
      rd.style.setProperty('--c', L.c); rd.style.setProperty('--t', L.t);
      rl.textContent = L.name; rdesc.textContent = L.desc; rlsr.textContent = 'ระดับ ' + L.n + ' ' + L.name;
      slider.setAttribute('aria-valuenow', L.n); slider.setAttribute('aria-valuetext', L.name + ' · ' + L.desc);
      thumb.style.left = (12.5 + 25 * (L.n - 1)) + '%';
    } else {
      rl.textContent = '–'; rdesc.textContent = ''; rlsr.textContent = 'ยังไม่ได้เลือก';
      slider.removeAttribute('aria-valuenow'); slider.setAttribute('aria-valuetext', 'ยังไม่ได้เลือก');
      thumb.style.left = '12.5%';
    }
    if (pin) { pin.hidden = !L; if (L) pin.style.left = (12.5 + 25 * (L.n - 1)) + '%'; }
    mlist.forEach(function (li, i) { li.classList.toggle('is-on', !!L && L.n === i + 1); });
    var now = L ? L.n : 0;
    if (now && now !== lastLvl) { rd.classList.remove('pop'); void rd.offsetWidth; rd.classList.add('pop'); }
    lastLvl = now;
  }
  function setLevel(n) { n = Math.min(4, Math.max(1, n)); if (n !== lvl) { lvl = n; syncReady(); } }
  function levelAt(x) { var r = slider.getBoundingClientRect(); return Math.floor(((x - r.left) / r.width) * 4) + 1; }
  slider.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, touch: e.pointerType === 'touch', moved: false };
    try { slider.setPointerCapture(e.pointerId); } catch (err) {}
    try { slider.focus({ preventScroll: true }); } catch (err) { slider.focus(); }
    if (!drag.touch) { setLevel(levelAt(e.clientX)); e.preventDefault(); } // finger: wait, it may just be scrolling the page
  });
  slider.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.touch) { if (!drag.moved && Math.abs(e.clientX - drag.x) < 6) return; drag.moved = true; }
    setLevel(levelAt(e.clientX));
  });
  slider.addEventListener('pointerup', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.touch && !drag.moved) setLevel(levelAt(e.clientX)); // a plain tap
    drag = null;
  });
  slider.addEventListener('pointercancel', function () { drag = null; }); // the page started scrolling: nothing is chosen
  slider.addEventListener('keydown', function (e) {
    var k = e.key, n = null;
    if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageUp') n = (lvl || 0) + 1;
    else if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageDown') n = (lvl || 2) - 1;
    else if (k === 'Home') n = 1; else if (k === 'End') n = 4;
    if (n === null) return;
    e.preventDefault(); setLevel(n);
  });
  rclr.addEventListener('click', function () { lvl = 0; syncReady(); slider.focus(); });
  syncReady();

  // license plate: only relevant when the guest is bringing their own car
  var plateEl = $('#f-plate'), plateF = $('#plate-f');
  function isPrivateCar() { return /^รถส่วนตัว/.test((form.elements.ride && form.elements.ride.value) || ''); }
  function syncRide() {
    var show = isPrivateCar();
    plateF.hidden = !show;
    if (!show && plateEl.value) plateEl.value = ''; // switched away from a private-car option: drop any plate already typed
  }
  $$('input[name=ride]', form).forEach(function (r) {
    r.addEventListener('change', function () { syncRide(); if (isPrivateCar()) plateEl.focus(); });
  });
  syncRide();

  // tap a chosen drink / ride again to un-choose it (Fun Stuff is optional)
  var downAt = 0;
  $$('.opts--pick label, .opts--mk label', form).forEach(function (lb) {
    var inp = $('input', lb), was = false;
    lb.addEventListener('pointerdown', function () { was = inp.checked; downAt = Date.now(); });
    inp.addEventListener('click', function () {
      if (was && inp.checked && Date.now() - downAt < 1500) { inp.checked = false; if (inp.name === 'ride') syncRide(); }
      was = false;
    });
  });

  // attending = no  ->  hide everything that only matters to attendees
  function attend() { return form.elements.attend.value || 'yes'; }
  function syncAttend() {
    var no = attend() === 'no';
    yesBlocks.forEach(function (el) { el.hidden = no; });
    if (no) { flag(contactEl, errContact, false); flag(dietEl, errDiet, false); }
  }
  $$('input[name=attend]', form).forEach(function (r) { r.addEventListener('change', syncAttend); });
  syncAttend();

  // dietary: reveal the text field only when "มี"
  function dietYes() { return form.elements.diet.value === 'yes'; }
  function syncDiet() {
    dietEl.hidden = !dietYes();
    if (!dietYes()) flag(dietEl, errDiet, false);
  }
  $$('input[name=diet]', form).forEach(function (r) {
    r.addEventListener('change', function () { syncDiet(); if (dietYes()) dietEl.focus(); });
  });
  syncDiet();

  // clear errors as soon as the guest fixes them
  nameEl.addEventListener('input', function () { if (nameEl.value.trim()) flag(nameEl, errName, false); });
  contactEl.addEventListener('input', function () { if (contactEl.value.trim()) flag(contactEl, errContact, false); });
  dietEl.addEventListener('input', function () { if (dietEl.value.trim()) flag(dietEl, errDiet, false); });

  function showStatus(t) { status.textContent = t; status.hidden = !t; }

  /* ---------- "ใบเสร็จความพร้อม" (shown only after the answer was really saved) ---------- */
  var bill = $('#bill'), saveBtn = $('#save-bill'), saveErr = $('#save-err');
  var billBlob = null; // image is prepared in the background so "save" answers instantly (needed for the phone share sheet)
  var passLink = $('#pass-link');

  function whoLabel(name, n) {
    name = name.trim();
    if (/^[฀-๿]/.test(name) && !/^(คุณ|นาย|นาง|น\.ส\.|ดร|พี่|น้อง|ป้า|ลุง|อา|ครู|หมอ)/.test(name)) name = 'คุณ' + name;
    return name + ' × ' + n + ' คน';
  }
  function billModel(d) {
    var rows = [], L = d.readinessLevel ? LEVELS[d.readinessLevel - 1] : null;
    if (d.drink) rows.push({ k: 'แก้วประจำตัว', v: d.drink });
    if (L) rows.push({ k: 'ความพร้อมสำหรับงานนี้', v: L.name, q: '“' + L.desc + '”' });
    if (d.song) rows.push({ k: 'เพลงลุกขึ้นเต้น', v: d.song });
    if (d.ride) rows.push({ k: 'การเดินทาง', v: d.ride, q: d.plate ? 'ทะเบียน ' + d.plate : '' });
    return { who: whoLabel(d.name, d.guests), rows: rows };
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function renderBill(m) {
    $('#b-who').textContent = m.who;
    var box = $('#b-rows'); box.textContent = '';
    m.rows.forEach(function (r) {
      var row = el('div', 'bill__r');
      row.appendChild(el('span', 'bill__k', r.k)); row.appendChild(el('span', 'bill__v', r.v));
      if (r.q) row.appendChild(el('span', 'bill__q', r.q));
      box.appendChild(row);
    });
    box.hidden = !m.rows.length;
    $$('.bill__hr', bill)[1].hidden = !m.rows.length;
  }

  // --- draw the receipt onto a canvas (no external library, works offline) ---
  var C_INK = '#2E1416', C_MUT = '#80593F', C_RED = '#A6441B', C_PAPER = '#FEEBB8', C_BG = '#542C2F';
  var F_DISP = '"Bricolage Grotesque","Prompt",sans-serif', F_MONO = '"IBM Plex Mono","IBM Plex Sans Thai",monospace';
  function splitWords(t) {
    try { return Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(t)).map(function (x) { return x.segment; }); }
    catch (e) { return t.split(/(\s+)/); }
  }
  function wrapText(ctx, text, maxW) {
    var out = [], cur = '';
    function push(line) {
      // hard-break anything still wider than the box
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
  // pass H = 0 to measure, H > 0 to paint. Returns the total height.
  function layoutBill(ctx, W, m, H) {
    var M = 42, PX = 50, x0 = M + PX, x1 = W - M - PX, iw = x1 - x0, cx = W / 2, T = 9, paint = H > 0, y = M + T + 46;
    ctx.textBaseline = 'alphabetic';
    if (paint) {
      ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);
      var bottom = H - M;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 14;
      ctx.beginPath(); ctx.moveTo(M, M + T);
      for (var x = M; x < W - M; x += 18) { ctx.lineTo(x + 9, M); ctx.lineTo(x + 18, M + T); }
      ctx.lineTo(W - M, bottom - T);
      for (x = W - M; x > M; x -= 18) { ctx.lineTo(x - 9, bottom); ctx.lineTo(x - 18, bottom - T); }
      ctx.closePath(); ctx.fillStyle = C_PAPER; ctx.fill(); ctx.restore();
    }
    function text(str, x, yy, font, color, align) { if (!paint) return; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.fillText(str, x, yy); }
    function rule(yy, dash, color, w) {
      if (!paint) return; ctx.save(); ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); ctx.restore();
    }
    // header (same as the on-page receipt)
    text('UNDERCLOUD VENUE', cx, y, '800 38px ' + F_DISP, C_INK, 'center'); y += 32;
    text('TAB #261226 · 26/12/2026 · 18:00', cx, y, '400 19px ' + F_MONO, C_MUT, 'center'); y += 26;
    rule(y, [11, 8], C_INK, 2.5); y += 62;
    // title
    ctx.font = '800 50px ' + F_DISP;
    var t1 = 'YOUR TAB IS OPEN ', t2 = '✓', w1 = ctx.measureText(t1).width, w2 = ctx.measureText(t2).width, sx = cx - (w1 + w2) / 2;
    text(t1, sx, y, '800 50px ' + F_DISP, C_INK, 'left'); text(t2, sx + w1, y, '800 50px ' + F_DISP, C_RED, 'left'); y += 20;
    // who
    ctx.font = '700 26px ' + F_MONO;
    wrapText(ctx, m.who, iw).forEach(function (ln) { y += 38; text(ln, cx, y, '700 26px ' + F_MONO, C_INK, 'center'); });
    y += 26; rule(y, [11, 8], C_INK, 2.5); y += 8;
    // rows
    m.rows.forEach(function (r) {
      y += 14;
      ctx.font = '400 21px ' + F_MONO; var kw = ctx.measureText(r.k).width;
      ctx.font = '700 25px ' + F_MONO; var vw = ctx.measureText(r.v).width;
      if (kw + 22 + vw <= iw) { y += 32; text(r.k, x0, y, '400 21px ' + F_MONO, C_MUT, 'left'); text(r.v, x1, y, '700 25px ' + F_MONO, C_INK, 'right'); }
      else {
        y += 30; text(r.k, x0, y, '400 21px ' + F_MONO, C_MUT, 'left');
        ctx.font = '700 25px ' + F_MONO; wrapText(ctx, r.v, iw).forEach(function (ln) { y += 36; text(ln, x1, y, '700 25px ' + F_MONO, C_INK, 'right'); });
      }
      if (r.q) { ctx.font = 'italic 600 21px ' + F_MONO; wrapText(ctx, r.q, iw).forEach(function (ln) { y += 32; text(ln, x1, y, 'italic 600 21px ' + F_MONO, C_RED, 'right'); }); }
      y += 14; rule(y, [2, 6], 'rgba(46,20,22,.4)', 2);
    });
    if (m.rows.length) { y += 6; rule(y, [11, 8], C_INK, 2.5); }
    y += 6;
    // total
    var lbl = 'ยอดรวม:', tot = 'แล้วเจอกัน 26 ธ.ค. ♡';
    ctx.font = '800 29px ' + F_DISP; var lw = ctx.measureText(lbl).width, tw = ctx.measureText(tot).width;
    if (lw + 20 + tw <= iw) { y += 46; text(lbl, x0, y, '800 29px ' + F_DISP, C_INK, 'left'); text(tot, x1, y, '800 29px ' + F_DISP, C_RED, 'right'); }
    else { y += 46; text(lbl, x0, y, '800 29px ' + F_DISP, C_INK, 'left'); y += 42; text(tot, x1, y, '800 29px ' + F_DISP, C_RED, 'right'); }
    y += 26; rule(y, [11, 8], C_INK, 2.5);
    // stamp
    y += 92;
    if (paint) {
      ctx.save(); ctx.translate(cx, y); ctx.rotate(-8 * Math.PI / 180);
      ctx.font = '800 34px ' + F_DISP; var sw = Math.max(ctx.measureText('PAID IN').width, ctx.measureText('LAUGHTER').width) + 34;
      ctx.globalAlpha = .85; ctx.strokeStyle = C_RED; ctx.lineWidth = 5; ctx.strokeRect(-sw / 2, -50, sw, 100);
      ctx.fillStyle = C_RED; ctx.textAlign = 'center'; ctx.fillText('PAID IN', 0, -8); ctx.fillText('LAUGHTER', 0, 32); ctx.restore();
    }
    y += 88;
    text('*** THANK YOU FOR CELEBRATING (LOUDLY) ***', cx, y, '400 16px ' + F_MONO, C_MUT, 'center');
    y += 34 + T;
    return y + M;
  }
  function loadFonts(m) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var sample = m.who + m.rows.map(function (r) { return r.k + r.v + (r.q || ''); }).join('') + 'ยอดรวม:แล้วเจอกัน 26 ธ.ค. ♡YOUR TAB IS OPEN UNDERCLOUD VENUE THANK YOU FOR CELEBRATING LOUDLY PAID IN LAUGHTER 0123456789';
    return Promise.all([
      '800 40px "Bricolage Grotesque"', '800 40px "Prompt"', '400 20px "IBM Plex Mono"', '700 20px "IBM Plex Mono"', '600 20px "IBM Plex Mono"',
      '400 20px "IBM Plex Sans Thai"', '600 20px "IBM Plex Sans Thai"', '700 20px "IBM Plex Sans Thai"'
    ].map(function (f) { return document.fonts.load(f, sample).catch(function () { return null; }); }));
  }
  function makeBillBlob(m) {
    return loadFonts(m).then(function () {
      var W = 750, S = 2, meas = document.createElement('canvas').getContext('2d');
      var H = Math.ceil(layoutBill(meas, W, m, 0));
      var cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
      var ctx = cv.getContext('2d'); ctx.scale(S, S); layoutBill(ctx, W, m, H);
      return new Promise(function (res, rej) { cv.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob')); }, 'image/png'); });
    });
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }
  var FILE = 'love-at-first-drink-tab.png';
  saveBtn.addEventListener('click', function () {
    if (!billBlob) return;
    saveErr.hidden = true;
    saveBtn.disabled = true;
    billBlob.then(function (blob) {
      var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches, file = null;
      try { file = new File([blob], FILE, { type: 'image/png' }); } catch (e) {}
      if (coarse && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file] }).catch(function (e) { if (!e || e.name !== 'AbortError') downloadBlob(blob, FILE); });
      }
      downloadBlob(blob, FILE);
    }).catch(function () {
      saveErr.textContent = 'เซฟภาพไม่สำเร็จ ลองใหม่อีกครั้งนะ'; saveErr.hidden = false;
    }).then(function () { saveBtn.disabled = false; });
  });

  // fallback registration code for the Guest Pass page — only used in preview mode (no rsvpEndpoint
  // configured yet), since there's no backend to hand back a real arrival order in that case.
  function fallbackCode(d) {
    var s = (d.name || '') + '|' + (d.submissionId || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 'JF-' + ((h % 9000) + 1000);
  }
  // real registration order: the Apps Script Web App hands back `runNumber` (row position in the
  // Sheet at the time it saved), which we store on d.runNumber right after a successful submit —
  // this is what makes the Guest Pass number a true sequential arrival order once a Sheet is connected.
  function passCode(d) {
    return d.runNumber ? 'JF-' + String(d.runNumber).padStart(4, '0') : fallbackCode(d);
  }
  function buildPassUrl(d) {
    var L = d.readinessLevel ? LEVELS[d.readinessLevel - 1] : LEVELS[0];
    var q = new URLSearchParams({
      name: d.name || '', code: passCode(d), lv: L ? L.n : 1,
      drink: d.drink || '', song: d.song || ''
    });
    return 'pass.html?' + q.toString();
  }

  function showDone(state, preview, model, data) {
    done.dataset.state = state;
    $('#preview-note').hidden = !preview;
    saveErr.hidden = true;
    var hasBill = state === 'yes' && !!model;
    bill.hidden = !hasBill; saveBtn.hidden = !hasBill;
    passLink.hidden = !hasBill;
    if (hasBill) passLink.href = buildPassUrl(data);
    billBlob = null;
    if (hasBill) {
      renderBill(model);
      billBlob = makeBillBlob(model); billBlob.catch(function () {}); // prepare now; the click handler reports any failure
    }
    form.hidden = true; done.hidden = false; receipt.classList.add('is-done');
    stickyState.sent = true; syncSticky();
    done.focus({ preventScroll: true });
    receipt.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#again').addEventListener('click', function () {
    done.hidden = true; form.hidden = false; receipt.classList.remove('is-done'); showStatus('');
    stickyState.sent = false; syncSticky(); nameEl.focus();
  });

  function validate() {
    var yes = attend() === 'yes', bad = [];
    var n = !nameEl.value.trim(); flag(nameEl, errName, n); if (n) bad.push(nameEl);
    var c = yes && !contactEl.value.trim(); flag(contactEl, errContact, c); if (c) bad.push(contactEl);
    var d = yes && dietYes() && !dietEl.value.trim(); flag(dietEl, errDiet, d); if (d) bad.push(dietEl);
    if (bad.length) { bad[0].focus(); bad[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return !bad.length;
  }

  // one id per attempt series, so pressing "send" again after a failure can never create a duplicate row
  var sid = null;
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showStatus('');
    if (form.elements.website.value) { showDone(attend(), false, null); return; } // honeypot: bots see "success", nothing is sent
    if (!validate()) return;

    var yes = attend() === 'yes';
    var f = form.elements, L = yes ? chosenLevel() : null;
    sid = sid || newId();
    var data = {
      submissionId: sid,
      submittedAt: new Date().toISOString(),
      attend: attend(),
      name: nameEl.value.trim(),
      contact: contactEl.value.trim(),
      guests: yes ? parseInt(guests.textContent, 10) || 1 : 0,
      dietary: yes ? (dietYes() ? dietEl.value.trim() : 'ไม่มี') : '',
      drink: yes ? (f.drink.value || '') : '',
      ride: yes ? (f.ride.value || '') : '',
      plate: yes && isPrivateCar() ? plateEl.value.trim() : '',
      readiness: L ? L.name : '',
      readinessLevel: L ? L.n : '',
      song: yes ? songEl.value.trim() : '',
      message: f.message.value.trim()
    };
    var model = yes ? billModel(data) : null;

    if (!C.rsvpEndpoint) { // preview mode: no backend configured yet
      if (window.console) console.warn('[RSVP] rsvpEndpoint is empty in assets/js/config.js. Nothing was saved.', data);
      if (yes) { location.href = buildPassUrl(data); return; } // straight to the Guest Pass — no on-page bill
      showDone(data.attend, true, model, data); return;
    }

    var btn = $('.btn--submit', form); btn.disabled = true;
    showStatus('กำลังส่ง…');
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
    fetch(C.rsvpEndpoint, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data), signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.text(); })
      .then(function (txt) {
        var ok = false, resJson = null;
        try { resJson = JSON.parse(txt); ok = resJson.ok === true; } catch (err) { ok = /^\s*ok\s*$/i.test(txt); }
        if (!ok) throw new Error('not saved');
        if (resJson && resJson.runNumber) data.runNumber = resJson.runNumber; // real arrival order from the Sheet, for the Guest Pass code
        sid = null; showStatus('');
        if (yes) { location.href = buildPassUrl(data); return; } // straight to the Guest Pass — no on-page bill
        showDone(data.attend, false, model, data); // "sorry to miss you" screen for non-attendees
      })
      .catch(function () {
        // answers stay in the form; pressing send again retries with the same submissionId
        showStatus('ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ (หรือทักคู่บ่าวสาวโดยตรง)');
        status.scrollIntoView({ block: 'center', behavior: 'smooth' });
      })
      .then(function () { clearTimeout(timer); btn.disabled = false; });
  });
})();
