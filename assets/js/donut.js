/* =========================================================
   Donat Empuk — Vector renderer (SVG isometrik)
   Menggambar donat & box isometrik secara prosedural.
   Bisa dipakai di browser (window.DonutArt) maupun Node.
   ========================================================= */
(function (root) {
  'use strict';

  // ---------- Data topping ----------
  var TOPPINGS = {
    vanila:    { name: 'Vanila',     icing: '#FFF0C7', shade: '#EBCF8E', dough: '#EFB36A', side: '#D08A42', accent: '#FFFFFF', kind: 'sprinkle', swatch: '#FFE7A3' },
    coklat:    { name: 'Coklat',     icing: '#5B2F1C', shade: '#3B1C0F', dough: '#E7A45C', side: '#C4803A', accent: '#A8683F', kind: 'drizzle',  swatch: '#6B3A22' },
    matcha:    { name: 'Matcha',     icing: '#8DC255', shade: '#679A34', dough: '#EDB064', side: '#CC883F', accent: '#F7FBEF', kind: 'drizzleDots', swatch: '#8DC255' },
    strowberi: { name: 'Strowberi',  icing: '#FF7DB2', shade: '#DE568D', dough: '#EFB36A', side: '#D08A42', accent: '#FFFFFF', kind: 'dots',     swatch: '#FF7DB2' },
    redvelvet: { name: 'Red Velvet', icing: '#FFF6F2', shade: '#EAD6CF', dough: '#B8243A', side: '#8C1427', accent: '#C8102E', kind: 'crumbs',   swatch: '#C8102E' },
    oreo:      { name: 'Oreo',       icing: '#F4EFEA', shade: '#D9CEC3', dough: '#4B2C20', side: '#331C14', accent: '#231E1B', kind: 'cookie',   swatch: '#2E2926' }
  };
  var ORDER = ['vanila', 'coklat', 'matcha', 'strowberi', 'redvelvet', 'oreo'];

  var PACKAGES = {
    '12': { id: '12', name: 'Isi 12', rows: 3, cols: 4, price: 34000, palette: 'pink' },
    '6':  { id: '6',  name: 'Isi 6',  rows: 2, cols: 3, price: 17000, palette: 'teal' },
    '2':  { id: '2',  name: 'Isi 2',  rows: 1, cols: 2, price: 9000,  palette: 'sun' }
  };

  var PALETTES = {
    pink: { outer: '#FF4F86', outerDark: '#D9336A', inner: '#FFC4D6', innerDark: '#FF9DBB', floor: '#FFF4EA', lid: '#FFD9E5', lidDot: '#FFFFFF', ink: '#B81E53' },
    teal: { outer: '#16B3A6', outerDark: '#0E8C82', inner: '#B5EEE7', innerDark: '#86DDD3', floor: '#FFF7EC', lid: '#CFF5F0', lidDot: '#FFFFFF', ink: '#0B6E66' },
    sun:  { outer: '#FF9F1C', outerDark: '#E07F00', inner: '#FFE0A8', innerDark: '#FFC870', floor: '#FFF8EE', lid: '#FFEBC4', lidDot: '#FFFFFF', ink: '#A65A00' }
  };

  var SPRINKLE_COLORS = ['#FF4F86', '#FFD23F', '#3BCEAC', '#4D8BFF', '#A06CFF', '#FF8A3D'];

  // ---------- Util ----------
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function f(n) { return Math.round(n * 100) / 100; }
  var UID = 0;
  function uid() { UID += 1; return 'd' + UID + Math.floor(Math.random() * 1e6).toString(36); }

  // Titik pada elips dengan faktor radius k
  function ep(cx, cy, rx, ry, a, k) { return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]; }

  // Path glaze bergelombang + lelehan di sisi depan
  function icingPath(cx, cy, rx, ry, seed, drip) {
    var r = rng(seed * 7 + 3), ph = r() * 6.28, ph2 = r() * 6.28;
    var pts = [], N = 72;
    for (var i = 0; i < N; i++) {
      var a = (i / N) * Math.PI * 2;
      var k = 0.9 + 0.045 * Math.sin(a * 7 + ph) + 0.02 * Math.sin(a * 13 + ph2);
      var p = ep(cx, cy, rx, ry, a, k);
      var s = Math.sin(a);
      if (s > 0.15) { // sisi depan -> lelehan
        var d = Math.max(0, Math.sin(a * 6 + ph2));
        p[1] += Math.pow(d, 3) * drip * s;
      }
      pts.push(p);
    }
    var d0 = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (var j = 1; j <= N; j++) {
      var p0 = pts[j - 1], p1 = pts[j % N];
      var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      d0 += 'Q' + f(p0[0]) + ' ' + f(p0[1]) + ' ' + f(mx) + ' ' + f(my);
    }
    return d0 + 'Z';
  }

  // Titik acak di area cincin glaze
  function ringPoint(r, cx, cy, rx, ry) {
    var a = r() * Math.PI * 2, k = 0.46 + r() * 0.36;
    return ep(cx, cy, rx, ry, a, k);
  }

  // ---------- Donat tunggal (isometrik) ----------
  // px,py = titik dasar donat, rad = radius dasar, key = topping|null
  function donut(px, py, rad, key, seed, opt) {
    opt = opt || {};
    var rx = rad * 1.2, ry = rad * 0.69, th = rad * 0.46, ty = py - th;
    var s = '';
    // bayangan
    s += '<ellipse cx="' + f(px + rad * 0.06) + '" cy="' + f(py + ry * 0.1) + '" rx="' + f(rx * 1.02) + '" ry="' + f(ry * 1.02) + '" fill="#5a2a14" opacity=".16"/>';

    if (!key) {
      // Mode garis (belum dipilih)
      var sw = f(Math.max(1, rad * 0.045));
      s += '<g fill="none" stroke="#CDA88A" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">';
      s += '<path d="M' + f(px - rx) + ' ' + f(ty) + 'L' + f(px - rx) + ' ' + f(py) + 'A' + f(rx) + ' ' + f(ry) + ' 0 0 0 ' + f(px + rx) + ' ' + f(py) + 'L' + f(px + rx) + ' ' + f(ty) + '" fill="#FFFBF5"/>';
      s += '<ellipse cx="' + f(px) + '" cy="' + f(ty) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="#FFFDF9"/>';
      s += '<ellipse cx="' + f(px) + '" cy="' + f(ty) + '" rx="' + f(rx * 0.72) + '" ry="' + f(ry * 0.72) + '" stroke-dasharray="' + f(rad * 0.12) + ' ' + f(rad * 0.11) + '" opacity=".8"/>';
      s += '<ellipse cx="' + f(px) + '" cy="' + f(ty) + '" rx="' + f(rx * 0.3) + '" ry="' + f(ry * 0.3) + '" fill="#F4E6D8"/>';
      s += '</g>';
      return s;
    }

    var T = TOPPINGS[key] || TOPPINGS.vanila;
    var r = rng(seed + 11);
    var id = opt.id || uid();

    // badan roti
    s += '<path d="M' + f(px - rx) + ' ' + f(ty) + 'L' + f(px - rx) + ' ' + f(py) + 'A' + f(rx) + ' ' + f(ry) + ' 0 0 0 ' + f(px + rx) + ' ' + f(py) + 'L' + f(px + rx) + ' ' + f(ty) + 'Z" fill="' + T.side + '"/>';
    // highlight sisi
    s += '<path d="M' + f(px - rx * 0.7) + ' ' + f(ty + ry * 0.75) + 'Q' + f(px - rx * 0.35) + ' ' + f(py + ry * 0.88) + ' ' + f(px + rx * 0.1) + ' ' + f(py + ry * 0.98) + '" stroke="#fff" stroke-opacity=".22" stroke-width="' + f(rad * 0.08) + '" fill="none" stroke-linecap="round"/>';
    s += '<ellipse cx="' + f(px) + '" cy="' + f(ty) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="' + T.dough + '"/>';

    // glaze
    var ip = icingPath(px, ty, rx, ry, seed, th * 0.75);
    var ipShade = icingPath(px, ty + rad * 0.05, rx, ry, seed, th * 0.75);
    s += '<path d="' + ipShade + '" fill="' + T.shade + '"/>';
    s += '<path d="' + ip + '" fill="' + T.icing + '"/>';

    // lubang
    s += '<ellipse cx="' + f(px) + '" cy="' + f(ty) + '" rx="' + f(rx * 0.34) + '" ry="' + f(ry * 0.34) + '" fill="' + T.shade + '"/>';
    s += '<ellipse cx="' + f(px) + '" cy="' + f(ty + ry * 0.02) + '" rx="' + f(rx * 0.29) + '" ry="' + f(ry * 0.29) + '" fill="' + T.dough + '"/>';
    s += '<ellipse cx="' + f(px) + '" cy="' + f(ty + ry * 0.1) + '" rx="' + f(rx * 0.25) + '" ry="' + f(ry * 0.22) + '" fill="' + T.side + '"/>';
    s += '<ellipse cx="' + f(px) + '" cy="' + f(ty + ry * 0.16) + '" rx="' + f(rx * 0.2) + '" ry="' + f(ry * 0.14) + '" fill="#3a1c0c" opacity=".55"/>';

    // mask untuk drizzle agar hanya di atas glaze
    var mask = '<mask id="m' + id + '" maskUnits="userSpaceOnUse" x="' + f(px - rx * 1.2) + '" y="' + f(ty - ry * 1.3) + '" width="' + f(rx * 2.4) + '" height="' + f(ry * 2.8) + '"><path d="' + ip + '" fill="#fff"/><ellipse cx="' + f(px) + '" cy="' + f(ty) + '" rx="' + f(rx * 0.36) + '" ry="' + f(ry * 0.36) + '" fill="#000"/></mask>';

    function zig(color, w, n) {
      var d = '', x0 = px - rx * 0.95, step = (rx * 1.9) / n;
      for (var i = 0; i <= n; i++) {
        var x = x0 + i * step + (r() - 0.5) * step * 0.3;
        var y = ty + (i % 2 ? 1 : -1) * ry * (0.75 + r() * 0.2);
        if (i === 0) d += 'M' + f(x) + ' ' + f(y);
        else { var cx1 = x - step * 0.5; d += 'Q' + f(cx1) + ' ' + f(ty + (i % 2 ? -0.1 : 0.1) * ry) + ' ' + f(x) + ' ' + f(y); }
      }
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + f(w) + '" stroke-linecap="round" mask="url(#m' + id + ')"/>';
    }

    var top = '';
    var i, p, n;
    if (T.kind === 'sprinkle') {
      n = 16;
      for (i = 0; i < n; i++) {
        p = ringPoint(r, px, ty, rx, ry);
        var c = SPRINKLE_COLORS[Math.floor(r() * SPRINKLE_COLORS.length)];
        var w = rad * 0.17, h = rad * 0.055, rot = Math.floor(r() * 180);
        top += '<rect x="' + f(p[0] - w / 2) + '" y="' + f(p[1] - h / 2) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(h / 2) + '" fill="' + c + '" transform="rotate(' + rot + ' ' + f(p[0]) + ' ' + f(p[1]) + ')"/>';
      }
    } else if (T.kind === 'drizzle') {
      top += zig(T.accent, rad * 0.075, 9);
      for (i = 0; i < 6; i++) { p = ringPoint(r, px, ty, rx, ry); top += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(rad * 0.045) + '" fill="#E9C9A0"/>'; }
    } else if (T.kind === 'drizzleDots') {
      top += zig(T.accent, rad * 0.06, 10);
      for (i = 0; i < 10; i++) { p = ringPoint(r, px, ty, rx, ry); top += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(rad * 0.03) + '" fill="#4E7C22" opacity=".7"/>'; }
    } else if (T.kind === 'dots') {
      top += zig('#FFFFFF', rad * 0.05, 11);
      for (i = 0; i < 12; i++) {
        p = ringPoint(r, px, ty, rx, ry);
        top += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(rad * (0.03 + r() * 0.025)) + '" fill="' + (i % 3 ? '#E3124F' : '#FFFFFF') + '"/>';
      }
    } else if (T.kind === 'crumbs') {
      for (i = 0; i < 14; i++) {
        p = ringPoint(r, px, ty, rx, ry);
        var cr = rad * (0.035 + r() * 0.04);
        top += '<rect x="' + f(p[0] - cr) + '" y="' + f(p[1] - cr * 0.7) + '" width="' + f(cr * 2) + '" height="' + f(cr * 1.4) + '" rx="' + f(cr * 0.4) + '" fill="' + (i % 2 ? T.accent : '#9B0F25') + '" transform="rotate(' + Math.floor(r() * 90) + ' ' + f(p[0]) + ' ' + f(p[1]) + ')"/>';
      }
    } else if (T.kind === 'cookie') {
      for (i = 0; i < 14; i++) {
        p = ringPoint(r, px, ty, rx, ry);
        var q = rad * (0.03 + r() * 0.05);
        top += '<path d="M' + f(p[0] - q) + ' ' + f(p[1]) + 'L' + f(p[0] - q * 0.2) + ' ' + f(p[1] - q * 0.8) + 'L' + f(p[0] + q) + ' ' + f(p[1] - q * 0.2) + 'L' + f(p[0] + q * 0.3) + ' ' + f(p[1] + q * 0.7) + 'Z" fill="' + T.accent + '"/>';
      }
      // mini cookie
      var ca = r() * Math.PI * 2, cp = ep(px, ty, rx, ry, -Math.PI / 2 + (r() - 0.5), 0.66);
      var cw = rad * 0.26, chh = rad * 0.16;
      top += '<g transform="rotate(' + Math.floor(ca * 10) % 30 + ' ' + f(cp[0]) + ' ' + f(cp[1]) + ')">' +
        '<ellipse cx="' + f(cp[0]) + '" cy="' + f(cp[1] + chh * 0.45) + '" rx="' + f(cw) + '" ry="' + f(chh) + '" fill="#1c1715"/>' +
        '<ellipse cx="' + f(cp[0]) + '" cy="' + f(cp[1] + chh * 0.2) + '" rx="' + f(cw * 0.95) + '" ry="' + f(chh * 0.9) + '" fill="#fff"/>' +
        '<ellipse cx="' + f(cp[0]) + '" cy="' + f(cp[1]) + '" rx="' + f(cw) + '" ry="' + f(chh) + '" fill="#2b2421"/>' +
        '<ellipse cx="' + f(cp[0]) + '" cy="' + f(cp[1]) + '" rx="' + f(cw * 0.6) + '" ry="' + f(chh * 0.55) + '" fill="none" stroke="#443a35" stroke-width="' + f(rad * 0.025) + '"/></g>';
    }

    // kilau glaze
    var h1 = ep(px, ty, rx, ry, Math.PI * 1.08, 0.72), h2 = ep(px, ty, rx, ry, Math.PI * 1.38, 0.72);
    var hl = '<path d="M' + f(h1[0]) + ' ' + f(h1[1]) + 'A' + f(rx * 0.72) + ' ' + f(ry * 0.72) + ' 0 0 1 ' + f(h2[0]) + ' ' + f(h2[1]) + '" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="' + f(rad * 0.07) + '" stroke-linecap="round"/>';

    return s + mask + top + hl;
  }

  // ---------- Proyeksi isometrik ----------
  function P(x, y, z) { return [(x - y) * 0.866, (x + y) * 0.5 - (z || 0)]; }
  function poly(pts, fill, extra) {
    return '<path d="M' + pts.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join('L') + 'Z" fill="' + fill + '"' + (extra || '') + '/>';
  }

  // ---------- Box isometrik ----------
  // pkgId: '12'|'6'|'2' ; fills: array topping|null sepanjang isi box
  function box(pkgId, fills, opt) {
    opt = opt || {};
    var pk = PACKAGES[pkgId];
    var R = pk.rows, C = pk.cols, S = 60, H = 11;
    var W = C * S, D = R * S;
    var pal = PALETTES[opt.palette || pk.palette];
    var lidOn = opt.lid !== false;
    var seed = opt.seed || 1;
    var brand = opt.brand || (root.APP_CONFIG && root.APP_CONFIG.STORE_NAME) || 'Donat Empuk';
    var g = '';

    // tutup (terbuka ke belakang)
    var lidBack = -D * 0.34, lidUp = H + Math.max(D, 90) * 0.92;
    var L0 = P(0, 0, H), L1 = P(W, 0, H), L2 = P(W, lidBack, lidUp), L3 = P(0, lidBack, lidUp);
    if (lidOn) {
      // sisi luar tutup (tipis)
      g += poly([L3, L2, P(W, lidBack - 4, lidUp - 3), P(0, lidBack - 4, lidUp - 3)], pal.outerDark);
      g += poly([L0, L1, L2, L3], pal.lid);
      // pola polkadot di dalam tutup
      var vx = (0 - lidBack) * 0.866, vy = lidBack * 0.5 - (lidUp - H);
      var vl = Math.sqrt(lidBack * lidBack + (lidUp - H) * (lidUp - H));
      var ux = 0.866, uy = 0.5;
      var dvx = vx / vl, dvy = vy / vl;
      for (var a = 1; a < C * 2; a++) {
        for (var b = 1; b < 5; b++) {
          if ((a + b) % 2) continue;
          var uu = a * (W / (C * 2)), vv = b * (vl / 5);
          var cx = L0[0] + ux * uu + dvx * vv, cy = L0[1] + uy * uu + dvy * vv;
          g += '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="3.2" ry="3.2" fill="' + pal.lidDot + '" opacity=".75" transform="matrix(1 0 0 1 0 0)"/>';
        }
      }
      // tulisan brand di tutup
      var tu = W / 2, tv = vl * 0.5;
      var ox = L0[0] + ux * tu + dvx * tv, oy = L0[1] + uy * tu + dvy * tv;
      var fs = Math.min(W * 0.105, 28);
      g += '<g transform="matrix(' + ux + ' ' + uy + ' ' + f(-dvx) + ' ' + f(-dvy) + ' ' + f(ox) + ' ' + f(oy) + ')">' +
        '<text x="0" y="' + f(fs * 0.35) + '" text-anchor="middle" font-family="Fredoka, \'Baloo 2\', system-ui, sans-serif" font-weight="700" font-size="' + f(fs) + '" fill="' + pal.ink + '">' + esc(brand) + '</text></g>';
      // tepi tutup
      g += '<path d="M' + f(L0[0]) + ' ' + f(L0[1]) + 'L' + f(L3[0]) + ' ' + f(L3[1]) + 'L' + f(L2[0]) + ' ' + f(L2[1]) + 'L' + f(L1[0]) + ' ' + f(L1[1]) + '" fill="none" stroke="' + pal.outerDark + '" stroke-width="2" stroke-linejoin="round"/>';
    }

    // dinding dalam belakang & kiri
    g += poly([P(0, 0, 0), P(W, 0, 0), P(W, 0, H), P(0, 0, H)], pal.inner);
    g += poly([P(0, 0, 0), P(0, D, 0), P(0, D, H), P(0, 0, H)], pal.innerDark);
    // lantai
    g += poly([P(0, 0, 0), P(W, 0, 0), P(W, D, 0), P(0, D, 0)], pal.floor);
    // alas kertas per sel
    for (var rr = 0; rr < R; rr++) {
      for (var cc = 0; cc < C; cc++) {
        var m = 4;
        g += poly([P(cc * S + m, rr * S + m), P((cc + 1) * S - m, rr * S + m), P((cc + 1) * S - m, (rr + 1) * S - m), P(cc * S + m, (rr + 1) * S - m)], '#FFFFFF', ' stroke="' + pal.inner + '" stroke-width="1.2" stroke-dasharray="3 3"');
      }
    }

    // donat — urutan gambar belakang ke depan
    var cells = [];
    for (var r2 = 0; r2 < R; r2++) for (var c2 = 0; c2 < C; c2++) cells.push({ r: r2, c: c2, i: r2 * C + c2 });
    cells.sort(function (A, B) { return (A.r + A.c) - (B.r + B.c) || A.c - B.c; });
    cells.forEach(function (cell) {
      var pt = P((cell.c + 0.5) * S, (cell.r + 0.5) * S, 0);
      var key = fills ? fills[cell.i] : null;
      var anim = opt.animate && key ? ' class="dn-pop" style="animation-delay:' + (cell.i * 35) + 'ms"' : '';
      g += '<g data-i="' + cell.i + '"' + anim + '>' + donut(pt[0], pt[1], S * 0.4, key, seed * 31 + cell.i * 17 + 5) + '</g>';
    });

    // dinding depan & kanan (luar)
    g += poly([P(0, D, 0), P(W, D, 0), P(W, D, H), P(0, D, H)], pal.outer);
    g += poly([P(W, 0, 0), P(W, D, 0), P(W, D, H), P(W, 0, H)], pal.outerDark);
    // bibir atas
    g += '<path d="M' + [P(0, 0, H), P(0, D, H), P(W, D, H), P(W, 0, H)].map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join('L') + '" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linejoin="round"/>';
    // garis dekor di dinding depan
    var s1 = P(S * 0.25, D, H * 0.45), s2 = P(W - S * 0.25, D, H * 0.45);
    g += '<path d="M' + f(s1[0]) + ' ' + f(s1[1]) + 'L' + f(s2[0]) + ' ' + f(s2[1]) + '" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>';

    // viewBox
    var pts = [P(0, D, 0), P(W, 0, 0), P(W, D, 0), P(0, 0, 0)];
    if (lidOn) pts.push(L2, L3);
    else pts.push(P(0, 0, 40));
    var minX = Math.min.apply(null, pts.map(function (p) { return p[0]; })) - 14;
    var maxX = Math.max.apply(null, pts.map(function (p) { return p[0]; })) + 14;
    var minY = Math.min.apply(null, pts.map(function (p) { return p[1]; })) - 10;
    var maxY = Math.max.apply(null, pts.map(function (p) { return p[1]; })) + 14;
    var vb = f(minX) + ' ' + f(minY) + ' ' + f(maxX - minX) + ' ' + f(maxY - minY);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" role="img" aria-label="Box donat ' + pk.name + '"' + (opt.cls ? ' class="' + opt.cls + '"' : '') + '>' + g + '</svg>';
  }

  // Donat tunggal berdiri sendiri (untuk ikon topping)
  function single(key, seed) {
    var body = donut(60, 72, 42, key, seed || 7);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" role="img" aria-label="Donat ' + (key ? TOPPINGS[key].name : '') + '">' + body + '</svg>';
  }

  // Isi box sesuai jumlah topping (berurutan)
  function fillsFromCounts(pkgId, counts) {
    var cap = PACKAGES[pkgId].rows * PACKAGES[pkgId].cols, out = [];
    ORDER.forEach(function (k) { var n = (counts && counts[k]) || 0; for (var i = 0; i < n; i++) out.push(k); });
    while (out.length < cap) out.push(null);
    return out.slice(0, cap);
  }
  // Isi acak (campur)
  function randomFills(pkgId, seed) {
    var cap = PACKAGES[pkgId].rows * PACKAGES[pkgId].cols, r = rng(seed || Date.now()), out = [];
    // pastikan variasi: putar semua rasa dulu lalu acak
    var base = ORDER.slice();
    for (var i = base.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = base[i]; base[i] = base[j]; base[j] = t; }
    for (var k = 0; k < cap; k++) out.push(k < base.length ? base[k] : ORDER[Math.floor(r() * ORDER.length)]);
    for (var x = out.length - 1; x > 0; x--) { var y = Math.floor(r() * (x + 1)); var tt = out[x]; out[x] = out[y]; out[y] = tt; }
    return out;
  }
  function countsFromFills(fills) {
    var c = {}; fills.forEach(function (k) { if (k) c[k] = (c[k] || 0) + 1; }); return c;
  }

  var API = { TOPPINGS: TOPPINGS, ORDER: ORDER, PACKAGES: PACKAGES, PALETTES: PALETTES, donut: donut, box: box, single: single, fillsFromCounts: fillsFromCounts, randomFills: randomFills, countsFromFills: countsFromFills, rng: rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DonutArt = API;
})(typeof window !== 'undefined' ? window : this);
