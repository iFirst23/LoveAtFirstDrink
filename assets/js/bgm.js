/*
  Background music — plays "So This Is Love" as close to automatically as
  browsers allow. Chrome/Safari/Firefox all block audio WITH sound from
  starting until the visitor interacts with the page — no website can
  bypass that (it's what stops random sites from blasting audio on load).
  So: try an unmuted play() on load (a few browsers allow it if the
  visitor has been here before / has this site "engaged"), and if that's
  blocked, start it — with sound, from the beginning — on the very first
  tap/click/keypress anywhere on the page, no dedicated play button
  needed. The corner toggle lets a guest turn it off (or back on) any time.
*/
(function () {
  var audio = document.getElementById('bgm');
  var btn = document.getElementById('bgm-toggle');
  if (!audio || !btn) return;

  var userToggledOff = false;
  audio.volume = 0.55;

  function updateBtn() {
    var on = !audio.paused && !audio.muted;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'ปิดเสียงเพลง' : 'เปิดเสียงเพลง');
  }

  // 1) Try playing WITH sound right away. Most browsers will silently
  //    block this on a first-time visit — that's expected, not an error —
  //    and playback starts for real on the first user gesture instead (2).
  audio.play().catch(function () {});

  // 2) On the first real user gesture, (re)try an unmuted play — this is
  //    what makes it feel automatic without needing a dedicated button.
  function firstGesture() {
    if (userToggledOff || (!audio.paused && !audio.muted)) return;
    audio.muted = false;
    audio.play().catch(function () {});
    updateBtn();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
    window.addEventListener(evt, firstGesture, { once: true, passive: true });
  });

  // 3) Manual toggle button.
  btn.addEventListener('click', function () {
    if (audio.paused || audio.muted) {
      userToggledOff = false;
      audio.muted = false;
      audio.play().catch(function () {});
    } else {
      userToggledOff = true;
      audio.pause();
    }
    updateBtn();
  });

  audio.addEventListener('play', updateBtn);
  audio.addEventListener('pause', updateBtn);
  updateBtn();
})();
