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

  /* ---------- map links ---------- */
  if (C.mapUrl) $$('[data-map]').forEach(function (a) { a.href = C.mapUrl; });
  if (C.mapUrl) $$('[data-mapnav]').forEach(function (a) { a.href = C.mapUrl; a.target = '_blank'; a.rel = 'noopener'; });

  /* ---------- parking note (shown only when provided in config.js) ---------- */
  if (C.parkingNote) {
    var pk = $('#parking'), pn = $('#parking-note');
    if (pk && pn) { pn.textContent = C.parkingNote; pk.hidden = false; }
  }

  /* ---------- add to calendar (.ics) ---------- */
  function esc(t) { return String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function downloadIcs() {
    var ev = C.event || {};
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tanawit and Kawisara//Love AT FIRST DRINK//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:love-at-first-drink-20261226@tanawit-kawisara', 'DTSTAMP:' + stamp,
      'DTSTART:' + ev.startUtc, 'DTEND:' + ev.endUtc,
      'SUMMARY:' + esc(ev.title), 'LOCATION:' + esc(ev.location), 'DESCRIPTION:' + esc(ev.description),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc('พรุ่งนี้: ' + ev.title + ' · เรียกรถกลับบ้านไว้ด้วยนะ'), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'love-at-first-drink.ics';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $$('[data-ics]').forEach(function (b) { b.addEventListener('click', downloadIcs); });

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
  var guests = $('#f-guests'), ready = $('#f-ready'), rl = $('#f-rl');
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

  // Drunk-o-Meter label follows the slider
  function readyLabel(v) { return v < 25 ? 'SOBER' : v < 50 ? 'TIPSY' : v < 80 ? 'WASTED' : 'LEGEND'; }
  function syncReady() { rl.textContent = readyLabel(+ready.value); }
  ready.addEventListener('input', syncReady); syncReady();

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

  function showDone(state, preview) {
    done.dataset.state = state;
    $('#preview-note').hidden = !preview;
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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showStatus('');
    if (form.elements.website.value) { showDone(attend(), false); return; } // honeypot: bots see "success", nothing is sent
    if (!validate()) return;

    var yes = attend() === 'yes';
    var f = form.elements;
    var data = {
      submittedAt: new Date().toISOString(),
      attend: attend(),
      name: nameEl.value.trim(),
      contact: contactEl.value.trim(),
      guests: yes ? parseInt(guests.textContent, 10) || 1 : 0,
      dietary: yes ? (dietYes() ? dietEl.value.trim() : 'ไม่มี') : '',
      drink: yes ? (f.drink.value || '') : '',
      ride: yes ? (f.ride.value || '') : '',
      readiness: yes ? readyLabel(+ready.value) : '',
      message: f.message.value.trim()
    };

    if (!C.rsvpEndpoint) { // preview mode: no backend configured yet
      if (window.console) console.warn('[RSVP] rsvpEndpoint is empty in assets/js/config.js. Nothing was saved.', data);
      showDone(data.attend, true); return;
    }

    var btn = $('.btn--submit', form); btn.disabled = true;
    showStatus('กำลังส่ง…');
    fetch(C.rsvpEndpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) })
      .then(function () { showStatus(''); showDone(data.attend, false); })
      .catch(function () { showStatus('ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ (หรือทักคู่บ่าวสาวโดยตรง)'); })
      .then(function () { btn.disabled = false; });
  });
})();
