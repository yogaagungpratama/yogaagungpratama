/* Hero effects: rotating 3D globe (land dots, cities, arcs) drawn on ONE sphere + wavy, pulsing headline.
   Pure vanilla JS. Respects prefers-reduced-motion and pauses when off-screen. */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Tunables (edit these to move / resize / speed up / brighten) ---- */
  var CFG = {
    xDesktop: 0.69, yDesktop: 0.50, rDesktop: 0.47,   // center x/y (fraction of hero), radius (x hero height, capped by width)
    xMobile: 0.60, yMobile: 0.30, rMobile: 0.42,      // same for narrow screens (radius = fraction of width)
    speed: 0.16,                                      // rotation, radians per second
    dotBright: 1.0, nodeBright: 1.0, arcBright: 1.0   // brightness multipliers
  };

  /* Coarse continent outlines [lon, lat] - enough to read as the real world when drawn as dots */
  var LAND = [
    [[-168,66],[-160,70],[-141,70],[-125,70],[-95,72],[-82,68],[-65,60],[-56,52],[-66,45],[-70,42],[-76,35],[-81,30],[-80,25],[-84,30],[-90,29],[-97,26],[-97,20],[-92,18],[-88,16],[-83,15],[-83,10],[-80,8],[-77,8],[-80,7],[-86,11],[-92,14],[-105,20],[-110,24],[-114,31],[-118,34],[-124,40],[-124,48],[-135,58],[-150,60],[-165,60]],
    [[-80,8],[-72,12],[-62,10],[-52,5],[-50,0],[-35,-5],[-38,-13],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-63,-41],[-66,-47],[-69,-52],[-72,-54],[-75,-50],[-74,-40],[-71,-30],[-70,-18],[-76,-14],[-81,-6],[-80,-2],[-78,2],[-77,8]],
    [[-55,60],[-45,60],[-20,70],[-20,80],[-40,83],[-60,80],[-70,76],[-55,68]],
    [[-10,36],[-9,43],[-1,46],[-4,48],[2,51],[8,54],[10,58],[5,62],[15,69],[28,71],[40,67],[60,69],[70,73],[90,76],[110,77],[130,72],[150,71],[170,69],[180,66],[165,60],[160,54],[156,51],[143,52],[140,47],[135,43],[129,35],[126,38],[122,40],[119,35],[122,30],[120,24],[110,20],[106,10],[100,13],[103,2],[98,8],[98,16],[92,22],[88,22],[80,15],[78,8],[73,18],[67,25],[57,25],[56,27],[50,30],[48,29],[52,24],[56,20],[52,16],[43,13],[35,28],[34,31],[36,36],[28,37],[26,40],[23,36],[20,40],[14,45],[18,40],[12,38],[8,44],[3,43],[-3,37]],
    [[-17,21],[-10,30],[-6,36],[10,37],[20,32],[32,31],[35,28],[43,12],[51,12],[45,2],[40,-5],[40,-15],[35,-24],[32,-29],[25,-34],[18,-34],[12,-18],[13,-6],[9,2],[8,5],[-8,4],[-17,14]],
    [[114,-22],[122,-18],[130,-12],[136,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[135,-34],[129,-32],[115,-34]],
    [[95,5],[104,-2],[106,-6],[101,-3]],
    [[109,2],[117,7],[119,1],[116,-4],[110,-3]],
    [[105,-6],[114,-7],[114,-8.5],[106,-7.5]],
    [[119,0],[125,1],[121,-5],[119,-4]],
    [[131,-1],[141,-3],[150,-10],[141,-9],[134,-4]],
    [[130,31],[135,34],[141,40],[145,44],[142,45],[140,41],[131,34]],
    [[-5,50],[1,51],[0,57],[-5,58]],
    [[172,-34],[178,-38],[174,-41],[167,-46],[172,-41]],
    [[-180,-72],[180,-72],[180,-90],[-180,-90]]
  ];
  var CITIES = [
    ['Jakarta', -6.2, 106.8, 1.6], ['Singapore', 1.35, 103.8, 1], ['Tokyo', 35.7, 139.7, 1], ['Seoul', 37.6, 127, 0.8], ['Beijing', 39.9, 116.4, 1],
    ['Mumbai', 19, 72.9, 1], ['Dubai', 25.2, 55.3, 1], ['Cairo', 30, 31.2, 0.9], ['Moscow', 55.7, 37.6, 0.9], ['London', 51.5, -0.1, 1],
    ['Frankfurt', 50.1, 8.7, 0.8], ['Lagos', 6.5, 3.4, 0.8], ['Johannesburg', -26.2, 28, 0.9], ['Sydney', -33.9, 151.2, 1], ['New York', 40.7, -74, 1],
    ['Toronto', 43.7, -79.4, 0.7], ['San Francisco', 37.8, -122.4, 1], ['Mexico City', 19.4, -99.1, 0.8], ['Sao Paulo', -23.5, -46.6, 1]
  ];
  var LINKS = [['Jakarta','Singapore'],['Jakarta','Sydney'],['Singapore','Tokyo'],['Singapore','Mumbai'],['Singapore','Beijing'],['Singapore','Sydney'],
    ['Mumbai','Dubai'],['Dubai','Cairo'],['Dubai','London'],['Dubai','Johannesburg'],['Cairo','Lagos'],['Cairo','Moscow'],['Johannesburg','Lagos'],
    ['London','Frankfurt'],['London','New York'],['Frankfurt','Moscow'],['Moscow','Beijing'],['Beijing','Tokyo'],['Beijing','Seoul'],['Seoul','Tokyo'],
    ['Tokyo','San Francisco'],['San Francisco','New York'],['San Francisco','Mexico City'],['New York','Toronto'],['New York','Sao Paulo'],['Lagos','Sao Paulo'],['Mexico City','Sao Paulo']];

  function inPoly(poly, lon, lat) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function isLand(lon, lat) { for (var i = 0; i < LAND.length; i++) if (inPoly(LAND[i], lon, lat)) return true; return false; }
  function ll(lat, lon) {
    var la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return { x: Math.cos(la) * Math.sin(lo), y: Math.sin(la), z: Math.cos(la) * Math.cos(lo) };
  }

  /* ---------------- 1. Globe ---------------- */
  var cv = document.createElement('canvas');
  cv.id = 'heroGlobe'; cv.setAttribute('aria-hidden', 'true');
  hero.insertBefore(cv, hero.firstChild);
  var ctx = cv.getContext('2d');
  if (ctx) initGlobe();

  function initGlobe() {
    var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0;
    var land = [], ocean = [], nodes = [], arcs = [], stars = [];
    var running = false, visible = true, raf = 0;
    var TILT = 0.36, cosT = Math.cos(TILT), sinT = Math.sin(TILT);
    var seed = 77123; function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    // dots: equal-area spiral over the sphere, split into land / ocean using the outlines
    (function () {
      var N = 5400, g = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < N; i++) {
        var y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), th = i * g;
        var p = { x: Math.sin(th) * r, y: y, z: Math.cos(th) * r };
        var lat = Math.asin(y) * 180 / Math.PI, lon = Math.atan2(p.x, p.z) * 180 / Math.PI;
        p.ph = rnd() * 6.283; p.sp = 0.8 + rnd() * 2.6; p.s = 0.7 + rnd() * 0.9;
        if (isLand(lon, lat)) land.push(p); else if (rnd() < 0.34) ocean.push(p);
      }
      var idx = {};
      CITIES.forEach(function (c, i) { var v = ll(c[1], c[2]); v.ph = rnd() * 6.283; v.sp = 1.2 + rnd() * 1.6; v.w = c[3]; nodes.push(v); idx[c[0]] = i; });
      LINKS.forEach(function (l) {
        var a = nodes[idx[l[0]]], b = nodes[idx[l[1]]];
        var dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
        arcs.push({ a: a, b: b, ang: Math.acos(dot), off: rnd(), speed: 0.07 + rnd() * 0.10 });
      });
    })();

    var glow = document.createElement('canvas'); glow.width = glow.height = 64;
    (function () {
      var c = glow.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(235,252,255,1)'); gr.addColorStop(0.22, 'rgba(110,215,255,.75)'); gr.addColorStop(1, 'rgba(40,120,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    })();

    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (W > 900) { cx = W * CFG.xDesktop; cy = H * CFG.yDesktop; R = Math.min(H * CFG.rDesktop, W * 0.30); }
      else { cx = W * CFG.xMobile; cy = H * CFG.yMobile; R = Math.min(W * CFG.rMobile, H * 0.42); }
      stars.length = 0;
      var sN = W < 700 ? 50 : 110;
      for (var i = 0; i < sN; i++) stars.push({ x: rnd() * W, y: rnd() * H, r: 0.4 + rnd() * 1.1, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.8 });
      if (!running) draw(performance.now());
    }

    var P = { x: 0, y: 0, z: 0, k: 1 }, Q = { x: 0, y: 0, z: 0, k: 1 }, T = { x: 0, y: 0, z: 0 };
    function proj(p, ca, sa, lift, o) {
      var x = p.x * ca + p.z * sa, z = -p.x * sa + p.z * ca, y = p.y;
      var y2 = y * cosT - z * sinT, z2 = y * sinT + z * cosT, m = lift || 1, k = 1 / (1 - z2 * 0.18);
      o.x = cx + x * m * R * k; o.y = cy - y2 * m * R * k; o.z = z2; o.k = k; return o;
    }

    function draw(now) {
      var t = now / 1000, ang = reduce ? 3.1 : t * CFG.speed, ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.clearRect(0, 0, W, H);

      // stars
      for (var si = 0; si < stars.length; si++) {
        var s = stars[si], a = reduce ? 0.6 : 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        ctx.fillStyle = 'rgba(190,225,255,' + a.toFixed(2) + ')'; ctx.fillRect(s.x, s.y, s.r, s.r);
      }

      // atmosphere glow behind the sphere
      var g0 = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.28);
      g0.addColorStop(0, 'rgba(60,150,255,.38)'); g0.addColorStop(0.45, 'rgba(40,110,255,.14)'); g0.addColorStop(1, 'rgba(30,90,255,0)');
      ctx.fillStyle = g0; ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, 6.2832); ctx.fill();

      // sphere body (lit from the upper-left)
      var gb = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.05, cx, cy, R);
      gb.addColorStop(0, '#1b4fa8'); gb.addColorStop(0.45, '#0c2a6a'); gb.addColorStop(1, '#040f2b');
      ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();

      // clip everything else to the sphere so dots can never float outside it
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 1.0, 0, 6.2832); ctx.clip();

      var i, p, d, al, sz, dsc = Math.max(0.5, Math.min(1.15, R / 260));
      for (i = 0; i < ocean.length; i++) {
        p = ocean[i]; proj(p, ca, sa, 1, P); if (P.z < -0.05) continue;
        d = (P.z + 1) / 2; al = 0.16 + 0.30 * d;
        ctx.fillStyle = 'rgba(80,150,255,' + al.toFixed(3) + ')'; ctx.fillRect(P.x - 0.7, P.y - 0.7, 1.4, 1.4);
      }
      for (i = 0; i < land.length; i++) {
        p = land[i]; proj(p, ca, sa, 1, P);
        d = (P.z + 1) / 2; if (P.z < -0.12) { if ((i & 3) !== 0) continue; }
        var tw = reduce ? 0.85 : 0.55 + 0.45 * Math.sin(t * p.sp + p.ph);
        al = Math.min(1, (0.10 + 0.95 * Math.pow(d, 1.5)) * tw * CFG.dotBright);
        if (al < 0.04) continue;
        sz = p.s * 1.85 * dsc * P.k * (0.7 + d * 0.9);
        ctx.fillStyle = 'rgba(' + (140 + d * 90 | 0) + ',' + (215 + d * 35 | 0) + ',255,' + al.toFixed(3) + ')';
        ctx.fillRect(P.x - sz / 2, P.y - sz / 2, sz, sz);
      }
      ctx.restore();

      // limb light (thin bright rim) for the 3D feel
      var gr = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.01);
      gr.addColorStop(0, 'rgba(90,190,255,0)'); gr.addColorStop(1, 'rgba(120,215,255,.38)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R * 1.01, 0, 6.2832); ctx.fill();

      // connection arcs (follow the sphere, lifted slightly) with travelling pulses
      ctx.lineCap = 'round';
      for (i = 0; i < arcs.length; i++) {
        var ar = arcs[i], sinA = Math.sin(ar.ang) || 1e-3, steps = 26, hgt = 0.05 + ar.ang * 0.14;
        var head = reduce ? 0.5 : (t * ar.speed + ar.off) % 1, tFrom = Math.max(0, head - 0.18), prev = null;
        for (var k = 0; k <= steps; k++) {
          var f = k / steps, w1 = Math.sin((1 - f) * ar.ang) / sinA, w2 = Math.sin(f * ar.ang) / sinA;
          T.x = ar.a.x * w1 + ar.b.x * w2; T.y = ar.a.y * w1 + ar.b.y * w2; T.z = ar.a.z * w1 + ar.b.z * w2;
          proj(T, ca, sa, 1.004 + hgt * Math.sin(Math.PI * f), Q);
          if (prev && (Q.z + prev.z) / 2 > -0.1) {
            d = ((Q.z + prev.z) / 2 + 1) / 2;
            var inTrail = f > tFrom && f <= head + 0.02;
            if (inTrail) {
              var tf = (f - tFrom) / (head - tFrom + 1e-3);
              ctx.strokeStyle = 'rgba(170,240,255,' + Math.min(1, (0.25 + 0.75 * tf) * (0.45 + d) * CFG.arcBright).toFixed(3) + ')'; ctx.lineWidth = 1.8;
            } else {
              ctx.strokeStyle = 'rgba(100,200,255,' + Math.min(1, (0.14 + 0.40 * d) * CFG.arcBright).toFixed(3) + ')'; ctx.lineWidth = 0.9;
            }
            ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(Q.x, Q.y); ctx.stroke();
          }
          prev = prev || {}; prev.x = Q.x; prev.y = Q.y; prev.z = Q.z;
        }
      }

      // glowing city nodes (on the surface)
      for (i = 0; i < nodes.length; i++) {
        var nd = nodes[i]; proj(nd, ca, sa, 1.005, P);
        if (P.z < 0.02) continue;
        d = (P.z + 1) / 2;
        var pu = reduce ? 0.8 : 0.5 + 0.5 * Math.sin(t * nd.sp + nd.ph);
        sz = (14 + pu * 24) * nd.w * P.k * (0.55 + d * 0.8);
        ctx.globalAlpha = Math.min(1, (0.35 + 0.65 * d) * (0.55 + 0.45 * pu) * CFG.nodeBright);
        ctx.drawImage(glow, P.x - sz / 2, P.y - sz / 2, sz, sz); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(240,253,255,' + (0.6 + 0.4 * d).toFixed(2) + ')';
        ctx.fillRect(P.x - 1.2, P.y - 1.2, 2.6, 2.6);
      }
    }

    function loop(now) { if (!running) return; draw(now); raf = requestAnimationFrame(loop); }
    function start() { if (reduce || running || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.01 }).observe(hero);
    layout(); start();
  }

  /* ---------------- 2. Headline: wavy letters + pulsing glow ---------------- */
  var h1 = hero.querySelector('h1');
  if (!h1 || reduce) return;
  var bgH = null, bgG = null, busy = false, idx = 0;
  function capture() { if (bgH) return; bgH = getComputedStyle(h1).backgroundImage; var g = h1.querySelector('.gradient'); bgG = g ? getComputedStyle(g).backgroundImage : bgH; }
  function split(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'wd'; w.setAttribute('aria-hidden', 'true');
          tok.split('').forEach(function (ch) { var l = document.createElement('span'); l.className = 'wl'; l.textContent = ch; l.style.setProperty('--i', idx++); w.appendChild(l); });
          frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') { split(n); }
    });
  }
  function place() {
    var hr = h1.getBoundingClientRect();
    h1.style.setProperty('--wsz', Math.max(1, hr.width) + 'px');
    Array.prototype.forEach.call(h1.querySelectorAll('.wl'), function (l) { l.style.setProperty('--gx', (-(l.getBoundingClientRect().left - hr.left)) + 'px'); });
  }
  function wavify() {
    if (busy) return; busy = true; mo.disconnect();
    try {
      capture(); h1.classList.add('wavy'); h1.style.setProperty('--wbg', bgH);
      h1.querySelectorAll('.gradient').forEach(function (g) { g.style.setProperty('--wbg', bgG); });
      if (!h1.querySelector('.wl')) { h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim()); idx = 0; split(h1); }
      place();
    } finally { busy = false; mo.observe(h1, { childList: true }); }
  }
  var mo = new MutationObserver(function () { if (!h1.querySelector('.wl')) wavify(); });
  wavify();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  var rt2; window.addEventListener('resize', function () { clearTimeout(rt2); rt2 = setTimeout(place, 150); });
})();
