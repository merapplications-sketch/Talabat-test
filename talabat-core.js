/* talabat-core.js — Mock backend on localStorage (same origin only).
   Later: replace the internals with Supabase, keep the same TLB.* API. */
(function () {
  'use strict';
  var KEY = 'tlb_db_v1', LK = 'tlb_lang', FEE = 10;
  var PROMOS = { TALABAT20: { t: 'fixed', v: 20 }, WELCOME50: { t: 'fixed', v: 50 }, PROMO10: { t: 'percent', v: 10 } };
  var FLOW = { pending: ['preparing', 'rejected', 'cancelled'], preparing: ['ready'], ready: ['pickedup'], pickedup: ['delivered'] };
  var U = function (id) { return 'https://images.unsplash.com/' + id + '?w=200'; };
  var m = function (id, name, price, img, pop) { return { id: id, name: name, price: price, image: img ? U(img) : '', available: true, popular: !!pop }; };

  function seed() {
    return { seq: 9000, open: {}, orders: [], menus: {
      'Romant Restaurant': [
        m(101, 'Signature Olov (Plov)', 60, 'photo-1543353071-873f17a7a088', 1),
        m(102, 'Combo Burger Meal', 75, 'photo-1568901346375-23c9450c58cd'),
        m(103, 'Fresh Tajik Green Tea', 15, 'photo-1576092768241-dec231879fc3'),
        m(104, 'Shashlik Assorted', 85, 'photo-1555939594-58d7cb561ad1')],
      'Burger King Dushanbe': [m(201, 'Whopper Meal', 70, 'photo-1568901346375-23c9450c58cd'), m(202, 'Chicken Royale', 55, 'photo-1625813506062-0aeb1d7a094b')],
      'Carrefour Mart': [m(301, 'Fresh Milk 1L', 12, 'photo-1550583724-b2692b85b150'), m(302, 'Tajikistan Rice 2kg', 35, 'photo-1586201375761-83865001e31c')],
      "Аптека 'Aibolit'": [m(501, 'Paracetamol 500mg', 10, 'photo-1584308666744-24d5c474f2ae'), m(502, 'Vitamin C 1000mg', 45, 'photo-1576602976047-174e57a47881')]
    } };
  }

  /* ---------- storage + change detection ---------- */
  var subs = [], last = null;
  try { if (/[?&]reset/.test(location.search)) localStorage.removeItem(KEY); last = localStorage.getItem(KEY); } catch (e) {}
  function load() { try { var r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {} return seed(); }
  function fire() { subs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  function check() { var c = null; try { c = localStorage.getItem(KEY); } catch (e) {} if (c !== last) { last = c; fire(); } }
  addEventListener('storage', function (e) { if (e.key === KEY) check(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
  setInterval(check, 1500);
  function tx(fn) {
    var d = load(), r = fn(d);
    try { var s = JSON.stringify(d); localStorage.setItem(KEY, s); last = s; } catch (e) { return { error: 'storage' }; }
    fire(); return r;
  }
  function find(d, id) { return d.orders.find(function (o) { return o.id === id; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- i18n RU / EN ---------- */
  var I = {
    ru: { pending: 'Ожидание подтверждения', preparing: 'Готовится', ready: 'Готов к выдаче курьеру', pickedup: 'Курьер в пути', delivered: 'Доставлено', rejected: 'Отклонён рестораном', cancelled: 'Отменён',
      err_closed: 'Ресторан сейчас закрыт', err_unavailable: 'Товар недоступен', err_empty: 'Корзина пуста', err_bad_transition: 'Действие недоступно', err_taken: 'Заказ уже взят другим курьером',
      confirm_cancel: 'Отменить заказ?', clear_cart: 'В корзине товары другого магазина. Очистить корзину?', accept: 'Принять', reject: 'Отклонить', add: 'Добавить', cart: 'Корзина', pay: 'Оплатить заказ', online: 'На линии', offline: 'Не в сети' },
    en: { pending: 'Waiting for confirmation', preparing: 'Preparing', ready: 'Ready for courier pickup', pickedup: 'Courier on the way', delivered: 'Delivered', rejected: 'Rejected by restaurant', cancelled: 'Cancelled',
      err_closed: 'The restaurant is closed right now', err_unavailable: 'Item unavailable', err_empty: 'Cart is empty', err_bad_transition: 'Action not allowed', err_taken: 'Order already taken by another courier',
      confirm_cancel: 'Cancel this order?', clear_cart: 'Your cart has items from another store. Clear it?', accept: 'Accept', reject: 'Reject', add: 'Add', cart: 'Cart', pay: 'Pay for order', online: 'Online', offline: 'Offline' }
  };
  var lang = 'ru';
  try { lang = localStorage.getItem(LK) || ((navigator.language || '').indexOf('en') === 0 ? 'en' : 'ru'); } catch (e) {}
  function t(k) { return (I[lang] && I[lang][k]) || I.ru[k] || k; }
  function applyI18n() {
    document.documentElement.lang = lang;
    [].forEach.call(document.querySelectorAll('[data-i18n]'), function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    [].forEach.call(document.querySelectorAll('[data-i18n-ph]'), function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  }
  function setLang(l) { lang = l; try { localStorage.setItem(LK, l); } catch (e) {} applyI18n(); var b = document.getElementById('tlb-lang'); if (b) b.textContent = l === 'ru' ? 'RU | en' : 'ru | EN'; fire(); }
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div'); b.id = 'tlb-lang';
    b.style.cssText = 'position:fixed;top:3px;left:50%;transform:translateX(-50%);z-index:9999;background:#000a;color:#fff;font:700 10px sans-serif;padding:3px 9px;border-radius:10px;cursor:pointer';
    b.textContent = lang === 'ru' ? 'RU | en' : 'ru | EN';
    b.onclick = function () { setLang(lang === 'ru' ? 'en' : 'ru'); };
    document.body.appendChild(b); applyI18n();
  });

  /* ---------- API ---------- */
  window.TLB = {
    addDict: function (ru, en) { Object.assign(I.ru, ru); Object.assign(I.en, en); },
    t: t, esc: esc, applyI18n: applyI18n, setLang: setLang, lang: function () { return lang; },
    on: function (f) { subs.push(f); },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} last = null; fire(); },

    allMenus: function (onlyAvail) { var mm = load().menus, o = {}; for (var k in mm) o[k] = onlyAvail ? mm[k].filter(function (i) { return i.available; }) : mm[k]; return o; },
    getMenu: function (s) { return load().menus[s] || []; },
    saveMenu: function (s, arr) { return tx(function (d) { d.menus[s] = arr; }); },
    isOpen: function (s) { return load().open[s] !== false; },
    setOpen: function (s, v) { return tx(function (d) { d.open[s] = !!v; }); },

    /* Server-side pricing: client sends ONLY ids + quantities. */
    placeOrder: function (o) {
      return tx(function (d) {
        if (d.open[o.store] === false) return { error: 'closed' };
        var menu = d.menus[o.store] || [], items = [], sub = 0;
        for (var id in o.cart) {
          var it = menu.find(function (x) { return String(x.id) === String(id); });
          if (!it || !it.available) return { error: 'unavailable' };
          var q = Math.max(1, Math.min(50, parseInt(o.cart[id], 10) || 0));
          items.push({ id: it.id, name: it.name, price: it.price, qty: q, note: ((o.notes || {})[id] || '').slice(0, 120) });
          sub += it.price * q;
        }
        if (!items.length) return { error: 'empty' };
        var p = PROMOS[String(o.promo || '').toUpperCase()];
        var disc = p ? (p.t === 'fixed' ? p.v : Math.round(sub * p.v / 100)) : 0; disc = Math.min(disc, sub);
        var tip = [0, 3, 5, 10].indexOf(o.tip) >= 0 ? o.tip : 0;
        var ord = { id: ++d.seq, store: o.store, items: items, subtotal: sub, discount: disc, delivery: FEE, tip: tip,
          total: Math.max(5, sub - disc + FEE + tip), payment: String(o.payment || '').slice(0, 40), address: String(o.address || '').slice(0, 200),
          client: { name: String((o.client || {}).name || '').slice(0, 60), phone: String((o.client || {}).phone || '').slice(0, 20) },
          status: 'pending', prepTime: 20, driver: null, driverName: '', payout: FEE + tip, chat: [], createdAt: Date.now(), doneAt: null, log: [{ s: 'pending', at: Date.now() }] };
        d.orders.unshift(ord); return ord;
      });
    },
    order: function (id) { return find(load(), id) || null; },
    orders: function (fn) { return load().orders.filter(fn || function () { return true; }); },
    setStatus: function (id, to) {
      return tx(function (d) {
        var o = find(d, id); if (!o || (FLOW[o.status] || []).indexOf(to) < 0) return { error: 'bad_transition' };
        o.status = to; o.log.push({ s: to, at: Date.now() });
        if (to === 'delivered' || to === 'rejected' || to === 'cancelled') o.doneAt = Date.now();
        return o;
      });
    },
    patch: function (id, f) {
      return tx(function (d) {
        var o = find(d, id); if (!o || ['pending', 'preparing'].indexOf(o.status) < 0) return { error: 'bad_transition' };
        if (f.prepTime) o.prepTime = Math.min(90, Math.max(5, +f.prepTime || 20)); return o;
      });
    },
    /* Orders a driver can take: merchant accepted, no driver yet. */
    offers: function () { return load().orders.filter(function (o) { return !o.driver && (o.status === 'preparing' || o.status === 'ready'); }); },
    driverAccept: function (id, drv) {
      return tx(function (d) {   /* atomic: only one driver wins */
        var o = find(d, id);
        if (!o || o.driver || (o.status !== 'preparing' && o.status !== 'ready')) return { error: 'taken' };
        o.driver = drv.id; o.driverName = drv.name; o.log.push({ s: 'driver', at: Date.now() }); return o;
      });
    },
    chat: function (id, sender, text) {
      return tx(function (d) {
        var o = find(d, id); if (!o || o.status === 'delivered') return { error: 'bad_transition' };
        o.chat.push({ s: sender, t: String(text).slice(0, 200), at: Date.now() }); return o;
      });
    }
  };
})();
