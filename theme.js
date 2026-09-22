(() => {
  const THEMES = [
    { bg: "#ffffff", text: "#111111", rank: "#00b300", surface: "#f5f5f5" },
    { bg: "#ddebee", text: "#1d282a", rank: "#128a32", surface: "#d3e1e4" },
    { bg: "#d4e3de", text: "#283933", rank: "#1a7a38", surface: "#c8d7d2" },
    { bg: "#d2dacb", text: "#3b4336", rank: "#2a6b28", surface: "#c7cfc1" },
    { bg: "#d5d1b6", text: "#4f4d36", rank: "#3a6a22", surface: "#c9c5aa" },
    { bg: "#f2e6ce", text: "#794d34", rank: "#3d6e24", surface: "#eadbc3" },
    { bg: "#ffd2b3", text: "#e74d0f", rank: "#2f6e22", surface: "#fcc3a1" },
    { bg: "#e94f0f", text: "#f2e6cc", rank: "#d8f0a8", surface: "#eb753e" },
    { bg: "#9d4432", text: "#f4d7b5", rank: "#d4e89a", surface: "#b16650" },
    { bg: "#773a35", text: "#f2c3a7", rank: "#c8e090", surface: "#965c52" },
    { bg: "#543b58", text: "#fcb3ad", rank: "#c8e8a8", surface: "#815b6f" },
    { bg: "#40364f", text: "#f6a7d4", rank: "#b8e0a8", surface: "#755776" },
    { bg: "#2d3248", text: "#cfbbec", rank: "#b0e0c0", surface: "#5c5a78" },
    { bg: "#182a38", text: "#b9d3f6", rank: "#a8e0c8", surface: "#475b6f" },
    { bg: "#051a1d", text: "#c5ecf3", rank: "#9ee0c0", surface: "#3d575b" },
  ];

  const LAST = THEMES.length - 1;
  const PAD = 22;
  const dock = document.querySelector(".theme-dock");
  const track = document.querySelector(".theme-track");
  const knob = document.querySelector(".theme-knob");
  const dotsHost = document.querySelector(".theme-dots");
  const root = document.documentElement;
  if (!dock || !track || !knob || !dotsHost) return;

  dock.style.setProperty("--theme-last", String(LAST));

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  let index = 0;
  let dragging = false;
  let touring = false;

  const applyIndex = (nextIndex) => {
    index = clamp(nextIndex, 0, LAST);
    const theme = THEMES[index];
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--accent", theme.text);
    root.style.setProperty("--rank", theme.rank);
    root.style.setProperty("--surface", theme.surface);
    track.setAttribute("aria-valuenow", String(index));
    dock.style.setProperty("--theme-stop", String(index));
  };

  const indexFromEvent = (event) => {
    const rect = track.getBoundingClientRect();
    const y = event.clientY - rect.top - PAD;
    const raw = clamp(y / Math.max(rect.height - PAD * 2, 1), 0, 1);
    return Math.round(raw * LAST);
  };

  THEMES.forEach((_, stop) => {
    const dot = document.createElement("span");
    dot.style.top = `${(stop / LAST) * 100}%`;
    dotsHost.appendChild(dot);
  });

  const onPointerDown = (event) => {
    if (touring) return;
    dragging = true;
    dock.classList.add("is-dragging");
    track.setPointerCapture(event.pointerId);
    applyIndex(indexFromEvent(event));
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!dragging || touring) return;
    applyIndex(indexFromEvent(event));
  };

  const onPointerUp = (event) => {
    if (!dragging) return;
    dragging = false;
    dock.classList.remove("is-dragging");
    applyIndex(indexFromEvent(event));
    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
  };

  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", onPointerUp);
  track.addEventListener("pointercancel", onPointerUp);

  track.addEventListener("keydown", (event) => {
    if (touring) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      applyIndex(index + 1);
      event.preventDefault();
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      applyIndex(index - 1);
      event.preventDefault();
    }
    if (event.key === "Home") {
      applyIndex(0);
      event.preventDefault();
    }
    if (event.key === "End") {
      applyIndex(LAST);
      event.preventDefault();
    }
  });

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const runLandingTour = () => {
    dock.classList.add("is-open");
    if (reducedMotion) {
      applyIndex(0);
      dock.classList.add("is-ready");
      document.dispatchEvent(new CustomEvent("theme-tour-done"));
      return;
    }

    touring = true;
    dock.classList.add("is-touring");
    document.dispatchEvent(new CustomEvent("theme-tour-start"));
    const sequence = [];
    for (let i = 0; i <= LAST; i += 1) sequence.push(i);
    for (let i = LAST - 1; i >= 0; i -= 1) sequence.push(i);

    let step = 0;
    const tick = () => {
      applyIndex(sequence[step]);
      step += 1;
      if (step < sequence.length) {
        const goingDown = step <= LAST;
        window.setTimeout(tick, goingDown ? 85 : 42);
        return;
      }
      applyIndex(0);
      document.dispatchEvent(new CustomEvent("theme-tour-done"));
      window.setTimeout(() => {
        touring = false;
        dock.classList.remove("is-touring");
        dock.classList.add("is-ready");
      }, 320);
    };

    window.setTimeout(tick, 280);
  };

  applyIndex(0);
  window.requestAnimationFrame(runLandingTour);
})();
