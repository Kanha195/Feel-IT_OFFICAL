/* feelit-hero.js — load LAST in index.html, after feelit-admin-route.js:
   <script src="feelit-hero.js"></script>
   Fills in the redesigned hero: live weather chip, "plan your ride" quick
   finder, a real-data popular-routes strip, trust badges, and a homepage
   aggregate of REAL reviews (empty state if none yet — nothing here is
   fabricated; the review system itself already lives in script.js and just
   needed the `reviews` table, see feelit-reviews.sql). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  /* ---- Weather chip: reuses feelit-extras.js's location + script.js's
     existing fetchWeatherFor()/weatherIcon()/weatherLabel() — no new API code. */
  const HQ_LAT = 27.7410, HQ_LNG = 85.3360;
  async function fillWeatherChip() {
    const el = $('fiWeatherWidget');
    if (!el) return;
    const timeout = new Promise(res => setTimeout(() => res(null), 6500));
    const loc = window.fiGetLocation ? await Promise.race([window.fiGetLocation(), timeout]) : null;
    const { lat, lng } = loc || { lat: HQ_LAT, lng: HQ_LNG };
    const locLabel = loc ? 'Your location' : 'Kathmandu';
    if ($('fiWeatherLoc')) $('fiWeatherLoc').textContent = locLabel;

    // Prefer full Open-Meteo payload for the rich card
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      const c = data.current;
      if (c) {
        const code = c.weather_code;
        const icon = (typeof weatherIcon === 'function') ? weatherIcon(code) : '🌡️';
        const label = (typeof weatherLabel === 'function') ? weatherLabel(code) : 'Weather';
        const iconEl = el.querySelector('.hero-weather-icon');
        const textEl = el.querySelector('.hero-weather-text');
        if (iconEl) iconEl.textContent = icon;
        if (textEl) textEl.textContent = label;
        if ($('fiWeatherTemp')) $('fiWeatherTemp').textContent = Math.round(c.temperature_2m) + '°';
        if ($('fiWeatherHum')) $('fiWeatherHum').textContent = (c.relative_humidity_2m != null ? c.relative_humidity_2m + '%' : '—');
        if ($('fiWeatherWind')) $('fiWeatherWind').textContent = (c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) + ' km/h' : '—');
        if ($('fiWeatherFeels')) $('fiWeatherFeels').textContent = (c.apparent_temperature != null ? Math.round(c.apparent_temperature) + '°' : '—');
        // Expose wind for the floating lamp in feelit-extras
        window.__fiWindKmh = Number(c.wind_speed_10m) || 0;
        window.dispatchEvent(new CustomEvent('fi-weather-updated', { detail: { wind: window.__fiWindKmh, code } }));
        return;
      }
    } catch (e) { /* fall through */ }

    if (typeof fetchWeatherFor === 'function') {
      const text = await fetchWeatherFor(lat, lng);
      const textEl = el.querySelector('.hero-weather-text');
      if (textEl) textEl.textContent = text ? text.replace(/^\S+\s/, '') : "Weather's unavailable right now";
      const iconMatch = text && text.match(/^\S+/);
      const iconEl = el.querySelector('.hero-weather-icon');
      if (iconMatch && iconEl) iconEl.textContent = iconMatch[0];
    }
  }
  fillWeatherChip();

  /* ---- Trust badges: real, non-numeric-fabricated claims only. Tour count
     is the actual length of your live `tours` array. ---- */
  function fillTrust() {
    const el = $('fiHeroTrust');
    if (!el || typeof tours === 'undefined') return;
    el.innerHTML = [
      `🏍️ ${tours.length} guided route${tours.length === 1 ? '' : 's'}`,
      '🪖 Certified local riders',
      '🛡️ Every payment manually verified',
      '📡 24/7 WhatsApp support'
    ].map(t => `<span>${t}</span>`).join('');
  }

  /* ---- "Plan your ride": populates the region dropdown from real tour data,
     and on submit reuses script.js's own setFilter() + scrolls to #tours. ---- */
  let regionsFilled = false;
  function fillRegions() {
    const sel = $('fiPlanRegion');
    if (!sel || regionsFilled || typeof tours === 'undefined' || !tours.length) return;
    const regions = [...new Set(tours.map(t => t.region).filter(Boolean))].sort();
    sel.insertAdjacentHTML('beforeend', regions.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join(''));
    regionsFilled = true;
  }
  $('fiPlanGo')?.addEventListener('click', () => {
    const region = $('fiPlanRegion').value;
    if (typeof setFilter === 'function') setFilter(region);
    document.getElementById('tours')?.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---- Popular routes strip: the first few tours from your real data,
     same photos/prices/links as the main grid — nothing invented. ---- */
  function fillPopular() {
    const host = $('fiPopularStrip');
    if (!host || typeof tours === 'undefined') return;
    if (!tours.length) { host.innerHTML = '<div class="empty-state">Add tours in Admin to see them here.</div>'; return; }
    host.innerHTML = tours.slice(0, 8).map(t => `
      <div class="popular-card" onclick="openTour('${esc(t.id)}')">
        ${t.imageUrl ? imgTag(t.imageUrl, t.title, '') : `<div class="popular-card-body" style="padding-top:40px;text-align:center;color:var(--ink-soft);">📷</div>`}
        <div class="popular-card-body">
          <div class="popular-card-region">${esc(t.region)}</div>
          <h4 class="popular-card-title">${esc(t.title)}</h4>
          <div class="popular-card-price">${fmtNPR(t.price)} / person</div>
        </div>
      </div>`).join('');
  }

  // tours load asynchronously; both of the above need it, so chain onto renderTours
  // (already wrapped once by feelit-upgrade.js — this just adds one more link).
  const _renderTours = window.renderTours;
  window.renderTours = function () {
    _renderTours();
    fillTrust();
    fillRegions();
    fillPopular();
  };

  /* ---- Homepage "Rider stories": a real aggregate across all tours, pulled
     straight from the `reviews` table. If it's empty (or the table doesn't
     exist yet — see feelit-reviews.sql), this says so honestly instead of
     showing anything invented. ---- */
  async function fillReviews() {
    const host = $('fiReviewsGrid');
    if (!host) return;
    try {
      const { data, error } = await supabaseClient
        .from('reviews').select('*').order('created_at', { ascending: false }).limit(6);
      if (error) throw error;
      if (!data || !data.length) {
        host.innerHTML = '<div class="empty-state">No reviews yet — they\'ll appear here the moment a rider posts one on their tour page.</div>';
        return;
      }
      host.innerHTML = data.map(r => {
        const t = (typeof tours !== 'undefined' ? tours.find(x => x.id === r.tour_id) : null);
        return `<div class="review-card">
          <span class="stars">${typeof starsHtml === 'function' ? starsHtml(r.rating) : '★'.repeat(r.rating)}</span>
          <p>“${esc(r.body)}”</p>
          <div class="review-who">${esc(r.name || 'Traveler')}</div>
          ${t ? `<div class="review-tour">${esc(t.title)}</div>` : ''}
        </div>`;
      }).join('');
    } catch (e) {
      host.innerHTML = '<div class="empty-state">Reviews aren\'t set up yet — run feelit-reviews.sql in Supabase, then reload.</div>';
    }
  }
  fillReviews();
})();
