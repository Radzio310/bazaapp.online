/* ==========================================================================
   bazaapp.online - silnik strony.

   JEDNA PĘTLA. Przewijanie nie animuje niczego wprost: zapisuje cel, a jedna
   pętla requestAnimationFrame liczy wszystko z pozycji strony i gaśnie, gdy
   nic się nie rusza. Scena historii (prawdziwy pokaz z aplikacji) dostaje
   postęp przez `window.BazaStory.set()`, tak jak w telefonie dostaje go palec.

   Z przewijania liczą się: zegar i wynik na tablicy, kurtyny sekcji, poziomy
   tor „Sprawdź sam”, lecący telefon, pocztówki z plaży i napisy malowane
   literka po literce. W pętli piszemy tylko zmienne CSS i transformacje.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = function () { return window.innerWidth < 820; };
  var isNarrow = function () { return window.innerWidth < 900; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var easeOut = function (t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeInOut = function (t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* Wloty wyzwalane progiem. Przewijanie tylko mówi „już” albo „jeszcze nie”,
     a sam ruch leci w swoim tempie do końca - nic nie zostaje w pół drogi,
     gdy ktoś przestanie przewijać. Cofnięcie za próg zwija ruch tą samą drogą.
     `TW(ms)` to czas pełnego ruchu 0→1; krótszy skok trwa proporcjonalnie krócej. */
  var nowT = 0, moving = false, firstFrame = true;
  function TW(ms) { return { v: 0, a: 0, b: 0, t0: 0, d: ms }; }
  function tw(o, target) {
    if (reduced || firstFrame) { o.v = o.a = o.b = target; return o.v; }
    if (target !== o.b) { o.a = o.v; o.b = target; o.t0 = nowT; }
    if (o.v !== o.b) {
      var t = (nowT - o.t0) / (o.d * Math.max(0.2, Math.abs(o.b - o.a)));
      if (t >= 1) o.v = o.b;
      else { o.v = o.a + (o.b - o.a) * t; moving = true; }
    }
    return o.v;
  }
  // Próg z histerezą: włącza się wyżej, wyłącza dopiero, gdy element całkiem zjedzie w dół.
  function gate(o, top, on, off) { return top < on ? 1 : top > off ? 0 : o.b; }
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var docTop = function (el) { return el.getBoundingClientRect().top + window.scrollY; };
  // Pozycje sekcji w dokumencie liczone raz i odświeżane dopiero przy zmianie
  // układu. Pętla przewijania przeplatała zapis stylu z odczytem pozycji, więc
  // przeglądarka przeliczała układ kilka razy na klatkę - na telefonie to było
  // główne źródło zacięć.
  var geo = new Map();
  function rectOf(el) {
    var g = geo.get(el);
    if (!g) { var r = el.getBoundingClientRect(); g = { top: r.top + window.scrollY, h: r.height, w: r.width, left: r.left }; geo.set(el, g); }
    var t = g.top - window.scrollY;
    return { top: t, bottom: t + g.h, height: g.h, width: g.w, left: g.left };
  }
  function geoTop(el) { return rectOf(el).top + window.scrollY; }
  var V = "20261002g";
  var API = "https://zprp-backend-production.up.railway.app/public/baza-stats";
  var vib = function (ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* brak wibracji */ } };

  /* ───────────────────────────── kolory ───────────────────────────── */
  function hexRgb(h) {
    var n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    var x = hexRgb(a), y = hexRgb(b);
    var c = x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); });
    return "#" + c.map(function (v) { return v.toString(16).padStart(2, "0"); }).join("");
  }
  // Zmienna na korzeniu przelicza style całej strony, więc tylko przy zmianie.
  var accentNow = "";
  function setAccent(c) { if (c === accentNow) return; accentNow = c; root.style.setProperty("--accent", c); }

  /* ───────────────────────────── intro ───────────────────────────── */
  var intro = $("#intro");
  function endIntro() {
    if (!intro || intro.classList.contains("done")) return;
    var logo = $("#heroLogo");
    if (logo) {
      var r = logo.getBoundingClientRect();
      intro.style.setProperty("--ix", (r.left + r.width / 2) + "px");
      intro.style.setProperty("--iy", (r.top + r.height / 2) + "px");
    }
    intro.classList.add("done");
    try { sessionStorage.setItem("baza-intro", "1"); } catch (e) { /* tryb prywatny */ }
    setTimeout(function () { intro.remove(); }, 1500);
  }
  if (intro && !root.classList.contains("intro-seen")) {
    if (reduced) { intro.remove(); }
    else {
      var g = $(".ticks", intro);
      for (var k = 0; k < 14; k++) {
        var a = (k / 14) * Math.PI * 2;
        var ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", 100 + Math.cos(a) * 90); ln.setAttribute("y1", 100 + Math.sin(a) * 90);
        ln.setAttribute("x2", 100 + Math.cos(a) * 97); ln.setAttribute("y2", 100 + Math.sin(a) * 97);
        ln.setAttribute("class", "tick");
        ln.style.animationDelay = (380 + ((k * 5) % 14) * 45) + "ms";
        g.appendChild(ln);
      }
      setTimeout(endIntro, 2050);
      $(".intro-skip", intro).addEventListener("click", endIntro);
      intro.addEventListener("click", endIntro);
    }
  } else if (intro) { intro.remove(); }

  /* ───────────────────────── fale w tle (z logo) ───────────────────────── */
  (function waves() {
    var svg = $(".bg-waves");
    if (!svg) return;
    var html = "";
    for (var i = 0; i < 16; i++) {
      var o = i * 14;
      var d = "M-50 " + (520 + o) + " C 220 " + (360 + o * 1.4) + ", 420 " + (700 - o) + ", 640 " + (520 + o * 0.6) +
        " S 1040 " + (300 + o * 1.2) + ", 1260 " + (430 + o);
      html += '<path d="' + d + '" style="opacity:' + (0.1 + (i / 16) * 0.25).toFixed(2) + '"/>';
    }
    svg.innerHTML = html;
  })();

  /* ───────────────────────── przyciski sklepów ───────────────────────── */
  (function stores() {
    var ua = navigator.userAgent || "";
    var ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
    var android = /Android/i.test(ua);
    $$("[data-stores]").forEach(function (row) {
      var play = $('[data-store="android"]', row), apple = $('[data-store="ios"]', row);
      if (ios && apple) { row.insertBefore(apple, row.firstChild); apple.classList.add("is-primary"); }
      else if (play) { play.classList.add("is-primary"); }
      if (android && apple) apple.style.order = "2";
    });
  })();

  /* ───────────────────── „Cześć, sędzio.” w jednej linii ───────────────────── */
  // Rozmiar liczymy z prawdziwej szerokości napisu w danym kroju: napis
  // wypełnia kolumnę co do piksela, na telefonie i na szerokim ekranie.
  var heroEl = $(".hero");
  function fitHero() {
    var t = $(".hero-title"), f = $(".hero-fit");
    if (!heroEl || !t || !f) return;
    heroEl.style.setProperty("--hf", "100px");
    var w = f.getBoundingClientRect().width;
    var avail = t.clientWidth;
    if (!w || !avail) return;
    // Jedna linia zawsze, ale bez krzyku: rozmiar ma sufit, a dopasowanie
    // do szerokości tylko pilnuje, żeby na wąskim ekranie się zmieściło.
    var cap = innerWidth < 900 ? 50 : 84;
    heroEl.style.setProperty("--hf", clamp((100 * avail) / w * 0.96, 28, cap).toFixed(1) + "px");
  }
  fitHero();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHero);

  /* ─────────────────────────── liczby z serwera ─────────────────────────── */
  // Zamrożona kopia na wypadek, gdy serwer milczy albo odda coś dziwnego.
  // Stan z serwera z 1.10.2026 (GET /public/baza-stats) - liczba pytań z katalogu w aplikacji.
  var FROZEN = { judges: 296, proel_matches: 105, questions: 432, provinces: 16, panel_province_list: ["DOLNOŚLĄSKIE", "ŚLĄSKIE"] };
  var statsData = null;
  var statsListeners = [];
  function onStats(fn) { if (statsData) fn(statsData); else statsListeners.push(fn); }

  (function stats() {
    var cells = $$("[data-stat]");
    var state = cells.map(function (el) { return { el: el, key: el.dataset.stat, cur: 0, to: null, from: 0, t0: 0 }; });
    var waiting = true;
    var fmt = new Intl.NumberFormat("pl-PL");
    var started = performance.now();

    function frame(now) {
      var busy = false;
      state.forEach(function (s) {
        if (s.to == null) {
          // Czekamy na serwer: licznik biegnie miękko w górę, jak przed metą.
          if (!waiting) return;
          var guess = FROZEN[s.key];
          if (typeof guess === "number") {
            s.cur = guess * (1 - Math.exp(-(now - started) / 1400)) * 0.92;
            s.el.textContent = fmt.format(Math.round(s.cur));
          } else if (now - (s.flip || 0) > 70) {
            s.flip = now;
            s.el.textContent = String(100 + Math.floor(Math.random() * 900));
          }
          busy = true;
          return;
        }
        var t = clamp((now - s.t0) / 1100, 0, 1);
        s.cur = s.from + (s.to - s.from) * easeOut(t);
        s.el.textContent = fmt.format(Math.round(s.cur));
        if (t < 1) busy = true;
      });
      if (busy) requestAnimationFrame(frame);
    }

    function land(data, live) {
      waiting = false;
      statsData = data;
      statsListeners.splice(0).forEach(function (fn) { fn(data); });
      state.forEach(function (s) {
        var v = data[s.key];
        if (typeof v !== "number" || !isFinite(v) || v < 0) v = FROZEN[s.key];
        if (typeof v !== "number") { s.el.closest(".stat").hidden = true; return; }
        s.from = typeof FROZEN[s.key] === "number" ? s.cur : 0; s.to = v; s.t0 = performance.now();
        s.el.classList.toggle("live", !!live);
      });
      requestAnimationFrame(frame);
    }

    if (reduced) waiting = false;
    else requestAnimationFrame(frame);

    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 5000);
    fetch(API, { signal: ctrl ? ctrl.signal : undefined, cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        clearTimeout(timer);
        // Serwer nie zna liczby pytań (żyją w aplikacji) - bierzemy ją z kopii.
        var merged = Object.assign({}, FROZEN, d, { questions: FROZEN.questions });
        if (!Array.isArray(merged.panel_province_list)) merged.panel_province_list = FROZEN.panel_province_list;
        merged.__live = true;
        land(merged, true);
      })
      .catch(function () { clearTimeout(timer); land(Object.assign({}, FROZEN), false); });
  })();

  /* ───────────────────── napisy malowane przewijaniem ───────────────────── */
  var paints = $$(".paint").map(function (h) {
    var text = h.textContent.trim().replace(/\s+/g, " ");
    var i = 0;
    var esc = function (c) { return c === "<" ? "&lt;" : c === "&" ? "&amp;" : c; };
    h.setAttribute("aria-label", text);
    h.innerHTML = text.split(" ").map(function (w) {
      return '<span class="pw" aria-hidden="true">' + Array.from(w).map(function (ch) {
        return '<span class="pl" style="--i:' + (i++) + '">' + esc(ch) + "</span>";
      }).join("") + "</span>";
    }).join(" ");
    h.style.setProperty("--n", i);
    h.style.setProperty("--p", reduced ? "1" : "0");
    return { el: h, p: -1, beach: !!h.closest(".beach"), tw: TW(1150) };
  });

  /* ─────────────────────────── odsłanianie ─────────────────────────── */
  var revealTargets = $$(".section-head, .faq-col, .support-card, .reel-nav, .flow, .dl-copy > p, .footer > *");
  revealTargets.forEach(function (el) { el.classList.add("reveal"); });
  if ("IntersectionObserver" in window && !reduced) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.transitionDelay = Math.min(sibs, 4) * 90 + "ms";
        el.classList.add("in");
        rio.unobserve(el);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    revealTargets.forEach(function (el) { rio.observe(el); });
  } else revealTargets.forEach(function (el) { el.classList.add("in"); });

  // Kod QR: skaner przejeżdża po kodzie, gdy kod wjedzie na ekran.
  var qr = $(".qr");
  if (qr && "IntersectionObserver" in window) {
    var qio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { qr.classList.add("in"); qio.disconnect(); } }, { threshold: 0.6 });
    qio.observe(qr);
  }

  /* ───────────────────────── akcent sekcji i nawigacja ───────────────────────── */
  var sectionAccent = "#E6CCB2";
  var navMap = { top: "top", features: "features", play: "play", gallery: "gallery", beach: "beach", security: "faq", support: "download", download: "download" };
  var tabMap = { top: "top", features: "features", play: "play", gallery: "gallery", beach: "gallery", faq: "gallery", download: "download" };
  var currentNav = "";
  var navSections = $$("main > section");
  if ("IntersectionObserver" in window) {
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var sec = e.target;
        var id = sec.id || "top";
        if (sec.dataset.accent && !sec.classList.contains("story")) { sectionAccent = sec.dataset.accent; setAccent(sectionAccent); }
        setNav(navMap[id] || id);
        guideFor(sec.dataset.bazus || (sec.classList.contains("story") ? "story" : ""));
      });
    }, { rootMargin: "-48% 0px -48% 0px" });
    navSections.forEach(function (s) { nio.observe(s); });
  }

  var navLinks = $$(".board-links a, .board-drop a");
  /* ══════════════════ DOLNE MENU: skacząca piłka z aplikacji ══════════════════
     Port 1:1 z BAZA/app/(tabs)/_layout.tsx (CustomTabBar + TabBall + TabBarNotchBar).
     Te same stałe, czasy i krzywe. Reanimated zastępuje tu Web Animations API -
     z niego zresztą pochodził pierwowzór animacji („Bottom menu ball animation”).
     Każdy kanał ruchu (poziom, spoczynek, unos, skala, sprężystość, obrót) ma
     własną warstwę, tak jak osobne shared values w aplikacji. Ruch tylko przy
     zmianie zakładki - w spoczynku piłka stoi, bez kołysania i pętli. */
  var tabBall = (function () {
    var bar = $("#tabbar");
    if (!bar || !bar.animate) return { go: function () {}, place: function () {} };
    var items = $$(".tb-item", bar);
    var CENTER = 2, SIDE = 50, SC = 64 / 50, ARC = 80, PAD = 6;
    var CEN_Y = 70 * (0.5 - 0.28); // środek beżowego kółka pod górną krawędzią paska
    var FLIGHT = "cubic-bezier(0.33, 1, 0.68, 1)", LAND = "cubic-bezier(0.215, 0.61, 0.355, 1)";
    var X_EASE = "cubic-bezier(0.34, 0.9, 0.42, 1)";
    var q = function (c) { return $(c, bar); };
    var bg = q(".tb-bg"), ped = q(".tb-pedestal"), ring = q(".tb-ring");
    var nx = q(".tb-x"), nRest = q(".tb-rest"), nLift = q(".tb-lift"), nScale = q(".tb-scale"), nSquash = q(".tb-squash"), nSpin = q(".tb-spin");
    var pat = q(".tb-pattern"), patOn = q(".tb-pat-on"), disc = q(".tb-disc"), discIcon = q(".tb-disc-icon"), sheen = q(".tb-sheen");
    var discUse = $("use", discIcon);
    var ICON = { features: "features", play: "play", gallery: "gallery", download: "download" };
    var active = -1, flying = false, pending = -1, born = performance.now();
    var swapT = 0, landT = 0, doneT = 0;

    // Etykieta litera po literze, jak StaggerLabel.
    $$(".tb-label", bar).forEach(function (l) {
      l.innerHTML = l.textContent.split("").map(function (ch, i) { return '<span class="tl" style="--i:' + i + '">' + ch + "</span>"; }).join("");
    });

    function centers() { var w = bar.clientWidth / items.length; return items.map(function (_, i) { return w * i + w / 2; }); }
    function restY(i) { return (i === CENTER ? CEN_Y : 0) - SIDE / 2; }
    function setIcon(i) {
      var key = ICON[items[i].dataset.nav];
      if (!key) return;
      discUse.setAttribute("href", "#ti-" + key);
      discIcon.dataset.icon = key;
    }
    // Ustawia wartość końcową od razu, a animacja tylko do niej dojeżdża -
    // po skończeniu nic nie wisi w `fill: forwards`.
    function run(node, prop, frames, opts) {
      node.getAnimations().forEach(function (a) { a.cancel(); });
      node.style[prop] = frames[frames.length - 1][prop];
      return node.animate(frames, Object.assign({ fill: "backwards" }, opts));
    }
    function fade(node, to, ms, ease, delay) {
      var from = getComputedStyle(node).opacity;
      return run(node, "opacity", [{ opacity: from }, { opacity: String(to) }], { duration: ms, easing: ease || FLIGHT, delay: delay || 0 });
    }
    function notch(x, r, ms) {
      bg.style.setProperty("--nx", x.toFixed(1) + "px");
      bg.style.transition = ms ? "--nr " + ms + "ms " + LAND : "none";
      bg.style.setProperty("--nr", r + "px");
    }
    function mark(i) { items.forEach(function (a, k) { a.classList.toggle("on", k === i); }); }

    // Postawienie piłki bez animacji - stan spoczynku 1:1 z placeInstantly.
    function place(i) {
      clearTimeout(swapT); clearTimeout(landT); clearTimeout(doneT);
      [nx, nRest, nLift, nScale, nSquash, nSpin, pat, patOn, disc, ped, ring, sheen].forEach(function (n) { n.getAnimations().forEach(function (a) { a.cancel(); }); });
      var c = centers(), isC = i === CENTER;
      bar.style.setProperty("--cx", c[CENTER] + "px");
      nx.style.transform = "translateX(" + (c[i] - SIDE / 2).toFixed(1) + "px)";
      nRest.style.transform = "translateY(" + restY(i).toFixed(1) + "px)";
      nLift.style.transform = nSquash.style.transform = nSpin.style.transform = "none";
      nScale.style.transform = "scale(" + (isC ? SC : 1) + ")";
      disc.style.opacity = isC ? "0" : "1";
      pat.style.opacity = isC ? "1" : "0";
      patOn.style.opacity = isC ? "1" : "0";
      ped.style.opacity = isC ? "0" : "1";
      ring.style.opacity = "0";
      notch(c[i], isC ? 0 : SIDE / 2 + PAD, 0);
      setIcon(i);
      active = i; flying = false; pending = -1;
      mark(i);
    }

    function jump(next) {
      if (next < 0 || next === active) { pending = -1; return; }
      if (flying) { pending = next; mark(next); return; }
      // Zmiana zaraz po starcie strony to ustalanie miejsca, nie klik - bez lotu.
      if (active < 0 || reduced || performance.now() - born < 500) { place(next); return; }
      var from = active;
      active = next; flying = true; pending = -1;
      mark(next);
      var c = centers(), isC = next === CENTER, fromC = from === CENTER;
      var dir = next > from ? 1 : -1, dist = Math.abs(next - from);
      var arc = ARC * (0.62 + dist * 0.18), dur = 520 + dist * 90, total = dur + 180;
      var landX = c[next];

      notch(c[from], 0, 200);
      if (fromC) fade(ped, 1, 260, "ease");
      // W locie zawsze zwykła piłka - wzór wraca, dysk z ikoną gaśnie.
      fade(patOn, 0, 340);
      fade(pat, 1, 340);
      fade(disc, 0, 340);

      run(nx, "transform", [{ transform: "translateX(" + (c[from] - SIDE / 2).toFixed(1) + "px)" }, { transform: "translateX(" + (landX - SIDE / 2).toFixed(1) + "px)" }], { duration: dur, easing: X_EASE });
      run(nRest, "transform", [{ transform: "translateY(" + restY(from).toFixed(1) + "px)" }, { transform: "translateY(" + restY(next).toFixed(1) + "px)" }], { duration: dur, easing: X_EASE });
      run(nScale, "transform", [{ transform: "scale(" + (fromC ? SC : 1) + ")" }, { transform: "scale(" + (isC ? SC : 1) + ")" }], { duration: 500, easing: "cubic-bezier(0.22, 1.12, 0.36, 1)" });
      // Łuk: wzlot, opadnięcie, mały doskok, spoczynek - każdy odcinek ze swoją krzywą.
      run(nLift, "transform", [
        { transform: "translateY(0px)", offset: 0, easing: "cubic-bezier(0.15, 0.7, 0.35, 1)" },
        { transform: "translateY(" + (-arc).toFixed(1) + "px)", offset: 0.44, easing: "cubic-bezier(0.6, 0, 0.85, 0.4)" },
        { transform: "translateY(0px)", offset: 0.86, easing: "cubic-bezier(0.5, 0, 0.6, 1)" },
        { transform: "translateY(" + (-arc * 0.13).toFixed(1) + "px)", offset: 0.94, easing: "linear" },
        { transform: "translateY(0px)", offset: 1 },
      ], { duration: total });
      // Squash & stretch zgrany z łukiem.
      run(nSquash, "transform", [
        { transform: "scale(1, 1)", offset: 0, easing: FLIGHT },
        { transform: "scale(0.9, 1.12)", offset: 0.22, easing: FLIGHT },
        { transform: "scale(1, 1)", offset: 0.55, easing: FLIGHT },
        { transform: "scale(1.22, 0.8)", offset: 0.72, easing: FLIGHT },
        { transform: "scale(0.96, 1.05)", offset: 0.84, easing: FLIGHT },
        { transform: "scale(1, 1)", offset: 1 },
      ], { duration: total });
      // Zawsze pełne obroty, żeby ikona wylądowała prosto.
      run(nSpin, "transform", [{ transform: "rotate(0deg)" }, { transform: "rotate(" + dir * 360 * (1 + dist) + "deg)" }], { duration: dur + 120, easing: "cubic-bezier(0.28, 0.7, 0.3, 1)" });
      nSpin.style.transform = "none";

      // Ikona na dysku zmienia się w połowie lotu, gdy dysk jest niewidoczny.
      swapT = setTimeout(function () { setIcon(next); }, dur * 0.5);

      landT = setTimeout(function () {
        // Lądowanie: pierścień, wycięcie, dysk z ikoną, błysk i odbicie ikony.
        ring.style.left = landX + "px";
        ring.style.top = (restY(next) + SIDE / 2) + "px";
        run(ring, "opacity", [{ opacity: 0.75 }, { opacity: 0 }], { duration: 620, easing: LAND });
        ring.animate([{ transform: "scale(0.34)" }, { transform: "scale(1)" }], { duration: 620, easing: LAND });
        notch(landX, isC ? 0 : SIDE / 2 + PAD, 220);
        fade(disc, isC ? 0 : 1, 220);
        fade(pat, isC ? 1 : 0, 220);
        if (isC) { fade(ped, 0, 220, "ease"); fade(patOn, 1, 200); }
        else {
          sheen.animate([
            { transform: "translateX(0px) rotate(18deg)", opacity: 1 },
            { transform: "translateX(" + SIDE * 1.8 + "px) rotate(18deg)", opacity: 1 },
          ], { duration: 720, easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
          discIcon.animate([
            { transform: "scale(2.1) rotate(30deg)", offset: 0, easing: FLIGHT },
            { transform: "scale(0.82) rotate(-8deg)", offset: 0.42, easing: FLIGHT },
            { transform: "scale(1.16) rotate(4deg)", offset: 0.66, easing: FLIGHT },
            { transform: "scale(0.96) rotate(-1deg)", offset: 0.84, easing: FLIGHT },
            { transform: "scale(1) rotate(0deg)", offset: 1 },
          ], { duration: 620 });
        }
      }, dur);

      doneT = setTimeout(function () {
        flying = false;
        if (pending >= 0 && pending !== active) jump(pending);
        else pending = -1;
      }, total);
    }

    // Stuknięcie: piłka leci od razu do celu, a przewijanie w drodze tam jej nie
    // zawraca. Blokada puszcza, gdy strona przestanie jechać.
    var lockUntil = 0, lockT = 0;
    items.forEach(function (a, i) {
      a.addEventListener("click", function () {
        vib(10);
        lockUntil = Date.now() + 1600;
        jump(i);
      });
    });
    window.addEventListener("scroll", function () {
      if (!lockUntil) return;
      clearTimeout(lockT);
      lockT = setTimeout(function () { lockUntil = 0; if (currentNav) tabBall.go(currentNav); }, 180);
    }, { passive: true });
    window.addEventListener("resize", function () { if (active >= 0) place(active); }, { passive: true });

    return {
      go: function (key) {
        if (lockUntil && Date.now() < lockUntil) return;
        var k = tabMap[key] || key;
        var i = items.findIndex(function (a) { return a.dataset.nav === k; });
        if (i >= 0) jump(i);
      },
      place: place,
    };
  })();

  function setNav(key) {
    if (key === currentNav) return;
    currentNav = key;
    navLinks.forEach(function (a) { a.classList.toggle("active", a.dataset.nav === key); });
    tabBall.go(key);
  }
  setNav("top");

  // Menu sekcji na węższych ekranach.
  var board = $("#board"), menuBtn = $(".board-menu"), drop = $(".board-drop");
  function closeDrop() { if (drop) { drop.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); } }
  if (menuBtn && drop) {
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !drop.classList.contains("open");
      drop.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    drop.addEventListener("click", closeDrop);
    document.addEventListener("click", function (e) { if (!drop.contains(e.target)) closeDrop(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrop(); });
  }

  /* ───────────────────────────── Bazuś ───────────────────────────── */
  var guide = $("#guide");
  var bubble = guide ? $(".guide-bubble", guide) : null;
  var TIPS = {
    play: "Przewijaj dalej, a tor pojedzie w bok!",
    gallery: "Przesuń w bok!",
    beach: "Pocztówki z plaży! Stuknij jedną, żeby ją odwrócić.",
    secure: "Twoje hasło zostaje w telefonie. Gwiżdżę na to!",
    faq: "Nie ma głupich pytań. Są tylko niezadane.",
    support: "Bez reklam. Dzięki patronom!",
    download: "No to co, wchodzisz do BAZY?",
  };
  var PANEL_TIPS = [
    "",
    "Zaznacz odpowiedź i sprawdź.",
    "START CZAS, a potem bramka!",
    "Wybierz halę i licz.",
    "Stuknij swój okręg.",
  ];
  var CHAPTER_TIPS = [
    "Przewijaj powoli.",
    "Zmiana godziny meczu? Dowiesz się pierwszy.",
    "ProEl działa nawet w hali bez zasięgu.",
    "Sprawdzisz się niżej, w quizie z przepisów!",
    "Wszystkie oceny w jednym miejscu.",
    "Ile meczów w tym sezonie? Policzę.",
    "Ryczałt co do grosza, jak na rachunku ZPRP.",
    "Hala na drugim końcu województwa? Jedno stuknięcie.",
    "Panel okręgu włącza Twoja komisja.",
    "",
  ];
  var FUN = [
    "Fiuuu! W BAZIE są 432 pytania z przepisów.",
    "W aplikacji wołasz mnie potrząśnięciem telefonu.",
    "Kara 2 minut? W ProElu odliczam ją za Ciebie.",
    "Stawkę ryczałtu biorę z daty meczu.",
    "Mecz testowy w ProElu nigdy nie trafia do ZPRP.",
    "Spójrz na tablicę u góry: BAZA prowadzi z papierem!",
  ];
  var guideKey = "";
  var talkTimer = null;
  function say(text, ms) {
    if (!guide || !bubble) return;
    clearTimeout(talkTimer);
    if (!text) { guide.classList.remove("talk"); return; }
    bubble.textContent = text;
    guide.classList.add("talk");
    // Na telefonie dymek zasłania treść, więc znika szybciej.
    var dur = ms || 5200;
    if (isMobile()) dur = Math.min(dur, 3200);
    talkTimer = setTimeout(function () { guide.classList.remove("talk"); }, dur);
  }
  function nod() {
    if (!guide || reduced) return;
    guide.classList.remove("nod"); void guide.offsetWidth; guide.classList.add("nod");
  }
  function guideFor(key) {
    if (!guide || key === guideKey) return;
    guideKey = key;
    var show = key && key !== "hero";
    guide.classList.toggle("show", !!show);
    if (!show) { say(""); return; }
    if (key === "story") return; // podpowiedzi rozdziałów daje pętla historii
    nod();
    say(TIPS[key] || "");
  }
  if (guide) {
    var funIdx = Math.floor(Math.random() * FUN.length);
    $(".guide-bazus", guide).addEventListener("click", function () {
      funIdx = (funIdx + 1) % FUN.length;
      nod(); say(FUN[funIdx], 5600);
      vib(12);
      askMotion();
    });
  }
  // Potrząśnięcie telefonem woła Bazusia - jak w aplikacji.
  var motionAsked = false;
  function askMotion() {
    if (motionAsked || !isMobile()) return;
    motionAsked = true;
    var D = window.DeviceMotionEvent;
    if (D && typeof D.requestPermission === "function") D.requestPermission().then(listenShake).catch(function () {});
    else listenShake("granted");
  }
  function listenShake(state) {
    if (state !== "granted") return;
    var last = 0;
    window.addEventListener("devicemotion", function (e) {
      var a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      var f = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      var now = Date.now();
      if (f > 38 && now - last > 1800) {
        last = now;
        guide.classList.add("show");
        nod(); funIdx = (funIdx + 1) % FUN.length; say(FUN[funIdx], 5600);
      }
    });
  }

  // Bazuś w hero: stuknięcie = gwizdek i nowa kwestia.
  var heroBazus = $(".hero-bazus");
  if (heroBazus) {
    var heroLines = ["Gwizdek gotowy? To lecimy!", "Fiuuu! Przewiń w dół.", "Mecz za 2 dni. Zdążysz?", "Ja tu tylko sędziuję."];
    var hb = 0;
    heroBazus.style.pointerEvents = "auto";
    heroBazus.style.cursor = "pointer";
    heroBazus.addEventListener("click", function () {
      hb = (hb + 1) % heroLines.length;
      heroBazus.classList.remove("wave"); void heroBazus.offsetWidth; heroBazus.classList.add("wave");
      $(".bubble-hero").textContent = heroLines[hb];
      vib(10);
    });
  }

  // Zdarzenia z prawdziwych ekranów aplikacji (wyspa): Bazuś komentuje.
  var PROEL_LINES = {
    goal: "Bramka! Już jest w protokole.",
    penalty: "2 minuty! Odliczam karę za Ciebie.",
    warning: "Żółta kartka. Spokojnie, kolego.",
    disq: "Czerwona kartka! To już poważna sprawa.",
    timeout: "Czas dla drużyny. Minuta na taktykę.",
    start: "Czas biegnie! Pilnuj kar.",
    half: "Koniec połowy. Herbata w szatni!",
  };
  var lastProelTalk = 0;
  document.addEventListener("proel:event", function (e) {
    var line = PROEL_LINES[e.detail && e.detail.type];
    if (!line || Date.now() - lastProelTalk < 1500) return;
    lastProelTalk = Date.now();
    nod(); say(line, 3200);
  });
  document.addEventListener("calc:result", function (e) {
    var t = e.detail && e.detail.total;
    if (typeof t !== "number") return;
    nod(); say("Wychodzi " + new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t) + " zł. Jak na rachunku ZPRP!", 4200);
  });
  document.addEventListener("quiz:answer", function (e) {
    nod();
    say(e.detail && e.detail.ok ? "Brawo! Delegat byłby zadowolony." : "Prawie! Następne będzie Twoje.", 3800);
  });

  /* ───────────────────────── przechył hero za kursorem ───────────────────────── */
  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    var orbit = $(".hero-orbit"), glow = $(".bg-glow");
    window.addEventListener("pointermove", function (e) {
      var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      if (orbit && scrollY < innerHeight) { orbit.style.setProperty("--ty", (nx * 14) + "deg"); orbit.style.setProperty("--tx", (-ny * 10) + "deg"); }
      if (glow) { glow.style.setProperty("--gx", (nx * 6) + "vmax"); glow.style.setProperty("--gy", (ny * 6) + "vmax"); }
    }, { passive: true });
  }

  /* ══════════════════════ TABLICA WYNIKÓW ══════════════════════
     BAZA kontra PAPIER. Zegar meczu to postęp strony (60 minut),
     każda sekcja z `data-goal` to bramka dla BAZY. Cofanie odejmuje. */
  var bug = $("#bug");
  var goalSecs = $$("[data-goal]");
  var scoreEls = $$('.score[data-score="home"], .bug-score [data-score="home"]');
  var boardEvent = $(".board-event");
  var mmEl = $(".digits .mm"), ssEl = $(".digits .ss"), halfEl = $(".half"), bugClock = $(".bug-clock"), bugHalf = $(".bug-half");
  var boardFill = $(".board-fill");
  var goals = -1, lastClock = "", lastHalf = "", eventTimer = null, tickTimer = null;
  var boardLine = $(".board-line"), boardTicks = [];

  function layoutTicks() {
    if (!boardLine) return;
    boardTicks.forEach(function (t) { t.remove(); });
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    boardTicks = goalSecs.map(function (s) {
      var t = document.createElement("span");
      t.className = "board-tick";
      t.style.left = clamp((docTop(s) - innerHeight * 0.5) / max, 0, 1) * 100 + "%";
      boardLine.appendChild(t);
      return t;
    });
  }

  function setDigit(el, val, up) {
    var cur = el.querySelector("i") || el;
    if (el.classList.contains("score")) {
      // Stara cyfra ucieka w górę, nowa wskakuje z dołu - jak w ProElu przy bramce.
      // Wszystkie żywe cyfry, nie tylko pierwsza: przy szybkim przewijaniu
      // (np. skok na górę) zmiany przychodzą częściej niż trwa animacja
      // i niewymieniona cyfra zostawała na tablicy obok nowej.
      el.querySelectorAll("i:not(.out)").forEach(function (old) {
        old.className = "out";
        setTimeout(function () { old.remove(); }, 450);
      });
      var n = document.createElement("i");
      n.textContent = val;
      n.className = up ? "in" : "down";
      el.appendChild(n);
    } else {
      cur.textContent = val;
      cur.classList.remove("in"); void cur.offsetWidth;
      if (up) cur.classList.add("in");
    }
  }

  function goalEvent(label, clock) {
    if (boardEvent) {
      $("time", boardEvent).textContent = clock;
      $("span", boardEvent).textContent = "Bramka · " + label;
      boardEvent.classList.add("show");
    }
    if (bug) {
      $(".bug-goal", bug).textContent = "Gol! " + label;
      bug.classList.add("goal");
    }
    $$('.score[data-score="home"]').forEach(function (s) { s.classList.add("goal"); });
    clearTimeout(eventTimer);
    eventTimer = setTimeout(function () {
      if (boardEvent) boardEvent.classList.remove("show");
      if (bug) bug.classList.remove("goal");
      $$('.score[data-score="home"]').forEach(function (s) { s.classList.remove("goal"); });
    }, 2600);
  }

  function renderBoard(max) {
    var p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    var secs = Math.round(p * 3600);
    var clock = String(Math.floor(secs / 60)).padStart(2, "0") + ":" + String(secs % 60).padStart(2, "0");
    if (clock !== lastClock) {
      lastClock = clock;
      if (mmEl) { mmEl.textContent = clock.slice(0, 2); ssEl.textContent = clock.slice(3); }
      if (bugClock) bugClock.textContent = clock;
    }
    var half = p >= 0.998 ? "KONIEC MECZU" : p < 0.5 ? "I POŁOWA" : "II POŁOWA";
    if (half !== lastHalf) {
      lastHalf = half;
      if (halfEl) halfEl.textContent = half;
      if (bugHalf) bugHalf.textContent = half === "KONIEC MECZU" ? "KONIEC" : half;
    }
    if (boardFill) boardFill.style.setProperty("--progress", p.toFixed(4));
    // Dwukropek mruga tylko wtedy, gdy zegar „chodzi”, czyli w trakcie przewijania.
    if (board && !isMobile()) {
      if (!board.classList.contains("ticking")) board.classList.add("ticking");
      clearTimeout(tickTimer);
      tickTimer = setTimeout(function () { board.classList.remove("ticking"); }, 700);
      var cmp = scrollY > 60;
      if (cmp !== board.classList.contains("compact")) board.classList.toggle("compact", cmp);
    }
    var n = 0, label = "";
    goalSecs.forEach(function (s, i) {
      var hit = rectOf(s).top <= innerHeight * 0.5;
      if (boardTicks[i] && boardTicks[i].classList.contains("on") !== hit) boardTicks[i].classList.toggle("on", hit);
      if (hit) { n = i + 1; label = s.dataset.goal; }
    });
    if (goals < 0) {
      // Pierwszy odczyt (np. odświeżenie w połowie strony) - wynik bez animacji.
      goals = n;
      scoreEls.forEach(function (el) { (el.querySelector("i") || el).textContent = n; });
      return;
    }
    if (n !== goals) {
      var up = n > goals;
      goals = n;
      scoreEls.forEach(function (el) { setDigit(el, n, up); });
      if (up) { goalEvent(label, clock); vib(18); }
    }
  }

  /* ───────────────────────────── historia ───────────────────────────── */
  var story = $(".story");
  var chapters = $$(".chapter");
  var rail = $(".story-rail");
  var railBtns = rail ? $$("button", rail) : [];
  var railFill = $(".story-rail-fill");
  var railCount = $(".story-count b");
  var ACCENTS = chapters.map(function (c) { return c.dataset.accent; });
  var LAST = chapters.length - 1;
  var storyTarget = 0, storyCur = 0, storyIn = false, lastTip = -1, railGeo = null;

  function storyRaw() {
    var r = rectOf(story);
    var total = r.height - innerHeight;
    var f = clamp(-r.top / Math.max(total, 1), 0, 1);
    var raw = f * LAST;
    // Każdy rozdział najpierw STOI (czas na przeczytanie), potem przechodzi.
    var i = Math.min(Math.floor(raw), LAST - 1);
    var t = raw - i;
    return { value: i + smooth((t - 0.32) / 0.56), inside: r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5 };
  }
  var lastStoryP = NaN;
  function renderStory(p) {
    // Poza historią postęp stoi (0 albo koniec) - wtedy nie ruszamy ekranów
    // aplikacji ani rozdziałów. Wcześniej przerysowywały się w każdej klatce
    // przewijania, także daleko niżej, przy zrzutach.
    if (p === lastStoryP) return;
    lastStoryP = p;
    if (window.BazaStory && window.BazaStory.ready) window.BazaStory.set(p);
    var mobile = isMobile();
    chapters.forEach(function (c, i) {
      var d = p - i;
      var o = clamp(1 - Math.abs(d) * 2.4, 0, 1);
      c.style.setProperty("--co", o.toFixed(3));
      c.style.setProperty("--cy", (-d * (mobile ? 40 : 70)).toFixed(1) + "px");
      c.classList.toggle("on", o > 0.6);
    });
    // Barwa rozdziału zmienia się raz na rozdział (płynnie, przejściem CSS),
    // a nie w każdej klatce - zmiana na korzeniu przelicza style całej strony.
    if (storyIn) setAccent(ACCENTS[clamp(Math.round(p), 0, LAST)]);
    if (railBtns.length && railFill) {
      if (!railGeo) {
        var b0 = railBtns[0], b1 = railBtns[1] || b0;
        railGeo = { left: b0.offsetLeft, step: b1.offsetLeft - b0.offsetLeft };
        railFill.style.width = b0.offsetWidth + "px";
      }
      railFill.style.setProperty("--rx", (railGeo.left + p * railGeo.step).toFixed(1) + "px");
      var n = Math.round(p);
      railBtns.forEach(function (b, k) { b.classList.toggle("done", k <= n); });
      if (railCount) railCount.textContent = String(n + 1).padStart(2, "0");
      if (storyIn && n !== lastTip && guide) {
        lastTip = n;
        guide.classList.toggle("show", n < LAST);
        if (n < LAST) { nod(); say(CHAPTER_TIPS[n], 4200); } else say("");
      }
    }
  }
  if (rail) {
    rail.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-go]");
      if (!b) return;
      var i = +b.dataset.go;
      var total = story.offsetHeight - innerHeight;
      window.scrollTo({ top: docTop(story) + (i / LAST) * total + 2, behavior: reduced ? "auto" : "smooth" });
    });
  }
  window.addEventListener("bazastory:ready", function () { lastStoryP = NaN; window.BazaStory.set(storyCur); });

  /* ══════════════════ SPRAWDŹ SAM: poziomy tor ══════════════════
     Na komputerze sekcja jest wysoka, a tor w środku przypięty: przewijanie
     w dół przesuwa tor w bok, 1 piksel na 1 piksel. Na telefonie panele
     stoją jeden pod drugim i wjeżdżają na zmianę z lewej i prawej. */
  var play = $("#play"), htrack = $("#htrack");
  var panels = $$(".panel");
  var hbarBtns = $$(".hbar button"), hbarFill = $(".hbar-fill");
  var trackMax = 0, hold = 0, panelIdx = -1, trackX = 0;
  function layoutTrack() {
    if (!play || !htrack) return;
    if (isNarrow()) { trackMax = 0; play.style.removeProperty("--ph"); htrack.style.removeProperty("--hx"); return; }
    hold = innerHeight * 0.3;
    trackMax = Math.max(0, htrack.scrollWidth - innerWidth);
    play.style.setProperty("--ph", (innerHeight + trackMax + hold * 2) + "px");
  }
  function trackTargetY(i) {
    var p = panels[i];
    var x = clamp(p.offsetLeft + p.offsetWidth / 2 - innerWidth / 2, 0, trackMax);
    if (i === 0) x = 0;
    return docTop(play) + hold + x + (i === panels.length - 1 ? hold * 0.5 : 0);
  }
  hbarBtns.forEach(function (b) {
    b.addEventListener("click", function () { window.scrollTo({ top: trackTargetY(+b.dataset.hgo), behavior: reduced ? "auto" : "smooth" }); });
  });
  function renderTrack(vh, vw) {
    if (!play) return;
    var r = rectOf(play);
    if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) return;
    if (isNarrow()) {
      panels.forEach(function (p, i) {
        var pr = rectOf(p);
        if (!p._tw) p._tw = TW(800);
        var e = easeOut(tw(p._tw, gate(p._tw, pr.top, vh * 0.85, vh)));
        if (pr.top > vh * 1.2 || pr.bottom < -vh * 0.2) return;
        p.style.setProperty("--pe", e.toFixed(3));
        p.style.setProperty("--side", i % 2 ? "-1" : "1");
      });
      return;
    }
    var x = clamp(-r.top - hold, 0, trackMax);
    trackX = x;
    htrack.style.setProperty("--hx", (-x).toFixed(1) + "px");
    var best = 0, bestD = 1e9;
    panels.forEach(function (p, i) {
      var c = p.offsetLeft + p.offsetWidth / 2 - x;
      var d = (c - vw / 2) / vw;
      p.style.setProperty("--pd", clamp(d, -1.5, 1.5).toFixed(3));
      p.style.setProperty("--pa", Math.min(1, Math.abs(d)).toFixed(3));
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
    });
    if (best !== panelIdx) {
      panelIdx = best;
      hbarBtns.forEach(function (b, i) { b.classList.toggle("on", i === best); });
      var on = hbarBtns[best];
      if (on && hbarFill) {
        hbarFill.style.setProperty("--hw", on.offsetWidth + "px");
        hbarFill.style.setProperty("--hl", on.offsetLeft + "px");
      }
      if (r.top < 0 && PANEL_TIPS[best]) { nod(); say(PANEL_TIPS[best], 4200); }
    }
  }

  /* ══════════════════ GALERIA: prawdziwe zrzuty w bok ══════════════════
     Zwykłe przewijanie poziome (palec, touchpad, Shift + kółko) z zatrzaskiem
     na środku. Pionowe kółko dalej przewija stronę. Telefony obracają się
     w 3D zależnie od odległości od środka, jak karuzela okładek. */
  var gallery = $("#gallery"), reel = $("#reel");
  var shots = reel ? $$(".shot", reel) : [];
  var reelLabel = $(".reel-label b"), reelCount = $(".reel-count"), reelBar = $(".reel-bar");
  var reelPrev = $('.reel-nav [data-dir="-1"]'), reelNext = $('.reel-nav [data-dir="1"]');
  var reelIdx = -1, reelRaf = 0;
  function reelStep() { return shots.length > 1 ? shots[1].offsetLeft - shots[0].offsetLeft : 1; }
  function renderReel() {
    reelRaf = 0;
    if (!reel || !shots.length) return;
    var step = reelStep(), mid = reel.scrollLeft + reel.clientWidth / 2;
    var best = 0, bestD = 1e9;
    shots.forEach(function (s, i) {
      var d = (s.offsetLeft + s.offsetWidth / 2 - mid) / step;
      var ad = Math.abs(d);
      var inn = s.firstElementChild;
      if (ad > 4.5) { inn.style.setProperty("--br", "0.3"); return; }
      inn.style.setProperty("--ry", clamp(-d * 24, -58, 58).toFixed(2) + "deg");
      inn.style.setProperty("--tz", (-Math.min(ad, 3) * 130).toFixed(1) + "px");
      inn.style.setProperty("--sc", (1 - Math.min(ad, 3) * 0.04).toFixed(3));
      inn.style.setProperty("--br", (1 - Math.min(ad, 2.5) * 0.24).toFixed(3));
      s.style.zIndex = String(100 - Math.round(ad * 10));
      if (ad < bestD) { bestD = ad; best = i; }
    });
    if (best !== reelIdx) {
      reelIdx = best;
      shots.forEach(function (s, i) { s.classList.toggle("is-current", i === best); });
      if (reelLabel) reelLabel.textContent = shots[best].dataset.title || "";
      if (reelCount) reelCount.textContent = (best + 1) + " / " + shots.length;
      if (reelBar) reelBar.style.setProperty("--rp", (best / Math.max(1, shots.length - 1)).toFixed(3));
      if (reelPrev) reelPrev.disabled = best === 0;
      if (reelNext) reelNext.disabled = best === shots.length - 1;
    }
  }
  function goShot(i) {
    if (!reel) return;
    i = clamp(i, 0, shots.length - 1);
    var s = shots[i];
    reel.scrollTo({ left: s.offsetLeft + s.offsetWidth / 2 - reel.clientWidth / 2, behavior: reduced ? "auto" : "smooth" });
  }
  if (reel && shots.length) {
    reel.addEventListener("scroll", function () { if (!reelRaf) reelRaf = requestAnimationFrame(renderReel); }, { passive: true });
    $$(".reel-nav [data-dir]").forEach(function (b) { b.addEventListener("click", function () { goShot(reelIdx + (+b.dataset.dir)); }); });
    reel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goShot(reelIdx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goShot(reelIdx - 1); }
    });
    // Myszką: chwyć i przeciągnij. Palec i touchpad przewijają natywnie.
    var dragX = null, dragLeft = 0, dragMoved = false;
    reel.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragX = e.clientX; dragLeft = reel.scrollLeft; dragMoved = false;
    });
    window.addEventListener("pointermove", function (e) {
      if (dragX === null) return;
      var dx = e.clientX - dragX;
      if (!dragMoved && Math.abs(dx) > 5) { dragMoved = true; reel.classList.add("dragging"); }
      if (dragMoved) reel.scrollLeft = dragLeft - dx;
    });
    window.addEventListener("pointerup", function () {
      if (dragX === null) return;
      dragX = null;
      if (!dragMoved) return;
      reel.classList.remove("dragging");
      requestAnimationFrame(function () { renderReel(); goShot(reelIdx); });
    });
    reel.addEventListener("click", function (e) {
      if (dragMoved) { e.preventDefault(); e.stopPropagation(); dragMoved = false; return; }
      var s = e.target.closest(".shot");
      if (s) { var i = shots.indexOf(s); if (i !== reelIdx) goShot(i); }
    }, true);
    renderReel();
  }

  /* ══════════════════ PLAŻA: pocztówki ══════════════════ */
  var beach = $(".beach");
  var cards = beach ? $$(".pc", beach) : [];
  var flipped = new Set();
  var beachP = 0, beachTw = TW(2700), beachIn = TW(900);
  cards.forEach(function (c, i) {
    c.addEventListener("click", function () {
      if (flipped.has(i)) flipped.delete(i); else flipped.add(i);
      vib(8);
      kick();
    });
  });
  (function footprints() {
    var svg = beach ? $(".steps", beach) : null;
    if (!svg) return;
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    var html = "";
    for (var i = 0; i < 14; i++) {
      var t = i / 13;
      var x = 140 + t * 380 + Math.sin(t * 5) * 30, y = 560 - t * 470;
      var side = i % 2 ? 1 : -1;
      var ang = -50 + Math.cos(t * 5) * 10;
      x += side * 12;
      html += '<path style="--i:' + i + '" transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + ang.toFixed(1) + ')" d="M-6 0a6 11 0 1 0 12 0a6 11 0 1 0-12 0M-6-15a2.2 2.2 0 1 0 0.1 0M-1.5-17a2.2 2.2 0 1 0 0.1 0M3-16a2 2 0 1 0 0.1 0M6.5-13a1.8 1.8 0 1 0 0.1 0"/>';
    }
    svg.innerHTML = html;
  })();
  function renderBeach(vh) {
    if (!beach) return;
    var r = rectOf(beach);
    // Dwa etapy: wjazd (pocztówki spadają, odwracają się, idą ślady) i fala.
    // Każdy rusza po progu i gra do końca, nawet gdy przewijanie stanie.
    var raw = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
    var target = raw >= 0.8 ? 1 : r.top < vh * 0.25 ? 0.62 : 0;
    var p = tw(beachTw, target);
    var bin = easeOut(tw(beachIn, gate(beachIn, r.top, vh * 0.75, vh)));
    if (r.top > vh || r.bottom < 0) return;
    beachP = p;
    var w = smooth((p - 0.8) / 0.17);
    beach.style.setProperty("--bp", p.toFixed(3));
    beach.style.setProperty("--bin", bin.toFixed(3));
    beach.style.setProperty("--sun", smooth(p / 0.32).toFixed(3));
    beach.style.setProperty("--fp", clamp((p - 0.22) / 0.42, 0, 1).toFixed(3));
    beach.style.setProperty("--bc", (smooth((p - 0.17) / 0.12) * (1 - smooth((p - 0.8) / 0.09))).toFixed(3));
    beach.style.setProperty("--w", w.toFixed(3));
    cards.forEach(function (c, k) {
      var t = reduced ? 1 : smooth((p - 0.06 - k * 0.045) / 0.17);
      var f = reduced ? 1 : smooth((p - 0.2 - k * 0.04) / 0.1);
      if (flipped.has(k)) f = 1 - f;
      c.style.setProperty("--t", t.toFixed(3));
      c.style.setProperty("--f", f.toFixed(3));
      c.style.setProperty("--wy", (w * (30 + k * 6)).toFixed(2));
      c.style.setProperty("--wo", smooth((p - 0.84 - k * 0.01) / 0.1).toFixed(3));
    });
  }

  /* ══════════════════ KURTYNY SEKCJI ══════════════════
     Sekcja odsłania się kształtem, gdy wjeżdża od dołu: kopuła, przekątna,
     zaokrąglone okno albo koło ze środka. Po pełnym wejściu kształt znika. */
  var curtains = reduced ? [] : $$(".curtain");
  function renderCurtains(vh) {
    curtains.forEach(function (el) {
      var r = rectOf(el);
      if (!el._tw) el._tw = TW(1000);
      var e = easeOut(tw(el._tw, gate(el._tw, r.top, vh * 0.88, vh)));
      if (r.bottom < 0) { if (el.classList.contains("cut")) el.classList.remove("cut"); return; }
      if (e >= 0.999) { if (el.classList.contains("cut")) el.classList.remove("cut"); return; }
      var W = r.width, H = r.height, clip;
      switch (el.dataset.curtain) {
        case "circle":
          clip = "circle(" + (e * Math.hypot(W / 2, vh) * 1.08).toFixed(1) + "px at 50% 0px)";
          break;
        case "circle-center": {
          var cy = Math.min(H * 0.42, vh * 0.5);
          clip = "circle(" + (e * Math.hypot(W / 2, Math.max(cy, H - cy)) * 1.06).toFixed(1) + "px at 50% " + cy.toFixed(0) + "px)";
          break;
        }
        case "diag": {
          var k = 0.55 * H, X = e * (W + k + 40);
          clip = "polygon(0 0, " + X.toFixed(1) + "px 0, " + (X - k).toFixed(1) + "px " + H.toFixed(0) + "px, 0 " + H.toFixed(0) + "px)";
          break;
        }
        default: {
          var ix = (1 - e) * W * 0.2, iy = (1 - e) * Math.min(H, vh) * 0.28;
          clip = "inset(" + iy.toFixed(1) + "px " + ix.toFixed(1) + "px " + iy.toFixed(1) + "px " + ix.toFixed(1) + "px round " + (40 + (1 - e) * 120).toFixed(0) + "px)";
        }
      }
      el.style.setProperty("--clip", clip);
      if (!el.classList.contains("cut")) el.classList.add("cut");
    });
  }

  /* ══════════════════ LECĄCY TELEFON ══════════════════
     Jeden telefon wychodzi ze sceny historii, ląduje w torze „Sprawdź sam”,
     wraca zza lewej krawędzi do galerii (oddaje miejsce prawdziwemu zrzutowi)
     i na koniec przylatuje do sekcji pobierania. W locie robi pełny obrót,
     a ekran zmienia się, gdy widać plecy telefonu. */
  var flyer = reduced ? null : $("#flyer");
  var flyShotA = flyer ? $(".flyer-shot.a", flyer) : null, flyShotB = flyer ? $(".flyer-shot.b", flyer) : null;
  var slotPlay = $('[data-fly="play"]'), slotDl = $('[data-fly="download"]');
  var stageWrap = $(".story-stage-wrap");
  var firstShot = shots[0] ? shots[0].firstElementChild : null;
  var SHOT = function (n) { return "/Grafiki/site/zrzuty/" + n + ".webp"; };
  var flyState = "";
  function slotBox(el, tilt) {
    var r = el.getBoundingClientRect();
    var w = el.offsetWidth || r.width, h = el.offsetHeight || r.height;
    return { x: r.left + r.width / 2 - w / 2, y: r.top + r.height / 2 - h / 2, w: w, tilt: tilt || 0 };
  }
  function setShots(a, b) {
    var key = a + ">" + b;
    if (key === flyState) return;
    flyState = key;
    if (a && flyShotA.getAttribute("src") !== SHOT(a)) flyShotA.src = SHOT(a);
    if (b && flyShotB.getAttribute("src") !== SHOT(b)) flyShotB.src = SHOT(b);
  }
  function placeFlyer(box, o) {
    flyer.style.setProperty("--fx", box.x.toFixed(1) + "px");
    flyer.style.setProperty("--fy", box.y.toFixed(1) + "px");
    flyer.style.setProperty("--fw", box.w.toFixed(1) + "px");
    flyer.style.setProperty("--fz", (box.tilt || 0).toFixed(2) + "deg");
    flyer.style.setProperty("--fr", (o.spin || 0).toFixed(1) + "deg");
    flyer.style.setProperty("--fq", (o.bob || 0).toFixed(1) + "deg");
    flyer.style.setProperty("--fo", (o.op == null ? 1 : o.op).toFixed(3));
    flyer.style.setProperty("--fb", (o.fb || 0).toFixed(3));
  }
  function flight(from, to, u) {
    var e = smooth(u);
    var box = { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - Math.sin(e * Math.PI) * innerHeight * 0.08, w: lerp(from.w, to.w, e), tilt: lerp(from.tilt, to.tilt, e) };
    return { box: box, spin: e * 360, bob: Math.sin(e * Math.PI) * 12, fb: e > 0.5 ? 1 : 0 };
  }
  // Trzy loty: ze sceny historii do toru, zza lewej krawędzi na pierwszy zrzut
  // galerii i z prawego dołu do pobierania. Próg odpala lot, a telefon sam
  // dolatuje w swoim tempie - nie wisi w powietrzu, gdy przewijanie stanie.
  var fly1 = TW(950), fly2 = TW(950), fly3 = TW(950);
  function renderFlyer(vh, vw) {
    if (!flyer || !story || !play || !slotPlay) return;
    var y = scrollY;
    var yStoryEnd = geoTop(story) + rectOf(story).height - vh;
    var playBox = slotBox(slotPlay, isNarrow() ? 5 : 6);
    // Slot odczytany przed przesunięciem toru w tej klatce - doliczamy przesunięcie.
    if (!isNarrow()) playBox.x += trackX - clamp(-rectOf(play).top - hold, 0, trackMax);
    var shotBox = firstShot ? slotBox(firstShot, 0) : null;
    var yGal = shotBox ? Math.min(y + shotBox.y + shotBox.w / 0.944 - vh / 2, geoTop(gallery) - 2) : Infinity;
    var dlBox = slotDl ? slotBox(slotDl, isNarrow() ? 0 : -6) : null;
    var yDl = dlBox ? Math.min(y + dlBox.y + dlBox.w / 0.944 - vh / 2, geoTop(dl) - 2) : Infinity;

    var u1 = tw(fly1, y >= yStoryEnd - vh * 0.02 ? 1 : 0);
    var u2 = tw(fly2, y >= yGal - vh * 0.55 ? 1 : 0);
    var u3 = tw(fly3, y >= yDl - vh * 0.5 ? 1 : 0);
    var on = false, docked = false;

    if (dlBox && u3 > 0) {
      setShots("glowna", "start-gra");
      if (u3 < 1) {
        var from3 = { x: vw + dlBox.w * 0.3, y: vh * 0.85, w: dlBox.w * 0.8, tilt: 24 };
        var f3 = flight(from3, dlBox, u3);
        placeFlyer(f3.box, { spin: f3.spin, bob: f3.bob, fb: f3.fb });
        on = true;
      } else {
        placeFlyer(dlBox, { fb: 1 });
        on = dlBox.y < vh + 60;
      }
    } else if (shotBox && u2 > 0 && (u2 < 1 || y < yGal)) {
      // Wraca zza lewej krawędzi i ląduje na pierwszym zrzucie, potem oddaje mu miejsce.
      var from2 = { x: -shotBox.w * 1.4, y: vh / 2 - shotBox.w / 0.944, w: shotBox.w * 0.9, tilt: -18 };
      var f2 = flight(from2, shotBox, u2);
      setShots("mecze", "glowna");
      placeFlyer(f2.box, { spin: f2.spin, bob: f2.bob, fb: f2.fb });
      on = true; docked = true;
    } else if (u1 > 0 && u2 === 0) {
      setShots("mecze", "mecze");
      if (u1 < 1) {
        // Wyłania się ze sceny historii i leci do toru.
        var sr = stageWrap.getBoundingClientRect();
        var sw = Math.min(sr.height * 0.62 * 0.472, sr.width * 0.5);
        var from = { x: sr.left + sr.width / 2 - sw / 2, y: sr.top + sr.height / 2 - sw / 0.944, w: sw, tilt: 0 };
        var f = flight(from, playBox, u1);
        placeFlyer(f.box, { spin: f.spin, bob: f.bob, op: smooth(u1 / 0.25), fb: 1 });
        on = true;
      } else {
        // Zadokowany w torze: jedzie razem z panelem, aż zniknie za krawędzią.
        placeFlyer(playBox, { fb: 1 });
        on = playBox.x + playBox.w > -40 && playBox.x < vw + 40 && playBox.y < vh + 40 && playBox.y + playBox.w * 2.2 > -40;
      }
    }
    flyer.classList.toggle("on", on);
    if (gallery) gallery.classList.toggle("dock", docked);
  }

  /* ───────────────────────── droga danych i finał ───────────────────────── */
  var flow = $("#flow"), flowPath = $("#flowPath"), packet = $(".packet"), flowLen = 0;
  var flowNodes = $$(".flow-node"), flowCaption = $(".flow-caption");
  var FLOW_TEXT = [
    "Pakiet jest szyfrowany kluczem publicznym RSA, zanim opuści telefon.",
    "Serwer odszyfrowuje go tylko na czas operacji. Hasło nie zostaje na serwerze.",
    "baza.zprp.pl zapisuje wynik, a do Ciebie wraca tylko „udało się”.",
  ];
  var flowStage = -1;
  if (flowPath) { flowLen = flowPath.getTotalLength(); flow.style.setProperty("--fl", flowLen.toFixed(0)); }
  var dl = $(".download");
  var bgWaves = $(".bg-waves"), docMax = 0, lastHs = -1;
  var flowTw = TW(2800), dlTw = TW(1000);

  function renderSections() {
    var vh = innerHeight, vw = innerWidth;
    if (!docMax) docMax = document.documentElement.scrollHeight - vh;
    var max = docMax;
    // Telefon czyta pozycje slotów - musi to zrobić, zanim klatka cokolwiek zapisze.
    renderFlyer(vh, vw);
    renderBoard(max);
    if (heroEl) {
      var hs = clamp(scrollY / (vh * 0.9), 0, 1);
      if (hs !== lastHs) { lastHs = hs; heroEl.style.setProperty("--hs", hs.toFixed(3)); }
    }
    if (bgWaves && !isMobile()) bgWaves.style.setProperty("--sy", scrollY);

    paints.forEach(function (o) {
      var p;
      if (reduced) p = 1;
      else if (o.beach) p = smooth((beachP - 0.18) / 0.2);
      else p = easeOut(tw(o.tw, gate(o.tw, rectOf(o.el).top, vh * 0.82, vh)));
      if (Math.abs(p - o.p) > 0.002) { o.p = p; o.el.style.setProperty("--p", p.toFixed(3)); }
    });

    renderCurtains(vh);
    renderTrack(vh, vw);
    renderBeach(vh);

    if (flow && flowPath) {
      var fr = rectOf(flow);
      // Pakiet rusza, gdy schemat wjedzie na ekran, i sam przechodzi całą drogę.
      var fp = easeInOut(tw(flowTw, gate(flowTw, fr.top, vh * 0.62, vh)));
      if (fr.top < vh && fr.bottom > 0) {
        flow.style.setProperty("--fp", fp.toFixed(3));
        var pt = flowPath.getPointAtLength(fp * flowLen);
        packet.setAttribute("transform", "translate(" + pt.x.toFixed(1) + " " + pt.y.toFixed(1) + ")");
        flowNodes.forEach(function (n, i) { n.classList.toggle("lit", fp >= i * 0.5 - 0.02); });
        var st = fp < 0.34 ? 0 : fp < 0.75 ? 1 : 2;
        if (st !== flowStage && flowCaption) { flowStage = st; flowCaption.textContent = FLOW_TEXT[st]; }
      }
    }
    if (dl) {
      var dr = rectOf(dl);
      var dv = easeOut(tw(dlTw, gate(dlTw, dr.top, vh * 0.7, vh)));
      if (dr.top < vh) dl.style.setProperty("--dl", dv.toFixed(3));
    }
  }

  /* ───────────────────────────── pętla ───────────────────────────── */
  var raf = 0, lastT = 0;
  function loop(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - (lastT || now)) / 1000);
    lastT = now;
    nowT = now;
    moving = false;
    renderSections();
    if (story) {
      var s = storyRaw();
      if (s.inside !== storyIn) {
        storyIn = s.inside;
        root.classList.toggle("in-story", storyIn);
        lastStoryP = NaN;
        if (!storyIn) { setAccent(sectionAccent); lastTip = -1; }
      }
      storyTarget = s.value;
      var k = reduced ? 1 : 1 - Math.exp(-dt * 9);
      storyCur += (storyTarget - storyCur) * k;
      if (Math.abs(storyTarget - storyCur) < 0.0008) storyCur = storyTarget;
      renderStory(storyCur);
    }
    firstFrame = false;
    if (moving || (story && storyCur !== storyTarget)) { raf = requestAnimationFrame(loop); return; }
    lastT = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function forget() { geo.clear(); railGeo = null; docMax = 0; if (settle) settle.reset(); }
  function relayout() { forget(); fitHero(); layoutTrack(); layoutTicks(); renderReel(); kick(); }
  window.addEventListener("scroll", kick, { passive: true });

  /* ══════════════════ DOMYKANIE PRZEWIJANIA ══════════════════
     Gdy przewijanie stanie blisko przystanku (rozdział historii, panel toru,
     plaża, wejście sekcji, czat z Bazusiem), strona sama i płynnie dojeżdża
     na niego, żeby całe wejście było widać. Działa tylko w pobliżu przystanku,
     woli kierunek, w którym się jechało, i oddaje stery przy każdym dotyku,
     kółku czy klawiszu. */
  var settle = reduced ? null : (function () {
    var idleT = 0, lastY = scrollY, dir = 0, touching = false, anim = 0, animY = -1, stops = null;
    function headOff() { return isMobile() ? 70 : 96; }
    function buildStops() {
      var vh = innerHeight, list = [];
      var add = function (y, r) { if (isFinite(y)) list.push({ y: Math.max(0, Math.round(y)), r: r }); };
      if (story) {
        var st = geoTop(story), tot = rectOf(story).height - vh, gap = tot / LAST;
        for (var i = 0; i < LAST; i++) add(st + ((i + 0.16) / LAST) * tot, Math.min(vh * 0.45, gap * 0.5));
        add(st + tot, Math.min(vh * 0.45, gap * 0.5));
      }
      if (play) {
        if (!isNarrow()) panels.forEach(function (_, i) { add(trackTargetY(i), vh * 0.4); });
        else panels.forEach(function (p) { add(geoTop(p) - headOff(), vh * 0.3); });
      }
      if (reel) add(geoTop(reel) + rectOf(reel).height / 2 - vh / 2, vh * 0.35);
      if (beach) { add(geoTop(beach), vh * 0.4); add(geoTop(beach) + rectOf(beach).height - vh, vh * 0.3); }
      ["#security", "#support", "#download"].forEach(function (q) { var el = $(q); if (el) add(geoTop(el) - headOff(), vh * 0.4); });
      var chatEl = $(".chat");
      if (chatEl) add(geoTop(chatEl) + rectOf(chatEl).height / 2 - vh / 2, vh * 0.35);
      return list;
    }
    function cancel() { if (anim) cancelAnimationFrame(anim); anim = 0; }
    function glide(to) {
      var from = scrollY, d = to - from, dur = clamp(300 + Math.abs(d) * 0.6, 340, 800), t0 = performance.now();
      function f(now) {
        var t = clamp((now - t0) / dur, 0, 1);
        animY = Math.round(from + d * easeInOut(t));
        window.scrollTo({ top: animY, behavior: "instant" });
        anim = t < 1 ? requestAnimationFrame(f) : 0;
      }
      anim = requestAnimationFrame(f);
    }
    function maybeSettle() {
      if (touching || anim) return;
      if (!stops) stops = buildStops();
      var y = scrollY, best = null, score = Infinity;
      stops.forEach(function (st) {
        var d = st.y - y, ad = Math.abs(d);
        if (ad > st.r) return;
        // Dociąga do przodu chętniej niż cofa.
        var sc = ad < 4 ? 0 : ad * (Math.sign(d) === dir ? 0.6 : 1.5);
        if (sc < score) { score = sc; best = st; }
      });
      if (best && Math.abs(best.y - y) >= 4) glide(best.y);
    }
    window.addEventListener("scroll", function () {
      var y = scrollY;
      if (anim) { if (Math.abs(y - animY) > 3) cancel(); else return; }
      if (y !== lastY) dir = y > lastY ? 1 : -1;
      lastY = y;
      clearTimeout(idleT);
      idleT = setTimeout(maybeSettle, 180);
    }, { passive: true });
    ["wheel", "keydown", "pointerdown"].forEach(function (ev) { window.addEventListener(ev, cancel, { passive: true }); });
    window.addEventListener("touchstart", function () { touching = true; cancel(); }, { passive: true });
    window.addEventListener("touchend", function () {
      touching = false;
      clearTimeout(idleT);
      idleT = setTimeout(maybeSettle, 240);
    }, { passive: true });
    return { reset: function () { stops = null; } };
  })();
  var rzT = null;
  window.addEventListener("resize", function () { clearTimeout(rzT); rzT = setTimeout(relayout, 120); kick(); }, { passive: true });
  layoutTrack();
  window.addEventListener("load", function () { forget(); fitHero(); layoutTrack(); layoutTicks(); kick(); });
  // Zmiana wysokości treści (wyspy, FAQ, obrazki) przesuwa sekcje - pamięć pozycji do kosza.
  if ("ResizeObserver" in window) {
    var mainEl = $("main");
    if (mainEl) new ResizeObserver(function () { forget(); layoutTicks(); kick(); }).observe(mainEl);
  }
  // Krój napisu może dojechać po „load” - wtedy dopasowujemy jeszcze raz.
  if (document.fonts) document.fonts.addEventListener("loadingdone", fitHero);
  // Wyspa dorysowuje ekrany w torze - szerokość toru może się zmienić.
  if ("ResizeObserver" in window && htrack) new ResizeObserver(function () { forget(); layoutTrack(); layoutTicks(); kick(); }).observe(htrack);
  layoutTicks();
  kick();

  /* ══════════════════ FAQ: rozmowa z Bazusiem ══════════════════
     Jak dokumenty Communio na catchapp.com.pl: z lewej pytania, z prawej czat.
     Klikasz pytanie, wpływa Twój dymek, Bazuś pisze... i odpowiada. Na ekranie
     stoi jedna wymiana naraz. Bazuś z rogu ekranu wskakuje łukiem na swoje
     miejsce w nagłówku czatu, gdy rozmowa wjedzie na ekran, i wraca, gdy
     zjedzie. Treść czat bierze z `.faq-src`, która stoi w HTML dla wyszukiwarek. */
  (function faqChat() {
    var faq = $("#faq");
    if (!faq) return;
    var src = $$(".fq", faq);
    var list = $(".faq-list", faq), chat = $(".chat", faq), body = $(".chat-body", faq);
    var statusEl = $(".chat-status", faq), countEl = $(".chat-count", faq), seat = $(".chat-seat", faq);
    var prevBtn = $(".chat-prev", faq), nextBtn = $(".chat-next", faq);
    var items = src.map(function (a) {
      var html = function (p) { return p.innerHTML; };
      return {
        id: a.id, short: a.dataset.short, q: $("h4", a).textContent,
        a: $$(":scope > p", a).map(html),
        more: $$(".fq-more p", a).map(html),
      };
    });
    var btns = [];
    $$(".faq-group", faq).forEach(function (g) {
      var h = document.createElement("p");
      h.className = "fl-group";
      h.textContent = g.dataset.group;
      list.appendChild(h);
      $$(".fq", g).forEach(function (a) {
        var i = src.indexOf(a);
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = '<b><i class="n">' + (i + 1) + '</i><i class="ar">→</i></b><span></span>';
        b.lastChild.textContent = items[i].short;
        b.addEventListener("click", function () { userPick(i); });
        list.appendChild(b);
        btns[i] = b;
      });
    });

    var active = -1, timers = [], greeted = false, seated = false, wantPick = -1;

    /* Najechanie myszką: jedno miękkie tło płynie za kursorem z pytania na
       pytanie, a w czacie pojawia się szara zapowiedź dymka z tym pytaniem.
       Tylko tam, gdzie jest kursor - na dotyku nie ma czego pokazywać. */
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var pill = document.createElement("span");
    pill.className = "fl-hover";
    pill.setAttribute("aria-hidden", "true");
    list.appendChild(pill);
    var ghost = null;
    function pillTo(b) {
      if (!b) { list.classList.remove("hovering"); return; }
      pill.style.transform = "translateY(" + b.offsetTop + "px)";
      pill.style.height = b.offsetHeight + "px";
      list.classList.add("hovering");
    }
    function showGhost(i) {
      if (!seated || i === active || chat.classList.contains("typing-now")) { hideGhost(); return; }
      if (!ghost) {
        ghost = document.createElement("p");
        ghost.className = "msg msg-ghost";
        ghost.setAttribute("aria-hidden", "true");
      }
      ghost.textContent = items[i].q;
      if (ghost.parentNode !== body) { body.appendChild(ghost); toEnd(); }
    }
    function hideGhost() { if (ghost && ghost.parentNode) ghost.remove(); }
    if (canHover) {
      list.addEventListener("pointerover", function (e) {
        var b = e.target.closest("button");
        if (!b || !list.contains(b)) return;
        pillTo(b);
        showGhost(btns.indexOf(b));
      });
      list.addEventListener("pointerleave", function () { pillTo(null); hideGhost(); });
    }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function stop() { timers.forEach(clearTimeout); timers = []; $$(".typing", body).forEach(function (t) { t.remove(); }); }
    function toEnd() { body.scrollTo({ top: body.scrollHeight, behavior: reduced ? "auto" : "smooth" }); }
    function add(cls, html, text) {
      var d = document.createElement("p");
      d.className = "msg " + cls;
      if (text) d.textContent = text; else d.innerHTML = html;
      // Zapowiedź dymka zawsze zostaje na samym dole rozmowy.
      body.insertBefore(d, ghost && ghost.parentNode === body ? ghost : null);
      toEnd();
      return d;
    }
    function setTyping(on) {
      chat.classList.toggle("typing-now", on);
      statusEl.textContent = on ? "pisze..." : "w BAZIE";
    }
    function nodSeat() {
      if (reduced) return;
      seat.classList.remove("nod"); void seat.offsetWidth; seat.classList.add("nod");
    }
    // Bazuś odpisuje dymek po dymku: kropki pisania, potem tekst. Czas pisania
    // rośnie z długością dymka, ale nigdy nie każe czekać dłużej niż chwilę.
    function botSay(lines, t, done) {
      lines.forEach(function (html, k) {
        var tp = null;
        var dur = reduced ? 120 : clamp(380 + html.length * 5, 560, 1250);
        later(function () {
          tp = document.createElement("div");
          tp.className = "typing";
          tp.innerHTML = '<span style="--d:0"></span><span style="--d:1"></span><span style="--d:2"></span>';
          body.insertBefore(tp, ghost && ghost.parentNode === body ? ghost : null);
          setTyping(true);
          toEnd();
        }, t);
        later(function () {
          if (tp) tp.remove();
          add("msg-bot", html);
          nodSeat();
          if (k === lines.length - 1) setTyping(false);
        }, t + dur);
        t += dur + (reduced ? 60 : 280);
      });
      if (done) later(done, t);
    }
    function pick(i, keep) {
      if (i < 0 || i >= items.length) return;
      hideGhost();
      stop();
      active = i;
      if (!keep) body.innerHTML = "";
      btns.forEach(function (b, k) { b.classList.toggle("on", k === i); b.setAttribute("aria-current", k === i ? "true" : "false"); });
      countEl.textContent = (i + 1) + " / " + items.length;
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === items.length - 1;
      nextBtn.textContent = i === items.length - 1 ? "To wszystko" : "Następne pytanie →";
      add("msg-me", "", items[i].q);
      botSay(items[i].a, reduced ? 80 : 420, function () { offerMore(i); });
      // Na telefonie aktywny chips przewija się na widok.
      var b = btns[i];
      if (list.scrollWidth > list.clientWidth + 4) list.scrollTo({ left: b.offsetLeft - 16, behavior: reduced ? "auto" : "smooth" });
    }
    // „Opowiedz więcej”: szybka odpowiedź pod krótką wersją. Kliknięta zamienia
    // się w Twój dymek, a Bazuś dopisuje szczegóły.
    function offerMore(i) {
      if (!items[i].more.length || i !== active) return;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "msg-chip";
      chip.innerHTML = 'Opowiedz więcej <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
      chip.addEventListener("click", function () {
        chip.remove();
        stop();
        add("msg-me", "", "Opowiedz więcej");
        botSay(items[i].more, reduced ? 80 : 380);
        vib(8);
      });
      body.insertBefore(chip, ghost && ghost.parentNode === body ? ghost : null);
      toEnd();
    }
    function userPick(i) {
      greeted = true;
      if (!seated) { wantPick = i; return; }
      pick(i);
      vib(8);
    }
    prevBtn.addEventListener("click", function () { userPick(active - 1); });
    nextBtn.addEventListener("click", function () { userPick(active + 1); });

    // Pierwsze wejście: powitanie i od razu pierwsza wymiana (albo ta, po którą
    // ktoś przyszedł linkiem, np. z napisu „inspirowane baza.zprp.pl”).
    function greet() {
      if (greeted) { if (wantPick >= 0) { pick(wantPick); wantPick = -1; } return; }
      greeted = true;
      body.innerHTML = "";
      botSay(["Cześć! Jestem Bazuś. O co chcesz zapytać?"], 200, function () {
        later(function () { pick(wantPick >= 0 ? wantPick : 0, true); wantPick = -1; }, reduced ? 100 : 650);
      });
    }

    // Linki do konkretnego pytania (#faq-zprp itp.) otwierają je w czacie.
    function linkTo(hash) {
      var i = items.findIndex(function (x) { return "#" + x.id === hash; });
      if (i < 0) return false;
      faq.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      if (seated) { greeted = true; pick(i); } else wantPick = i;
      return true;
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#faq-"]');
      if (a && linkTo(a.getAttribute("href"))) e.preventDefault();
    });
    if (/^#faq-/.test(location.hash)) setTimeout(function () { linkTo(location.hash); }, 400);

    /* ── skok Bazusia między rogiem a czatem ──
       Lot liczony w klatkach: cel (miejsce w czacie) przesuwa się razem ze
       stroną, więc jego pozycję czytamy w każdej klatce lotu. Łuk, obrót
       i lekkie spłaszczenie przy odbiciu i lądowaniu - jak piłka w menu. */
    var cornerBtn = guide ? $(".guide-bazus", guide) : null;
    var cornerImg = cornerBtn ? $("img", cornerBtn) : null;
    var inChat = false, flying = false, want = false, flyEl = null;
    function seatBox() {
      var r = seat.getBoundingClientRect();
      return { x: r.left - 8, y: r.top - 12, s: 68 };
    }
    function cornerBox() {
      var r = cornerBtn.getBoundingClientRect();
      // Schowany Bazuś stoi pod krawędzią ekranu - startujemy z rogu, nie spod podłogi.
      var y = Math.min(r.top, innerHeight - r.height * 0.9);
      return { x: r.left, y: y, s: r.width };
    }
    function fly(toChat) {
      if (!cornerBtn) { setSeated(toChat); return; }
      flying = true;
      var from = toChat ? cornerBox() : seatBox();
      if (toChat) guide.classList.add("in-chat");
      else setSeated(false);
      if (reduced) { land(toChat); return; }
      flyEl = document.createElement("img");
      flyEl.className = "bazus-fly";
      flyEl.src = (cornerImg && (cornerImg.currentSrc || cornerImg.src)) || "/Grafiki/site/bazus_small.webp";
      flyEl.alt = "";
      flyEl.style.width = flyEl.style.height = from.s + "px";
      document.body.appendChild(flyEl);
      var t0 = performance.now(), dur = 820;
      var spinDir = toChat ? 1 : -1;
      function frame(now) {
        var t = clamp((now - t0) / dur, 0, 1);
        var to = toChat ? seatBox() : cornerBox();
        var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        var dist = Math.hypot(to.x - from.x, to.y - from.y);
        var arc = Math.min(260, 120 + dist * 0.22);
        var x = from.x + (to.x - from.x) * e;
        var y = from.y + (to.y - from.y) * e - Math.sin(Math.PI * t) * arc;
        var sc = (from.s + (to.s - from.s) * e) / from.s;
        // Odbicie na starcie i przysiad przy lądowaniu.
        var sq = t < 0.14 ? 1 - Math.sin(t / 0.14 * Math.PI) * 0.12 : t > 0.86 ? 1 - Math.sin((t - 0.86) / 0.14 * Math.PI) * 0.16 : 1;
        var rot = spinDir * 360 * e;
        flyEl.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + rot.toFixed(1) + "deg) scale(" + (sc * (2 - sq)).toFixed(3) + "," + (sc * sq).toFixed(3) + ")";
        if (t < 1) requestAnimationFrame(frame);
        else land(toChat);
      }
      requestAnimationFrame(frame);
    }
    function setSeated(on) { seated = on; chat.classList.toggle("seated", on); }
    function land(toChat) {
      if (flyEl) { flyEl.remove(); flyEl = null; }
      flying = false;
      inChat = toChat;
      if (toChat) { setSeated(true); nodSeat(); vib(10); greet(); }
      else { guide.classList.remove("in-chat"); stop(); setTyping(false); }
      if (want !== inChat) fly(want);
    }
    function setWant(v) {
      want = v;
      if (!flying && want !== inChat) fly(want);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        var r = es[0].intersectionRatio;
        if (r >= 0.55) setWant(true);
        else if (r <= 0.12) setWant(false);
      }, { threshold: [0, 0.12, 0.55, 0.8] }).observe(chat);
    } else { setSeated(true); greet(); }
  })();

  /* ─────────────────────── dane: mapa okręgów i Patronite ─────────────────────── */
  var dataModule = null;
  function data() { return dataModule || (dataModule = import("/site/data.js?v=" + V)); }
  var lazyIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      lazyIO.unobserve(e.target);
      if (e.target.id === "map") data().then(setupMap);
      if (e.target.hasAttribute("data-patronite")) setupPatronite(e.target);
    });
  }, { rootMargin: "60% 400% 60% 400%" });
  ["#map", "[data-patronite]"].forEach(function (s) { var el = $(s); if (el) lazyIO.observe(el); });

  function setupMap(m) {
    var mapEl = $("#map"), svg = $(".map-svg"), crestsBox = $(".map-crests"), card = $(".crest-card");
    var nameEl = $(".crest-name", card), stateEl = $(".crest-state", card), img = $(".crest-img", card);
    var regions = m.regions();
    var ns = "http://www.w3.org/2000/svg";
    var panels = new Set();
    var typing = null, sel = -1;
    var paths = regions.map(function (r, i) {
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", r.d);
      p.style.setProperty("--p", r.primary);
      p.style.setProperty("--q", r.secondary);
      p.style.setProperty("--i", i);
      p.setAttribute("tabindex", "0");
      p.setAttribute("role", "button");
      p.setAttribute("aria-label", r.name);
      svg.appendChild(p);
      return p;
    });
    paths.forEach(function (p) { p.style.setProperty("--len", Math.ceil(p.getTotalLength())); });
    // Herb każdego okręgu siedzi na środku województwa.
    var crests = regions.map(function (r, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mc";
      b.style.left = (r.cx / 10) + "%";
      b.style.top = (r.cy / 9.51) + "%";
      b.style.setProperty("--p", r.primary);
      b.style.setProperty("--i", i);
      b.setAttribute("aria-label", r.name);
      b.innerHTML = '<img src="/Grafiki/site/okregi/' + r.slug.toLowerCase() + '.webp" alt="" width="160" height="160" loading="lazy" />';
      crestsBox.appendChild(b);
      return b;
    });
    requestAnimationFrame(function () { mapEl.classList.add("drawn"); });

    function pick(i, quiet) {
      if (i === sel) return;
      sel = i;
      var r = regions[i];
      paths.forEach(function (p, k) { p.classList.toggle("sel", k === i); });
      crests.forEach(function (c, k) { c.classList.toggle("sel", k === i); });
      card.style.setProperty("--cp", r.primary);
      card.style.setProperty("--cs", r.secondary);
      img.src = "/Grafiki/site/okregi/" + r.slug.toLowerCase() + ".webp";
      card.classList.remove("go"); void card.offsetWidth; card.classList.add("go");
      // Nazwa wpisuje się literka po literce, jak w panelu okręgu w aplikacji.
      clearInterval(typing);
      var n = 0;
      nameEl.textContent = "";
      typing = setInterval(function () {
        n++;
        nameEl.textContent = r.name.slice(0, n);
        if (n >= r.name.length) clearInterval(typing);
      }, reduced ? 1 : 38);
      var on = panels.has(r.slug);
      stateEl.innerHTML = on
        ? "<b>Panel włączony.</b> Niedyspozycje, Mecztarg, ogłoszenia i wydarzenia."
        : "Panelu jeszcze nie ma. Zapytaj o niego swoją komisję.";
      if (!quiet) vib(8);
    }
    paths.forEach(function (p, i) {
      p.addEventListener("click", function () { pick(i); });
      p.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } });
    });
    crests.forEach(function (c, i) {
      c.addEventListener("click", function () { pick(i); });
      c.addEventListener("pointerenter", function () { paths[i].classList.add("hover"); });
      c.addEventListener("pointerleave", function () { paths[i].classList.remove("hover"); });
    });
    onStats(function (d) {
      (d.panel_province_list || []).forEach(function (n) { panels.add(m.slugOf(n)); });
      regions.forEach(function (r, i) {
        var on = panels.has(r.slug);
        paths[i].classList.toggle("has-panel", on);
        crests[i].classList.toggle("has-panel", on);
      });
      var first = regions.findIndex(function (r) { return panels.has(r.slug); });
      setTimeout(function () { pick(first >= 0 ? first : 0, true); }, 900);
    });
  }

  function setupPatronite(box) {
    var f = document.createElement("iframe");
    f.src = "https://patronite.pl/widget/bazaapp/797249/small/dark/colorful?description=Bo%20tylko%20razem%20mo%C5%BCemy%20budowa%C4%87%20BAZ%C4%98!&buttonText=Wesprzyj";
    f.title = "Wesprzyj BAZĘ na Patronite";
    f.loading = "lazy";
    // Biały pasek „Powered by” na dole widgetu odcina ramka z ukrytym nadmiarem.
    var clip = document.createElement("div");
    clip.className = "pt-clip";
    clip.appendChild(f);
    box.appendChild(clip);
  }
})();
