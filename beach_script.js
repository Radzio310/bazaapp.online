/* ===================================================
   BAZA Beach — interactive JS
   =================================================== */

// ─── Scroll progress bar ─────────────────────────────
const scrollBar = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  if (scrollBar) scrollBar.style.width = pct + '%';
}, { passive: true });

// ─── Reveal on scroll (IntersectionObserver) ─────────
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

// ─── Particle canvas ──────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  class Particle {
    constructor() { this.reset(true); }
    reset(randomY) {
      this.x  = Math.random() * W;
      this.y  = randomY ? Math.random() * H : H + 6;
      this.r  = Math.random() * 1.8 + 0.4;
      this.vy = -(Math.random() * 0.6 + 0.15);
      this.vx = (Math.random() - 0.5) * 0.25;
      this.maxOp = Math.random() * 0.55 + 0.1;
      this.life  = 0;
      this.maxLife = Math.random() * 280 + 120;
    }
    update() {
      this.x += this.vx; this.y += this.vy; this.life++;
      if (this.life > this.maxLife || this.y < -10) this.reset(false);
    }
    draw() {
      const progress = this.life / this.maxLife;
      const op = this.maxOp * (1 - Math.pow(progress, 1.5));
      ctx.save();
      ctx.globalAlpha = op;
      ctx.fillStyle = Math.random() > 0.85 ? '#c8950a' : '#f0c929';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function init() {
    resize();
    particles = Array.from({ length: 70 }, () => new Particle());
  }

  let raf;
  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    raf = requestAnimationFrame(loop);
  }

  init();
  loop();

  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(canvas.parentElement || document.body);
})();

// ─── Stat counters ────────────────────────────────────
function animateCounter(el, target, duration) {
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(ease * target);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

const counterIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseInt(el.dataset.target, 10);
    if (!isNaN(target)) animateCounter(el, target, 1200);
    el.dataset.animated = '1';
    counterIO.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-target]').forEach(el => counterIO.observe(el));

// Fetch live active-user count. If the animation already played (observer fired before
// the response arrived), re-animate directly to the real value.
(function fetchActiveUsers() {
  const activeEl = document.getElementById('active-users-count');
  if (!activeEl) return;
  fetch('https://zprp-backend-production.up.railway.app/beach/users/public-stats')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      const n = parseInt(data.active_users, 10);
      if (!n || n <= 0) return;
      activeEl.dataset.target = String(n);
      if (activeEl.dataset.animated) animateCounter(activeEl, n, 900);
    })
    .catch(() => { /* keep fallback 300 */ });
})();

// ─── Tilt effect (feature cards) ──────────────────────
document.querySelectorAll('.tilt').forEach(el => {
  const halo = el.querySelector('.halo');
  let rAF = null;
  const onMove = (ev) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (ev.clientX - cx) / rect.width;
    const dy = (ev.clientY - cy) / rect.height;
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(() => {
      el.style.transform = `rotateX(${(+dy * 5).toFixed(2)}deg) rotateY(${(-dx * 8).toFixed(2)}deg) translateY(-3px)`;
      if (halo) {
        halo.style.setProperty('--mx', ((ev.clientX - rect.left) / rect.width * 100) + '%');
        halo.style.setProperty('--my', ((ev.clientY - rect.top)  / rect.height * 100) + '%');
      }
    });
  };
  const onLeave = () => { cancelAnimationFrame(rAF); el.style.transform = ''; };
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseleave', onLeave);
});

// ─── Pain flip cards (touch support) ─────────────────
document.querySelectorAll('.pain-card').forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('is-flipped'));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.classList.toggle('is-flipped');
    }
  });
  // Flip back on mouse leave (desktop)
  card.addEventListener('mouseleave', () => {
    card.classList.remove('is-flipped');
  });
});

// ─── Hero scroll hint auto-hide ───────────────────────
const heroHint = document.getElementById('heroScrollHint');
let hintHidden = false;
window.addEventListener('scroll', () => {
  if (!hintHidden && window.scrollY > 60) {
    hintHidden = true;
    if (heroHint) heroHint.style.opacity = '0';
  }
}, { passive: true });

// ─── Phone strip pause on hover (already CSS, but also
//     add JS touch drag for mobile) ──────────────────
(function initStripDrag() {
  const strip = document.getElementById('phoneStrip');
  const outer = document.getElementById('phoneStripOuter');
  if (!strip || !outer) return;
  let isDragging = false, startX = 0, scrollLeft = 0;

  outer.addEventListener('mousedown', e => {
    isDragging = true; startX = e.pageX; scrollLeft = outer.scrollLeft;
    strip.style.animationPlayState = 'paused';
    outer.style.cursor = 'grabbing';
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
    strip.style.animationPlayState = '';
    outer.style.cursor = '';
  });
  outer.addEventListener('mousemove', e => {
    if (!isDragging) return;
    e.preventDefault();
    outer.scrollLeft = scrollLeft - (e.pageX - startX);
  });
})();

