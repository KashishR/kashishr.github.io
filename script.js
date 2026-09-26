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
     2. Protected BCG projects — instead of navigating, open a modal
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
     3b. Story timeline — scroll-pinned 3-step journey
        (India → Netherlands → Morocco), each scroll advancing the
        line/dot to that checkpoint and bringing that step into focus.
     ---------------------------------------------------------------- */
  const timelineScroll = document.getElementById("timeline-scroll");
  const timelineItems = document.querySelectorAll(".timeline__item");
  const timelineFill = document.querySelector(".timeline__line-fill");
  const timelineDot = document.querySelector(".timeline__dot");

  if (timelineScroll && timelineItems.length && timelineFill && timelineDot) {
    const steps = timelineItems.length;
    let pinned = window.matchMedia("(min-width: 769px)").matches;
    let ticking = false;

    function setStep(step) {
      const pct = (step / (steps - 1)) * 100;
      timelineFill.style.width = pct + "%";
      timelineDot.style.left = pct + "%";
      timelineItems.forEach((item, i) => item.classList.toggle("is-active", i === step));
    }

    function updateTimelineStep() {
      if (!pinned) {
        ticking = false;
        return;
      }
      const rect = timelineScroll.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const progress = total > 0 ? scrolled / total : 0;
      const step = Math.min(steps - 1, Math.floor(progress * steps));
      setStep(step);
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateTimelineStep);
        ticking = true;
      }
    }

    function onResize() {
      pinned = window.matchMedia("(min-width: 769px)").matches;
      if (pinned) updateTimelineStep();
    }

    setStep(0);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
  }

  /* ----------------------------------------------------------------
     3c. Work gallery — the frame itself never moves (all six pieces
        stay visible together), but the image inside each frame drifts
        a few pixels as the section scrolls through the viewport, each
        at a slightly different depth. Desktop only, off under reduced
        motion.
     ---------------------------------------------------------------- */
  const workGallery = document.getElementById("work-gallery");
  const galleryMedia = document.querySelectorAll(".work-gallery__media");

  if (workGallery && galleryMedia.length && !reduceMotion) {
    const speeds = [0.18, 0.32, 0.12, 0.28, 0.16, 0.3]; // drift per px scrolled, per item
    const maxDrift = 40; // px — stays inside the media's 15% overscan
    let parallaxOn = window.matchMedia("(min-width: 821px)").matches;
    let parallaxTicking = false;

    function updateGalleryParallax() {
      parallaxTicking = false;
      if (!parallaxOn) return;
      const viewportCenter = window.innerHeight / 2;
      galleryMedia.forEach((media, i) => {
        const frameRect = media.parentElement.getBoundingClientRect();
        const frameCenter = frameRect.top + frameRect.height / 2;
        const speed = speeds[i % speeds.length];
        const offset = Math.max(-maxDrift, Math.min(maxDrift, (viewportCenter - frameCenter) * speed));
        media.style.transform = `translateY(${offset}px)`;
      });
    }

    function onScrollGalleryParallax() {
      if (!parallaxTicking) {
        requestAnimationFrame(updateGalleryParallax);
        parallaxTicking = true;
      }
    }

    function onResizeGalleryParallax() {
      parallaxOn = window.matchMedia("(min-width: 821px)").matches;
      if (!parallaxOn) {
        galleryMedia.forEach((media) => (media.style.transform = ""));
      } else {
        updateGalleryParallax();
      }
    }

    updateGalleryParallax();
    window.addEventListener("scroll", onScrollGalleryParallax, { passive: true });
    window.addEventListener("resize", onResizeGalleryParallax);
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
  // Project pages load this same script but have no contact form on them.
  if (form) {
    const status = document.getElementById("form-status");
    const rules = {
      name: (v) => (v.trim().length >= 2 ? "" : "Please enter your name."),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter a valid email."),
      message: (v) => (v.trim().length >= 10 ? "" : "A little more detail, please."),
    };
    const showError = (field, msg) => {
      const el = form.querySelector(`.error[data-for="${field}"]`);
      if (el) el.textContent = msg;
      return !msg;
    };
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
  }

  /* ---- Footer year ---- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Embedded prototypes (e.g. Figma Make) ----
     The embedded canvas grabs mouse-wheel input for its own pan/zoom, which
     stops the page from scrolling under the cursor. A click-to-activate
     overlay keeps scroll on the page until the visitor opts into the embed. */
  document.querySelectorAll("[data-embed-overlay]").forEach((overlay) => {
    overlay.addEventListener("click", () => overlay.classList.add("is-hidden"));
  });
})();
