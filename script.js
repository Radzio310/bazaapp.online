// ===== Init GLightbox
const lightbox = GLightbox({ selector: '.glightbox' });

// ===== Reveal on Scroll + count-ups
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');

      if (e.target.classList.contains('stat')) {
        const n = e.target.querySelector('.n');
        if (n && !n.dataset.done) {
          n.dataset.done = '1';
          const to = parseInt(n.dataset.count || '0', 10);
          let cur = 0;
          const step = Math.max(1, Math.round(to / 40));
          const tick = () => {
            cur = Math.min(to, cur + step);
            n.textContent = cur;
            if (cur < to) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      }

      io.unobserve(e.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.reveal, .stat').forEach(el => io.observe(el));

// ===== Tilt effect (cards)
document.querySelectorAll('.tilt').forEach(el => {
  const halo = el.querySelector('.halo');
  let rAF = null;
  const onMove = (ev) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (ev.clientX - cx) / rect.width;
    const dy = (ev.clientY - cy) / rect.height;
    const rotX = (+dy * 6).toFixed(2);
    const rotY = (-dx * 10).toFixed(2);
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(() => {
      el.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
      if (halo) {
        halo.style.setProperty('--mx', ((ev.clientX - rect.left) / rect.width * 100) + '%');
        halo.style.setProperty('--my', ((ev.clientY - rect.top) / rect.height * 100) + '%');
      }
    });
  };
  const onLeave = () => { cancelAnimationFrame(rAF); el.style.transform = ''; };
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseleave', onLeave);
});

// ===== See more gallery
const btnSeeMore = document.getElementById('btnSeeMore');
if (btnSeeMore) {
  btnSeeMore.addEventListener('click', () => {
    document.querySelectorAll('.masonry-item').forEach((item, i) => {
      if (i >= 3) item.style.display = 'block';
    });
    btnSeeMore.parentElement.style.display = 'none';
  });
}

// ===== Modals
const backdrop  = document.getElementById('modalBackdrop');
function openModal(id){
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('active');
  backdrop.classList.add('active');
  m.setAttribute('aria-hidden', 'false');
}
function closeModals(){
  document.querySelectorAll('.modal.active').forEach(m => { m.classList.remove('active'); m.setAttribute('aria-hidden','true'); });
  backdrop.classList.remove('active');
}
window.openModal  = openModal;
window.closeModal = (id) => { const m = document.getElementById(id); if (m) { m.classList.remove('active'); m.setAttribute('aria-hidden','true'); } backdrop.classList.remove('active'); };

backdrop.addEventListener('click', closeModals);
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModals));
document.getElementById('openCalendarModal')?.addEventListener('click', () => openModal('calendarModal'));

// Dokumenty prawne mają własne adresy (/polityka-prywatnosci/, /warunki-uzytkowania/).
// Stare kotwice #privacyModal i #termsModal przekierowuje skrypt w <head> index.html.

// ===== Toast
function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => container.removeChild(toast), 250);
  }, 3000);
}

// ===== Downloads
document.getElementById('downloadAndroid')?.addEventListener('click', (e) => {
  e.preventDefault();
  const url = 'https://play.google.com/store/apps/details?id=com.radzio.RefHandballApp&hl=pl';
  window.open(url, '_blank', 'noopener,noreferrer');
});
document.getElementById('downloadIOS')?.addEventListener('click', (e) => {
  e.preventDefault();
  const url = 'https://apps.apple.com/pl/app/baza-app/id6751402205?l=pl';
  window.open(url, '_blank', 'noopener,noreferrer');
});
document.getElementById('ctaDownload')?.addEventListener('click', () => document.getElementById('download')?.scrollIntoView({ behavior:'smooth' }));

// ===== Fixed buttons
const btnDownload = document.getElementById('btnDownloadBAZA');
const btnTop = document.getElementById('btnScrollTop');
const showAfter = 220;
window.addEventListener('scroll', () => {
  if (scrollY > showAfter) { btnDownload.classList.add('visible'); btnTop.classList.add('visible'); }
  else { btnDownload.classList.remove('visible'); btnTop.classList.remove('visible'); }
});
btnDownload.addEventListener('click', () => document.getElementById('download')?.scrollIntoView({ behavior:'smooth' }));
btnTop.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

// ===== NAV: pokazuj przy przewijaniu w górę i trzymaj aż do kolejnego przewijania w dół
(function(){
  const nav = document.getElementById('siteNav');
  let lastY = window.scrollY || 0;
  let navHidden = false;

  const UP_TRIGGER = 6;
  const DOWN_TRIGGER = 6;

  let accUp = 0;
  let accDown = 0;
  let ticking = false;

  const setNavHeight = () => {
    const h = nav.offsetHeight || 64;
    document.documentElement.style.setProperty('--nav-h', h + 'px');
  };
  setNavHeight();
  window.addEventListener('resize', setNavHeight, { passive: true });

  const onScroll = () => {
    const y = window.scrollY || 0;
    const dy = y - lastY;

    if (dy > 0) {
      accDown += dy;
      accUp = 0;
      if (!navHidden && accDown > DOWN_TRIGGER) {
        navHidden = true;
        nav.classList.add('nav--hidden');
      }
    } else if (dy < 0) {
      accUp += -dy;
      accDown = 0;
      if (navHidden && accUp > UP_TRIGGER) {
        navHidden = false;
        nav.classList.remove('nav--hidden');
      }
      if (!navHidden && accUp > UP_TRIGGER) {
        nav.classList.remove('nav--hidden');
      }
    }

    if (y < 8 && navHidden) {
      navHidden = false;
      nav.classList.remove('nav--hidden');
      accUp = accDown = 0;
    }

    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
})();

// ===== FAQ accordions
document.querySelectorAll('.faq-item').forEach((item) => {
  const btn = item.querySelector('.faq-question');
  const body = item.querySelector('.faq-body');
  if (!btn || !body) return;

  btn.addEventListener('click', () => {
    const isOpenNow = !item.classList.contains('is-open');

    const parentList = item.parentElement;
    if (parentList) {
      parentList.querySelectorAll('.faq-item').forEach((sib) => {
        if (sib !== item) {
          sib.classList.remove('is-open');
          const sibBtn = sib.querySelector('.faq-question');
          if (sibBtn) sibBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    item.classList.toggle('is-open', isOpenNow);
    btn.setAttribute('aria-expanded', isOpenNow ? 'true' : 'false');
  });
});

// ===== FAQ technical toggles
document.querySelectorAll('.faq-tech-toggle').forEach((btn) => {
  const techBody = btn.nextElementSibling;
  if (!techBody) return;

  btn.addEventListener('click', () => {
    const isOpen = !techBody.classList.contains('is-open');
    techBody.classList.toggle('is-open', isOpen);
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    btn.textContent = isOpen ? 'Zwiń opis techniczny' : 'A trochę bardziej technicznie?';
  });
});
