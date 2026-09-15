(() => {
  "use strict";

  /* Sticky header shadow */
  const header = document.getElementById("site-header");
  const onScroll = () => {
    header.classList.toggle("is-stuck", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile navigation */
  const nav = document.getElementById("main-nav");
  const navToggle = document.getElementById("nav-toggle");
  const navClose = document.getElementById("nav-close");
  const navBackdrop = document.getElementById("nav-backdrop");

  const openNav = () => {
    nav.classList.add("is-open");
    navBackdrop.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    navClose.focus();
  };
  const closeNav = () => {
    nav.classList.remove("is-open");
    navBackdrop.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    navToggle.focus();
  };

  navToggle.addEventListener("click", openNav);
  navClose.addEventListener("click", closeNav);
  navBackdrop.addEventListener("click", closeNav);
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) closeNav();
  });

  /* Scroll reveal (skipped for prefers-reduced-motion via CSS) */
  const revealTargets = document.querySelectorAll(
    ".split-text, .split-media, .services-grid li, .review-card, .contact-text, .contact-info"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }

  /* Contact modal */
  const modalOverlay = document.getElementById("modal-overlay");
  const modalClose = document.getElementById("modal-close");
  const openTriggers = document.querySelectorAll(".js-open-modal");
  let lastFocused = null;

  const getFocusable = () =>
    modalOverlay.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');

  const openModal = (e) => {
    if (e) e.preventDefault();
    lastFocused = document.activeElement;
    modalOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    const focusable = getFocusable();
    if (focusable.length) focusable[0].focus();
  };
  const closeModal = () => {
    modalOverlay.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  };

  openTriggers.forEach((btn) => btn.addEventListener("click", openModal));
  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || modalOverlay.hidden) return;
    closeModal();
  });
  modalOverlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || modalOverlay.hidden) return;
    const focusable = Array.from(getFocusable());
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* Contact form: client-side validation + mailto fallback.
     Replace with a real backend endpoint (e.g. a Supabase Edge Function) when available. */
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    const bodyLines = [
      `Prénom : ${data.prenom}`,
      `Nom : ${data.nom}`,
      `Email : ${data.email}`,
      `Téléphone : ${data.telephone}`,
      `Type d'événement : ${data.type_evenement}`,
      `Date souhaitée : ${data.date_souhaitee || "-"}`,
      `Adultes : ${data.nb_adultes || "-"}`,
      `Enfants : ${data.nb_enfants || "-"}`,
      `Horaires : ${data.horaires || "-"}`,
      `Prestations : ${data.prestations || "-"}`,
      `Message : ${data.message || "-"}`,
    ].join("\n");

    const mailto = `mailto:oliviermerz@gmail.com?subject=${encodeURIComponent(
      "Demande de projet — " + data.prenom + " " + data.nom
    )}&body=${encodeURIComponent(bodyLines)}`;

    status.textContent = "Ouverture de votre messagerie…";
    window.location.href = mailto;
    form.reset();
    setTimeout(() => {
      status.textContent = "Merci, votre messagerie s'est ouverte avec votre demande pré-remplie.";
    }, 400);
  });

  /* Image carousel (bloc 04) */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-carousel]").forEach((root) => {
    const slides = Array.from(root.querySelectorAll(".carousel-slide"));
    if (slides.length < 2) return;

    const prevBtn = root.querySelector(".carousel-arrow-prev");
    const nextBtn = root.querySelector(".carousel-arrow-next");
    const interval = parseInt(root.dataset.interval, 10) || 2000;
    let index = slides.findIndex((s) => s.classList.contains("is-active"));
    if (index < 0) index = 0;
    let timer = null;

    /* Navigation par pièce (optionnelle) : un élément .carousel-rooms juste
       après le carrousel, avec un bouton [data-room] par pièce, saute à la
       première photo taguée data-room correspondante sur la diapositive. */
    const roomNav = root.nextElementSibling && root.nextElementSibling.classList.contains("carousel-rooms")
      ? root.nextElementSibling
      : null;
    const roomLinks = roomNav ? Array.from(roomNav.querySelectorAll("[data-room]")) : [];
    const syncRoomNav = () => {
      if (!roomLinks.length) return;
      const activeRoom = slides[index].dataset.room || null;
      roomLinks.forEach((btn) => {
        btn.classList.toggle("is-active", !!activeRoom && btn.dataset.room === activeRoom);
      });
    };

    const show = (next) => {
      slides[index].classList.remove("is-active");
      slides[index].setAttribute("aria-hidden", "true");
      index = (next + slides.length) % slides.length;
      slides[index].classList.add("is-active");
      slides[index].removeAttribute("aria-hidden");
      syncRoomNav();
    };
    slides.forEach((s, i) => { if (i !== index) s.setAttribute("aria-hidden", "true"); });

    const start = () => {
      if (reduceMotion) return;
      stop();
      timer = setInterval(() => show(index + 1), interval);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    nextBtn.addEventListener("click", () => { show(index + 1); start(); });
    prevBtn.addEventListener("click", () => { show(index - 1); start(); });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);

    roomLinks.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetIndex = slides.findIndex((s) => s.dataset.room === btn.dataset.room);
        if (targetIndex === -1) return;
        show(targetIndex);
        start();
      });
    });

    syncRoomNav();
    start();
  });
})();
