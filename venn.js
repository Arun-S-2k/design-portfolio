(() => {
  const root = document.getElementById("venn");
  const stage = root?.querySelector(".venn-stage");
  if (!root || !stage) return;

  const svg = stage.querySelector(".venn-svg");
  const rings = [...root.querySelectorAll(".venn-ring")];
  const designStrokeHost = root.querySelector(".venn-design-stroke");
  const outcomeIconsHost = root.querySelector(".venn-outcome-icons");

  const CIRCLES = [
    { id: "design", cx: 234.38, cy: 144.51, r: 146.71 },
    { id: "experience", cx: 146.71, cy: 282.85, r: 146.71 },
    { id: "outcome", cx: 318.53, cy: 282.85, r: 146.71 },
  ];

  const DESIGN = CIRCLES[0];
  const OUTCOME = CIRCLES[2];
  const PIECE_COUNT = 9;
  const ZONE_RAD = 0.72;
  const GAP_RAD = 0.05;
  const PIECE_OFFSETS = [8, 13, 19, 25, 30, 25, 19, 13, 8];
  const PIECE_TILT = [-10, -8, -5, -2, 0, 2, 5, 8, 10];
  const BORDER_PROXIMITY = 28;
  const INNER_REACH = 0.55;
  const REST_EPSILON = 0.04;
  const easeOutCubic = (t) => 1 - (1 - t) ** 3;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const svgNS = "http://www.w3.org/2000/svg";
  const pieces = [];
  let restCircle = null;
  let staticPath = null;
  let cursorAngle = 0;
  let cursorInfluence = 0;
  let smoothInfluence = 0;
  let pieceOffsets = PIECE_OFFSETS.map(() => 0);
  let animating = false;
  let rafId = 0;
  let previewing = false;

  const smoothstep = (t) => {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  };

  const angleDelta = (a, b) => {
    let delta = a - b;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  };

  const arcPath = (cx, cy, radius, start, end) => {
    const x0 = cx + Math.cos(start) * radius;
    const y0 = cy + Math.sin(start) * radius;
    const x1 = cx + Math.cos(end) * radius;
    const y1 = cy + Math.sin(end) * radius;
    const sweep = end > start ? 1 : 0;
    const largeArc = Math.abs(end - start) > Math.PI ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(
      2
    )} 0 ${largeArc} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  const polar = (center, dist, angle) => ({
    x: center.cx + Math.cos(angle) * dist,
    y: center.cy + Math.sin(angle) * dist,
  });

  const fullCirclePath = (cx, cy, r) =>
    `M ${cx} ${(cy - r).toFixed(2)} A ${r} ${r} 0 1 1 ${cx} ${(cy + r).toFixed(
      2
    )} A ${r} ${r} 0 1 1 ${cx} ${(cy - r).toFixed(2)}`;

  const createDesignRing = () => {
    if (!designStrokeHost) return;

    restCircle = document.createElementNS(svgNS, "path");
    restCircle.setAttribute("class", "venn-design-seg venn-design-rest");
    restCircle.setAttribute("d", fullCirclePath(DESIGN.cx, DESIGN.cy, DESIGN.r));
    restCircle.setAttribute("fill", "none");
    restCircle.setAttribute("stroke-linecap", "butt");
    designStrokeHost.appendChild(restCircle);

    staticPath = document.createElementNS(svgNS, "path");
    staticPath.setAttribute("class", "venn-design-seg venn-design-static");
    staticPath.setAttribute("fill", "none");
    staticPath.setAttribute("stroke-linecap", "butt");
    staticPath.style.opacity = "0";
    designStrokeHost.appendChild(staticPath);

    for (let i = 0; i < PIECE_COUNT; i += 1) {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("class", "venn-design-seg venn-design-piece");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "butt");
      path.style.opacity = "0";
      designStrokeHost.appendChild(path);
      pieces.push(path);
    }
  };

  const renderDesignRing = () => {
    if (!restCircle || !staticPath) return;
    const breaking = smoothInfluence > 0.04 || pieceOffsets.some((value) => value > 0.4);

    if (!breaking) {
      restCircle.style.opacity = "1";
      staticPath.style.opacity = "0";
      pieces.forEach((path) => {
        path.style.opacity = "0";
        path.removeAttribute("transform");
      });
      return;
    }

    restCircle.style.opacity = "0";
    staticPath.style.opacity = "1";

    const zoneStart = cursorAngle - ZONE_RAD;
    const zoneEnd = cursorAngle + ZONE_RAD;
    staticPath.setAttribute(
      "d",
      arcPath(DESIGN.cx, DESIGN.cy, DESIGN.r, zoneEnd, zoneStart + Math.PI * 2)
    );

    const pieceSpan =
      (ZONE_RAD * 2 - GAP_RAD * (PIECE_COUNT - 1)) / PIECE_COUNT;

    for (let i = 0; i < PIECE_COUNT; i += 1) {
      const start = zoneStart + i * (pieceSpan + GAP_RAD);
      const end = start + pieceSpan;
      const mid = (start + end) / 2;
      const radius = DESIGN.r + pieceOffsets[i];
      const path = pieces[i];
      path.style.opacity = "1";
      path.setAttribute("d", arcPath(DESIGN.cx, DESIGN.cy, radius, start, end));

      const hinge = polar(DESIGN, DESIGN.r, mid);
      const tilt = PIECE_TILT[i] * smoothInfluence;
      path.setAttribute(
        "transform",
        `rotate(${tilt.toFixed(2)} ${hinge.x.toFixed(2)} ${hinge.y.toFixed(2)})`
      );
    }
  };

  const tick = () => {
    const influenceDiff = cursorInfluence - smoothInfluence;
    const influenceStep = reducedMotion ? 1 : easeOutCubic(0.2);
    if (Math.abs(influenceDiff) > 0.001) {
      smoothInfluence += influenceDiff * influenceStep;
    } else {
      smoothInfluence = cursorInfluence;
    }

    let moving = Math.abs(influenceDiff) > 0.001;
    const offsetStep = reducedMotion ? 1 : easeOutCubic(0.16);

    for (let i = 0; i < PIECE_COUNT; i += 1) {
      const target = PIECE_OFFSETS[i] * smoothInfluence;
      const diff = target - pieceOffsets[i];
      if (Math.abs(diff) > REST_EPSILON) moving = true;
      pieceOffsets[i] += diff * offsetStep;
      if (Math.abs(diff) < REST_EPSILON) pieceOffsets[i] = target;
    }

    renderDesignRing();

    if (moving || smoothInfluence > 0.008 || cursorInfluence > 0.008) {
      rafId = requestAnimationFrame(tick);
    } else {
      smoothInfluence = 0;
      pieceOffsets = PIECE_OFFSETS.map(() => 0);
      renderDesignRing();
      animating = false;
      rafId = 0;
    }
  };

  const ensureAnimating = () => {
    if (animating) return;
    animating = true;
    rafId = requestAnimationFrame(tick);
  };

  const setDesignInfluence = (point, activeIds) => {
    const dx = point.x - DESIGN.cx;
    const dy = point.y - DESIGN.cy;
    const dist = Math.hypot(dx, dy);
    const borderDist = Math.abs(dist - DESIGN.r);
    const angle = Math.atan2(dy, dx);

    cursorAngle = angle;

    let influence = 0;
    const innerLimit = DESIGN.r * (1 - INNER_REACH);

    if (dist >= innerLimit && dist <= DESIGN.r) {
      const t = (dist - innerLimit) / (DESIGN.r - innerLimit);
      influence = 0.55 + 0.45 * smoothstep(t);
    } else if (dist > DESIGN.r && dist <= DESIGN.r + BORDER_PROXIMITY) {
      influence = smoothstep(1 - (dist - DESIGN.r) / BORDER_PROXIMITY);
    }

    cursorInfluence = influence;
    ensureAnimating();
  };

  const resetDesignInfluence = () => {
    cursorInfluence = 0;
    ensureAnimating();
  };

  const positionOutcomeIcons = () => {
    if (!outcomeIconsHost) return;

    const placements = [
      { angle: -0.2, radius: 88, selector: '[data-icon="dollar"]' },
      { angle: 0.42, radius: 88, selector: '[data-icon="trend"]' },
      { angle: 1.12, radius: 88, selector: '[data-icon="bars"]' },
    ];

    placements.forEach(({ angle, radius, selector }) => {
      const wrap = outcomeIconsHost.querySelector(selector);
      if (!wrap) return;
      const { x, y } = polar(OUTCOME, radius, angle);
      wrap.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    });
  };

  createDesignRing();
  renderDesignRing();
  positionOutcomeIcons();

  const prepareStrokeDraw = (node) => {
    if (!node || reducedMotion || typeof node.getTotalLength !== "function") return;
    const length = node.getTotalLength();
    node.style.strokeDasharray = `${length}`;
    node.style.strokeDashoffset = `${length}`;
  };

  prepareStrokeDraw(restCircle);
  root.querySelectorAll(".venn-outline").forEach(prepareStrokeDraw);

  const toSvgPoint = (event) => {
    if (!svg) return { x: DESIGN.cx, y: DESIGN.cy - DESIGN.r };

    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    return {
      x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width,
      y: viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height,
    };
  };

  const hits = (event) => {
    const point = toSvgPoint(event);
    return CIRCLES.filter((set) => {
      const dx = point.x - set.cx;
      const dy = point.y - set.cy;
      return dx * dx + dy * dy <= set.r * set.r;
    }).map((set) => set.id);
  };

  const clear = () => {
    if (previewing) return;
    root.classList.remove(
      "is-hot",
      "is-blend",
      "is-core",
      "is-design-hover",
      "is-experience-hover",
      "is-outcome-hover"
    );
    stage.classList.remove("is-cursor-experience");
    rings.forEach((ring) => ring.classList.remove("is-on"));
    resetDesignInfluence();
  };

  const showHoverPreview = () => {
    previewing = true;
    root.classList.add(
      "is-design-hover",
      "is-experience-hover",
      "is-outcome-hover"
    );
    rings.forEach((ring) => ring.classList.add("is-on"));
    setDesignInfluence(
      { x: DESIGN.cx, y: DESIGN.cy - DESIGN.r * 0.92 },
      ["design"]
    );
  };

  const endHoverPreview = () => {
    previewing = false;
    clear();
  };

  if (!reducedMotion) {
    document.addEventListener("theme-tour-start", showHoverPreview, {
      once: true,
    });
    document.addEventListener(
      "theme-tour-done",
      () => {
        window.setTimeout(endHoverPreview, 1500);
      },
      { once: true }
    );
  }

  const apply = (ids, point) => {
    if (previewing) return;
    if (!ids.length) {
      root.classList.remove(
        "is-hot",
        "is-blend",
        "is-core",
        "is-design-hover",
        "is-experience-hover",
        "is-outcome-hover"
      );
      stage.classList.remove("is-cursor-experience");
      rings.forEach((ring) => ring.classList.remove("is-on"));
      setDesignInfluence(point, []);
      return;
    }

    root.classList.add("is-hot");
    root.classList.toggle("is-blend", ids.length === 2);
    root.classList.toggle("is-core", ids.length === 3);
    root.classList.toggle("is-design-hover", ids.includes("design"));
    root.classList.toggle("is-experience-hover", ids.includes("experience"));
    root.classList.toggle("is-outcome-hover", ids.includes("outcome"));
    stage.classList.toggle("is-cursor-experience", ids.includes("experience"));

    rings.forEach((ring) => {
      ring.classList.toggle("is-on", ids.includes(ring.dataset.ring));
    });

    setDesignInfluence(point, ids);
  };

  stage.addEventListener("pointerdown", (event) => {
    const allowPullRefresh =
      event.pointerType === "touch" && window.scrollY <= 2;
    if (!allowPullRefresh) {
      stage.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
    apply(hits(event), toSvgPoint(event));
  });

  stage.addEventListener("pointermove", (event) => {
    apply(hits(event), toSvgPoint(event));
  });

  stage.addEventListener("pointerup", clear);
  stage.addEventListener("pointerleave", clear);
  stage.addEventListener("pointercancel", clear);
})();
