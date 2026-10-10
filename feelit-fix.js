/* feelit-fix.js — critical site fixes (tours, login, map) */
(function () {
  'use strict';
  if (window.__fiFixLoaded) return;
  window.__fiFixLoaded = true;

  var SEED = [
    { id:'t1', title:'Sarangkot Sunrise Ridge', region:'Pokhara', duration:'Half day', price:5500, price_local:3500, guide:'Assigned after payment', desc:'Dawn ride to Sarangkot for sunrise over the Annapurnas.', includes:['Helmet','Fuel','Local captain'], hidden_gem:false, image:'assets/1.png' },
    { id:'t2', title:'Kathmandu Valley Rim Loop', region:'Kathmandu', duration:'Full day', price:9500, price_local:6500, guide:'Assigned after payment', desc:'Full loop around Kathmandu valley ridges and heritage towns.', includes:['Helmet','Fuel','Local captain'], hidden_gem:false, image:'assets/1.png' },
    { id:'t3', title:'Nagarkot Hill Escape', region:'Kathmandu', duration:'Full day', price:8500, price_local:5500, guide:'Assigned after payment', desc:'Quiet roads up to Nagarkot viewpoints.', includes:['Helmet','Fuel'], hidden_gem:false, image:'assets/1.png' },
    { id:'t4', title:'Hidden Bhaktapur Lanes', region:'Kathmandu', duration:'Half day', price:4500, price_local:3000, guide:'Assigned after payment', desc:'Quiet backlanes and pottery squares.', includes:['Helmet','Captain'], hidden_gem:true, image:'assets/1.png' },
    { id:'t5', title:'Shivapuri Forest Edge', region:'Kathmandu', duration:'Half day', price:6000, price_local:4000, guide:'Assigned after payment', desc:'Green escape on the edge of Shivapuri.', includes:['Helmet','Fuel'], hidden_gem:true, image:'assets/1.png' }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .split('&').join('&')
      .split('<').join('<')
      .split('>').join('>')
      .split('"').join('"');
  }

  function card(t, gem) {
    var title = esc(t.title || t.name || 'Tour');
    var price = t.price != null ? 'NPR ' + Number(t.price).toLocaleString() : '';
    var img = esc(t.image || t.imageUrl || t.photo || 'assets/1.png');
    var id = esc(String(t.id));
    var region = esc(t.region || '');
    var dur = esc(t.duration || '');
    return (
      '<article class="tour-card popular-card" data-tour-id="' + id + '">' +
      '<div class="popular-card-media tour-card-media"><img src="' + img + '" alt="' + title + '" loading="lazy" onerror="this.src=\'assets/1.png\'"></div>' +
      '<div class="popular-card-body tour-card-body">' +
      (gem ? '<span class="pill">Hidden gem</span>' : '') +
      '<h3>' + title + '</h3>' +
      '<p class="muted" style="font-size:13px">' + region + (dur ? ' · ' + dur : '') + '</p>' +
      '<p class="price">' + price + '</p>' +
      '<button type="button" class="btn btn-primary" data-open-tour="' + id + '">View / Book</button>' +
      '</div></article>'
    );
  }

  function getList() {
    if (Array.isArray(window.feelitTours) && window.feelitTours.length) return window.feelitTours;
    return SEED;
  }

  function bindCards(root) {
    (root || document).querySelectorAll('[data-open-tour]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-open-tour');
        if (typeof openTour === 'function') openTour(id);
        else if (typeof openBooking === 'function') openBooking(id);
        else window.location.hash = '#tours';
      });
    });
  }

  function renderAll() {
    var list = getList();
    window.feelitTours = list;

    var grid = document.getElementById('toursGrid') || document.getElementById('tourGrid');
    if (grid) {
      if (grid.id !== 'toursGrid') grid.id = 'toursGrid';
      var normal = list.filter(function (t) { return !t.hidden_gem; });
      grid.innerHTML = normal.length ? normal.map(function (t) { return card(t, false); }).join('') : '<div class="empty-state">Tours coming soon.</div>';
      bindCards(grid);
    }

    var gems = document.getElementById('hiddenGemsGrid');
    if (gems) {
      var g = list.filter(function (t) { return t.hidden_gem; });
      gems.innerHTML = g.length ? g.map(function (t) { return card(t, true); }).join('') : '<div class="empty-state">Hidden gems coming soon.</div>';
      bindCards(gems);
    }

    var strip = document.getElementById('fiPopularStrip');
    if (strip) {
      var pop = list.filter(function (t) { return !t.hidden_gem; }).slice(0, 8);
      strip.innerHTML = pop.map(function (t) { return card(t, false); }).join('');
      bindCards(strip);
    }
  }

  async function loadFromSupabase() {
    try {
      var url = window.SUPABASE_URL || 'https://gsjkexvchfozviqllpvq.supabase.co';
      var key = window.SUPABASE_ANON_KEY || 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';
      if (!window.supabase) return false;
      var client = window.supabase.createClient(url, key);
      var res = await client.from('tours').select('*');
      if (res.error || !res.data || !res.data.length) return false;
      window.feelitTours = res.data.map(function (t) {
        return {
          id: t.id,
          title: t.title || t.name,
          region: t.region,
          duration: t.duration,
          price: t.price,
          price_local: t.price_local,
          guide: t.guide || 'Assigned after payment',
          desc: t.desc || t.description || '',
          includes: t.includes,
          hidden_gem: !!(t.hidden_gem || t.hiddenGem),
          image: t.image || t.imageUrl || t.photo || 'assets/1.png',
          lat: t.lat,
          lng: t.lng
        };
      });
      return true;
    } catch (e) {
      console.warn('tour load', e);
      return false;
    }
  }

  function fixLoginButton() {
    var btn = document.getElementById('authNavBtn');
    if (btn) {
      btn.textContent = 'Login / Account';
      btn.onclick = function (e) {
        if (e) e.preventDefault();
        if (typeof openAuthModal === 'function') openAuthModal();
        else if (typeof showAuthTabs === 'function') showAuthTabs('login');
      };
    }
    document.querySelectorAll('.mobile-login-link').forEach(function (a) {
      a.textContent = 'Login / Account';
      a.onclick = function (e) {
        e.preventDefault();
        if (typeof openAuthModal === 'function') openAuthModal();
        if (typeof closeMobileMenu === 'function') closeMobileMenu();
      };
    });
  }

  function initMapSearch() {
    if (typeof L === 'undefined') return;

    function setup(mapId, inputId, resultsId) {
      var mapEl = document.getElementById(mapId);
      var input = document.getElementById(inputId);
      var results = document.getElementById(resultsId);
      if (!mapEl || !input) return;
      if (mapEl._fiMap) {
        try { mapEl._fiMap.invalidateSize(); } catch (e) {}
        return;
      }

      var map = L.map(mapEl).setView([27.7172, 85.324], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
      }).addTo(map);
      var marker = L.marker([27.7172, 85.324]).addTo(map);
      mapEl._fiMap = map;
      setTimeout(function () { map.invalidateSize(); }, 400);

      var timer = null;
      input.addEventListener('input', function () {
        clearTimeout(timer);
        var q = input.value.trim();
        if (q.length < 2) {
          if (results) results.innerHTML = '';
          return;
        }
        timer = setTimeout(async function () {
          try {
            var url = 'https://nominatim.openstreetmap.org/search?format=json&countrycodes=np&limit=6&q=' + encodeURIComponent(q);
            var r = await fetch(url, { headers: { Accept: 'application/json' } });
            var data = await r.json();
            if (!results) return;
            if (!data.length) {
              results.innerHTML = '<div class="route-search-item">No places found</div>';
              return;
            }
            results.innerHTML = data.map(function (p, i) {
              return '<button type="button" class="route-search-item" data-i="' + i + '">' + esc(p.display_name) + '</button>';
            }).join('');
            results.querySelectorAll('[data-i]').forEach(function (btn) {
              btn.addEventListener('click', function () {
                var p = data[Number(btn.getAttribute('data-i'))];
                var lat = parseFloat(p.lat), lng = parseFloat(p.lon);
                map.setView([lat, lng], 12);
                marker.setLatLng([lat, lng]);
                input.value = p.display_name.split(',')[0];
                results.innerHTML = '';
                window.__fiMapPick = { lat: lat, lng: lng, name: p.display_name };
              });
            });
          } catch (e) {
            console.warn('search', e);
          }
        }, 350);
      });
    }

    setup('tourMap', 'tourMapSearchInput', 'tourMapSearchResults');
    setup('routeMap', 'routeSearchInput', 'routeSearchResults');
    setup('customizeMap', 'routeSearchInput', 'routeSearchResults');
  }

  async function boot() {
    fixLoginButton();
    var ok = await loadFromSupabase();
    if (!ok) window.feelitTours = SEED;
    var grid = document.getElementById('tourGrid');
    if (grid) grid.id = 'toursGrid';
    try {
      if (typeof loadTours === 'function') await loadTours();
    } catch (e) {}
    renderAll();
    setTimeout(initMapSearch, 800);
    setTimeout(initMapSearch, 2000);
    setTimeout(fixLoginButton, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 500); });
  else setTimeout(boot, 500);

  window.fiForceRenderTours = renderAll;
  window.fiInitMapSearch = initMapSearch;
})();
