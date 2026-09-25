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

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const displays = [hoursEl, minutesEl, secondsEl].map(createDisplay);

  function setFaceValue(face, value) {
    face.replaceChildren(...Array.from(value, (digit) => {
      const cell = document.createElement("span");
      cell.className = "digit-cell";
      cell.textContent = digit;
      return cell;
    }));
  }

  function createDisplay(el) {
    const card = el.parentElement;
    const faces = ["static-top", "static-bottom", "turn-top", "turn-bottom"].map((name) => {
      const panel = document.createElement("div");
      panel.className = `flip-half ${name}`;
      panel.setAttribute("aria-hidden", "true");
      const face = document.createElement("div");
      face.className = "face-digits";
      setFaceValue(face, el.textContent);
      panel.append(face);
      card.append(panel);
      return face;
    });
    const display = { el, card, faces, value: el.textContent };
    card.addEventListener("animationend", (event) => {
      if (event.animationName === "flipBottom") settleDisplay(display);
    });
    return display;
  }

  function settleDisplay(display) {
    display.card.classList.remove("flipping");
    display.faces.forEach((face) => setFaceValue(face, display.value));
  }

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

  function updateDisplay(display, value, animate) {
    if (!animate) settleDisplay(display);
    if (display.value === value) return;
    const previous = display.value;
    settleDisplay(display);
    display.value = value;
    display.el.textContent = value;
    display.card.style.setProperty("--digit-scale", Math.min(1, 2 / value.length));

    if (!animate || reducedMotion.matches) {
      settleDisplay(display);
      return;
    }

    const [top, bottom, turningTop, turningBottom] = display.faces;
    setFaceValue(top, value);
    setFaceValue(bottom, previous);
    setFaceValue(turningTop, previous);
    setFaceValue(turningBottom, value);
    void display.card.offsetWidth;
    display.card.classList.add("flipping");
  }

  function render(now = Date.now(), animate = true) {
    const time = formatElapsed(elapsedMs(now));
    [time.h, time.m, time.s].forEach((value, index) => {
      updateDisplay(displays[index], value, animate);
    });

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
    render(Date.now(), false);

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
  render(Date.now(), false);

  if (state.running) {
    requestWakeLock();
  }

  loop();
})();
