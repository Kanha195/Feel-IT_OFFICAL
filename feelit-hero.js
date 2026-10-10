/* feelit-hero.js — load LAST after script.js + feelit-extras.js */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  const HQ_LAT = 27.7410, HQ_LNG = 85.3360; // Basundhara / Kathmandu HQ

  function fiWeatherIcon(code) {
    const c = Number(code);
    const h = (() => { try { return new Date().getHours(); } catch (e) { return 12; } })();
    const night = h < 6 || h >= 19;

    if (c === 0) return night ? '🌙' : '☀️';
    if (c === 1) return night ? '🌙' : '🌤️';
    if (c === 2) return night ? '☁️' : '⛅';
    if (c === 3) return '☁️';

    // Fog
    if (c === 45) return '🌫️';
    if (c === 48) return '🌃';

    // Rain / drizzle
    if (c === 51) return '🌦️';
    if (c === 53) return '🌦️';
    if (c === 55) return '🌧️';
    if (c === 56) return '🌨️';
    if (c === 57) return '🌨️';
    if (c === 61) return '🌧️';
    if (c === 63) return '🌧️';
    if (c === 65) return '💧';
    if (c === 66) return '🌨️';
    if (c === 67) return '🧊';
    if (c === 80) return '🌦️';
    if (c === 81) return '🌧️';
    if (c === 82) return '⛈️';

    // Snow
    if (c === 71) return '🌨️';
    if (c === 73) return '❄️';
    if (c === 75) return '☃️';
    if (c === 77) return '🌨️';
    if (c === 85) return '🌨️';
    if (c === 86) return '❄️';

    // Thunder
    if (c === 95) return '⛈️';
    if (c === 96) return '⛈️';
    if (c === 99) return '🌩️';

    return '🌡️';
  }
  function fiWeatherLabel(code) {
    const c = Number(code);
    const map = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Rime fog',
      51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
      56: 'Freezing drizzle', 57: 'Heavy freezing drizzle',
      61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
      66: 'Freezing rain', 67: 'Heavy freezing rain',
      71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
      80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
      85: 'Snow showers', 86: 'Heavy snow showers',
      95: 'Thunderstorm', 96: 'Storm + hail', 99: 'Severe storm'
    };
    return map[c] || 'Live weather';
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
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=10',
        { headers: { Accept: 'application/json' } }
      );
      if (!r.ok) return null;
      const j = await r.json();
      const a = j.address || {};
      return a.city || a.town || a.village || a.county || a.state || null;
    } catch (e) { return null; }
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
        lat = loc.lat; lng = loc.lng; place = 'Your location';
        const name = await fiReverseName(lat, lng);
        if (name) place = name;
      }
    } catch (e) {}

    if ($('fiWeatherLoc')) $('fiWeatherLoc').textContent = place;

    try {
      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation' +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code' +
        '&timezone=auto&forecast_days=2';

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
      if ($('fiWeatherHum')) $('fiWeatherHum').textContent = c.relative_humidity_2m != null ? Math.round(c.relative_humidity_2m) + '%' : '—';
      if ($('fiWeatherWind')) $('fiWeatherWind').textContent = c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) + ' km/h' : '—';
      if ($('fiWeatherFeels')) $('fiWeatherFeels').textContent = c.apparent_temperature != null ? Math.round(c.apparent_temperature) + '°' : '—';

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
        temp: c.temperature_2m, feels: c.apparent_temperature,
        humidity: c.relative_humidity_2m, wind: c.wind_speed_10m,
        windDir: c.wind_direction_10m, precip: c.precipitation,
        code, kind, label, icon, lat, lng, place, updatedAt: Date.now()
      };
      window.dispatchEvent(new CustomEvent('fi-weather-updated', { detail: window.__fiWeather }));
      el.setAttribute('data-weather-kind', kind || 'unknown');
      el.classList.add('fi-weather-live');
    } catch (e) {
      console.warn('Weather API failed', e);
      const textEl = el.querySelector('.hero-weather-text');
      if (textEl && /checking/i.test(textEl.textContent || '')) textEl.textContent = 'Weather unavailable';
    }
  }

  function startWeatherLoop() {
    fillWeatherChip();
    if (window.__fiWeatherTimer) clearInterval(window.__fiWeatherTimer);
    window.__fiWeatherTimer = setInterval(fillWeatherChip, 15 * 60 * 1000);
  }

  function fillTrust() {}
  function fillRegions() {
    const sel = $('fiPlanRegion');
    if (!sel || typeof tours === 'undefined') return;
    const regions = [...new Set(tours.map(t => t.region).filter(Boolean))].sort();
    if (!regions.length) return;
    const current = sel.value;
    sel.innerHTML = '<option value="All">All regions</option>' +
      regions.map(r => '<option value="' + esc(r) + '">' + esc(r) + '</option>').join('');
    if (current) sel.value = current;
  }

  function fillPopular() {
    const host = $('fiPopularStrip');
    if (!host || typeof tours === 'undefined') return;
    if (!tours.length) {
      host.innerHTML = '<div class="empty-state">Tours will appear here once published.</div>';
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
    host.innerHTML = list.map(t => {
      const title = esc(t.title || t.name || 'Tour');
      const price = t.price != null ? 'NPR ' + Number(t.price).toLocaleString() : '';
      const img = esc(t.image || t.photo || 'assets/1.png');
      const id = esc(String(t.id));
      return '<article class="popular-card" data-tour-id="' + id + '">' +
        '<div class="popular-card-media"><img src="' + img + '" alt="' + title + '" loading="lazy"></div>' +
        '<div class="popular-card-body"><h3>' + title + '</h3><p class="price">' + price + '</p>' +
        '<button type="button" class="btn btn-primary" data-book="' + id + '">Book now</button></div></article>';
    }).join('');
    host.querySelectorAll('[data-book]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof openBooking === 'function') openBooking(btn.getAttribute('data-book'));
      });
    });
  }

  function fillReviews() {}
  function esc(s) {
    return String(s == null ? '' : s)
      .split('&').join('&' + 'amp;')
      .split('<').join('&' + 'lt;')
      .split('>').join('&' + 'gt;')
      .split('"').join('&' + 'quot;');
  }

  function jumpToMiddle() {}
  window.syncFeatCustomize = window.syncFeatCustomize || function () {};
  window.applyFeatToRouteBuilder = window.applyFeatToRouteBuilder || function () {};

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
