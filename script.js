/* ====================================================================
   Portal portfolio — interactions
   ==================================================================== */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------
     1. Hero — a fixed full-screen curtain over the portfolio.
        STEP THROUGH (or scrolling down) flies you through: the artwork +
        name rush forward (scale 1→8) and fade, a cream flash blooms, then
        the hero hides itself to reveal the portfolio beneath. Returning to
        the top (logo / Story link) collapses the hero back into place.
     ---------------------------------------------------------------- */
  const hero = document.getElementById("hero");
  const heroContainer = document.getElementById("hero-container");
  const stepThroughBtn = document.getElementById("step-through");
  const portalFlash = document.getElementById("portal-flash");
  const body = document.body;

  body.classList.add("entered");
  // Only lock scrolling on pages that actually have the hero curtain. Project
  // pages load this same script but have no #hero to lift, so locking there
  // would leave them permanently unscrollable.
  if (hero) body.classList.add("hero-locked");   // no page scroll while the hero is up

  let dismissed = false;       // is the hero curtain currently lifted?
  let animating = false;       // mid transition (block re-entry)

  // STEP THROUGH → fly through the portal, then lift the curtain.
  function portalTransition() {
    if (dismissed || animating) return;

    if (reduceMotion) {
      hideHero();
      return;
    }

    animating = true;
    stepThroughBtn.style.pointerEvents = "none";

    // Fly in: artwork + name zoom/fade while the cream flash blooms.
    heroContainer.classList.add("zooming");
    if (portalFlash) portalFlash.classList.add("flash-in");

    // At peak brightness the screen is full cream — hide the hero behind it,
    // unlock the page, then dissolve the flash to reveal the world.
    setTimeout(() => {
      hideHero();
      if (portalFlash) {
        portalFlash.classList.remove("flash-in");
        portalFlash.classList.add("flash-out");
      }
      setTimeout(() => {
        if (portalFlash) portalFlash.classList.remove("flash-out");
        animating = false;
      }, 600);
    }, 700);
  }

  // Lift the curtain: hide the hero overlay and let the page scroll.
  function hideHero() {
    dismissed = true;
    hero.classList.add("dismissed");

    // Properly restore scrolling
    document.body.classList.remove('hero-locked');
    document.body.classList.add('entered');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    window.scrollTo(0, 0);   // start at the top of the revealed portfolio
  }

  // Collapse the hero back into its original, ready-to-step-through state.
  function resetHero() {
    if (animating) return;
    dismissed = false;
    window.scrollTo(0, 0);
    body.classList.add("hero-locked");
    hero.classList.remove("dismissed");
    // Contract the zoomed lines + name back inward.
    heroContainer.classList.remove("zooming");
    if (portalFlash) portalFlash.classList.remove("flash-in", "flash-out");
    stepThroughBtn.style.pointerEvents = "auto";
  }

  if (stepThroughBtn) {
    stepThroughBtn.addEventListener("click", portalTransition);
  }

  // Wheel drives the curtain both ways:
  //  • scrolling down on the hero flies you through (dismiss)
  //  • scrolling up while already at the very top brings the hero back
  if (hero) {
    window.addEventListener(
      "wheel",
      (e) => {
        if (animating) return;
        if (!dismissed && e.deltaY > 0) {
          e.preventDefault();
          portalTransition();
        } else if (dismissed && e.deltaY < 0 && window.scrollY === 0) {
          e.preventDefault();
          resetHero();
        }
      },
      { passive: false }
    );
  }

  // Deep link: arriving with a section hash (e.g. from a project page's
  // "← Back to Work" → index.html#work) should skip the portal curtain and
  // land directly on that section, rather than being trapped behind the hero.
  if (hero && location.hash && location.hash !== "#portal") {
    const target = document.querySelector(location.hash);
    if (target) {
      hideHero();                       // lift the curtain + unlock scroll
      requestAnimationFrame(() =>       // hideHero resets to top; then jump
        target.scrollIntoView({ behavior: "auto", block: "start" })
      );
    }
  }

  // Returning to the top (logo or Story nav link) brings the hero back.
  const logoLink = document.querySelector(".topnav__logo");
  const storyLink = document.querySelector('.topnav__links a[href="#about"]');
  [logoLink, storyLink].forEach((link) => {
    if (!link) return;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      resetHero();
    });
  });

  /* ----------------------------------------------------------------
     2. Pinboard — bring a pin to the front on click/focus (helps touch,
        where there is no hover). Click again to drop it back.
     ---------------------------------------------------------------- */
  const pins = document.querySelectorAll(".pin");
  pins.forEach((pin) => {
    if (pin.hasAttribute("data-protected")) return; // handled by the NDA gate below
    pin.addEventListener("click", () => {
      const wasFront = pin.classList.contains("front");
      pins.forEach((p) => p.classList.remove("front"));
      if (!wasFront) pin.classList.add("front");
    });
  });

  /* ----------------------------------------------------------------
     2b. Protected BCG projects — instead of navigating, open a modal
         explaining the case is an ongoing NDA project, with a prompt
         to get in touch. No password: details are shared in interviews.
     ---------------------------------------------------------------- */
  (function () {
    const modal = document.getElementById("pw-modal");
    if (!modal) return;

    const nameEl = document.getElementById("pw-modal-name");
    let lastFocused = null;

    function openModal(name) {
      lastFocused = document.activeElement;
      nameEl.textContent = name || "";
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("pw-open");
      const first = modal.querySelector(".pw-modal__contact");
      if (first) setTimeout(() => first.focus(), 60);
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("pw-open");
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function projectName(pin) {
      const b = pin.querySelector("figcaption b");
      return b ? b.textContent.trim() : "";
    }

    document.querySelectorAll(".pin[data-protected]").forEach((pin) => {
      pin.addEventListener("click", (e) => {
        e.preventDefault();
        openModal(projectName(pin));
      });
      pin.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(projectName(pin));
        }
      });
    });

    modal.querySelectorAll("[data-pw-close]").forEach((el) =>
      el.addEventListener("click", closeModal)
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  })();

  /* ----------------------------------------------------------------
     3. Scroll reveal
     ---------------------------------------------------------------- */
  const reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("visible"));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ----------------------------------------------------------------
     4. Cursor glow (desktop, fine pointer)
     ---------------------------------------------------------------- */
  const glow = document.getElementById("cursor-glow");
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
    let gx = innerWidth / 2, gy = innerHeight / 2, cx = gx, cy = gy, raf = null;
    addEventListener("mousemove", (e) => {
      gx = e.clientX; gy = e.clientY;
      glow.classList.add("active");
      if (!raf) loop();
    });
    function loop() {
      cx += (gx - cx) * 0.12;
      cy += (gy - cy) * 0.12;
      glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    }
  }

  /* ----------------------------------------------------------------
     5. Contact form validation
     ---------------------------------------------------------------- */
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const rules = {
    name: (v) => (v.trim().length >= 2 ? "" : "Please enter your name."),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter a valid email."),
    message: (v) => (v.trim().length >= 10 ? "" : "A little more detail, please."),
  };
  function showError(field, msg) {
    const el = form.querySelector(`.error[data-for="${field}"]`);
    if (el) el.textContent = msg;
    return !msg;
  }
  Object.keys(rules).forEach((field) => {
    const input = form.elements[field];
    input.addEventListener("blur", () => showError(field, rules[field](input.value)));
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    Object.keys(rules).forEach((field) => {
      valid = showError(field, rules[field](form.elements[field].value)) && valid;
    });
    if (!valid) {
      status.style.color = "var(--rust)";
      status.textContent = "Please fix the fields above.";
      return;
    }
    // No backend — swap for a real fetch() to your form endpoint.
    status.style.color = "var(--teal)";
    status.textContent = "Thank you — your message has been sent (demo).";
    form.reset();
  });

  /* ----------------------------------------------------------------
     6. Story — Simple reliable scrollytelling
     ---------------------------------------------------------------- */
  (function() {
    const story = document.getElementById('story');
    if (!story) {
      console.warn('[story] #story not found — scrollytelling disabled');
      return;
    }

    const path = document.getElementById('travelPath');
    if (!path) {
      console.warn('[story] #travelPath not found — scrollytelling disabled');
      return;
    }

    const blocks = document.querySelectorAll('.story-block');
    const dots = document.querySelectorAll('.story-dot');
    const cityDots = document.querySelectorAll('.city-dot');
    const cityLabels = document.querySelectorAll('.city-label');
    const stamps = document.querySelectorAll('.map-stamp');

    const pathLen = path.getTotalLength();
    path.style.strokeDasharray = pathLen;
    path.style.strokeDashoffset = pathLen;

    console.log('[story] init', {
      storyHeight: story.offsetHeight,
      blocks: blocks.length,
      cityDots: cityDots.length,
      stamps: stamps.length,
      pathLen: Math.round(pathLen),
    });

    // How far along the drawn path each city sits. Mumbai is the path start
    // (0) and Casablanca the end (1); Amsterdam is the junction between the two
    // curves, so measure its fractional length by sampling the path.
    function fractionOfPoint(tx, ty) {
      if (!path.getPointAtLength) return 0.5;
      let best = 0, bestDist = Infinity;
      const samples = 240;
      for (let i = 0; i <= samples; i++) {
        const len = (pathLen * i) / samples;
        const pt = path.getPointAtLength(len);
        const d = (pt.x - tx) * (pt.x - tx) + (pt.y - ty) * (pt.y - ty);
        if (d < bestDist) { bestDist = d; best = len; }
      }
      return best / pathLen;
    }
    const amsterdamDot = Array.prototype.find.call(cityDots, (d) => d.dataset.city === '1');
    const cityFrac = [
      0,
      amsterdamDot ? fractionOfPoint(+amsterdamDot.getAttribute('cx'), +amsterdamDot.getAttribute('cy')) : 0.5,
      1,
    ];
    console.log('[story] city path fractions', cityFrac.map((f) => +f.toFixed(3)));

    let currentStep = -1; // force the first applyStep() to apply

    // Visual update for a city step — the TEXT and map markers (NOT the path,
    // which is now drawn continuously from scroll in update()).
    function applyStep(step) {
      if (step === currentStep) return; // skip redundant work
      currentStep = step;

      // Text block: fade the incoming one in (0.6s via its inline transition).
      blocks.forEach((b, i) => {
        if (i === step) {
          b.style.display = 'block';
          b.style.opacity = '0';
          void b.offsetWidth;          // force reflow so the fade actually runs
          b.style.opacity = '1';
        } else {
          b.style.display = 'none';
        }
      });

      // Progress dots
      dots.forEach((d, i) => {
        d.style.background = i === step ? '#C1440E' : 'transparent';
        d.style.border = i === step ? 'none' : '1.5px solid #C8C2BA';
      });

      // Map dots + labels accumulate up to the current city
      cityDots.forEach((d) => {
        d.style.opacity = parseInt(d.dataset.city, 10) <= step ? '1' : '0';
      });
      cityLabels.forEach((l) => {
        l.style.opacity = parseInt(l.dataset.city, 10) <= step ? '1' : '0';
      });

      // Passport stamps accumulate — every stamp up to and including the
      // current step stays visible (never hidden once shown).
      stamps.forEach((s) => {
        s.classList.toggle('is-active', parseInt(s.dataset.stamp, 10) <= step);
      });

      console.log('[story] text step →', step);
    }

    // The text lags the path: it only switches once the path has REACHED the
    // next city's dot, then waits 300ms (arrive → pause → the story updates).
    let reachedStep = -1;
    let switchTimer = null;
    function reachCity(step) {
      if (step === reachedStep) return;  // reached-city hasn't changed
      reachedStep = step;
      clearTimeout(switchTimer);
      if (step === currentStep) return;  // already on screen
      switchTimer = setTimeout(() => applyStep(step), 300);
    }

    // Anchor each passport stamp diagonally off its city dot, into a clear
    // corner of the map so it never overlaps a label, dot, the path, or another
    // stamp. Using the dot's real rendered rect keeps this correct regardless of
    // how the SVG scales/letterboxes inside its column:
    //   0 Mumbai (bottom right)  → ABOVE-RIGHT of the dot (top-right area)
    //   1 Amsterdam (top centre) → ABOVE-LEFT of the dot  (top-left area)
    //   2 Casablanca (centre left) → BELOW-LEFT of the dot (bottom-left area)
    const STAMP_SIDE = { '0': 'above-right', '1': 'above-left', '2': 'below-left' };
    const svgMap = document.getElementById('storyMap');
    function positionStamps() {
      if (!svgMap) return;
      const col = svgMap.parentElement;            // offset parent (position:relative)
      const colRect = col.getBoundingClientRect();
      const gap = 18;
      stamps.forEach((stamp) => {
        const i = stamp.dataset.stamp;
        const dot = svgMap.querySelector('.city-dot[data-city="' + i + '"]');
        if (!dot) return;
        const dotRect = dot.getBoundingClientRect();
        const dotX = dotRect.left + dotRect.width / 2 - colRect.left;
        const dotY = dotRect.top + dotRect.height / 2 - colRect.top;
        const sw = stamp.offsetWidth;
        const sh = stamp.offsetHeight;

        let left, top;
        switch (STAMP_SIDE[i]) {
          case 'above-right': left = dotX + gap;       top = dotY - gap - sh; break;
          case 'above-left':  left = dotX - gap - sw;  top = dotY - gap - sh; break;
          default:            left = dotX - gap - sw;  top = dotY + gap;      break; // below-left
        }

        // Keep fully inside the map column (it has overflow:hidden).
        left = Math.max(8, Math.min(left, colRect.width - sw - 8));
        top = Math.max(8, Math.min(top, colRect.height - sh - 8));

        stamp.style.left = left + 'px';
        stamp.style.top = top + 'px';
      });
    }

    function update() {
      // getBoundingClientRect() is viewport-relative, so it tracks whichever
      // element is the scroller. With the single-viewport-scroller model
      // (see styles.css project-page note) this reflects window scroll.
      const rect = story.getBoundingClientRect();
      const total = story.offsetHeight - window.innerHeight;
      const progress = total > 0
        ? Math.max(0, Math.min(1, -rect.top / total))
        : 0;

      // 1) Map scroll progress → how much of the path is drawn, with "dwell"
      //    zones where the path freezes at a city before moving on:
      //      0–5%    Mumbai start (path at 0)
      //      5–45%   draw Mumbai → Amsterdam
      //      45–55%  dwell at Amsterdam (frozen; text switches to Amsterdam)
      //      55–85%  draw Amsterdam → Casablanca
      //      85–100% dwell at Casablanca (frozen; text switches to Casablanca)
      const A = cityFrac[1];           // path fraction at the Amsterdam junction
      let drawn;
      if (progress <= 0.05) {
        drawn = 0;
      } else if (progress < 0.45) {
        drawn = A * (progress - 0.05) / 0.40;        // Mumbai → Amsterdam
      } else if (progress < 0.55) {
        drawn = A;                                   // dwell at Amsterdam
      } else if (progress < 0.85) {
        drawn = A + (1 - A) * (progress - 0.55) / 0.30; // Amsterdam → Casablanca
      } else {
        drawn = 1;                                   // dwell at Casablanca
      }
      path.style.strokeDashoffset = pathLen - pathLen * drawn;

      // 2/3) The text advances when the path has fully REACHED a city dot,
      //      i.e. at the start of that city's dwell zone.
      let reached = 0;
      if (progress >= 0.85) reached = 2;       // Casablanca — path fully drawn
      else if (progress >= 0.45) reached = 1;  // Amsterdam — first leg complete
      reachCity(reached);
    }

    // rAF-throttled handler so we never compute more than once per frame.
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }

    applyStep(0);                              // start on Mumbai
    reachedStep = 0;
    path.style.strokeDashoffset = pathLen;     // nothing drawn yet
    positionStamps();

    // Capture phase (3rd arg `true`) so we still catch scroll even if a
    // nested element ends up being the scroll container.
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', () => { onScroll(); positionStamps(); }, { passive: true });
    window.addEventListener('load', positionStamps);
    // Re-anchor once webfonts settle (stamp size can shift the layout).
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(positionStamps);
    }

    console.log('[story] scroll listener attached');
    update(); // sync to wherever the page currently sits
  })();

  /* ---- Footer year ---- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
