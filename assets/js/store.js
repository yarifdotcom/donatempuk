/* =========================================================
   Store — format pesanan, link review, penyimpanan pesanan
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var DA = window.DonutArt;
  var LS_ORDERS = 'donatempuk_orders_v1';
  var LS_CART = 'donatempuk_cart_v1';

  function fmt(n) { return (CFG.CURRENCY || 'Rp') + ' ' + Number(n || 0).toLocaleString('id-ID'); }
  function fmtK(n) { return Math.round(n / 1000) + 'K'; }

  function itemLabel(it) {
    var p = DA.PACKAGES[it.pkg];
    return 'Box ' + p.name + ' (' + (it.mode === 'campur' ? 'Campur' : 'Atur sendiri') + ')';
  }
  function itemDetail(it) {
    if (it.mode === 'campur' || !it.counts) return 'Topping campur aneka rasa';
    return DA.ORDER.filter(function (k) { return it.counts[k] > 0; })
      .map(function (k) { return DA.TOPPINGS[k].name + ' ' + it.counts[k]; }).join(', ');
  }
  function itemPrice(it) { return DA.PACKAGES[it.pkg].price * it.qty; }
  function total(items) { return items.reduce(function (s, it) { return s + itemPrice(it); }, 0); }
  function totalPcs(items) { return items.reduce(function (s, it) { return s + Number(it.pkg) * it.qty; }, 0); }
  function totalBox(items) { return items.reduce(function (s, it) { return s + it.qty; }, 0); }

  // ---------- encode / decode untuk link review ----------
  function b64e(str) {
    var b = btoa(unescape(encodeURIComponent(str)));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  }
  function encode(o) {
    var c = {
      i: o.id, t: o.createdAt, n: o.name, p: o.phone, a: o.address, o: o.note || '',
      x: o.items.map(function (it) {
        return [it.pkg, it.mode === 'campur' ? 'c' : 'a', it.qty,
          it.counts ? DA.ORDER.map(function (k) { return it.counts[k] || 0; }) : 0, it.seed || 1];
      })
    };
    return b64e(JSON.stringify(c));
  }
  function decode(s) {
    var c = JSON.parse(b64d(s));
    var items = (c.x || []).map(function (a) {
      var counts = null;
      if (Array.isArray(a[3])) { counts = {}; DA.ORDER.forEach(function (k, i) { counts[k] = a[3][i] || 0; }); }
      return { pkg: String(a[0]), mode: a[1] === 'c' ? 'campur' : 'atur', qty: a[2], counts: counts, seed: a[4] || 1 };
    });
    return { id: c.i, createdAt: c.t, name: c.n, phone: c.p, address: c.a, note: c.o, items: items, total: total(items), status: 'baru' };
  }

  function baseUrl() {
    var s = (CFG.SITE_URL || '').trim();
    if (s) return s.charAt(s.length - 1) === '/' ? s : s + '/';
    var u = location.href.split('#')[0].split('?')[0];
    return u.substring(0, u.lastIndexOf('/') + 1);
  }
  function reviewLink(o) { return baseUrl() + 'order.html?id=' + encodeURIComponent(o.id) + '&d=' + encode(o); }

  function waText(o, link) {
    var L = [];
    L.push('Halo ' + (CFG.STORE_NAME || 'Donat Empuk') + ', saya mau pesan donat.');
    L.push('');
    L.push('*PESANAN #' + o.id + '*');
    L.push('Nama   : ' + o.name);
    L.push('No. HP : ' + o.phone);
    L.push('Alamat : ' + o.address);
    if (o.note) L.push('Catatan: ' + o.note);
    L.push('');
    L.push('*Detail:*');
    o.items.forEach(function (it) {
      L.push('- ' + it.qty + 'x Box ' + DA.PACKAGES[it.pkg].name + ' (' + (it.mode === 'campur' ? 'Campur' : itemDetail(it)) + ')');
    });
    L.push('');
    L.push('Total: ' + totalBox(o.items) + ' box / ' + totalPcs(o.items) + ' pcs');
    L.push('*Total harga: ' + fmt(o.total) + '*');
    L.push('_(belum termasuk ongkir)_');
    L.push('');
    L.push('Review pesanan: ' + link);
    return L.join('\n');
  }
  function waLink(o, link) {
    return 'https://wa.me/' + String(CFG.WA_NUMBER || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(waText(o, link));
  }

  function newId() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (CFG.ORDER_PREFIX || 'DE') + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  // ---------- localStorage (aman) ----------
  function lsGet(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // ---------- Pesanan: SQLite (window.DB) dengan cadangan localStorage ----------
  function useDb() { return window.DB && window.DB.isOk(); }
  function listOrders() { return useDb() ? window.DB.list() : lsGet(LS_ORDERS, []); }
  function getOrder(id) {
    if (useDb()) return window.DB.get(id);
    return lsGet(LS_ORDERS, []).filter(function (x) { return x.id === id; })[0] || null;
  }
  function saveOrder(o) {
    if (useDb()) return window.DB.save(o);
    var all = lsGet(LS_ORDERS, []).filter(function (x) { return x.id !== o.id; });
    all.unshift(o); lsSet(LS_ORDERS, all);
  }
  function setStatus(id, st) {
    if (useDb()) return window.DB.setStatus(id, st);
    lsSet(LS_ORDERS, lsGet(LS_ORDERS, []).map(function (x) { return x.id === id ? Object.assign({}, x, { status: st }) : x; }));
  }
  function deleteOrder(id) {
    if (useDb()) return window.DB.remove(id);
    lsSet(LS_ORDERS, lsGet(LS_ORDERS, []).filter(function (x) { return x.id !== id; }));
  }
  function ready() { return window.DB ? window.DB.ready() : Promise.resolve(false); }

  // Terapkan nama brand dari config ke elemen bertanda data-brand
  function applyBrand() {
    var name = CFG.STORE_NAME || 'Donat Empuk';
    var parts = name.split(' '), last = parts.length > 1 ? parts.pop() : '';
    Array.prototype.forEach.call(document.querySelectorAll('[data-brand]'), function (el) {
      if (el.getAttribute('data-brand') === 'split' && last) {
        el.textContent = parts.join(' ') + ' ';
        var b = document.createElement('b'); b.textContent = last; el.appendChild(b);
      } else el.textContent = name;
    });
    document.title = document.title.replace(/Donat Empuk/g, name);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyBrand); else applyBrand();
  }

  window.Store = {
    fmt: fmt, fmtK: fmtK, itemLabel: itemLabel, itemDetail: itemDetail, itemPrice: itemPrice,
    total: total, totalPcs: totalPcs, totalBox: totalBox,
    encode: encode, decode: decode, reviewLink: reviewLink, waText: waText, waLink: waLink, newId: newId,
    lsGet: lsGet, lsSet: lsSet, LS_CART: LS_CART,
    ready: ready, useDb: useDb,
    listOrders: listOrders, getOrder: getOrder, saveOrder: saveOrder, setStatus: setStatus, deleteOrder: deleteOrder
  };
})();
