(function () {
  'use strict';
  var C = window.WEDDING_CONFIG || {};
  var html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var lang = 'th';

  /* ---------- language ---------- */
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'th';
    html.setAttribute('data-lang', lang);
    html.lang = lang;
    $$('[data-setlang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setlang === lang)); });
    $$('img[data-alt-th]').forEach(function (i) { i.alt = i.getAttribute('data-alt-' + lang) || ''; });
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }
  var q = new URLSearchParams(location.search).get('lang'), saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) {}
  setLang(q || saved || 'th');
  $$('[data-setlang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.setlang); }); });

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

  /* ---------- gauge: needle swings up when it scrolls into view ---------- */
  var gw = $('#gwrap'), needle = $('#needle');
  function startWobble() { if (needle) needle.classList.add('wobble'); }
  if (gw && 'IntersectionObserver' in window) {
    var gio = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) {
        gw.classList.add('is-in'); gio.disconnect();
        setTimeout(startWobble, 2100);
      }
    }, { threshold: 0.35 });
    gio.observe(gw);
  } else if (gw) { gw.classList.add('is-in'); startWobble(); }

  /* ---------- link to map ---------- */
  if (C.mapUrl) $$('[data-map]').forEach(function (a) { a.href = C.mapUrl; });

  /* ---------- add to calendar (.ics) ---------- */
  function esc(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function downloadIcs() {
    var ev = C.event || {};
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tanawit and Kawisara//Love AT FIRST DRINK//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:love-at-first-drink-20261226@tanawit-kawisara', 'DTSTAMP:' + stamp,
      'DTSTART:' + ev.startUtc, 'DTEND:' + ev.endUtc,
      'SUMMARY:' + esc(ev.title), 'LOCATION:' + esc(ev.location), 'DESCRIPTION:' + esc(ev.description),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc('Tomorrow: ' + ev.title + '. Book your ride home!'), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'love-at-first-drink.ics';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $$('[data-ics]').forEach(function (b) { b.addEventListener('click', downloadIcs); });

  /* ---------- RSVP form ---------- */
  var form = $('#rsvp-form');
  if (!form) return;
  var done = $('#done'), status = $('#status'), receipt = $('#receipt');
  var nameEl = $('#f-name'), errName = $('#e-name');
  var guests = $('#f-guests'), ready = $('#f-ready'), rl = $('#f-rl');
  var yesBlock = $('[data-yes]', form);

  // stepper
  $$('[data-step]', form).forEach(function (b) {
    b.addEventListener('click', function () {
      var n = Math.min(6, Math.max(1, (parseInt(guests.textContent, 10) || 1) + parseInt(b.dataset.step, 10)));
      guests.textContent = n;
    });
  });

  // readiness label follows the slider
  function readyLabel(v) { return v < 25 ? 'SOBER' : v < 50 ? 'TIPSY' : v < 80 ? 'WASTED' : 'LEGEND'; }
  function syncReady() { rl.textContent = readyLabel(+ready.value); }
  ready.addEventListener('input', syncReady); syncReady();

  // hide drink/seat/ride questions when the guest can't come
  function attend() { return (form.elements.attend.value || 'yes'); }
  function syncAttend() { yesBlock.hidden = attend() === 'no'; }
  $$('input[name=attend]', form).forEach(function (r) { r.addEventListener('change', syncAttend); });
  syncAttend();

  nameEl.addEventListener('input', function () {
    if (nameEl.value.trim()) { nameEl.removeAttribute('aria-invalid'); errName.hidden = true; }
  });

  function msg(th, en) { return lang === 'en' ? en : th; }
  function showStatus(t) { status.textContent = t; status.hidden = !t; }

  function showDone(state, preview) {
    done.dataset.state = state;
    $('#preview-note').hidden = !preview;
    form.hidden = true; done.hidden = false; receipt.classList.add('is-done');
    done.focus({ preventScroll: true });
    receipt.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#again').addEventListener('click', function () {
    done.hidden = true; form.hidden = false; receipt.classList.remove('is-done'); showStatus(''); nameEl.focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showStatus('');
    if (form.elements.website.value) { showDone(attend(), false); return; } // honeypot: bots see "success", nothing is sent
    var name = nameEl.value.trim();
    if (!name) {
      nameEl.setAttribute('aria-invalid', 'true'); errName.hidden = false; nameEl.focus(); return;
    }
    var yes = attend() === 'yes';
    var f = form.elements;
    var data = {
      submittedAt: new Date().toISOString(),
      attend: attend(),
      name: name,
      contact: f.contact.value.trim(),
      drink: yes ? f.drink.value : '',
      guests: yes ? parseInt(guests.textContent, 10) || 1 : 0,
      dietary: yes ? f.dietary.value.trim() : '',
      ride: yes ? (f.ride.value || '') : '',
      readiness: yes ? readyLabel(+ready.value) : '',
      message: f.message.value.trim(),
      lang: lang
    };

    if (!C.rsvpEndpoint) { // preview mode: no backend configured yet
      if (window.console) console.warn('[RSVP] rsvpEndpoint is empty in assets/js/config.js. Nothing was saved.', data);
      showDone(data.attend, true); return;
    }

    var btn = $('.btn--submit', form); btn.disabled = true;
    showStatus(msg('กำลังส่ง…', 'Sending…'));
    fetch(C.rsvpEndpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) })
      .then(function () { showStatus(''); showDone(data.attend, false); })
      .catch(function () { showStatus(msg('ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ (หรือทักคู่บ่าวสาวโดยตรง)', 'Could not send. Please try again (or message the couple directly).')); })
      .then(function () { btn.disabled = false; });
  });
})();
