(function () {
  "use strict";

  /* ---------- header: border on scroll, mobile menu ---------- */

  var header = document.querySelector(".site-header");
  var nav = document.getElementById("site-nav");
  var menuBtn = document.querySelector(".menu-btn");

  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menuBtn.innerHTML = open
      ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  }
  menuBtn.addEventListener("click", function () {
    setMenu(!nav.classList.contains("open"));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });

  /* ---------- highlight current section in nav ---------- */

  var links = {};
  nav.querySelectorAll('a[href^="#"]').forEach(function (a) {
    links[a.getAttribute("href").slice(1)] = a;
  });
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (id) {
          links[id].classList.toggle("active", id === en.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { spy.observe(s); });
  }

  /* ---------- publication filter ---------- */

  var filterBtns = document.querySelectorAll(".pub-filter button");
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.dataset.filter;
      filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      document.querySelectorAll("[data-group]").forEach(function (el) {
        el.classList.toggle("is-hidden", f !== "all" && el.dataset.group !== f);
      });
    });
  });

  /* ---------- Figure 1: direct search on the Rosenbrock function ---------- */

  var canvas = document.getElementById("mads");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var roK = document.getElementById("ro-k");
  var roF = document.getElementById("ro-f");
  var roD = document.getElementById("ro-d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var darkMode = window.matchMedia("(prefers-color-scheme: dark)");

  var X0 = -2, X1 = 2, Y0 = -1, Y1 = 3;   // design space
  var STEP_MS = 140, MAX_ITER = 320, MIN_DELTA = 5e-4, HOLD_MS = 2600;

  function rosen(x, y) {
    // extreme barrier: points outside the bounds are infeasible
    if (x < X0 || x > X1 || y < Y0 || y > Y1) return Infinity;
    var a = 1 - x, b = y - x * x;
    return a * a + 100 * b * b;
  }

  var W = 0, H = 0, dpr = 1, bg = null, colors = {};

  function hex(c) {
    c = c.trim().replace("#", "");
    if (c.length === 3) c = c.replace(/./g, "$&$&");
    var n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ["--paper", "--paper-2", "--ink", "--ink-2", "--ink-3", "--accent", "--accent-soft", "--warm"].forEach(function (k) {
      colors[k.slice(2)] = cs.getPropertyValue(k).trim();
    });
  }
  function rgba(c, a) {
    var v = hex(c);
    return "rgba(" + v[0] + "," + v[1] + "," + v[2] + "," + a + ")";
  }

  function toPx(x, y) {
    return [(x - X0) / (X1 - X0) * W, (1 - (y - Y0) / (Y1 - Y0)) * H];
  }

  // Contour background, rendered once per size/theme into an offscreen canvas.
  function renderBackground() {
    var w = Math.round(W * dpr), h = Math.round(H * dpr);
    var off = document.createElement("canvas");
    off.width = w; off.height = h;
    var octx = off.getContext("2d");
    var img = octx.createImageData(w, h);
    var px = img.data;

    var levels = 5.2, vmax = 3.45;
    var val = new Float32Array(w * h);
    for (var j = 0; j < h; j++) {
      var y = Y1 - (j + 0.5) / h * (Y1 - Y0);
      for (var i = 0; i < w; i++) {
        var x = X0 + (i + 0.5) / w * (X1 - X0);
        var a = 1 - x, b = y - x * x;
        val[j * w + i] = Math.log(1 + a * a + 100 * b * b) / Math.LN10;
      }
    }

    var base = hex(colors["paper-2"]), tint = hex(colors["accent-soft"]), line = hex(colors["ink-3"]);
    var lineAlpha = darkMode.matches ? 0.55 : 0.42;

    for (j = 0; j < h; j++) {
      for (i = 0; i < w; i++) {
        var k = j * w + i, v = val[k];
        // fill: tint the valley, fade to the page colour on the walls
        var t = Math.max(0, 1 - v / vmax);
        t = t * t * t;
        var r = base[0] + (tint[0] - base[0]) * t;
        var g = base[1] + (tint[1] - base[1]) * t;
        var bl = base[2] + (tint[2] - base[2]) * t;

        // anti-aliased iso-lines: distance to nearest level in pixel units
        var s = v * levels;
        var gx = i + 1 < w ? val[k + 1] - v : v - val[k - 1];
        var gy = j + 1 < h ? val[k + w] - v : v - val[k - w];
        var grad = Math.sqrt(gx * gx + gy * gy) * levels + 1e-6;
        var d = Math.abs(s - Math.round(s)) / grad;
        var lw = 0.6 * dpr;
        var aL = d < lw ? 1 : Math.max(0, 1 - (d - lw));
        aL *= lineAlpha;

        px[k * 4] = r + (line[0] - r) * aL;
        px[k * 4 + 1] = g + (line[1] - g) * aL;
        px[k * 4 + 2] = bl + (line[2] - bl) * aL;
        px[k * 4 + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    bg = off;
  }

  /* --- optimizer state --- */
  var S;

  function randomStart() {
    var x, y, tries = 0;
    do {
      x = X0 + 0.1 + Math.random() * (X1 - X0 - 0.2);
      y = Y0 + 0.6 + Math.random() * (Y1 - Y0 - 0.75);   // keep clear of the readout
      tries++;
    } while ((rosen(x, y) < 60 || Math.hypot(x - 1, y - 1) < 1.2) && tries < 200);
    return [x, y];
  }

  function reset() {
    var p = randomStart();
    S = {
      x: p, fx: rosen(p[0], p[1]), delta: 0.5, k: 0,
      trail: [p.slice()], poll: [], prev: p.slice(),
      done: false, doneAt: 0, last: 0, tStep: 0
    };
  }

  // One iteration: poll along +/- the columns of a random Householder matrix.
  function iterate() {
    var a = Math.random() * 2 * Math.PI;
    var vx = Math.cos(a), vy = Math.sin(a);
    var h1 = [1 - 2 * vx * vx, -2 * vx * vy];
    var h2 = [-2 * vx * vy, 1 - 2 * vy * vy];
    var dirs = [h1, h2, [-h1[0], -h1[1]], [-h2[0], -h2[1]]];

    var best = null;
    S.poll = dirs.map(function (dv) {
      var p = [S.x[0] + S.delta * dv[0], S.x[1] + S.delta * dv[1]];
      var fp = rosen(p[0], p[1]);
      var pt = { p: p, f: fp, win: false };
      if (!best || fp < best.f) best = pt;
      return pt;
    });

    S.prev = S.x.slice();
    if (best.f < S.fx) {
      best.win = true;
      S.x = best.p.slice();
      S.fx = best.f;
      S.trail.push(S.x.slice());
      S.delta = Math.min(S.delta * 2, 0.8);
    } else {
      S.delta /= 2;
    }
    S.k++;
    if (S.delta < MIN_DELTA || S.k >= MAX_ITER) S.done = true;
  }

  function fmt(v) {
    if (!isFinite(v)) return "–";
    if (v === 0) return "0";
    if (Math.abs(v) >= 0.01 && Math.abs(v) < 1000) return v.toPrecision(3);
    return v.toExponential(1).replace("e", "e");
  }

  function draw(progress) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);

    // minimizer
    var m = toPx(1, 1);
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(m[0] - 5, m[1]); ctx.lineTo(m[0] + 5, m[1]);
    ctx.moveTo(m[0], m[1] - 5); ctx.lineTo(m[0], m[1] + 5);
    ctx.stroke();
    ctx.fillStyle = colors["ink-2"];
    ctx.font = "italic 12px " + getComputedStyle(document.body).fontFamily.split(",")[0];
    ctx.fillText("x*", m[0] + 7, m[1] - 6);

    // incumbent trail
    var tr = S.trail;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i < tr.length; i++) {
      var q = toPx(tr[i][0], tr[i][1]);
      if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();

    // start point
    var s0 = toPx(tr[0][0], tr[0][1]);
    ctx.fillStyle = colors.paper;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(s0[0] - 4, s0[1] - 4, 8, 8); ctx.fill(); ctx.stroke();

    // poll stencil
    var c = toPx(S.prev[0], S.prev[1]);
    var alpha = S.done ? 0.35 : 1 - 0.5 * progress;
    S.poll.forEach(function (pt) {
      var q = toPx(pt.p[0], pt.p[1]);
      ctx.strokeStyle = rgba(colors["ink-3"], 0.55 * alpha);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();

      ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, 2 * Math.PI);
      if (pt.win) {
        ctx.fillStyle = rgba(colors.warm, alpha);
        ctx.fill();
      } else {
        ctx.fillStyle = rgba(colors.paper, alpha);
        ctx.fill();
        ctx.strokeStyle = rgba(isFinite(pt.f) ? colors["ink-2"] : colors.warm, alpha);
        ctx.stroke();
      }
    });

    // incumbent, eased toward its new position
    var e = 1 - Math.pow(1 - Math.min(1, progress * 1.6), 3);
    var ix = S.prev[0] + (S.x[0] - S.prev[0]) * e;
    var iy = S.prev[1] + (S.x[1] - S.prev[1]) * e;
    var ip = toPx(ix, iy);
    ctx.beginPath(); ctx.arc(ip[0], ip[1], 5, 0, 2 * Math.PI);
    ctx.fillStyle = colors.accent; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = colors.paper; ctx.stroke();

    // axis labels
    ctx.fillStyle = colors["ink-3"];
    ctx.font = "italic 12px " + getComputedStyle(document.body).fontFamily.split(",")[0];
    ctx.textAlign = "right";
    ctx.fillText("x₁", W - 8, H - 10);
    ctx.textAlign = "left";
    ctx.fillText("x₂", 8, 16);

    roK.textContent = S.k;
    roF.textContent = fmt(S.fx);
    roD.textContent = fmt(S.delta);
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    readColors();
    renderBackground();
    draw(1);
  }

  // Static version for reduced motion: run to completion, draw the final state.
  function runStatic() {
    reset();
    while (!S.done) iterate();
    S.prev = S.x.slice();
    draw(1);
  }

  var visible = true, rafId = null;

  function frame(now) {
    rafId = null;
    if (!visible || document.hidden) return;
    if (!S.last) S.last = now;

    if (S.done) {
      if (!S.doneAt) S.doneAt = now;
      if (now - S.doneAt > HOLD_MS) { reset(); S.last = now; }
    } else if (now - S.last >= STEP_MS) {
      iterate();
      S.last = now;
    }
    draw(S.done ? 1 : Math.min(1, (now - S.last) / STEP_MS));
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (reduceMotion.matches) { runStatic(); return; }
    if (rafId === null) rafId = requestAnimationFrame(frame);
  }

  reset();
  resize();
  start();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  darkMode.addEventListener && darkMode.addEventListener("change", resize);
  reduceMotion.addEventListener && reduceMotion.addEventListener("change", function () {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    start();
  });
  document.addEventListener("visibilitychange", start);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) start();
    }).observe(canvas);
  }
})();
