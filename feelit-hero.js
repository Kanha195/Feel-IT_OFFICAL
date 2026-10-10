/* feelit-hero.js — load LAST after script.js + feelit-extras.js */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  const HQ_LAT = 27.7410, HQ_LNG = 85.3360;

  async function fillWeatherChip() {
    const el = $('fiWeatherWidget');
    if (!el) return;
    const timeout = new Promise(res => setTimeout(() => res(null), 6500));
    const loc = window.fiGetLocation
      ? await Promise.race([window.fiGetLocation(), timeout])
      : null;
    const { lat, lng } = loc || { lat: HQ_LAT, lng: HQ_LNG };
    if ($('fiWeatherLoc')) {
      $('fiWeatherLoc').textContent = loc ? 'Your location' : 'Kathmandu';
    }

    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      const c = data.current;
      if (!c) return;

      const code = c.weather_code;
      const icon = typeof weatherIcon === 'function' ? weatherIcon(code) : '🌡️';
      const label = typeof weatherLabel === 'function' ? weatherLabel(code) : 'Weather';
      const iconEl = el.querySelector('.hero-weather-icon');
      const textEl = el.querySelector('.hero-weather-text');
      if (iconEl) iconEl.textContent = icon;
      if (textEl) textEl.textContent = label;
      if ($('fiWeatherTemp')) $('fiWeatherTemp').textContent = Math.round(c.temperature_2m) + '°';
      if ($('fiWeatherHum')) {
        $('fiWeatherHum').textContent =
          c.relative_humidity_2m != null ? c.relative_humidity_2m + '%' : '—';
      }
      if ($('fiWeatherWind')) {
        $('fiWeatherWind').textContent =
          c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) + ' km/h' : '—';
      }
      if ($('fiWeatherFeels')) {
        $('fiWeatherFeels').textContent =
          c.apparent_temperature != null ? Math.round(c.apparent_temperature) + '°' : '—';
      }

      window.__fiWindKmh = Number(c.wind_speed_10m) || 0;
      let kind = null;
      if ([95, 96, 99].includes(code)) kind = 'thunder';
      else if ([71, 73, 75, 77, 85, 86].includes(code)) kind = 'snow';
      else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) kind = 'rain';
      else if ([45, 48].includes(code)) kind = 'fog';
      else if (code <= 1) kind = 'clear';
      window.__fiWeatherKind = kind;
      window.dispatchEvent(
        new CustomEvent('fi-weather-updated', {
          detail: { wind: window.__fiWindKmh, code, kind }
        })
      );
    } catch (e) {
      console.warn('Weather chip failed', e);
    }
  }

  function fillTrust() {
    /* trust strip is static HTML — nothing to fill */
  }

  function fillRegions() {
    const sel = $('fiPlanRegion');
    if (!sel || typeof tours === 'undefined') return;
    const regions = [...new Set(tours.map(t => t.region).filter(Boolean))].sort();
    if (!regions.length) return;
    const current = sel.value;
    sel.innerHTML =
      '<option value="All">All regions</option>' +
      regions.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
    if (current) sel.value = current;
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
        const map = Object.fromEntries(tours.map(t => [String(t.id), t]));
        list = ids.map(id => map[String(id)]).filter(Boolean);
      }
    } catch (e) {}
    if (!list.length) list = tours.filter(t => !t.hidden_gem).slice(0, 8);
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
        : `<div class="popular-card-media popular-card-media-empty" aria-hidden="true">📷</div>`;

      return (
        `<div class="popular-card${clone ? ' popular-card-clone' : ''}" ` +
        `data-tour-id="${esc(t.id)}" onclick="openTour('${esc(t.id)}')">` +
        media +
        `<div class="popular-card-body">` +
        `<div class="popular-card-region">${esc(t.region || '')}</div>` +
        `<h4 class="popular-card-title">${esc(t.title || 'Tour')}</h4>` +
        `<div class="popular-card-price">${fmtNPR(t.price)} / person</div>` +
        `</div></div>`
      );
    };

    if (list.length <= 1) {
      host.innerHTML = list.map(t => cardHtml(t, false)).join('');
    } else {
      host.innerHTML =
        list.map(t => cardHtml(t, true)).join('') +
        list.map(t => cardHtml(t, false)).join('') +
        list.map(t => cardHtml(t, true)).join('');
    }
    bindPopularNav(list.length);
  }

  function bindPopularNav(itemCount) {
    const strip = $('fiPopularStrip');
    const left = $('fiPopLeft');
    const right = $('fiPopRight');
    if (!strip || !left || !right) return;

    // remove old listeners by cloning buttons
    const left2 = left.cloneNode(true);
    const right2 = right.cloneNode(true);
    left.parentNode.replaceChild(left2, left);
    right.parentNode.replaceChild(right2, right);

    left2.disabled = false;
    right2.disabled = false;
    if (!itemCount || itemCount <= 1) {
      left2.disabled = true;
      right2.disabled = true;
      return;
    }

    let locked = false;

    const oneSetWidth = () => {
      const cards = strip.querySelectorAll('.popular-card');
      if (cards.length < itemCount * 2) return Math.floor(strip.scrollWidth / 3);
      return cards[itemCount].offsetLeft - cards[0].offsetLeft;
    };

    const jumpToMiddle = () => {
      const w = oneSetWidth();
      if (w > 0) strip.scrollLeft = w;
    };

    const step = () => {
      const card = strip.querySelector('.popular-card');
      if (card) return Math.round(card.getBoundingClientRect().width + 14);
      return Math.max(200, Math.floor(strip.clientWidth * 0.7));
    };

    const maintainLoop = () => {
      if (locked) return;
      const w = oneSetWidth();
      if (w <= 0) return;
      const x = strip.scrollLeft;
      if (x >= w * 2 - 8) {
        locked = true;
        strip.scrollLeft = x - w;
        requestAnimationFrame(() => {
          locked = false;
        });
      } else if (x <= 8) {
        locked = true;
        strip.scrollLeft = x + w;
        requestAnimationFrame(() => {
          locked = false;
        });
      }
    };

    left2.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      strip.scrollBy({ left: -step(), behavior: 'smooth' });
    });
    right2.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      strip.scrollBy({ left: step(), behavior: 'smooth' });
    });

    strip.addEventListener('scroll', maintainLoop, { passive: true });
    requestAnimationFrame(() => {
      jumpToMiddle();
      setTimeout(jumpToMiddle, 100);
      setTimeout(jumpToMiddle, 300);
    });
    window.addEventListener('resize', jumpToMiddle);
  }

  const _renderTours = window.renderTours;
  window.renderTours = function () {
    if (typeof _renderTours === 'function') _renderTours();
    fillTrust();
    fillRegions();
    fillPopular();
  };

  async function fillReviews() {
    const host = $('fiReviewsGrid');
    if (!host) return;
    try {
      const { data, error } = await supabaseClient
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error || !data || !data.length) {
        host.innerHTML =
          '<div class="empty-state">No rider stories yet — be the first after your trip.</div>';
        return;
      }
      host.innerHTML = data
        .map(r => {
          const stars = '★'.repeat(Math.min(5, Math.max(1, Number(r.rating) || 5)));
          return (
            `<article class="review-card">` +
            `<span class="stars">${stars}</span>` +
            `<p>${esc(r.comment || r.text || '')}</p>` +
            `<div class="review-who">${esc(r.name || r.email || 'Rider')}</div>` +
            (r.tour_title
              ? `<div class="review-tour">${esc(r.tour_title)}</div>`
              : '') +
            `</article>`
          );
        })
        .join('');
    } catch (e) {
      host.innerHTML =
        '<div class="empty-state">Reviews will show here when available.</div>';
    }
  }

  window.syncFeatCustomize = function () {
    const h = document.getElementById('featHotel');
    const f = document.getElementById('featFood');
    const rh = document.getElementById('routeIncludeHotel');
    const rf = document.getElementById('routeIncludeFood');
    if (h && rh) rh.checked = h.checked;
    if (f && rf) rf.checked = f.checked;
    if (typeof recalcRouteEstimate === 'function') recalcRouteEstimate();
  };

  window.applyFeatToRouteBuilder = function () {
    const days = document.getElementById('featDays')?.value;
    const group = document.getElementById('featGroup')?.value;
    if (days && document.getElementById('routeDays')) {
      document.getElementById('routeDays').value = days;
    }
    if (group && document.getElementById('routePassengers')) {
      document.getElementById('routePassengers').value = group;
    }
    window.syncFeatCustomize();
  };

  // boot
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
})();
