/* feelit-fix.js — light assist; core owns tour cards */
(function(){
  'use strict';
  if (window.__fiFixLoaded) return;
  window.__fiFixLoaded = true;
  function fixIds(){
    var g = document.getElementById('tourGrid');
    if (g && !document.getElementById('toursGrid')) g.id = 'toursGrid';
  }
  function fixLogin(){
    var btn = document.getElementById('authNavBtn');
    if (btn) {
      btn.textContent = 'Login / Account';
      btn.onclick = function(e){ e && e.preventDefault(); if (typeof openAuthModal==='function') openAuthModal(); };
    }
  }
  function ensureMaps(){
    if (typeof L === 'undefined') return;
    function setup(mapId, inputId, resultsId){
      var mapEl = document.getElementById(mapId);
      var input = document.getElementById(inputId);
      var results = document.getElementById(resultsId);
      if (!mapEl || !input || mapEl._fiMap) return;
      var map = L.map(mapEl).setView([27.7172, 85.324], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OSM'}).addTo(map);
      var marker = L.marker([27.7172, 85.324]).addTo(map);
      mapEl._fiMap = map;
      setTimeout(function(){ map.invalidateSize(); }, 500);
      var timer=null;
      input.addEventListener('input', function(){
        clearTimeout(timer);
        var q = input.value.trim();
        if (q.length < 2) { if(results) results.innerHTML=''; return; }
        timer = setTimeout(async function(){
          try {
            var r = await fetch('https://nominatim.openstreetmap.org/search?format=json&countrycodes=np&limit=6&q='+encodeURIComponent(q), {headers:{Accept:'application/json'}});
            var data = await r.json();
            if (!results) return;
            results.innerHTML = (data||[]).map(function(p,i){
              return '<button type="button" class="route-search-item" data-i="'+i+'">'+(p.display_name||'')+'</button>';
            }).join('') || '<div class="route-search-item">No places found</div>';
            results.querySelectorAll('[data-i]').forEach(function(btn){
              btn.onclick = function(){
                var p = data[Number(btn.getAttribute('data-i'))];
                var lat=parseFloat(p.lat), lng=parseFloat(p.lon);
                map.setView([lat,lng],12); marker.setLatLng([lat,lng]);
                input.value = (p.display_name||'').split(',')[0];
                results.innerHTML='';
              };
            });
          } catch(e){}
        }, 350);
      });
    }
    setup('tourMap','tourMapSearchInput','tourMapSearchResults');
    setup('routeMap','routeSearchInput','routeSearchResults');
  }
  async function boot(){
    fixIds(); fixLogin();
    try { if (typeof loadTours==='function') await loadTours(); } catch(e){}
    try { if (typeof renderTours==='function') renderTours(); } catch(e){}
    try { if (typeof renderHiddenGems==='function') renderHiddenGems(); } catch(e){}
    setTimeout(ensureMaps, 800);
    setTimeout(fixLogin, 1000);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot,400); });
  else setTimeout(boot,400);
})();
