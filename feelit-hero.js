/* feelit-hero.js — weather chip, reviews strip, popular strip helpers */
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;');
  }

  // Re-use core img helpers when available
  function imgTag(url, alt, cls, extra) {
    if (typeof window.imgTag === 'function') return window.imgTag(url, alt, cls, extra);
    var src = url || 'assets/1.png';
    return (
      '<img src="' +
      esc(src) +
      '" alt="' +
      esc(alt || '') +
      '" class="' +
      esc(cls || '') +
      '" loading="lazy" ' +
      (extra || '') +
      ' onerror="this.onerror=null;this.src=\'assets/1.png\'">'
    );
  }

  async function fillWeatherChip() {
    var chip = document.querySelector('.hero-weather-text') || document.getElementById('fiWeatherText');
    if (!chip) return;
    try {
      var r = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=27.741&longitude=85.336&current_weather=true'
      );
      var data = await r.json();
      var w = data.current_weather || {};
      var t = Math.round(w.temperature);
      chip.textContent = (isFinite(t) ? t + '°C in Kathmandu' : 'Weather updating…');
    } catch (e) {
      chip.textContent = 'Weather updating…';
    }
  }

  async function fillReviews() {
    /* core script handles reviews if present */
  }

  function fillPopular() {
    var host = $('fiPopularStrip');
    if (!host || typeof tours === 'undefined') return;
    if (!tours.length) {
      host.innerHTML =
        '<div class="empty-state">Tours will appear here once published.</div>';
      return;
    }

    var list = [];
    try {
      var ids = typeof loadFeaturedIds === 'function' ? loadFeaturedIds() : [];
      if (ids && ids.length) {
        var map = {};
        tours.forEach(function (t) {
          map[String(t.id)] = t;
        });
        list = ids.map(function (id) {
          return map[String(id)];
        }).filter(Boolean);
      }
    } catch (e) {}
    if (!list.length) list = tours.filter(function (t) {
      return !t.hidden_gem;
    }).slice(0, 8);
    if (!list.length) list = tours.slice(0, 8);

    var cardHtml = function (t, clone) {
      var zoom = Math.min(200, Math.max(100, Number(t.image_zoom) || 100));
      var pos = esc(t.image_position || 'center');
      var media = t.imageUrl
        ? '<div class="popular-card-media">' +
          imgTag(
            t.imageUrl,
            t.title,
            'popular-card-img',
            'style="object-position:' + pos + ';transform:scale(' + zoom / 100 + ');transform-origin:center;"'
          ) +
          '</div>'
        : '<div class="popular-card-media popular-card-media--empty">Photo soon</div>';
      var guide = String(t.guide || '').trim();
      if (
        !guide ||
        /rider will|will be assigned|assign after|payment received|assigned when|to be assigned|\bpending\b|\btbd\b/i.test(
          guide
        )
      ) {
        guide = 'Assigned after payment';
      }
      return (
        '<article class="popular-card' +
        (clone ? ' is-clone' : '') +
        '" data-tour-id="' +
        esc(String(t.id)) +
        '">' +
        media +
        '<div class="popular-card-body">' +
        '<div class="popular-card-region">' +
        esc(t.region || '') +
        '</div>' +
        '<h3 class="popular-card-title">' +
        esc(t.title || '') +
        '</h3>' +
        '<div class="popular-card-meta">' +
        esc(t.duration || '') +
        ' · ' +
        esc(guide) +
        '</div>' +
        '<div class="popular-card-price">' +
        (typeof fmtNPR === 'function' ? fmtNPR(t.price) : 'NPR ' + (t.price || 0)) +
        '</div>' +
        '</div></article>'
      );
    };

    var html = list.map(function (t) {
      return cardHtml(t, false);
    }).join('');
    // infinite-ish strip: clone first cards at end
    html += list
      .slice(0, Math.min(3, list.length))
      .map(function (t) {
        return cardHtml(t, true);
      })
      .join('');
    host.innerHTML = html;

    host.querySelectorAll('[data-tour-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-tour-id');
        if (id && typeof openTour === 'function') openTour(id);
      });
    });
  }

  window.fillPopular = fillPopular;
  window.syncFeatCustomize = window.syncFeatCustomize || function () {};

  // boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      fillWeatherChip();
      fillReviews();
      if (typeof tours !== 'undefined' && tours.length) fillPopular();
    });
  } else {
    fillWeatherChip();
    fillReviews();
    if (typeof tours !== 'undefined' && tours.length) fillPopular();
  }

  // ONE FIX: clean placeholder guide text on tour cards after they render
  function cleanGuideLabels() {
    document.querySelectorAll('.card-meta span').forEach(function (span) {
      var t = (span.textContent || '').trim();
      if (
        /^Guide:\s*/i.test(t) &&
        /rider will|will be assigned|assign after|payment received|assigned when|to be assigned|\bpending\b|\btbd\b/i.test(
          t
        )
      ) {
        span.textContent = 'Guide: Assigned after payment';
      }
    });
  }
  setTimeout(cleanGuideLabels, 600);
  setTimeout(cleanGuideLabels, 1500);
  setTimeout(cleanGuideLabels, 3500);
  setInterval(cleanGuideLabels, 5000);

  // Re-fill popular strip once tours finish loading (async)
  var popTries = 0;
  var popTimer = setInterval(function () {
    popTries++;
    if (typeof tours !== 'undefined' && tours.length) {
      fillPopular();
      clearInterval(popTimer);
    }
    if (popTries > 40) clearInterval(popTimer);
  }, 500);
})();
