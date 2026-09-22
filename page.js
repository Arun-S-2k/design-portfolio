(() => {
  const venn = document.getElementById("venn");
  if (venn) {
    window.setTimeout(() => {
      venn.classList.add("is-landed");
      venn
        .querySelectorAll(".venn-design-rest, .venn-outline")
        .forEach((node) => {
          node.style.strokeDasharray = "";
          node.style.strokeDashoffset = "";
        });
    }, 1900);
  }

  const about = document.querySelector(".about");
  const aboutInner = document.querySelector(".intro-heading");
  const aboutCopies = [...document.querySelectorAll(".about-copy")];
  const aboutEducation = document.querySelector(".about-education");
  const aboutStart = document.querySelector(".about-copy-start");

  const wrapWords = (element) => {
    const parts = element.innerHTML.split(/(<strong>.*?<\/strong>)/g);
    element.innerHTML = parts
      .map((part) => {
        if (part.startsWith("<strong>")) {
          const inner = part.replace(/<\/?strong>/g, "");
          const words = inner
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => `<span class="word">${word}</span>`)
            .join(" ");
          return `<strong>${words}</strong>`;
        }

        return part
          .split(/(\s+)/)
          .map((token) => {
            if (!token.trim()) return token;
            return `<span class="word">${token}</span>`;
          })
          .join("");
      })
      .join("");
  };

  aboutCopies.forEach(wrapWords);

  const words = aboutCopies.flatMap((copy) => [...copy.querySelectorAll(".word")]);
  const firstWordCount = aboutStart
    ? aboutStart.querySelectorAll(".word").length
    : 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const getAboutProgress = () => {
    if (!about) return 0;

    const rect = about.getBoundingClientRect();
    const scrollable = Math.max(about.offsetHeight - window.innerHeight, 1);
    return clamp(-rect.top / scrollable, 0, 1);
  };

  const updateAboutReveal = () => {
    if (!about || !aboutInner) return;

    const progress = prefersReducedMotion ? 1 : getAboutProgress();
    aboutInner.style.setProperty("--about-progress", progress.toFixed(4));

    if (!words.length) return;

    const revealCount = Math.round(progress * words.length);
    words.forEach((word, index) => {
      word.classList.toggle("is-read", index < revealCount);
    });

    if (aboutEducation) {
      aboutEducation.classList.toggle(
        "is-in",
        prefersReducedMotion || revealCount >= firstWordCount
      );
    }
  };

  if (prefersReducedMotion) {
    words.forEach((word) => word.classList.add("is-read"));
    aboutEducation?.classList.add("is-in");
  }

  if (about) {
    updateAboutReveal();
    window.addEventListener("scroll", updateAboutReveal, { passive: true });
    window.addEventListener("resize", updateAboutReveal);
  }

  const tabs = [...document.querySelectorAll(".work-tab")];
  const panels = [...document.querySelectorAll(".work-panel")];
  const workTabs = document.querySelector(".work-tabs");

  const scrollToPanelStart = () => {
    const panel = document.querySelector(".work-panel.is-on");
    if (!panel || !workTabs) return;
    const tabsBottom = workTabs.getBoundingClientRect().bottom;
    const panelTop = panel.getBoundingClientRect().top;
    window.scrollBy({ top: panelTop - tabsBottom - 24, behavior: "auto" });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      tab.focus({ preventScroll: true });
      const id = tab.dataset.tab;
      tabs.forEach((item) => {
        const on = item === tab;
        item.classList.toggle("is-on", on);
        item.setAttribute("aria-selected", on ? "true" : "false");
      });
      panels.forEach((panel) => {
        const on = panel.id === `panel-${id}`;
        panel.classList.toggle("is-on", on);
        panel.hidden = !on;
      });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(scrollToPanelStart);
      });
    });
  });

  const copyBtn = document.querySelector(".footer-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const value = copyBtn.dataset.copy || "";
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      copyBtn.classList.add("is-copied");
      window.setTimeout(() => copyBtn.classList.remove("is-copied"), 1400);
    });
  }

  const backTop = document.querySelector(".back-top");
  const works = document.querySelector(".works");
  if (backTop && works) {
    backTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    const toggleBackTop = () => {
      const start = works.getBoundingClientRect().top + window.scrollY - 80;
      backTop.classList.toggle("is-on", window.scrollY >= start);
    };
    toggleBackTop();
    window.addEventListener("scroll", toggleBackTop, { passive: true });
    window.addEventListener("resize", toggleBackTop);
  }

  const iSection = document.querySelector(".i-section");
  if (iSection && !prefersReducedMotion) {
    const introCard = iSection.querySelector(".intro-card");
    const iBlock = iSection.querySelector(".i-block");
    const arrive = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) iSection.classList.add("is-in");
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    arrive.observe(iSection);

    const allowParallax = window.matchMedia("(min-width: 701px)").matches;
    const shiftIntro = () => {
      if (!allowParallax || !iSection.classList.contains("is-in") || !introCard) {
        introCard?.style.setProperty("--shift", "0px");
        iBlock?.style.setProperty("--shift", "0px");
        return;
      }
      const rect = iSection.getBoundingClientRect();
      const mid = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift = Math.max(-22, Math.min(22, mid * 0.06));
      introCard.style.setProperty("--shift", `${shift.toFixed(1)}px`);
      iBlock?.style.setProperty("--shift", `${(shift * 0.45).toFixed(1)}px`);
    };
    window.addEventListener("scroll", shiftIntro, { passive: true });
    window.addEventListener("resize", shiftIntro);
  } else if (iSection) {
    iSection.classList.add("is-in");
  }
})();
