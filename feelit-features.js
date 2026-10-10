/* feelit-features.js — additive guest features (safe: no core rewrite) */
(function () {
  'use strict';
  if (window.__fiFeaturesLoaded) return;
  window.__fiFeaturesLoaded = true;

  var SB_URL = window.SUPABASE_URL || 'https://gsjkexvchfozviqllpvq.supabase.co';
  var SB_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';
  var sb = null;
  try { if (window.supabase) sb = window.supabase.createClient(SB_URL, SB_KEY); } catch (e) {}

  function $(id) { return document.getElementById(id); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  var blocked = {};
  function loadBlocked() {
    if (!sb) return Promise.resolve();
    return sb.from('blocked_dates').select('day,reason').then(function (r) {
      if (r.data) r.data.forEach(function (row) { blocked[row.day] = row.reason || 'Unavailable'; });
    }).catch(function () {});
  }
  function isBlocked(dateStr) {
    if (!dateStr) return false;
    return !!blocked[dateStr.slice(0, 10)];
  }

  window.fiApplyVoucher = async function (code, basePrice) {
    code = String(code || '').trim().toUpperCase();
    if (!code || !sb) return { ok: false, msg: 'No code' };
    try {
      var r = await sb.from('vouchers').select('*').eq('code', code).eq('active', true).maybeSingle();
      if (r.error || !r.data) return { ok: false, msg: 'Invalid code' };
      var v = r.data;
      if (v.expires_at && new Date(v.expires_at) < new Date()) return { ok: false, msg: 'Expired' };
      if (v.max_uses != null && v.used_count >= v.max_uses) return { ok: false, msg: 'Code used up' };
      var off = Number(v.percent_off) || 0;
      var final = Math.round(Number(basePrice) * (1 - off / 100));
      return { ok: true, percent: off, price: final, code: code };
    } catch (e) {
      return { ok: false, msg: 'Could not check code' };
    }
  };

  function packingTip() {
    var w = window.__fiWeather || {};
    var kind = w.kind || window.__fiWeatherKind || '';
    var tips = [];
    if (kind === 'rain' || kind === 'thunder') tips.push('Pack a light rain jacket and waterproof phone pouch.');
    if (kind === 'snow') tips.push('Wear layers and gloves — mountain passes can be cold.');
    if (kind === 'fog') tips.push('Expect slower roads in fog; captain will adjust pace.');
    if ((w.temp != null && w.temp >= 28) || kind === 'clear') tips.push('Sunscreen, water, and a light layer for higher altitude.');
    if (w.wind != null && w.wind >= 20) tips.push('Wind is up — secure loose scarves and phone mounts.');
    if (!tips.length) tips.push('Helmet is provided. Wear closed shoes and bring a light jacket.');
    return tips.join(' ');
  }

  function injectPackingBanner() {
    if ($('fiPackingTip')) return;
    var host = document.querySelector('.hero-content') || document.querySelector('main') || document.body;
    if (!host) return;
    var b = el('<div id="fiPackingTip" style="margin:12px 0;padding:10px 14px;border-radius:12px;background:rgba(0,245,212,.08);border:1px solid rgba(0,245,212,.2);font-size:13px;max-width:520px;color:#cfe;line-height:1.45"></div>');
    b.textContent = '🎒 ' + packingTip();
    var anchor = document.querySelector('.hero-actions') || host.firstChild;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b, anchor.nextSibling);
    else host.appendChild(b);
  }

  function enhanceBookingUI() {
    document.querySelectorAll('input[type="date"]').forEach(function (inp) {
      if (inp.dataset.fiBound) return;
      inp.dataset.fiBound = '1';
      inp.addEventListener('change', function () {
        if (isBlocked(inp.value)) {
          var reason = blocked[inp.value.slice(0, 10)] || 'Fully booked';
          alert('That date is unavailable: ' + reason + '. Please choose another day.');
          inp.value = '';
        }
      });
    });

    var modal = $('modalContent') || document.querySelector('.booking-form') || $('bookingForm');
    if (!modal || $('fiVoucherCode')) return;

    var box = el(
      '<div id="fiFeatureFields" style="margin:12px 0;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2)">' +
        '<label style="display:block;font-size:12px;opacity:.8;margin-bottom:4px">Group size</label>' +
        '<input id="fiGroupSize" type="number" min="1" max="6" value="1" style="width:100%;margin-bottom:8px;padding:8px;border-radius:8px;border:1px solid #333;background:#111;color:#fff">' +
        '<label style="display:block;font-size:12px;opacity:.8;margin-bottom:4px">Voucher code</label>' +
        '<div style="display:flex;gap:8px">' +
        '<input id="fiVoucherCode" type="text" placeholder="e.g. FEELIT10" style="flex:1;padding:8px;border-radius:8px;border:1px solid #333;background:#111;color:#fff">' +
        '<button type="button" id="fiVoucherBtn" style="padding:8px 12px;border-radius:8px;border:0;background:#00F5D4;color:#041018;font-weight:700;cursor:pointer">Apply</button>' +
        '</div>' +
        '<p id="fiVoucherMsg" style="font-size:12px;margin:6px 0 0;opacity:.85"></p>' +
        '<p style="font-size:12px;margin:10px 0 0;opacity:.75">Local price requires Nepali ID at meetup. Foreign guests use standard rate.</p>' +
        '<p style="font-size:12px;margin:6px 0 0;opacity:.75">Cancel: free up to 24h before ride (ops policy).</p>' +
      '</div>'
    );
    modal.appendChild(box);

    var btn = $('fiVoucherBtn');
    if (btn) {
      btn.addEventListener('click', async function () {
        var msg = $('fiVoucherMsg');
        var base = window.__fiBookingPrice || 0;
        if (!base) {
          var priceEl = document.querySelector('.booking-price, #bookingPrice, [data-price]');
          if (priceEl) base = parseFloat(String(priceEl.textContent).replace(/[^\d.]/g, '')) || 0;
        }
        var res = await window.fiApplyVoucher(($('fiVoucherCode') || {}).value, base || 10000);
        if (!res.ok) {
          msg.style.color = '#f87171';
          msg.textContent = res.msg || 'Invalid';
          window.__fiVoucher = null;
          return;
        }
        msg.style.color = '#4ade80';
        msg.textContent = res.percent + '% off → NPR ' + res.price.toLocaleString();
        window.__fiVoucher = res;
      });
    }
  }

  function ensureRideLink() {
    if (document.querySelector('a[href="ride.html"]')) return;
    var foot = document.querySelector('footer') || document.body;
    foot.appendChild(el('<p style="text-align:center;padding:8px"><a href="ride.html" style="color:#00F5D4">Track My Ride →</a></p>'));
  }

  window.fiIncludedHtml = function (tour) {
    var inc = (tour && (tour.includes || tour.included)) || ['Helmet', 'Fuel', 'Local captain', 'Basic jacket'];
    var exc = (tour && (tour.excludes || tour.not_included)) || ['Meals', 'Entry fees', 'Personal insurance'];
    if (typeof inc === 'string') inc = inc.split(',').map(function (s) { return s.trim(); });
    if (typeof exc === 'string') exc = exc.split(',').map(function (s) { return s.trim(); });
    return '<div style="font-size:12px;line-height:1.5;margin-top:8px"><b>Included:</b> ' + inc.join(', ') + '<br><b>Not included:</b> ' + exc.join(', ') + '</div>';
  };

  function boot() {
    loadBlocked().then(function () { enhanceBookingUI(); });
    injectPackingBanner();
    ensureRideLink();
    var obs = new MutationObserver(function () { enhanceBookingUI(); injectPackingBanner(); });
    try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    window.addEventListener('fi-weather-updated', function () {
      var t = $('fiPackingTip');
      if (t) t.textContent = '🎒 ' + packingTip();
      else injectPackingBanner();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 600);
})();
