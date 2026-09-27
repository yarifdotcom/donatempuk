/* =========================================================
   Donat Empuk — Menu pelengkap: MADU
   Data varian + renderer botol madu vektor (SVG).
   Menambah ke window.DonutArt: HONEY, HONEY_ORDER, HONEY_SIZES, bottle()
   ========================================================= */
(function (root) {
  'use strict';
  var DA = root.DonutArt;

  // warna cairan: randu (paling terang) -> rambutan -> kaliandra -> klanceng -> multiflora -> hutan (paling gelap), bpro merah
  var HONEY = {
    lanceng:    { name: 'Trigona Klanceng', short: 'Klanceng',   taste: 'Asam manis segar', liquid: '#D4A04E', liquidDark: '#B07C2C', cloudy: 0.25, accent: '#FFB020',
                  prices: { '1000': 380000, '500': 200000, '330': 120000 } },
    hutan:      { name: 'Hutan',            short: 'Hutan',      taste: 'Manis pekat, aroma hutan', liquid: '#7A3A12', liquidDark: '#4E2208', cloudy: 0, accent: '#3BCEAC',
                  prices: { '1000': 250000, '500': 140000, '330': 100000 } },
    randu:      { name: 'Randu',            short: 'Randu',      taste: 'Manis lembut, ringan', liquid: '#F4DC93', liquidDark: '#E3C271', cloudy: 0.35, accent: '#FFD23F',
                  prices: { '1000': 200000, '500': 110000, '330': 70000 } },
    multiflora: { name: 'Multiflora',       short: 'Multiflora', taste: 'Manis kaya rasa bunga', liquid: '#B9772E', liquidDark: '#8E5519', cloudy: 0.1, accent: '#FF7DB2',
                  prices: { '1000': 175000, '500': 95000, '330': 65000 } },
    kaliandra:  { name: 'Kaliandra',        short: 'Kaliandra',  taste: 'Creamy, manis legit', liquid: '#E2C185', liquidDark: '#CDA565', cloudy: 0.5, accent: '#FF9F1C',
                  prices: { '1000': 200000, '500': 110000, '330': 70000 } },
    rambutan:   { name: 'Rambutan',         short: 'Rambutan',   taste: 'Manis buah, lembut', liquid: '#EFD387', liquidDark: '#DDB967', cloudy: 0.35, accent: '#FF4F86',
                  prices: { '1000': 185000, '500': 95000, '330': 65000 } },
    bpro:       { name: 'BPRO', short: 'BPRO', taste: 'Royal jelly, bee pollen & propolis', liquid: '#B5282F', liquidDark: '#7E141B', cloudy: 0.15, accent: '#7B5CFF',
                  prices: { '330': 125000 } }
  };
  var HONEY_ORDER = ['lanceng', 'hutan', 'randu', 'multiflora', 'kaliandra', 'rambutan', 'bpro'];
  var HONEY_SIZES = ['1000', '500', '330'];
  var SCALE = { '1000': 1.14, '500': 1, '330': 0.84 };

  function f(n) { return Math.round(n * 100) / 100; }
  var uid = 0;

  // Botol madu tampak 3/4 (senada dengan box donat isometrik)
  // key: varian, size: '1000'|'500'|'330', opt.cls
  function bottle(key, size, opt) {
    opt = opt || {};
    var H = HONEY[key] || HONEY.kaliandra;
    size = String(size || '500');
    var s = SCALE[size] || 1, id = 'hb' + (++uid) + Math.floor(Math.random() * 1e5);
    var cx = 60, base = 243;                       // kanvas 120 x 240, botol berdiri di bawah
    var W = 62 * s, bodyH = 118 * s, shoulder = 26 * s, neckW = 26 * s, neckH = 44 * s, ey = W * 0.14;
    var x0 = cx - W / 2, x1 = cx + W / 2;
    var yB = base - ey, yT = yB - bodyH, yS = yT - shoulder, yN = yS - neckH;
    var n0 = cx - neckW / 2, n1 = cx + neckW / 2;

    var shape = 'M' + f(x0) + ' ' + f(yT) +
      'C' + f(x0) + ' ' + f(yT - shoulder * 0.7) + ' ' + f(n0) + ' ' + f(yS + shoulder * 0.35) + ' ' + f(n0) + ' ' + f(yS) +
      'L' + f(n0) + ' ' + f(yN) + 'L' + f(n1) + ' ' + f(yN) + 'L' + f(n1) + ' ' + f(yS) +
      'C' + f(n1) + ' ' + f(yS + shoulder * 0.35) + ' ' + f(x1) + ' ' + f(yT - shoulder * 0.7) + ' ' + f(x1) + ' ' + f(yT) +
      'L' + f(x1) + ' ' + f(yB) + 'A' + f(W / 2) + ' ' + f(ey) + ' 0 0 1 ' + f(x0) + ' ' + f(yB) + 'Z';

    var g = '';
    // bayangan
    g += '<ellipse cx="' + f(cx + 4) + '" cy="' + f(base + 1) + '" rx="' + f(W * 0.62) + '" ry="' + f(ey * 1.2) + '" fill="#5a2a14" opacity=".18"/>';
    g += '<defs><clipPath id="c' + id + '"><path d="' + shape + '"/></clipPath>' +
      '<linearGradient id="g' + id + '" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0" stop-color="' + H.liquidDark + '"/><stop offset=".35" stop-color="' + H.liquid + '"/>' +
      '<stop offset=".7" stop-color="' + H.liquid + '"/><stop offset="1" stop-color="' + H.liquidDark + '"/></linearGradient></defs>';

    // kaca
    g += '<path d="' + shape + '" fill="#FFF8EC" fill-opacity=".55"/>';
    // cairan madu
    var yFill = yN + neckH * 0.42;
    g += '<g clip-path="url(#c' + id + ')">';
    g += '<rect x="' + f(x0 - 2) + '" y="' + f(yFill) + '" width="' + f(W + 4) + '" height="' + f(base - yFill + 4) + '" fill="url(#g' + id + ')"/>';
    g += '<ellipse cx="' + cx + '" cy="' + f(yFill) + '" rx="' + f(neckW / 2) + '" ry="' + f(neckW * 0.12) + '" fill="' + H.liquid + '"/>';
    // bintik kristal (madu creamy)
    if (H.cloudy) {
      var r = DA.rng(key.length * 97 + size.length * 13);
      for (var i = 0; i < 70 * H.cloudy + 8; i++) {
        var px = x0 + r() * W, py = yFill + 6 + r() * (base - yFill - 10);
        g += '<circle cx="' + f(px) + '" cy="' + f(py) + '" r="' + f(0.6 + r() * 0.9) + '" fill="#fff" opacity="' + f(0.25 + r() * 0.3) + '"/>';
      }
    }
    // kilau kaca
    g += '<rect x="' + f(x0 + W * 0.12) + '" y="' + f(yT - shoulder * 0.2) + '" width="' + f(W * 0.09) + '" height="' + f(bodyH * 0.9) + '" rx="' + f(W * 0.045) + '" fill="#fff" opacity=".42"/>';
    g += '<rect x="' + f(x1 - W * 0.16) + '" y="' + f(yT + 6) + '" width="' + f(W * 0.04) + '" height="' + f(bodyH * 0.7) + '" rx="' + f(W * 0.02) + '" fill="#fff" opacity=".25"/>';
    g += '</g>';
    g += '<path d="' + shape + '" fill="none" stroke="#2A1740" stroke-opacity=".35" stroke-width="1.4"/>';

    // tutup + segel (merah marun)
    var capTop = yN - 6 * s, capBot = yS + shoulder * 0.08;
    g += '<path d="M' + f(n0 - 2) + ' ' + f(capBot) + 'L' + f(n0 - 2) + ' ' + f(capTop + 5 * s) + 'Q' + f(n0 - 2) + ' ' + f(capTop) + ' ' + f(n0 + 4) + ' ' + f(capTop) +
      'L' + f(n1 - 4) + ' ' + f(capTop) + 'Q' + f(n1 + 2) + ' ' + f(capTop) + ' ' + f(n1 + 2) + ' ' + f(capTop + 5 * s) + 'L' + f(n1 + 2) + ' ' + f(capBot) +
      'A' + f(neckW / 2 + 2) + ' ' + f(neckW * 0.14) + ' 0 0 1 ' + f(n0 - 2) + ' ' + f(capBot) + 'Z" fill="#8E1B2C"/>';
    g += '<ellipse cx="' + cx + '" cy="' + f(capTop + 1) + '" rx="' + f(neckW / 2 - 1) + '" ry="' + f(neckW * 0.12) + '" fill="#A8283B"/>';
    g += '<rect x="' + f(n0 + 3) + '" y="' + f(capTop + 4) + '" width="' + f(neckW * 0.14) + '" height="' + f(capBot - capTop - 8) + '" rx="2" fill="#fff" opacity=".22"/>';
    g += '<path d="M' + f(n0 - 2) + ' ' + f(capTop + (capBot - capTop) * 0.62) + 'L' + f(n1 + 2) + ' ' + f(capTop + (capBot - capTop) * 0.62) + '" stroke="#6E1020" stroke-width="1.2" opacity=".6"/>';

    // label (hitam, membungkus silinder)
    var lT = yT + bodyH * 0.12, lB = yT + bodyH * 0.8, lw = ey * 0.9;
    var label = 'M' + f(x0) + ' ' + f(lT) + 'A' + f(W / 2) + ' ' + f(lw) + ' 0 0 0 ' + f(x1) + ' ' + f(lT) +
      'L' + f(x1) + ' ' + f(lB) + 'A' + f(W / 2) + ' ' + f(lw) + ' 0 0 1 ' + f(x0) + ' ' + f(lB) + 'Z';
    g += '<path d="' + label + '" fill="#1E1A1A"/>';
    // pita hijau bawah
    var gT = lB - (lB - lT) * 0.26;
    g += '<path d="M' + f(x0) + ' ' + f(gT) + 'A' + f(W / 2) + ' ' + f(lw) + ' 0 0 0 ' + f(x1) + ' ' + f(gT) + 'L' + f(x1) + ' ' + f(lB) +
      'A' + f(W / 2) + ' ' + f(lw) + ' 0 0 1 ' + f(x0) + ' ' + f(lB) + 'Z" fill="#1E7A3C"/>';
    g += '<path d="M' + f(x0) + ' ' + f(gT) + 'A' + f(W / 2) + ' ' + f(lw) + ' 0 0 0 ' + f(x1) + ' ' + f(gT) + '" fill="none" stroke="' + H.accent + '" stroke-width="1.6"/>';
    // heksagon lebah
    var hy = lT + (gT - lT) * 0.36 + lw * 0.6, hr = W * 0.17;
    var hex = '';
    for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k - Math.PI / 2; hex += (k ? 'L' : 'M') + f(cx + hr * Math.cos(a)) + ' ' + f(hy + hr * Math.sin(a)); }
    g += '<path d="' + hex + 'Z" fill="#FFD23F" stroke="' + H.accent + '" stroke-width="1.4"/>';
    g += '<ellipse cx="' + f(cx - hr * 0.35) + '" cy="' + f(hy - hr * 0.3) + '" rx="' + f(hr * 0.34) + '" ry="' + f(hr * 0.22) + '" fill="#fff" opacity=".9"/>';
    g += '<ellipse cx="' + f(cx + hr * 0.35) + '" cy="' + f(hy - hr * 0.3) + '" rx="' + f(hr * 0.34) + '" ry="' + f(hr * 0.22) + '" fill="#fff" opacity=".9"/>';
    g += '<ellipse cx="' + cx + '" cy="' + f(hy + hr * 0.08) + '" rx="' + f(hr * 0.26) + '" ry="' + f(hr * 0.42) + '" fill="#2A1740"/>';
    g += '<path d="M' + f(cx - hr * 0.26) + ' ' + f(hy + hr * 0.02) + 'L' + f(cx + hr * 0.26) + ' ' + f(hy + hr * 0.02) + 'M' + f(cx - hr * 0.22) + ' ' + f(hy + hr * 0.22) + 'L' + f(cx + hr * 0.22) + ' ' + f(hy + hr * 0.22) + '" stroke="#FFD23F" stroke-width="' + f(hr * 0.12) + '"/>';
    // tetesan madu dari heksagon
    g += '<path d="M' + f(cx - hr * 0.5) + ' ' + f(hy + hr * 0.8) + 'Q' + f(cx) + ' ' + f(hy + hr * 1.5) + ' ' + f(cx + hr * 0.5) + ' ' + f(hy + hr * 0.8) + 'Z" fill="' + H.liquid + '"/>';
    // teks
    var fs = W * 0.15;
    g += '<text x="' + cx + '" y="' + f(lT + lw + fs * 0.9) + '" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="' + f(fs * 0.62) + '" fill="#FFD23F" letter-spacing=".5">MADU</text>';
    var nm = H.short, nfs = Math.min(fs, (W * 0.9) / (nm.length * 0.56));
    g += '<text x="' + cx + '" y="' + f(gT - lw * 0.1 - 2) + '" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="' + f(nfs) + '" fill="#fff">' + nm + '</text>';
    g += '<text x="' + cx + '" y="' + f(gT + (lB - gT) * 0.62 + lw * 0.5) + '" text-anchor="middle" font-family="Nunito, system-ui, sans-serif" font-weight="800" font-size="' + f(fs * 0.5) + '" fill="#fff">' + size + ' gr</text>';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 252" role="img" aria-label="Madu ' + H.name + ' ' + size + ' gram"' + (opt.cls ? ' class="' + opt.cls + '"' : '') + '>' + g + '</svg>';
  }

  DA.HONEY = HONEY;
  DA.HONEY_ORDER = HONEY_ORDER;
  DA.HONEY_SIZES = HONEY_SIZES;
  DA.honeySizes = function (key) { return HONEY_SIZES.filter(function (s) { return HONEY[key].prices[s] != null; }); };
  DA.bottle = bottle;
})(typeof window !== 'undefined' ? window : globalThis);
