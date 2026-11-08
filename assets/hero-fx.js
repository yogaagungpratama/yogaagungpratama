/* Hero effects: rotating 3D globe network (canvas) + pulsing, wavy headline letters.
   Pure vanilla JS, no dependencies. Respects prefers-reduced-motion and pauses when off-screen. */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------
     1. 3D globe with twinkling dots, glowing nodes and moving arcs
  --------------------------------------------------------------- */
  var cv = document.createElement('canvas');
  cv.id = 'heroGlobe';
  cv.setAttribute('aria-hidden', 'true');
  hero.insertBefore(cv, hero.firstChild);
  var ctx = cv.getContext('2d');
  if (ctx) initGlobe();

  function initGlobe() {
    var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0;
    var pts = [], nodes = [], arcs = [];
    var running = false, visible = true, raf = 0;
    var TILT = 0.38;

    // seeded random so the layout is stable between reloads
    var seed = 20261109;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    function build() {
      pts.length = nodes.length = arcs.length = 0;
      var N = W < 700 ? 320 : 560;
      var g = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < N; i++) {
        var y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), th = i * g;
        pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r, ph: rnd() * 6.283, sp: 0.8 + rnd() * 2.4, s: 0.6 + rnd() * 1.0 });
      }
      var M = W < 700 ? 22 : 34;
      for (var k = 0; k < M; k++) {
        var u = rnd() * 2 - 1, t = rnd() * 6.283, rr = Math.sqrt(1 - u * u);
        nodes.push({ x: Math.cos(t) * rr, y: u, z: Math.sin(t) * rr, ph: rnd() * 6.283, sp: 1.2 + rnd() * 1.8 });
      }
      // connect each node to its 2 nearest neighbours
      var seen = {};
      for (var a = 0; a < nodes.length; a++) {
        var d = [];
        for (var b = 0; b < nodes.length; b++) {
          if (a === b) continue;
          var dot = nodes[a].x * nodes[b].x + nodes[a].y * nodes[b].y + nodes[a].z * nodes[b].z;
          d.push({ b: b, dot: dot });
        }
        d.sort(function (p, q) { return q.dot - p.dot; });
        for (var j = 0; j < 2; j++) {
          var bb = d[j].b, key = a < bb ? a + '-' + bb : bb + '-' + a;
          if (seen[key]) continue;
          seen[key] = 1;
          arcs.push({ a: a, b: bb, off: rnd(), speed: 0.10 + rnd() * 0.14, ang: Math.acos(Math.max(-1, Math.min(1, d[j].dot))) });
        }
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (W > 900) { cx = W * 0.76; cy = H * 0.52; R = Math.min(H * 0.64, W * 0.26); }
      else { cx = W * 0.5; cy = H * 0.40; R = Math.min(W * 0.48, H * 0.36); }
      build();
      if (!running) draw(performance.now());
    }

    // pre-rendered soft glow sprite for nodes
    var glow = document.createElement('canvas'); glow.width = glow.height = 64;
    (function () {
      var c = glow.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(210,245,255,1)'); gr.addColorStop(0.25, 'rgba(90,200,255,.65)');
      gr.addColorStop(1, 'rgba(40,120,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    })();

    var cosT = Math.cos(TILT), sinT = Math.sin(TILT);
    function proj(p, ca, sa, lift, out) {
      // rotate around Y, then tilt around X
      var x = p.x * ca + p.z * sa, z = -p.x * sa + p.z * ca, y = p.y;
      var y2 = y * cosT - z * sinT, z2 = y * sinT + z * cosT;
      var m = lift || 1;
      var persp = 1 / (1 - z2 * 0.22);
      out.x = cx + x * m * R * persp; out.y = cy - y2 * m * R * persp; out.z = z2; out.p = persp;
      return out;
    }

    var A = { x: 0, y: 0, z: 0, p: 1 }, B = { x: 0, y: 0, z: 0, p: 1 }, P = { x: 0, y: 0, z: 0, p: 1 };
    var tmp = { x: 0, y: 0, z: 0 };

    function draw(now) {
      var t = now / 1000, ang = reduce ? 0.9 : t * 0.14, ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.clearRect(0, 0, W, H);

      // atmosphere + body
      var g1 = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.22);
      g1.addColorStop(0, 'rgba(30,110,255,0)'); g1.addColorStop(0.62, 'rgba(60,160,255,.20)'); g1.addColorStop(1, 'rgba(40,120,255,0)');
      ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 6.2832); ctx.fill();
      var g2 = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
      g2.addColorStop(0, 'rgba(70,150,255,.16)'); g2.addColorStop(1, 'rgba(10,40,110,.10)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();

      // surface dots (twinkling, dimmer on the far side)
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i]; proj(p, ca, sa, 1, A);
        var depth = (A.z + 1) / 2;
        var tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * p.sp + p.ph);
        var al = Math.min(1, (0.14 + 1.05 * Math.pow(depth, 1.4)) * tw);
        if (al < 0.03) continue;
        var s = p.s * 1.55 * A.p * (0.8 + depth * 0.9);
        ctx.fillStyle = 'rgba(' + (120 + depth * 100 | 0) + ',' + (200 + depth * 45 | 0) + ',255,' + al.toFixed(3) + ')';
        ctx.fillRect(A.x - s / 2, A.y - s / 2, s, s);
      }

      // arcs lifted above the surface, with travelling light pulses
      ctx.lineCap = 'round';
      for (var k = 0; k < arcs.length; k++) {
        var ar = arcs[k], na = nodes[ar.a], nb = nodes[ar.b];
        var sinA = Math.sin(ar.ang) || 1e-3, steps = 22, hgt = 0.10 + ar.ang * 0.16;
        proj(na, ca, sa, 1, A); proj(nb, ca, sa, 1, B);
        var vis = (Math.min(A.z, B.z) + 1) / 2;
        if (vis < 0.05 && Math.max(A.z, B.z) < 0) continue;
        var head = reduce ? 0.5 : (t * ar.speed + ar.off) % 1;
        var prev = null, trailFrom = Math.max(0, head - 0.16);
        ctx.lineWidth = 1;
        for (var s2 = 0; s2 <= steps; s2++) {
          var f = s2 / steps;
          var w1 = Math.sin((1 - f) * ar.ang) / sinA, w2 = Math.sin(f * ar.ang) / sinA;
          tmp.x = na.x * w1 + nb.x * w2; tmp.y = na.y * w1 + nb.y * w2; tmp.z = na.z * w1 + nb.z * w2;
          proj(tmp, ca, sa, 1 + hgt * Math.sin(Math.PI * f), P);
          if (prev) {
            var d = ((P.z + prev.z) / 2 + 1) / 2;
            var base = 0.10 + 0.42 * d;
            var inTrail = f > trailFrom && f <= head + 0.02;
            if (inTrail) {
              var tf = (f - trailFrom) / (head - trailFrom + 1e-3);
              ctx.strokeStyle = 'rgba(150,235,255,' + (0.25 + 0.7 * tf * (0.4 + d)).toFixed(3) + ')';
              ctx.lineWidth = 1.6;
            } else {
              ctx.strokeStyle = 'rgba(90,185,255,' + base.toFixed(3) + ')';
              ctx.lineWidth = 0.9;
            }
            ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(P.x, P.y); ctx.stroke();
          }
          prev = prev || {}; prev.x = P.x; prev.y = P.y; prev.z = P.z;
        }
      }

      // glowing city nodes
      for (var n = 0; n < nodes.length; n++) {
        var nd = nodes[n]; proj(nd, ca, sa, 1.012, A);
        var dep = (A.z + 1) / 2;
        if (dep < 0.08) continue;
        var pulse = reduce ? 0.8 : 0.5 + 0.5 * Math.sin(t * nd.sp + nd.ph);
        var sz = (16 + pulse * 26) * A.p * (0.55 + dep);
        ctx.globalAlpha = Math.min(1, (0.25 + 0.75 * dep) * (0.55 + 0.45 * pulse));
        ctx.drawImage(glow, A.x - sz / 2, A.y - sz / 2, sz, sz);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(235,252,255,' + (0.5 + 0.5 * dep).toFixed(2) + ')';
        ctx.fillRect(A.x - 1, A.y - 1, 2.2, 2.2);
      }
    }

    function loop(now) {
      if (!running) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    function start() { if (reduce || running || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.01 }).observe(hero);
    }
    resize(); start();
  }

  /* ---------------------------------------------------------------
     2. Headline: wavy letters + pulsing glow
  --------------------------------------------------------------- */
  var h1 = hero.querySelector('h1');
  if (!h1 || reduce) return;
  var bgH = null, bgG = null, busy = false, idx = 0;

  function capture() {
    if (bgH) return;
    bgH = getComputedStyle(h1).backgroundImage;
    var g = h1.querySelector('.gradient');
    bgG = g ? getComputedStyle(g).backgroundImage : bgH;
  }

  function split(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'wd'; w.setAttribute('aria-hidden', 'true');
          tok.split('').forEach(function (ch) {
            var l = document.createElement('span'); l.className = 'wl'; l.textContent = ch;
            l.style.setProperty('--i', idx++); w.appendChild(l);
          });
          frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') { split(n); }
    });
  }

  function place() {
    var hr = h1.getBoundingClientRect();
    h1.style.setProperty('--wsz', Math.max(1, hr.width) + 'px');
    Array.prototype.forEach.call(h1.querySelectorAll('.wl'), function (l) {
      l.style.setProperty('--gx', (-(l.getBoundingClientRect().left - hr.left)) + 'px');
    });
  }

  function wavify() {
    if (busy) return; busy = true; mo.disconnect();
    try {
      capture();
      h1.classList.add('wavy');
      h1.style.setProperty('--wbg', bgH);
      h1.querySelectorAll('.gradient').forEach(function (g) { g.style.setProperty('--wbg', bgG); });
      if (!h1.querySelector('.wl')) {
        h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
        idx = 0; split(h1);
      }
      place();
    } finally { busy = false; mo.observe(h1, { childList: true }); }
  }

  var mo = new MutationObserver(function () { if (!h1.querySelector('.wl')) wavify(); });
  wavify();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  var rt2; window.addEventListener('resize', function () { clearTimeout(rt2); rt2 = setTimeout(place, 150); });
})();
