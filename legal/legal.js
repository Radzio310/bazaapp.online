/* ==========================================================================
   Dokumenty prawne - zachowanie strony.
   Spis treści z aktywną sekcją, pasek postępu, odsłanianie sekcji,
   kopiowanie linku do sekcji, arkusz spisu na telefonie, motyw i druk.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.remove("no-js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------- Motyw ---------------------------------- */
  var THEME_KEY = "baza-legal-theme";
  var themeBtn = document.querySelector("[data-theme-toggle]");

  function applyTheme(next) {
    if (next === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* tryb prywatny */ }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "light" ? "#F7F3EF" : "#0F0B09");
    if (themeBtn) themeBtn.setAttribute("aria-label", next === "light" ? "Włącz ciemny motyw" : "Włącz jasny motyw");
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      if (!document.startViewTransition || reduceMotion) { applyTheme(next); return; }

      // Koło rozlewa się od przycisku na cały ekran.
      var r = themeBtn.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.setProperty("--tx", x + "px");
      root.style.setProperty("--ty", y + "px");
      root.style.setProperty("--tr", radius + "px");
      root.classList.add("theme-vt");
      var vt = document.startViewTransition(function () { applyTheme(next); });
      vt.finished.finally(function () { root.classList.remove("theme-vt"); });
    });
  }
  applyTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");

  /* ----------------------------- Druk ---------------------------------- */
  document.querySelectorAll("[data-print]").forEach(function (b) {
    b.addEventListener("click", function () {
      // Przed drukiem wszystko musi być widoczne, nawet sekcje poniżej ekranu.
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
      window.print();
    });
  });

  /* ---------------------------- Toast ---------------------------------- */
  var toast = document.querySelector(".toast");
  var toastTimer = null;
  function showToast(text) {
    if (!toast) return;
    toast.querySelector("span").textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  /* ------------------------ Słowa w tytule ----------------------------- */
  document.querySelectorAll(".hero h1 .word").forEach(function (w, i) {
    w.style.setProperty("--i", i);
  });

  /* ---------------------- Odsłanianie sekcji --------------------------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* --------------- Poświata kafli idzie za kursorem -------------------- */
  document.querySelectorAll(".tile").forEach(function (t) {
    t.addEventListener("pointermove", function (ev) {
      var r = t.getBoundingClientRect();
      t.style.setProperty("--mx", (ev.clientX - r.left) + "px");
      t.style.setProperty("--my", (ev.clientY - r.top) + "px");
    });
  });

  /* ------------------- Kopiowanie linku do sekcji ---------------------- */
  var linkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  document.querySelectorAll(".section[id] h2").forEach(function (h) {
    var id = h.closest(".section").id;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "anchor-btn";
    b.setAttribute("aria-label", "Skopiuj link do sekcji");
    b.innerHTML = linkIcon;
    b.addEventListener("click", function () {
      var url = location.origin + location.pathname + "#" + id;
      history.replaceState(null, "", "#" + id);
      var done = function () { showToast("Skopiowano link do sekcji"); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done, done);
      } else {
        done();
      }
    });
    h.appendChild(b);
  });

  /* ----------------- Spis treści i aktywna sekcja ---------------------- */
  // Arkusz na telefonie dostaje kopię spisu z boku - jedna lista w HTML.
  var sheetList = document.querySelector(".sheet ol");
  var tocList = document.querySelector(".toc ol");
  if (sheetList && tocList && !sheetList.children.length) {
    tocList.querySelectorAll("li").forEach(function (li) {
      sheetList.appendChild(li.cloneNode(true));
    });
  }

  var sections = Array.prototype.slice.call(document.querySelectorAll(".doc .section[id]"));
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  var sheetLinks = Array.prototype.slice.call(document.querySelectorAll(".sheet a[href^='#']"));
  var indicator = document.querySelector(".toc-indicator");
  var fab = document.querySelector(".toc-fab");
  var fabLabel = fab ? fab.querySelector(".fab-label") : null;
  var fabNum = fab ? fab.querySelector(".ring span") : null;
  var currentId = null;

  function setActive(id) {
    if (id === currentId) return;
    currentId = id;
    var activeLink = null;
    tocLinks.concat(sheetLinks).forEach(function (a) {
      var on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      if (on && tocLinks.indexOf(a) !== -1) activeLink = a;
    });
    if (indicator) {
      if (activeLink) {
        var li = activeLink.parentElement;
        indicator.style.setProperty("--iy", li.offsetTop + "px");
        indicator.style.setProperty("--ih", li.offsetHeight + "px");
        indicator.style.setProperty("--io", "1");
        // Trzymaj aktywną pozycję w polu widzenia przewijanego spisu.
        var toc = indicator.closest(".toc");
        if (toc && toc.scrollHeight > toc.clientHeight) {
          var top = li.offsetTop - toc.clientHeight / 2 + li.offsetHeight / 2;
          toc.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
        }
      } else {
        indicator.style.setProperty("--io", "0");
      }
    }
    if (fabLabel) {
      var idx = sections.findIndex(function (s) { return s.id === id; });
      var h = idx >= 0 ? sections[idx].querySelector("h2") : null;
      fabLabel.textContent = h ? h.firstChild.textContent.trim() : "Spis treści";
      if (fabNum) fabNum.textContent = idx >= 0 ? String(idx + 1).padStart(2, "0") : "00";
    }
  }

  // Aktywna jest ostatnia sekcja, której nagłówek minął 35% wysokości ekranu.
  var ticking = false;
  function onScroll() {
    ticking = false;
    var line = innerHeight * 0.35;
    var active = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top - line <= 0) active = sections[i].id;
      else break;
    }
    // Koniec strony: ostatnia sekcja, nawet jeśli jest krótka.
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4 && sections.length) {
      active = sections[sections.length - 1].id;
    }
    setActive(active);

    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    root.style.setProperty("--progress", p.toFixed(4));

    if (fab) {
      var docStart = sections.length ? sections[0].getBoundingClientRect().top : 0;
      fab.classList.toggle("show", docStart < innerHeight * 0.8);
    }
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", function () { currentId = null; onScroll(); }, { passive: true });
  onScroll();

  /* ------------------ Arkusz spisu treści (telefon) -------------------- */
  var sheet = document.querySelector(".sheet");
  var sheetBackdrop = document.querySelector(".sheet-backdrop");
  var lastFocus = null;

  function openSheet() {
    if (!sheet) return;
    lastFocus = document.activeElement;
    root.classList.add("sheet-open");
    sheet.setAttribute("aria-hidden", "false");
    if (fab) fab.setAttribute("aria-expanded", "true");
    var active = sheet.querySelector("a.active") || sheet.querySelector("a");
    setTimeout(function () {
      if (active) { active.focus({ preventScroll: true }); active.scrollIntoView({ block: "center" }); }
    }, 60);
  }
  function closeSheet(restoreFocus) {
    if (!sheet || !root.classList.contains("sheet-open")) return;
    root.classList.remove("sheet-open");
    sheet.setAttribute("aria-hidden", "true");
    if (fab) fab.setAttribute("aria-expanded", "false");
    if (restoreFocus !== false && lastFocus) lastFocus.focus({ preventScroll: true });
  }
  if (fab) fab.addEventListener("click", openSheet);
  if (sheetBackdrop) sheetBackdrop.addEventListener("click", function () { closeSheet(); });
  sheetLinks.forEach(function (a) {
    a.addEventListener("click", function () { closeSheet(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSheet();
  });

  // Przeciągnięcie arkusza w dół zamyka go.
  if (sheet) {
    var startY = null, dy = 0;
    sheet.addEventListener("touchstart", function (e) {
      if (sheet.scrollTop > 0) { startY = null; return; }
      startY = e.touches[0].clientY; dy = 0;
      sheet.style.transition = "none";
    }, { passive: true });
    sheet.addEventListener("touchmove", function (e) {
      if (startY === null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      sheet.style.transform = "translateY(" + dy + "px)";
    }, { passive: true });
    sheet.addEventListener("touchend", function () {
      if (startY === null) return;
      sheet.style.transition = "";
      sheet.style.transform = "";
      if (dy > 90) closeSheet();
      startY = null;
    });
  }

  /* ---------- Płynne przejście między dokumentami bez View Transitions --- */
  var crossDocVT = typeof window.CSSViewTransitionRule !== "undefined";
  if (!crossDocVT && !reduceMotion) {
    document.querySelectorAll("a[data-doc-link]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (a.getAttribute("aria-current") === "page") { e.preventDefault(); return; }
        e.preventDefault();
        root.classList.add("leaving");
        setTimeout(function () { location.href = a.href; }, 220);
      });
    });
    // Powrót strzałką "wstecz" z pamięci podręcznej nie może zostawić wygaszonej strony.
    window.addEventListener("pageshow", function () { root.classList.remove("leaving"); });
  }
})();
