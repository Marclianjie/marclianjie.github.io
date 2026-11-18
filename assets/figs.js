(function () {
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function scale(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); }; }
  function fmtThousands(v) { var s = Math.abs(v).toLocaleString("en-US"); return (v < 0 ? "−" : "") + s; }

  /* ---------- Fig 0: simulated latent trajectory (seeded, deterministic) ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function fig0() {
    var svg = document.getElementById("fig0"); if (!svg) return;
    var rnd = mulberry32(405);
    function norm() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    var n = 35, x = [], obs = [];
    for (var i = 0; i < n; i++) {
      var prev = i > 0 ? x[i - 1] : 0, lag5 = i > 4 ? x[i - 5] : 0;
      var xi = 0.55 * prev + 0.25 * lag5 + 0.55 * norm();
      x.push(xi);
    }
    var cuts = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
    for (i = 0; i < n; i++) {
      var u = rnd(), eps = Math.log(u / (1 - u)) * 0.55; /* logistic noise */
      var z = 1.25 * x[i] + eps, r = 1;
      for (var c = 0; c < cuts.length; c++) if (z > cuts[c]) r = c + 2;
      obs.push(r);
    }
    var L = 34, R = 548, T = 12, B = 196;
    var sx = scale(0, n - 1, L + 6, R - 6), sy = scale(1, 7, B, T);
    function lat(v) { return 4 + 1.25 * v; } /* latent on rating scale */
    for (var y = 1; y <= 7; y++) {
      svg.appendChild(el("line", { x1: L, x2: R, y1: sy(y), y2: sy(y), class: "grid", "stroke-dasharray": y === 4 ? "" : "2 4" }));
      if (y === 1 || y === 4 || y === 7) svg.appendChild(el("text", { x: L - 8, y: sy(y) + 4, "text-anchor": "end", class: "t" }, String(y)));
    }
    for (var d = 0; d < 7; d++) {
      var xa = sx(d * 5) - 6;
      if (d > 0) svg.appendChild(el("line", { x1: xa, x2: xa, y1: T, y2: B, class: "grid" }));
      svg.appendChild(el("text", { x: sx(d * 5 + 2), y: B + 18, "text-anchor": "middle", class: "t" }, "day " + (d + 1)));
    }
    var up = [], lo = [], mid = [];
    for (i = 0; i < n; i++) {
      var m = lat(x[i]), w = 0.9 + 0.25 * Math.abs(Math.sin(i * 1.7));
      mid.push([sx(i), sy(Math.max(1, Math.min(7, m)))]);
      up.push([sx(i), sy(Math.max(1, Math.min(7, m + w)))]);
      lo.push([sx(i), sy(Math.max(1, Math.min(7, m - w)))]);
    }
    var bandPts = up.concat(lo.slice().reverse()).map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    svg.appendChild(el("polygon", { points: bandPts, class: "band" }));
    svg.appendChild(el("polyline", { points: mid.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), class: "ln-a", "stroke-linejoin": "round", "stroke-linecap": "round" }));
    for (i = 0; i < n; i++) svg.appendChild(el("circle", { cx: sx(i), cy: sy(obs[i]), r: 3.2, class: "obs" }));
    svg.appendChild(el("text", { x: L - 26, y: T + 2, class: "t", transform: "rotate(-90 " + (L - 26) + " " + (T + 2) + ")", "text-anchor": "end" }, "happy"));
    svg.appendChild(el("text", { x: R, y: B + 34, "text-anchor": "end", class: "t" }, "prompts, 5 per day"));
  }

  /* ---------- Fig 1: ELPD dot plot ---------- */
  function fig1() {
    var svg = document.getElementById("fig1"); if (!svg) return;
    var rows = [
      { label: "Independent states", hmc: [-12490.6, 24.4], vi: [-12570.8, 29.4] },
      { label: "Latent AR (lag 1, lag 5)", hmc: [-10597.5, 32.5], vi: [-11068.1, 31.4] },
      { label: "AR + lagged emotions", hmc: [-10559.3, 37.5], vi: [-10708.0, 42.6] }
    ];
    var L = 176, R = 540, T = 14, rowH = 62;
    var B = T + rowH * rows.length;
    var sx = scale(-12800, -10400, L, R);
    [-12500, -12000, -11500, -11000, -10500].forEach(function (v) {
      svg.appendChild(el("line", { x1: sx(v), x2: sx(v), y1: T - 4, y2: B, class: "grid" }));
      svg.appendChild(el("text", { x: sx(v), y: B + 18, "text-anchor": "middle", class: "t" }, fmtThousands(v)));
    });
    svg.appendChild(el("text", { x: (L + R) / 2, y: B + 38, "text-anchor": "middle", class: "t" }, "ELPD (PSIS-LOO), higher is better →"));
    rows.forEach(function (r, i) {
      var cy = T + rowH * i + rowH / 2;
      svg.appendChild(el("text", { x: 0, y: cy + 4, class: "t-ink" }, r.label));
      [["hmc", -8, "m-a", "ln-whisk-a"], ["vi", 8, "m-b", "ln-whisk-b"]].forEach(function (s) {
        var v = r[s[0]], y = cy + s[1];
        svg.appendChild(el("line", { x1: sx(v[0] - v[1]), x2: sx(v[0] + v[1]), y1: y, y2: y, class: s[3] }));
        svg.appendChild(el("circle", { cx: sx(v[0]), cy: y, r: 5.5, class: s[2] }));
      });
      var best = r.hmc[0];
      svg.appendChild(el("text", { x: sx(best) + 10, y: cy - 4, class: "t-val" }, fmtThousands(Math.round(best))));
      svg.appendChild(el("text", { x: sx(r.vi[0]) + 10, y: cy + 12, class: "t" }, fmtThousands(Math.round(r.vi[0]))));
    });
  }

  /* ---------- generic line chart ---------- */
  function lineChart(svg, o) {
    var sx = scale(o.x[0], o.x[1], o.L, o.R), sy = scale(o.y[0], o.y[1], o.B, o.T);
    o.yt.forEach(function (v) {
      svg.appendChild(el("line", { x1: o.L, x2: o.R, y1: sy(v), y2: sy(v), class: "grid" }));
      svg.appendChild(el("text", { x: o.L - 6, y: sy(v) + 3.5, "text-anchor": "end", class: o.small ? "t-s" : "t" }, o.yf ? o.yf(v) : String(v)));
    });
    o.xt.forEach(function (v) {
      svg.appendChild(el("text", { x: sx(v), y: o.B + 15, "text-anchor": "middle", class: o.small ? "t-s" : "t" }, o.xf ? o.xf(v) : String(v)));
    });
    if (o.xlab) svg.appendChild(el("text", { x: o.R, y: o.B + 30, "text-anchor": "end", class: o.small ? "t-s" : "t" }, o.xlab));
    o.series.forEach(function (s) {
      var pts = s.vals.map(function (v, i) { return v == null ? null : [sx(s.xs ? s.xs[i] : o.x[0] + i), sy(v)]; }).filter(Boolean);
      svg.appendChild(el("polyline", { points: pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), class: s.cls, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      if (s.dots) pts.forEach(function (p) { svg.appendChild(el("circle", { cx: p[0], cy: p[1], r: 3, class: s.dots })); });
      if (s.end) { var p = pts[pts.length - 1]; svg.appendChild(el("text", { x: p[0] + 6, y: p[1] + 3.5, class: o.small ? "t-s" : "t-val" }, s.end)); }
    });
  }

  /* ---------- Fig 2: CNN validation curves ---------- */
  function fig2() {
    var svg = document.getElementById("fig2"); if (!svg) return;
    var v = [62.54,71.41,76.12,76.02,78.67,78.31,79.48,80.99,81.59,82.0,82.21,81.61,80.97,81.89,81.78,80.8,81.66,80.53,81.67,82.05,81.39,81.6,81.57,81.98,81.83,81.4,82.11,81.02,80.89,80.34,
      62.4,70.05,72.11,75.71,76.05,77.91,78.88,66.32,79.42,78.56,72.32,74.83,80.95,81.94,79.69,79.22,80.83,81.47,82.82,73.86,82.85,82.51,77.47,78.69,78.2,82.91,82.82,80.88,78.92,82.51,
      56.53,72.8,77.3,75.16,80.3,78.63,80.06,81.06,81.96,82.67,83.11,83.05,84.3,83.02,82.28,81.58,84.8,85.12,85.37,86.1,85.52,86.47,86.64,86.81,86.76,85.39,86.69,87.54,84.7,87.64,
      66.03,60.04,70.01,70.27,71.72,72.93,75.89,65.51,78.92,69.54,78.09,80.91,81.79,70.02,80.35,82.79,81.86,81.24,82.72,84.44,84.8,78.52,86.02,85.51,85.43,86.36,85.99,86.23,83.91,82.47];
    function arm(k) { return v.slice(k * 30, k * 30 + 30); }
    lineChart(svg, { L: 40, R: 512, T: 10, B: 220, x: [1, 30], y: [55, 90], yt: [60, 70, 80, 90], xt: [1, 5, 10, 15, 20, 25, 30], yf: function (t) { return t + "%"; }, xlab: "epoch",
      series: [
        { vals: arm(0), cls: "ln-mute", end: "80.3" },
        { vals: arm(1), cls: "ln-mute-d" },
        { vals: arm(3), cls: "ln-b", end: "82.5" },
        { vals: arm(2), cls: "ln-a", end: "87.6" }
      ] });
  }

  /* ---------- mini charts for project cards ---------- */
  function minis() {
    var s;
    if ((s = document.getElementById("mini-dl"))) {
      var cnn = [79.1,86.43,86.37,90.73,92.37,92.0,92.31,92.67,92.85,92.91,93.52,92.97,93.58,92.67,92.91,91.76,92.73,93.4,93.52,93.64,93.52,93.58,93.52,93.7,93.58,93.58,93.52,93.52,93.52,93.58];
      var lr = [73.77,72.8,82.25,83.59,86.01,83.71,70.56,84.31,78.13,85.71,82.07,80.25,85.34,74.32,68.02,84.98,75.71,85.28,86.25,84.68,85.83,85.83,85.58,68.32,83.34,86.55,85.95,86.31,78.92,84.19];
      lineChart(s, { small: true, L: 32, R: 322, T: 8, B: 136, x: [1, 30], y: [65, 96], yt: [70, 80, 90], xt: [1, 10, 20, 30], yf: function (t) { return t + "%"; }, xlab: "epoch",
        series: [{ vals: lr, cls: "ln-b", end: "84.2" }, { vals: cnn, cls: "ln-a", end: "93.6" }] });
    }
    if ((s = document.getElementById("mini-airbnb"))) {
      var xs = [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.5, 4.5, 6, 9.5];
      lineChart(s, { small: true, L: 34, R: 328, T: 8, B: 136, x: [0, 10], y: [60, 190], yt: [80, 120, 160], xt: [0, 2, 4, 6, 8, 10], yf: function (t) { return "€" + t; }, xlab: "km from city centre",
        series: [
          { xs: xs, vals: [182.1,163.6,156.4,161.0,145.7,151.1,145.5,137.4,130.9,116.1], cls: "ln-a", dots: "m-a" },
          { xs: xs, vals: [126.9,98.5,84.4,92.8,91.6,101.0,null,72.6,88.1,73.2], cls: "ln-b", dots: "m-b" }
        ] });
    }
    if ((s = document.getElementById("mini-coffee"))) {
      var L = 44, R = 300, T = 8, B = 136, sy = scale(4.5, 7, B, T), x0 = L + 30, x1 = R - 50;
      [5, 6, 7].forEach(function (v) {
        s.appendChild(el("line", { x1: L, x2: R + 40, y1: sy(v), y2: sy(v), class: "grid" }));
        s.appendChild(el("text", { x: L - 6, y: sy(v) + 3.5, "text-anchor": "end", class: "t-s" }, "pH " + v));
      });
      [[x0, "Tim Hortons"], [x1, "Starbucks"]].forEach(function (p) { s.appendChild(el("text", { x: p[0], y: B + 16, "text-anchor": "middle", class: "t-ink-s" }, p[1])); });
      [[6.565, 6.64, "ln-a", "m-a", "latte"], [4.825, 5.89, "ln-b", "m-b", "Americano"]].forEach(function (r) {
        s.appendChild(el("line", { x1: x0, x2: x1, y1: sy(r[0]), y2: sy(r[1]), class: r[2] }));
        s.appendChild(el("circle", { cx: x0, cy: sy(r[0]), r: 4, class: r[3] }));
        s.appendChild(el("circle", { cx: x1, cy: sy(r[1]), r: 4, class: r[3] }));
        s.appendChild(el("text", { x: x1 + 10, y: sy(r[1]) + 3.5, class: "t-s" }, r[4]));
      });
      s.appendChild(el("text", { x: R + 40, y: B + 32, "text-anchor": "end", class: "t-s" }, "higher pH = less acidic"));
    }
    if ((s = document.getElementById("mini-delhi"))) {
      var rows = [["Seasonal + wind + ARMA(4,1)", 1.6454, "m-a"], ["Seasonal + ARMA(4,1)", 1.6518, "m-sel2"], ["Seasonal + humidity + AR(2)", 1.6970, "m-sel2"], ["Exponential smoothing", 1.7278, "m-sel2"], ["Holt linear trend", 1.7604, "m-sel2"], ["Holt–Winters", 2.1817, "m-dia"], ["Day-of-year average", 2.9562, "m-dia"], ["Same day last year", 3.2743, "m-dia"]];
      var L2 = 168, R2 = 330, T2 = 4, rh = 22, B2 = T2 + rh * rows.length, sx = scale(0, 3.6, L2, R2);
      [0, 1, 2, 3].forEach(function (v) {
        s.appendChild(el("line", { x1: sx(v), x2: sx(v), y1: T2, y2: B2, class: "grid" }));
        s.appendChild(el("text", { x: sx(v), y: B2 + 14, "text-anchor": "middle", class: "t-s" }, v + "°"));
      });
      s.appendChild(el("text", { x: R2, y: B2 + 29, "text-anchor": "end", class: "t-s" }, "holdout RMSE (°C), lower is better"));
      rows.forEach(function (r, i) {
        var cy = T2 + rh * i + rh / 2;
        s.appendChild(el("text", { x: 0, y: cy + 3.5, class: "t-ink-s" }, r[0]));
        s.appendChild(el("circle", { cx: sx(r[1]), cy: cy, r: 4, class: r[2] }));
        s.appendChild(el("text", { x: sx(r[1]) + 11, y: cy + 3.5, class: i === 0 ? "t-val" : "t-s" }, r[1].toFixed(2)));
      });
    }
  }

  /* ---------- Fig 3: OJ model comparison ---------- */
  function fig3() {
    var svg = document.getElementById("fig3"); if (!svg) return;
    var rows = [
      { label: "Majority baseline", cv: 0.6098 },
      { label: "k-nearest neighbors", cv: 0.7874 },
      { label: "Decision tree", cv: 0.8037 },
      { label: "Gradient boosting", cv: 0.8130 },
      { label: "Logistic, 17 predictors", cv: 0.8224 },
      { label: "Logistic, 8 predictors", cv: 0.8248, sel: true, test: 0.8411, future: 0.8026 }
    ];
    var L = 168, R = 540, T = 10, rowH = 36, B = T + rowH * rows.length;
    var sx = scale(0.55, 0.90, L, R);
    rows.forEach(function (r, i) {
      if (r.sel) svg.appendChild(el("rect", { x: -4, y: T + rowH * i + 2, width: R + 8, height: rowH - 4, rx: 5, class: "m-sel" }));
    });
    [0.6, 0.7, 0.8, 0.9].forEach(function (v) {
      svg.appendChild(el("line", { x1: sx(v), x2: sx(v), y1: T - 4, y2: B, class: "grid" }));
      svg.appendChild(el("text", { x: sx(v), y: B + 18, "text-anchor": "middle", class: "t" }, Math.round(v * 100) + "%"));
    });
    svg.appendChild(el("text", { x: (L + R) / 2, y: B + 38, "text-anchor": "middle", class: "t" }, "accuracy"));
    rows.forEach(function (r, i) {
      var cy = T + rowH * i + rowH / 2;
      svg.appendChild(el("text", { x: 0, y: cy + 4, class: "t-ink" }, r.label));
      svg.appendChild(el("line", { x1: sx(0.55), x2: sx(r.cv), y1: cy, y2: cy, class: "grid", "stroke-dasharray": "2 3" }));
      svg.appendChild(el("circle", { cx: sx(r.cv), cy: cy, r: 5.5, class: "m-a" }));
      if (r.sel) {
        svg.appendChild(el("rect", { x: sx(r.test) - 5, y: cy - 5, width: 10, height: 10, rx: 1.5, class: "m-b" }));
        var fx = sx(r.future);
        svg.appendChild(el("polygon", { points: [fx, cy - 6, fx + 6, cy, fx, cy + 6, fx - 6, cy].join(","), class: "m-dia" }));
        svg.appendChild(el("text", { x: sx(r.test) + 10, y: cy + 4, class: "t-val" }, (r.test * 100).toFixed(1) + "%"));
      } else {
        svg.appendChild(el("text", { x: sx(r.cv) + 10, y: cy + 4, class: "t" }, (r.cv * 100).toFixed(1) + "%"));
      }
    });
  }

  fig0(); fig1(); fig2(); fig3(); minis();

  /* ---------- copy email ---------- */
  var btn = document.getElementById("copy-email"), state = document.getElementById("copy-state");
  if (btn) btn.addEventListener("click", function () {
    var text = document.getElementById("email-text").textContent;
    function selectIt() {
      var range = document.createRange(); range.selectNodeContents(document.getElementById("email-text"));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(range);
      state.textContent = "Selected";
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { state.textContent = "Copied"; }, selectIt);
      } else { selectIt(); }
    } catch (e) { selectIt(); }
  });
})();
