/* Feel It — restore full production core + original tour cards with photos */
(function () {
  'use strict';
  if (typeof window.CONTACT_INFO === 'undefined') {
    window.CONTACT_INFO = {
      email: 'feelitofficial@gmail.com',
      phone: '+977-9808747221',
      whatsapp: '9779825344810',
      address: 'Basundhara, Kathmandu, Nepal',
      instagram: 'feelitoffical'
    };
  }

  function applyTourPatches() {
    try {
      if (typeof normalizeTour === 'function') {
        var _n = normalizeTour;
        window.normalizeTour = function (t) {
          var x = _n(t);
          var img = x.imageUrl || x.image_url || x.image || x.photo || x.cover || '';
          x.imageUrl = img || 'assets/1.png';
          var g = String(x.guide || '').toLowerCase();
          if (!g.trim() || /rider will|will be assigned|assign after|payment received|to be assigned|tbd|pending/.test(g)) {
            x.guide = 'Assigned after payment';
          }
          return x;
        };
      }

      window.cardHtml = function (t, gem) {
        var src = (t && (t.imageUrl || t.image || t.photo)) || 'assets/1.png';
        var title = (typeof esc === 'function' ? esc(t.title || '') : String(t.title || ''));
        var region = (typeof esc === 'function' ? esc(t.region || '') : String(t.region || ''));
        var duration = (typeof esc === 'function' ? esc(t.duration || '') : String(t.duration || ''));
        var guide = (typeof esc === 'function' ? esc(t.guide || 'Assigned after payment') : 'Assigned after payment');
        var id = (typeof esc === 'function' ? esc(String(t.id)) : String(t.id));
        var price = (typeof fmtNPR === 'function' ? fmtNPR(t.price) : ('NPR ' + (t.price || 0)));
        var priceL = (typeof fmtNPR === 'function' ? fmtNPR(t.price_local) : ('NPR ' + (t.price_local || 0)));
        var art = (typeof imgTag === 'function')
          ? imgTag(src, t.title, 'card-photo', 'style="object-fit:cover;width:100%;height:100%;" onerror="this.onerror=null;this.src=\'assets/1.png\'"')
          : '<img class="card-photo" src="' + src + '" alt="' + title + '" style="object-fit:cover;width:100%;height:100%;" onerror="this.onerror=null;this.src=\'assets/1.png\'">';
        return '<article class="card tour-card">' +
          '<div class="card-art" style="overflow:hidden;aspect-ratio:16/10;">' +
          (gem ? '<span class="gem-badge">Hidden Gem</span>' : '') + art +
          '</div><div class="card-body">' +
          '<div class="card-region">' + region + '</div>' +
          '<h3 class="card-title">' + title + '</h3>' +
          '<div class="card-meta"><span>' + duration + '</span><span>' + guide + '</span></div>' +
          '<div class="card-price dual-price">' +
          '<span class="price-foreign">' + price + ' <small>foreigner</small></span>' +
          '<span class="price-local">' + priceL + ' <small>local</small></span>' +
          '</div>' +
          '<button type="button" class="btn btn-primary" onclick="openTour(\'' + id + '\')">View & book</button>' +
          '</div></article>';
      };

      window.renderTours = function () {
        var box = document.getElementById('toursGrid') || document.getElementById('tourGrid') || document.querySelector('#tours .grid');
        if (!box) return;
        var list = [];
        try {
          if (typeof tours !== 'undefined' && Array.isArray(tours)) list = tours.filter(function (t) { return !t.hidden_gem; });
        } catch (e) {}
        if (!list.length && Array.isArray(window.feelitTours)) list = window.feelitTours.filter(function (t) { return !t.hidden_gem; });
        box.innerHTML = list.length ? list.map(function (t) { return window.cardHtml(t, false); }).join('') : '<div class="empty-state">Tours coming soon.</div>';
      };

      window.renderHiddenGems = function () {
        var el = document.getElementById('hiddenGemsGrid') || document.getElementById('hiddenGems');
        if (!el) return;
        var list = [];
        try {
          if (typeof tours !== 'undefined' && Array.isArray(tours)) list = tours.filter(function (t) { return t.hidden_gem; });
        } catch (e) {}
        if (!list.length && Array.isArray(window.feelitTours)) list = window.feelitTours.filter(function (t) { return t.hidden_gem; });
        el.innerHTML = list.length ? list.map(function (t) { return window.cardHtml(t, true); }).join('') : '<div class="empty-state">Hidden gems coming soon.</div>';
      };

      try {
        if (typeof tours !== 'undefined' && Array.isArray(tours) && tours.length) {
          for (var i = 0; i < tours.length; i++) {
            if (typeof window.normalizeTour === 'function') tours[i] = window.normalizeTour(tours[i]);
          }
          window.feelitTours = tours.slice();
        }
      } catch (e) {}
      if (typeof window.renderTours === 'function') window.renderTours();
      if (typeof window.renderHiddenGems === 'function') window.renderHiddenGems();

      var btn = document.getElementById('authNavBtn');
      if (btn) btn.textContent = 'Login / Account';
    } catch (e) {
      console.warn('tour patches', e);
    }
  }

  function loadCore(code) {
    var s = document.createElement('script');
    s.text = code;
    document.head.appendChild(s);
    applyTourPatches();
    setTimeout(applyTourPatches, 600);
    setTimeout(applyTourPatches, 2000);
  }

  var urls = [
    'https://cdn.jsdelivr.net/gh/Kanha195/Feel-IT_OFFICAL@763d7cd225656b0eba64c87759d10d1133978ed4/script.js',
    'https://cdn.jsdelivr.net/gh/Kanha195/Feel-IT_OFFICAL@763d7cd2/script.js'
  ];
  (async function () {
    for (var i = 0; i < urls.length; i++) {
      try {
        var r = await fetch(urls[i], { cache: 'no-store' });
        if (r.ok) {
          var code = await r.text();
          if (code && code.length > 10000 && code.indexOf('function cardHtml') >= 0) {
            loadCore(code);
            return;
          }
        }
      } catch (e) {}
    }
    console.error('Could not load core script.js');
  })();
})();
