(() => {
  "use strict";

  const app = document.getElementById("app");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  const statusEl = document.getElementById("status");

  const STORAGE_KEY = "fullscreen-stopwatch-state-v2";
  const DOUBLE_TAP_MS = 260;

  let state = {
    running: false,
    startedAt: null,
    accumulatedMs: 0
  };

  let frameId = null;
  let wakeLock = null;
  let singleTapTimer = null;
  let lastTapAt = 0;

  let lastShown = {
    h: "00",
    m: "00",
    s: "00"
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (
        saved &&
        typeof saved.running === "boolean" &&
        typeof saved.accumulatedMs === "number"
      ) {
        state.running = saved.running;
        state.accumulatedMs = Math.max(0, saved.accumulatedMs);
        state.startedAt =
          state.running && typeof saved.startedAt === "number"
            ? saved.startedAt
            : null;
      }
    } catch {
      // Ignore corrupted localStorage and start fresh.
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function elapsedMs(now = Date.now()) {
    if (!state.running || state.startedAt === null) {
      return state.accumulatedMs;
    }

    return state.accumulatedMs + Math.max(0, now - state.startedAt);
  }

  function formatElapsed(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      h: String(hours).padStart(2, "0"),
      m: String(minutes).padStart(2, "0"),
      s: String(seconds).padStart(2, "0")
    };
  }

  function animateIfChanged(el, oldValue, newValue) {
    if (oldValue === newValue) return;

    el.classList.remove("tick");
    void el.offsetWidth;
    el.classList.add("tick");
  }

  function render(now = Date.now()) {
    const time = formatElapsed(elapsedMs(now));

    if (hoursEl.textContent !== time.h) {
      animateIfChanged(hoursEl, lastShown.h, time.h);
      hoursEl.textContent = time.h;
    }

    if (minutesEl.textContent !== time.m) {
      animateIfChanged(minutesEl, lastShown.m, time.m);
      minutesEl.textContent = time.m;
    }

    if (secondsEl.textContent !== time.s) {
      animateIfChanged(secondsEl, lastShown.s, time.s);
      secondsEl.textContent = time.s;
    }

    lastShown = time;

    if (state.running) {
      statusEl.textContent = "1 TAP = PAUSE  ·  2 TAPS = RESTART";
      statusEl.classList.add("hidden");
    } else if (elapsedMs(now) > 0) {
      statusEl.textContent = "1 TAP = CONTINUE  ·  2 TAPS = RESTART";
      statusEl.classList.remove("hidden");
    } else {
      statusEl.textContent = "1 TAP = START  ·  2 TAPS = RESTART";
      statusEl.classList.remove("hidden");
    }
  }

  function loop() {
    render();
    frameId = requestAnimationFrame(loop);
  }

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;

    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    } catch {
      wakeLock = null;
    }
  }

  async function releaseWakeLock() {
    if (!wakeLock) return;

    try {
      await wakeLock.release();
    } catch {
      // No action needed.
    }
    wakeLock = null;
  }

  function start() {
    if (state.running) return;

    state.running = true;
    state.startedAt = Date.now();
    saveState();
    render();
    requestWakeLock();
  }

  function pause() {
    if (!state.running) return;

    state.accumulatedMs = elapsedMs();
    state.startedAt = null;
    state.running = false;
    saveState();
    render();
    releaseWakeLock();
  }

  function toggle() {
    if (state.running) {
      pause();
    } else {
      start();
    }

    flash();
  }

  function restart() {
    state.accumulatedMs = 0;
    state.startedAt = Date.now();
    state.running = true;
    saveState();
    render();
    flash();
    requestWakeLock();
  }

  function flash() {
    app.classList.remove("flash");
    void app.offsetWidth;
    app.classList.add("flash");

    window.setTimeout(() => {
      app.classList.remove("flash");
    }, 220);
  }

  function handleTap() {
    const now = Date.now();

    if (now - lastTapAt <= DOUBLE_TAP_MS) {
      if (singleTapTimer) {
        clearTimeout(singleTapTimer);
        singleTapTimer = null;
      }

      lastTapAt = 0;
      restart();
      return;
    }

    lastTapAt = now;
    singleTapTimer = window.setTimeout(() => {
      toggle();
      singleTapTimer = null;
      lastTapAt = 0;
    }, DOUBLE_TAP_MS);
  }

  app.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    handleTap();
  });

  app.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  document.addEventListener("visibilitychange", () => {
    render();

    if (document.visibilityState === "visible" && state.running) {
      requestWakeLock();
    } else if (document.visibilityState !== "visible") {
      releaseWakeLock();
    }
  });

  window.addEventListener("pagehide", saveState);
  window.addEventListener("beforeunload", saveState);

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  loadState();
  render();

  if (state.running) {
    requestWakeLock();
  }

  loop();
})();
