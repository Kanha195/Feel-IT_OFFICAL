/* =========================================================================
   Feel It — hero helpers (weather chip, reviews, popular strip)
   ========================================================================= */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function esc(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    return String(s ?? '')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;');
  }

  function imgTag(url, alt, cls, extra) {
    if (typeof window.imgTag === 'function') return window.imgTag(url, alt, cls, extra || '');
    const src = url || 'assets/1.png';
    return `<img src="${esc(src)}" alt="${esc(alt || '')}" class="${esc(cls || '')}" loading="lazy" ${extra || ''} onerror="this.onerror=null;this.src='assets/1.png'">`;
  }

  async function fillWeatherChip() {
    const textEl =
      document.querySelector('.hero-weather-text') ||
      document.getElementById('fiWeatherText');
    if (!textEl) return;
    try {
      const r = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=27.741&longitude=85.336&current_weather=true'
      );
      const data = await r.json();
      const w = data.current_weather || {};
      const t = Math.round(w.temperature);
      textEl.textContent = Number.isFinite(t) ? `${t}°C · Kathmandu` : 'Checking the weather…';
    } catch (e) {
      textEl.textContent = 'Checking the weather…';
    }
  }

  async function fillReviews() {
    /* left to core script when present */
  }

  function fillPopular() {
    const host = $('fiPopularStrip');
    if (!host || typeof tours === 'undefined') return;
    if (!tours.length) {
      host.innerHTML =
        '<div class="empty-state">Tours will appear here once published.</div>';
      return;
    }

    let list = [];
    try {
      const ids = typeof loadFeaturedIds === 'function' ? loadFeaturedIds() : [];
      if (ids && ids.length) {
        const map = Object.fromEntries(tours.map((t) => [String(t.id), t]));
        list = ids.map((id) => map[String(id)]).filter(Boolean);
      }
    } catch (e) {}
    if (!list.length) list = tours.filter((t) => !t.hidden_gem).slice(0, 8);
    if (!list.length) list = tours.slice(0, 8);

    const cardHtml = (t, clone) => {
      const zoom = Math.min(200, Math.max(100, Number(t.image_zoom) || 100));
      const pos = esc(t.image_position || 'center');
      const media = t.imageUrl
        ? `<div class="popular-card-media">${imgTag(
            t.imageUrl,
            t.title,
            'popular-card-img',
            `style="object-position:${pos};transform:scale(${zoom / 100});transform-origin:center;"`
          )}</div>`
        : `<div class="popular-card-media popular-card-media--empty">Photo soon</div>`;

      let guide = String(t.guide || '').trim();
      if (
        !guide ||
        /rider will|will be assigned|assign after|payment received|assigned when|to be assigned|\bpending\b|\btbd\b/i.test(
          guide
        )
      ) {
        guide = 'Assigned after payment';
      }

      return `<article class="popular-card${clone ? ' is-clone' : ''}" data-tour-id="${esc(
        String(t.id)
      )}">
        ${media}
        <div class="popular-card-body">
          <div class="popular-card-region">${esc(t.region || '')}</div>
          <h3 class="popular-card-title">${esc(t.title || '')}</h3>
          <div class="popular-card-meta">${esc(t.duration || '')} · ${esc(guide)}</div>
          <div class="popular-card-price">${
            typeof fmtNPR === 'function' ? fmtNPR(t.price) : 'NPR ' + (t.price || 0)
          }</div>
        </div>
      </article>`;
    };

    let html = list.map((t) => cardHtml(t, false)).join('');
    html += list
      .slice(0, Math.min(3, list.length))
      .map((t) => cardHtml(t, true))
      .join('');
    host.innerHTML = html;

    host.querySelectorAll('[data-tour-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-tour-id');
        if (id && typeof openTour === 'function') openTour(id);
      });
    });
  }

  window.fillPopular = fillPopular;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fillWeatherChip();
      fillReviews();
      if (typeof tours !== 'undefined' && tours.length) fillPopular();
    });
  } else {
    fillWeatherChip();
    fillReviews();
    if (typeof tours !== 'undefined' && tours.length) fillPopular();
  }

  // ONE FIX ONLY: placeholder guide labels on tour cards
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

  // Popular strip often boots before tours load — retry briefly
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
