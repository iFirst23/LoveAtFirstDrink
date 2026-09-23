/*
  Background music — plays "So This Is Love" automatically.
  Browsers block autoplay WITH sound until the visitor interacts with the
  page, so this starts muted on load (always allowed) and unmutes itself
  on the very first tap/click/keypress anywhere on the page — no need to
  find and press a dedicated play button. The corner toggle lets a guest
  turn it off (or back on) any time.
*/
(function () {
  var audio = document.getElementById('bgm');
  var btn = document.getElementById('bgm-toggle');
  if (!audio || !btn) return;

  var userToggledOff = false;

  function updateBtn() {
    var on = !audio.paused && !audio.muted;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'ปิดเสียงเพลง' : 'เปิดเสียงเพลง');
  }

  // 1) Start muted immediately — this is always allowed by autoplay policy.
  //    Retried on a couple of later lifecycle points too, since some
  //    browsers reject the very first play() call if it fires before the
  //    page has finished its initial load.
  audio.muted = true;
  audio.volume = 0.55;
  function tryMutedAutoplay() {
    if (!audio.paused) return;
    audio.muted = true;
    audio.play().catch(function () {
      /* still blocked — the interaction listeners below will start
         playback on the first real tap/click/keypress instead. */
    });
  }
  tryMutedAutoplay();
  window.addEventListener('load', tryMutedAutoplay);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') tryMutedAutoplay();
  });

  // 2) On the first real user gesture, unmute and (if not already
  //    playing) start playback — this is what makes it feel automatic.
  function firstGesture() {
    if (userToggledOff) return;
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
