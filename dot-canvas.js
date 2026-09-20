(() => {
  const canvas = document.getElementById("heroDots");
  const hero = document.querySelector(".hero");
  if (!canvas || !hero) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let dots = [];
  let raf = 0;
  const mouse = { x: -9999, y: -9999, active: false };
  const spacing = 26;
  const influence = 130;

  const buildGrid = () => {
    dots = [];
    const cols = Math.ceil(width / spacing) + 2;
    const rows = Math.ceil(height / spacing) + 2;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = col * spacing + (row % 2 ? spacing * 0.5 : 0);
        const y = row * spacing;
        dots.push({ x, y, ox: 0, oy: 0 });
      }
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGrid();
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);

    dots.forEach((dot) => {
      let targetX = 0;
      let targetY = 0;

      if (mouse.active && !prefersReducedMotion) {
        const dx = dot.x - mouse.x;
        const dy = dot.y - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = Math.max(0, (influence - dist) / influence);
        targetX = (dx / dist) * force * 14;
        targetY = (dy / dist) * force * 14;
      }

      dot.ox += (targetX - dot.ox) * 0.12;
      dot.oy += (targetY - dot.oy) * 0.12;

      ctx.beginPath();
      ctx.fillStyle = "rgba(160, 160, 160, 0.45)";
      ctx.arc(dot.x + dot.ox, dot.y + dot.oy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    });

    raf = window.requestAnimationFrame(draw);
  };

  hero.addEventListener(
    "pointermove",
    (event) => {
      const rect = hero.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active = true;
    },
    true
  );

  hero.addEventListener("pointerleave", () => {
    mouse.active = false;
  });

  resize();
  draw();
  window.addEventListener("resize", resize);

  window.addEventListener("beforeunload", () => {
    window.cancelAnimationFrame(raf);
  });
})();
