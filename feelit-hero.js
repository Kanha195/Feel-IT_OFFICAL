/* feelit-hero.js — load LAST after script.js + feelit-extras.js */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  const HQ_LAT = 27.7410, HQ_LNG = 85.3360; // Basundhara / Kathmandu HQ

  /** WMO weather codes → icon + short label (Open-Meteo) */
  function fiWeatherIcon(code) {
    const c = Number(code);
    if (c === 0) return '☀️';
    if (c === 1) return '🌤️';
    if (c === 2) return '⛅';
    if (c === 3) return '☁️';
    if (c === 45 || c === 48) return '🌫️';
    if ([51, 53, 55, 56, 57].includes(c)) return '🌦️';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return '🌧️';
    if ([71, 73, 75, 77, 85, 86].includes(c)) return '❄️';
    if ([95, 96, 99].includes(c)) return '⛈️';
    return '🌡️';
  }
  function fiWeatherLabel(code) {
    const c = Number(code);
    if (c === 0) return 'Clear sky';
    if (c === 1) return 'Mainly clear';
    if (c === 2) return 'Partly cloudy';
    if (c === 3) return 'Overcast';
    if (c === 45 || c === 48) return 'Fog';
    if ([51, 53, 55].includes(c)) return 'Drizzle';
    if ([56, 57].includes(c)) return 'Freezing drizzle';
    if ([61, 63, 65].includes(c)) return 'Rain';
    if ([66, 67].includes(c)) return 'Freezing rain';
    if ([71, 73, 75, 77].includes(c)) return 'Snow';
    if ([80, 81, 82].includes(c)) return 'Rain showers';
    if ([85, 86].includes(c)) return 'Snow showers';
    if ([95, 96, 99].includes(c)) return 'Thunderstorm';
    return 'Live weather';
  }
  function fiWeatherKind(code) {
    const c = Number(code);
    if ([95, 96, 99].includes(c)) return 'thunder';
    if ([71, 73, 75, 77, 85, 86].includes(c)) return 'snow';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return 'rain';
    if ([45, 48].includes(c)) return 'fog';
    if (c <= 1) return 'clear';
    if (c <= 3) return 'clouds';
    return null;
  }

  async function fiReverseName(lat, lng) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
        { headers: { Accept: 'application/json' } }
      );
      if (!r.ok) return null;
      const j = await r.json();
      const a = j.address || {};
      return a.city || a.town || a.village || a.county || a.state || null;
    } catch (e) {
      return null;
    }
  }

  async function fillWeatherChip() {
    const el = $('fiWeatherWidget');
    if (!el) return;

    let lat = HQ_LAT, lng = HQ_LNG, place = 'Kathmandu';
    try {
      const timeout = new Promise(res => setTimeout(() => res(null), 5000));
      const loc = window.fiGetLocation
        ? await Promise.race([window.fiGetLocation(), timeout])
        : null;
      if (loc && loc.lat != null && loc.lng != null) {
        lat = loc.lat;
        lng = loc.lng;
        place = 'Your location';
        const name = await fiReverseName(lat, lng);
        if (name) place = name;
      }
    } catch (e) {}

    if ($('fiWeatherLoc')) $('fiWeatherLoc').textContent = place;

    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
        `&timezone=auto&forecast_days=2`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
      const data = await res.json();
      const c = data.current;
      if (!c) throw new Error('No current weather');

      const code = c.weather_code;
      const icon = (typeof weatherIcon === 'function' ? weatherIcon(code) : null) || fiWeatherIcon(code);
      const label = (typeof weatherLabel === 'function' ? weatherLabel(code) : null) || fiWeatherLabel(code);
      const kind = fiWeatherKind(code);

      const iconEl = el.querySelector('.hero-weather-icon');
      const textEl = el.querySelector('.hero-weather-text');
      if (iconEl) iconEl.textContent = icon;
      if (textEl) textEl.textContent = label;

      if ($('fiWeatherTemp')) $('fiWeatherTemp').textContent = Math.round(c.temperature_2m) + '°';
      if ($('fiWeatherHum')) {
        $('fiWeatherHum').textContent =
          c.relative_humidity_2m != null ? Math.round(c.relative_humidity_2m) + '%' : '—';
      }
      if ($('fiWeatherWind')) {
        $('fiWeatherWind').textContent =
          c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) + ' km/h' : '—';
      }
      if ($('fiWeatherFeels')) {
        $('fiWeatherFeels').textContent =
          c.apparent_temperature != null ? Math.round(c.apparent_temperature) + '°' : '—';
      }

      try {
        const d = data.daily;
        if (d && d.temperature_2m_max && d.temperature_2m_max[0] != null) {
          const hi = Math.round(d.temperature_2m_max[0]);
          const lo = Math.round(d.temperature_2m_min[0]);
          const hiEl = $('fiWeatherHi') || el.querySelector('[data-wx-hi]');
          const loEl = $('fiWeatherLo') || el.querySelector('[data-wx-lo]');
          if (hiEl) hiEl.textContent = hi + '°';
          if (loEl) loEl.textContent = lo + '°';
        }
      } catch (e) {}

      window.__fiWindKmh = Number(c.wind_speed_10m) || 0;
      window.__fiWeatherCode = code;
      window.__fiWeatherKind = kind;
      window.__fiWeather = {
        temp: c.temperature_2m,
        feels: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        wind: c.wind_speed_10m,
        windDir: c.wind_direction_10m,
        precip: c.precipitation,
        code,
        kind,
        label,
        icon,
        lat,
        lng,
        place,
        updatedAt: Date.now()
      };

      window.dispatchEvent(
        new CustomEvent('fi-weather-updated', {
          detail: window.__fiWeather
        })
      );

      el.setAttribute('data-weather-kind', kind || 'unknown');
      el.classList.add('fi-weather-live');
    } catch (e) {
      console.warn('Weather API failed', e);
      const textEl = el.querySelector('.hero-weather-text');
      if (textEl && /checking/i.test(textEl.textContent || '')) {
        textEl.textContent = 'Weather unavailable';
      }
    }
  }

  function startWeatherLoop() {
    fillWeatherChip();
    if (window.__fiWeatherTimer) clearInterval(window.__fiWeatherTimer);
    window.__fiWeatherTimer = setInterval(fillWeatherChip, 15 * 60 * 1000);
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

    if (!list.length) {
      list = tours.filter(t => t.featured || t.popular).slice(0, 12);
      if (!list.length) list = tours.slice(0, 8);
    }

    const escFn = typeof esc === 'function' ? esc : s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[m]));

    host.innerHTML = list.map(t => {
      const title = escFn(t.title || t.name || 'Tour');
      const price = t.price != null ? 'NPR ' + Number(t.price).toLocaleString() : '';
      const img = escFn(t.image || t.photo || 'assets/1.png');
      const id = escFn(t.id);
      return `<article class="popular-card" data-tour-id="${id}">
        <div class="popular-card-media"><img src="${img}" alt="${title}" loading="lazy"></div>
        <div class="popular-card-body"><h3>${title}</h3><p class="price">${price}</p>
        <button type="button" class="btn btn-primary" onclick="typeof openBooking==='function'&&openBooking('${id}')">Book now</button></div>
      </article>`;
    }).join('');
  }

  function fillReviews() {
    /* reviews static or loaded elsewhere */
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  // Infinite popular strip helpers (safe no-ops if missing DOM)
  function jumpToMiddle() {}
  window.syncFeatCustomize = window.syncFeatCustomize || function () {};
  window.applyFeatToRouteBuilder = window.applyFeatToRouteBuilder || function () {};

  // boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startWeatherLoop();
      fillReviews();
      if (typeof tours !== 'undefined' && tours.length) fillPopular();
    });
  } else {
    startWeatherLoop();
    fillReviews();
    if (typeof tours !== 'undefined' && tours.length) fillPopular();
  }
})();
