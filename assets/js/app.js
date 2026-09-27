/* =========================================================
   Donat Empuk — logika kasir (POS)
   ========================================================= */
(function () {
  'use strict';
  var DA = window.DonutArt, S = window.Store;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var cart = S.lsGet(S.LS_CART, []);
  var cur = { pkg: '12' };           // paket yang sedang dipilih
  var atur = null;                   // state modal atur sendiri
  var lastOrder = null;

  // ---------- helpers ----------
  function cap(pkg) { return DA.PACKAGES[pkg].rows * DA.PACKAGES[pkg].cols; }
  function seed() { return Math.floor(Math.random() * 1e9) + 1; }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function saveCart() { S.lsSet(S.LS_CART, cart); }

  // ---------- Modal ----------
  var openStack = [];
  function openModal(id) {
    var m = $(id); m.hidden = false;
    requestAnimationFrame(function () { m.classList.add('open'); });
    document.body.classList.add('no-scroll');
    openStack.push(id);
    var f = m.querySelector('input:not([type=radio]):not([readonly]), button.btn-primary');
    setTimeout(function () { if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function closeModal(id) {
    var m = $(id); if (!m || m.hidden) return;
    m.classList.remove('open');
    setTimeout(function () { m.hidden = true; }, 180);
    openStack = openStack.filter(function (x) { return x !== id; });
    if (!openStack.length && !$('#cart').classList.contains('open')) document.body.classList.remove('no-scroll');
  }
  $$('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.closest('[data-close]')) closeModal('#' + m.id);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (openStack.length) closeModal(openStack[openStack.length - 1]);
      else closeCart();
    }
  });

  // ---------- Render produk & hero ----------
  $$('[data-art]').forEach(function (el) {
    var p = el.getAttribute('data-art');
    el.innerHTML = DA.box(p, DA.randomFills(p, p * 97 + 3), { seed: p * 7 });
  });
  $('#heroBox').innerHTML = DA.box('6', DA.randomFills('6', 2026), { seed: 4 });
  $('#year').textContent = new Date().getFullYear();

  var desc = {
    vanila: 'Glaze vanila creamy + sprinkle pelangi',
    coklat: 'Coklat pekat dengan drizzle coklat susu',
    matcha: 'Matcha Jepang, drizzle susu putih',
    strowberi: 'Glaze strowberi manis + meses merah',
    redvelvet: 'Roti red velvet, cream cheese & crumble',
    oreo: 'Roti coklat, cream + remahan Oreo'
  };
  function renderToppings() {
  $('#topGrid').innerHTML = DA.ORDER.map(function (k, i) {
    var T = DA.TOPPINGS[k];
    return '<article class="top-card' + (T.available === false ? ' off' : '') + '" style="--sw:' + T.swatch + '">' +
      '<div class="top-art">' + DA.single(k, 7 + i) + '</div>' +
      '<h3>' + T.name + (T.available === false ? ' <em class="habis">Habis</em>' : '') + '</h3><p>' + desc[k] + '</p></article>';
  }).join('');
  }
  renderToppings();

  $$('.product').forEach(function (b) {
    b.addEventListener('click', function () {
      var P = DA.PACKAGES[b.getAttribute('data-pkg')];
      if (P.available === false) { toast('Box ' + P.name + ' sedang tidak tersedia'); return; }
      openMode(b.getAttribute('data-pkg'));
    });
  });

  // ---------- MODAL 1: mode + qty ----------
  function openMode(pkg) {
    cur.pkg = pkg;
    var P = DA.PACKAGES[pkg];
    $('#mModeTitle').textContent = 'Box ' + P.name;
    $('#modePrice').textContent = S.fmt(P.price) + ' / box · ' + cap(pkg) + ' pcs';
    $('#modeArt').innerHTML = DA.box(pkg, DA.randomFills(pkg, seed()), { lid: false });
    $('#boxQty').value = 1;
    $('input[name=mode][value=campur]').checked = true;
    updateModeFoot();
    openModal('#mMode');
  }
  function qtyVal() { var v = parseInt($('#boxQty').value, 10); return isNaN(v) ? 1 : Math.min(50, Math.max(1, v)); }
  function updateModeFoot() {
    var mode = $('input[name=mode]:checked').value;
    $('#modeSubtotal').textContent = S.fmt(DA.PACKAGES[cur.pkg].price * qtyVal());
    $('#modeNext').textContent = mode === 'campur' ? 'Masukkan Keranjang' : 'Lanjut Atur Topping';
  }
  $$('#mMode .step').forEach(function (b) {
    b.addEventListener('click', function () {
      $('#boxQty').value = Math.min(50, Math.max(1, qtyVal() + Number(b.getAttribute('data-step'))));
      updateModeFoot();
    });
  });
  $('#boxQty').addEventListener('input', updateModeFoot);
  $('#boxQty').addEventListener('blur', function () { $('#boxQty').value = qtyVal(); updateModeFoot(); });
  $$('input[name=mode]').forEach(function (r) { r.addEventListener('change', updateModeFoot); });

  $('#modeNext').addEventListener('click', function () {
    var mode = $('input[name=mode]:checked').value, q = qtyVal();
    if (mode === 'campur') {
      addCampur(cur.pkg, q);
      closeModal('#mMode');
      toast(q + ' box ' + DA.PACKAGES[cur.pkg].name + ' (campur) masuk keranjang');
      bump();
    } else {
      closeModal('#mMode');
      setTimeout(function () { openAtur(cur.pkg, q); }, 190);
    }
  });

  function addCampur(pkg, q) {
    var ex = cart.filter(function (it) { return it.pkg === pkg && it.mode === 'campur'; })[0];
    if (ex) ex.qty += q; else cart.push({ key: 'c' + pkg + '-' + seed(), pkg: pkg, mode: 'campur', qty: q, counts: null, seed: seed() });
    saveCart(); renderCart();
  }

  // ---------- MODAL 2: Atur sendiri ----------
  function emptyCounts() { var c = {}; DA.ORDER.forEach(function (k) { c[k] = 0; }); return c; }
  function openAtur(pkg, qty) {
    atur = { pkg: pkg, idx: 0, boxes: [] };
    for (var i = 0; i < qty; i++) atur.boxes.push({ mix: false, counts: emptyCounts(), fills: null, seed: seed() });
    $('#mAturTitle').textContent = 'Box ' + DA.PACKAGES[pkg].name + ' × ' + qty;
    buildTopList();
    renderAtur(true);
    openModal('#mAtur');
  }
  function boxSum(b) { return DA.ORDER.reduce(function (s, k) { return s + (b.counts[k] || 0); }, 0); }
  function boxDone(b) { return b.mix || boxSum(b) === cap(atur.pkg); }

  function buildTopList() {
    $('#tList').innerHTML = DA.ORDER.map(function (k) {
      var T = DA.TOPPINGS[k];
      var off = T.available === false;
      return '<li class="trow' + (off ? ' off' : '') + '" data-k="' + k + '">' +
        '<label class="tcheck"><input type="checkbox" data-chk="' + k + '">' +
        '<span class="tbox" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></span>' +
        '<span class="tsw">' + DA.single(k, 3) + '</span>' +
        '<span class="tname">' + T.name + (off ? ' <em class="habis">Habis</em>' : '') + '</span></label>' +
        '<div class="stepper sm">' +
        '<button type="button" class="step" data-dec="' + k + '" aria-label="Kurangi ' + T.name + '">−</button>' +
        '<input type="number" min="0" inputmode="numeric" data-num="' + k + '" aria-label="Jumlah ' + T.name + '" value="0">' +
        '<button type="button" class="step" data-inc="' + k + '" aria-label="Tambah ' + T.name + '">+</button>' +
        '</div></li>';
    }).join('');
  }

  function setCount(k, v) {
    var b = atur.boxes[atur.idx];
    if (b.mix) return;
    if (DA.TOPPINGS[k].available === false && v > 0) { toast(DA.TOPPINGS[k].name + ' sedang habis'); v = 0; }
    v = Math.max(0, parseInt(v, 10) || 0);
    var others = boxSum(b) - (b.counts[k] || 0);
    var room = cap(atur.pkg) - others;
    if (v > room) { v = room; toast('Box sudah penuh (' + cap(atur.pkg) + ' pcs)'); }
    b.counts[k] = v;
    renderAtur(false, k);
  }

  $('#tList').addEventListener('click', function (e) {
    var t = e.target.closest('[data-inc],[data-dec]'); if (!t) return;
    var b = atur.boxes[atur.idx];
    if (t.hasAttribute('data-inc')) { var k = t.getAttribute('data-inc'); setCount(k, (b.counts[k] || 0) + 1); }
    else { var k2 = t.getAttribute('data-dec'); setCount(k2, (b.counts[k2] || 0) - 1); }
  });
  $('#tList').addEventListener('change', function (e) {
    var t = e.target, b = atur.boxes[atur.idx];
    if (t.hasAttribute('data-chk')) {
      var k = t.getAttribute('data-chk');
      if (t.checked) {
        if (boxSum(b) >= cap(atur.pkg)) { t.checked = false; toast('Box sudah penuh, kurangi topping lain dulu'); return; }
        setCount(k, Math.max(1, b.counts[k]));
      } else setCount(k, 0);
    } else if (t.hasAttribute('data-num')) setCount(t.getAttribute('data-num'), t.value);
  });
  $('#tList').addEventListener('input', function (e) {
    var t = e.target; if (t.hasAttribute('data-num') && t.value !== '') setCount(t.getAttribute('data-num'), t.value);
  });

  $('#btnMix').addEventListener('click', function () {
    var b = atur.boxes[atur.idx];
    b.mix = true; b.seed = seed(); b.fills = DA.randomFills(atur.pkg, b.seed);
    renderAtur(true);
  });
  $('#btnManual').addEventListener('click', function () {
    var b = atur.boxes[atur.idx]; b.mix = false; b.fills = null; b.counts = emptyCounts(); renderAtur(true);
  });
  $('#btnReset').addEventListener('click', function () {
    var b = atur.boxes[atur.idx]; b.mix = false; b.fills = null; b.counts = emptyCounts(); renderAtur(true);
  });
  $('#prevBox').addEventListener('click', function () { if (atur.idx > 0) { atur.idx--; renderAtur(true); } });
  $('#nextBox').addEventListener('click', function () { if (atur.idx < atur.boxes.length - 1) { atur.idx++; renderAtur(true); } });
  $('#boxTabs').addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]'); if (!t) return;
    atur.idx = Number(t.getAttribute('data-tab')); renderAtur(true);
  });

  var prevFills = [];
  function renderAtur(full, changedKey) {
    var b = atur.boxes[atur.idx], c = cap(atur.pkg), n = atur.boxes.length;
    // tabs (dibangun sekali, lalu hanya diperbarui agar klik tidak hilang)
    var tabs = $('#boxTabs');
    if (tabs.children.length !== (n > 1 ? n : 0)) {
      tabs.innerHTML = n > 1 ? atur.boxes.map(function (bx, i) { return '<button type="button" role="tab" class="btab" data-tab="' + i + '"></button>'; }).join('') : '';
    }
    $$('.btab', tabs).forEach(function (el, i) {
      var bx = atur.boxes[i], d = boxDone(bx);
      el.className = 'btab' + (i === atur.idx ? ' on' : '') + (d ? ' done' : '');
      el.setAttribute('aria-selected', String(i === atur.idx));
      el.innerHTML = 'Box ' + (i + 1) + (bx.mix ? ' · Campur' : '') + (d ? ' <span class="ck" aria-label="lengkap">✓</span>' : '');
    });

    // live preview
    var fills = b.mix ? b.fills : DA.fillsFromCounts(atur.pkg, b.counts);
    var html = DA.box(atur.pkg, fills, { seed: b.seed, animate: false, lid: true });
    $('#liveBox').innerHTML = html;
    // animasi "pop" untuk donat yang baru berwarna
    fills.forEach(function (k, i) {
      if (k && (full ? b.mix : prevFills[i] !== k)) {
        var g = $('#liveBox g[data-i="' + i + '"]');
        if (g) { g.classList.add('dn-pop'); g.style.animationDelay = (full ? i * 40 : 0) + 'ms'; }
      }
    });
    prevFills = fills.slice();

    var sum = b.mix ? c : boxSum(b);
    $('#fillBar').style.width = (sum / c * 100) + '%';
    $('#fillText').textContent = b.mix ? 'Campur · ' + c + ' / ' + c + ' terisi' : sum + ' / ' + c + ' terisi';
    $('#fillBar').parentNode.classList.toggle('full', sum === c);

    // list
    $('#mixNote').hidden = !b.mix;
    $('#tList').classList.toggle('disabled', b.mix);
    $('#btnMixText').textContent = b.mix ? 'Acak lagi' : 'Campur';
    var shown = b.mix ? DA.countsFromFills(b.fills) : b.counts;
    DA.ORDER.forEach(function (k) {
      var v = shown[k] || 0;
      var chk = $('[data-chk="' + k + '"]'), num = $('[data-num="' + k + '"]');
      var off = DA.TOPPINGS[k].available === false && !b.mix;
      chk.checked = v > 0; chk.disabled = b.mix || off;
      if (document.activeElement !== num || changedKey !== k) num.value = v;
      num.disabled = b.mix || off; num.max = c;
      $('[data-dec="' + k + '"]').disabled = b.mix || v <= 0;
      $('[data-inc="' + k + '"]').disabled = b.mix || sum >= c || off;
      num.closest('.trow').classList.toggle('on', v > 0);
    });

    // footer
    var done = atur.boxes.filter(boxDone).length;
    $('#prevBox').hidden = n <= 1; $('#nextBox').hidden = n <= 1;
    $('#prevBox').disabled = atur.idx === 0; $('#nextBox').disabled = atur.idx === n - 1;
    $('#aturStatus').textContent = done === n ? 'Semua box lengkap' : 'Box lengkap: ' + done + ' / ' + n;
    $('#aturSubtotal').textContent = S.fmt(DA.PACKAGES[atur.pkg].price * n);
    $('#aturAdd').disabled = done !== n;
    $('#aturAdd').textContent = 'Masukkan Keranjang (' + n + ' box)';
  }

  $('#aturAdd').addEventListener('click', function () {
    var pkg = atur.pkg, mixCount = 0;
    atur.boxes.forEach(function (b) {
      if (b.mix) { mixCount++; return; }
      cart.push({ key: 'a' + seed(), pkg: pkg, mode: 'atur', qty: 1, counts: Object.assign({}, b.counts), seed: b.seed });
    });
    if (mixCount) addCampur(pkg, mixCount);
    saveCart(); renderCart();
    closeModal('#mAtur');
    toast(atur.boxes.length + ' box ' + DA.PACKAGES[pkg].name + ' masuk keranjang');
    bump();
  });

  // ---------- KERANJANG ----------
  function renderCart() {
    var list = $('#cartList');
    if (!cart.length) {
      list.innerHTML = '<div class="empty"><img src="assets/img/box-empty.svg" alt="" width="150"><p><b>Keranjang masih kosong</b><br>Pilih box donat atau madu pelengkap.</p></div>';
    } else {
      list.innerHTML = cart.map(function (it, i) {
        return '<div class="citem' + (itemBlocked(it) ? ' blocked' : '') + (S.isHoney(it) ? ' is-honey' : '') + '">' +
          '<div class="cart-art">' + S.itemArt(it, { lid: false }) + '</div>' +
          '<div class="cinfo"><b>' + esc(S.itemTitle(it)) + '</b>' + S.itemChip(it) +
          '<small>' + esc(S.itemDetail(it)) + '</small>' +
          (itemBlocked(it) ? '<small class="habis">Tidak tersedia saat ini</small>' : '') +
          '<div class="crow"><div class="stepper xs">' +
          '<button type="button" class="step" data-cdec="' + i + '" aria-label="Kurangi">−</button><span>' + it.qty + '</span>' +
          '<button type="button" class="step" data-cinc="' + i + '" aria-label="Tambah">+</button></div>' +
          '<b class="cprice">' + S.fmt(S.itemPrice(it)) + '</b></div></div>' +
          '<button class="icon-btn del" data-cdel="' + i + '" aria-label="Hapus item"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>' +
          '</div>';
      }).join('');
    }
    var tot = S.total(cart), n = S.totalBox(cart) + S.totalBottles(cart);
    $('#cartTotal').textContent = S.fmt(tot);
    $('#cartBoxes').textContent = S.summary(cart);
    $('#cartBadge').textContent = n;
    $('#cartBadge').classList.toggle('show', n > 0);
    $('#mbarTotal').textContent = S.fmt(tot);
    $('#mbarCount').textContent = S.summary(cart);
    $('#mbar').classList.toggle('show', n > 0);
    $('#checkoutBtn').disabled = !cart.length;
  }
  $('#cartList').addEventListener('click', function (e) {
    var t = e.target.closest('[data-cinc],[data-cdec],[data-cdel]'); if (!t) return;
    var i;
    if (t.hasAttribute('data-cinc')) { i = +t.getAttribute('data-cinc'); cart[i].qty = Math.min(50, cart[i].qty + 1); }
    if (t.hasAttribute('data-cdec')) { i = +t.getAttribute('data-cdec'); cart[i].qty--; if (cart[i].qty < 1) cart.splice(i, 1); }
    if (t.hasAttribute('data-cdel')) { i = +t.getAttribute('data-cdel'); cart.splice(i, 1); }
    saveCart(); renderCart();
  });
  function bump() { var b = $('#openCart'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }

  function openCart() { $('#cart').classList.add('open'); $('#scrim').classList.add('show'); document.body.classList.add('no-scroll'); }
  function closeCart() { $('#cart').classList.remove('open'); $('#scrim').classList.remove('show'); if (!openStack.length) document.body.classList.remove('no-scroll'); }
  function isDrawer() { return window.matchMedia('(max-width: 980px)').matches; }
  $('#openCart').addEventListener('click', function () {
    if (isDrawer()) openCart(); else { $('#kasir').scrollIntoView({ behavior: 'smooth' }); bump(); }
  });
  $('#mbarBtn').addEventListener('click', openCart);
  $('#closeCart').addEventListener('click', closeCart);
  $('#scrim').addEventListener('click', closeCart);

  // ---------- CHECKOUT ----------
  function itemBlocked(it) {
    if (S.isHoney(it)) return !S.honeyAvailable(it.key, it.size);
    if (DA.PACKAGES[it.pkg].available === false) return true;
    return it.mode === 'atur' && it.counts && DA.ORDER.some(function (k) { return it.counts[k] > 0 && DA.TOPPINGS[k].available === false; });
  }
  $('#checkoutBtn').addEventListener('click', function () {
    if (!cart.length) return;
    if (cart.some(itemBlocked)) { toast('Ada item yang sedang tidak tersedia. Hapus dulu dari keranjang.'); return; }
    closeCart();
    $('#coSum').innerHTML = cart.map(function (it) {
      return '<li><div><b>' + it.qty + '× ' + esc(S.itemTitle(it)) + '</b><small>' + esc(S.itemShort(it)) + '</small></div><span>' + S.fmt(S.itemPrice(it)) + '</span></li>';
    }).join('');
    $('#coTotal').textContent = S.fmt(S.total(cart));
    $('#coErr').textContent = '';
    openModal('#mCheckout');
  });

  $('#coForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    var name = f.name.value.trim(), phone = f.phone.value.trim(), address = f.address.value.trim(), note = f.note.value.trim();
    var err = '';
    if (!name) err = 'Nama wajib diisi.';
    else if (!/^[0-9+\-\s]{8,20}$/.test(phone)) err = 'Nomor telepon tidak valid (8–20 digit).';
    else if (address.length < 10) err = 'Alamat pengiriman terlalu singkat.';
    $$('.field', f).forEach(function (x) { x.classList.remove('bad'); });
    if (err) {
      $('#coErr').textContent = err;
      var bad = !name ? f.name : (!/^[0-9+\-\s]{8,20}$/.test(phone) ? f.phone : f.address);
      bad.closest('.field').classList.add('bad'); bad.focus();
      return;
    }
    var order = {
      id: S.newId(), createdAt: new Date().toISOString(),
      name: name, phone: phone, address: address, note: note,
      items: cart.map(function (it) {
        if (S.isHoney(it)) return { type: 'honey', key: it.key, size: it.size, qty: it.qty };
        return { pkg: it.pkg, mode: it.mode, qty: it.qty, counts: it.counts, seed: it.seed };
      }),
      status: 'baru'
    };
    order.total = S.total(order.items);
    var btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Memproses…';

    var done = function (res) {
      lastOrder = order; lastOrder.cloud = !!(res && res.cloud);
      cart = []; saveCart(); renderCart();
      btn.disabled = false; btn.textContent = 'Proses Pesanan';
      f.reset();
      closeModal('#mCheckout');
      setTimeout(showReview, 190);
    };
    S.saveOrder(order).then(done, function () { done({ cloud: false }); });
  });

  function showReview() {
    var o = lastOrder, link = S.reviewLink(o);
    $('#mRvTitle').textContent = 'Pesanan #' + o.id;
    $('#rvBody').innerHTML =
      '<dl class="rv-cust"><div><dt>Nama</dt><dd>' + esc(o.name) + '</dd></div>' +
      '<div><dt>No. HP</dt><dd>' + esc(o.phone) + '</dd></div>' +
      '<div class="w"><dt>Alamat</dt><dd>' + esc(o.address) + '</dd></div>' +
      (o.note ? '<div class="w"><dt>Catatan</dt><dd>' + esc(o.note) + '</dd></div>' : '') + '</dl>' +
      '<ul class="sum-list">' + o.items.map(function (it) {
        return '<li><div><b>' + it.qty + '× ' + esc(S.itemTitle(it)) + '</b><small>' + esc(S.itemShort(it)) + '</small></div><span>' + S.fmt(S.itemPrice(it)) + '</span></li>';
      }).join('') + '</ul>' +
      '<div class="row total"><span>Total (' + S.summary(o.items) + ')</span><b>' + S.fmt(o.total) + '</b></div>' +
      '<p class="note">*Harga belum termasuk ongkir.</p>';
    $('#rvLink').value = link;
    $('#rvOpen').href = link;
    $('#rvWa').href = S.waLink(o, link);
    openModal('#mReview');
  }
  $('#copyLink').addEventListener('click', function () {
    var i = $('#rvLink'); i.select();
    (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(function () { toast('Link disalin'); })
      .catch(function () { try { document.execCommand('copy'); toast('Link disalin'); } catch (e) { toast('Salin manual ya'); } });
  });

  renderCart();

  // ---------- MENU PELENGKAP: MADU ----------
  var honeySel = {};   // ukuran terpilih per varian
  function defaultSize(k) {
    var sizes = DA.honeySizes(k), on = sizes.filter(function (z) { return S.honeyAvailable(k, z); });
    if (on.indexOf('500') > -1) return '500';
    return on[0] || sizes[0];
  }
  function renderHoney() {
    var grid = $('#honeyGrid'); if (!grid) return;
    grid.innerHTML = DA.HONEY_ORDER.map(function (k) {
      var H = DA.HONEY[k], off = !S.honeyAvailable(k);
      var sizes = DA.honeySizes(k);
      if (!honeySel[k] || !S.honeyAvailable(k, honeySel[k])) honeySel[k] = defaultSize(k);
      var sel = honeySel[k], selOff = off || !S.honeyAvailable(k, sel);
      return '<article class="honey-card' + (off ? ' off' : '') + '" data-honey="' + k + '" style="--hc:' + H.liquid + '">' +
        '<div class="honey-art">' + DA.bottle(k, sel) + '</div>' +
        '<div class="honey-info">' +
          '<h3>Madu ' + esc(H.name) + (off ? ' <em class="habis">Habis</em>' : '') + '</h3>' +
          '<p>' + esc(H.taste) + '</p>' +
          '<div class="sizes" role="radiogroup" aria-label="Ukuran Madu ' + esc(H.name) + '">' + sizes.map(function (z) {
            var zOff = off || !S.honeyAvailable(k, z);
            return '<button type="button" role="radio" class="size' + (z === sel ? ' on' : '') + '" data-hsize="' + z + '" aria-checked="' + (z === sel) + '"' + (zOff ? ' disabled' : '') + '>' +
              '<b>' + z + 'gr</b><span>' + (zOff ? 'Habis' : kNum(H.prices[z]) + 'K') + '</span></button>';
          }).join('') + '</div>' +
          '<div class="honey-buy"><b class="hprice">' + S.fmt(H.prices[sel]) + '</b>' +
          '<button type="button" class="btn btn-sm btn-honey" data-hadd="' + k + '"' + (selOff ? ' disabled' : '') + ' aria-label="Tambah Madu ' + esc(H.name) + ' ' + sel + ' gram ke keranjang">+ Tambah</button></div>' +
        '</div></article>';
    }).join('');
  }
  $('#honeyGrid').addEventListener('click', function (e) {
    var card = e.target.closest('[data-honey]'); if (!card) return;
    var k = card.getAttribute('data-honey');
    var sz = e.target.closest('[data-hsize]');
    if (sz && !sz.disabled) { honeySel[k] = sz.getAttribute('data-hsize'); renderHoney(); return; }
    var add = e.target.closest('[data-hadd]');
    if (add && !add.disabled) {
      var size = honeySel[k];
      var ex = cart.filter(function (it) { return S.isHoney(it) && it.key === k && it.size === size; })[0];
      if (ex) ex.qty = Math.min(50, ex.qty + 1);
      else cart.push({ key: k, type: 'honey', size: size, qty: 1 });
      saveCart(); renderCart(); bump();
      toast('Madu ' + DA.HONEY[k].name + ' ' + size + ' gr masuk keranjang');
    }
  });
  renderHoney();

  // ---------- Muat pengaturan (harga & ketersediaan) dari Firebase ----------
  function kNum(p) { return (p / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }); }
  function renderCatalog() {
    $$('.product').forEach(function (b) {
      var P = DA.PACKAGES[b.getAttribute('data-pkg')];
      b.querySelector('h3').textContent = P.name;
      b.querySelector('.price').innerHTML = kNum(P.price) + '<small>K</small>';
      var off = P.available === false;
      b.classList.toggle('soldout', off);
      b.setAttribute('aria-disabled', String(off));
      b.querySelector('.add').textContent = off ? 'Tidak tersedia' : '+ Pilih';
    });
    var on = Object.keys(DA.PACKAGES).filter(function (k) { return DA.PACKAGES[k].available !== false; });
    var min = Math.min.apply(null, (on.length ? on : Object.keys(DA.PACKAGES)).map(function (k) { return DA.PACKAGES[k].price; }));
    var ms = $('#minPrice'); if (ms) ms.textContent = kNum(min) + 'K';
    var nt = $('#topCount'); if (nt) nt.textContent = DA.ORDER.filter(function (k) { return DA.TOPPINGS[k].available !== false; }).length;
    renderToppings(); renderHoney(); renderCart();
  }
  S.ready().then(renderCatalog);
})();