// ─── Dokumenty prawne ─────────────────────────────────
// Polityka i warunki BAZA Beach mają własne adresy (/beach/polityka-prywatnosci/,
// /beach/warunki-uzytkowania/). Stare kotwice przekierowuje skrypt w <head> beach.html.

// ─── Toast ────────────────────────────────────────────
function showToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => container.removeChild(toast), 260);
  }, 3000);
}

// ─── CTA → smooth scroll to download ─────────────────
document.getElementById('ctaDownload')?.addEventListener('click', () => {
  document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
});

// ─── Fixed buttons ────────────────────────────────────
const btnDownload = document.getElementById('btnDownloadBAZA');
const btnTop      = document.getElementById('btnScrollTop');
const SHOW_AFTER  = 280;

window.addEventListener('scroll', () => {
  const show = window.scrollY > SHOW_AFTER;
  btnDownload?.classList.toggle('visible', show);
  btnTop?.classList.toggle('visible', show);
}, { passive: true });

btnDownload?.addEventListener('click', () => document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' }));
btnTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ─── NAV hide-on-scroll behavior ─────────────────────
(function () {
  const nav = document.getElementById('siteNav');
  if (!nav) return;
  let lastY = window.scrollY || 0;
  let navHidden = false;
  let accUp = 0, accDown = 0;
  const UP = 6, DOWN = 8;
  let ticking = false;

  const setH = () => {
    document.documentElement.style.setProperty('--nav-h', (nav.offsetHeight || 64) + 'px');
  };
  setH();
  window.addEventListener('resize', setH, { passive: true });

  const onScroll = () => {
    const y = window.scrollY || 0;
    const dy = y - lastY;
    if (dy > 0) { accDown += dy; accUp = 0; if (!navHidden && accDown > DOWN) { navHidden = true; nav.classList.add('nav--hidden'); } }
    else if (dy < 0) { accUp += -dy; accDown = 0; if (navHidden && accUp > UP) { navHidden = false; nav.classList.remove('nav--hidden'); } }
    if (y < 8 && navHidden) { navHidden = false; nav.classList.remove('nav--hidden'); accUp = accDown = 0; }
    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
})();

// ─── FAQ accordions ───────────────────────────────────
document.querySelectorAll('.faq-item').forEach((item) => {
  const btn  = item.querySelector('.faq-question');
  const body = item.querySelector('.faq-body');
  if (!btn || !body) return;

  btn.addEventListener('click', () => {
    const opening = !item.classList.contains('is-open');
    item.parentElement?.querySelectorAll('.faq-item').forEach(sib => {
      if (sib !== item) {
        sib.classList.remove('is-open');
        sib.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      }
    });
    item.classList.toggle('is-open', opening);
    btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
  });
});

// ─── Stagger reveal for feature cards ────────────────
(function staggerFeatureCards() {
  const cards = document.querySelectorAll('.feat-card');
  const io2 = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const idx = Array.from(cards).indexOf(e.target);
        e.target.style.transitionDelay = (idx * 80) + 'ms';
        e.target.classList.add('in');
        io2.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  cards.forEach(c => io2.observe(c));
})();

// Features carousel: auto scroll, pause on interaction
(function initFeaturesCarousel() {
  const carousel = document.getElementById('featuresCarousel');
  if (!carousel) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  Array.from(carousel.children).forEach((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.classList.remove('reveal', 'in');
    carousel.appendChild(clone);
  });
})();

// Mobile stats strip: pause auto pan while the user scrolls it.
(function initMobileStatsStrip() {
  const statsBar = document.querySelector('.stats-bar');
  const scroller = document.querySelector('.stats-bar .container');
  if (!statsBar || !scroller) return;

  let resumeTimer;
  const pauseBriefly = () => {
    statsBar.classList.add('is-user-scrolling');
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      statsBar.classList.remove('is-user-scrolling');
    }, 1400);
  };

  ['scroll', 'wheel', 'touchstart', 'pointerdown'].forEach((eventName) => {
    scroller.addEventListener(eventName, pauseBriefly, { passive: true });
  });
})();

// Roadmap items stagger
(function staggerRoadmap() {
  const items = document.querySelectorAll('.rm-item');
  const io3 = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const idx = Array.from(items).indexOf(e.target);
        e.target.style.transitionDelay = (idx * 120) + 'ms';
        e.target.classList.add('in');
        io3.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(i => io3.observe(i));
})();
