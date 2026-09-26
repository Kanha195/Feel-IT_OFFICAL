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
        // Map code to kind for lamp + FX consistency
        let kind = null;
        if([95,96,99].includes(code)) kind = 'thunder';
        else if([71,73,75,77,85,86].includes(code)) kind = 'snow';
        else if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) kind = 'rain';
        else if([45,48].includes(code)) kind = 'fog';
        else if(code <= 1) kind = 'clear';
        window.__fiWeatherKind = kind;
        window.dispatchEvent(new CustomEvent('fi-weather-updated', { detail: { wind: window.__fiWindKmh, code, kind } }));
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
    if (!tours.length) { host.innerHTML = '<div class="empty-state">Tours will appear here once published.</div>'; return; }
    // Admin-controlled featured list (Operations → Featured)
    let list = [];
    try {
      const ids = (typeof loadFeaturedIds === 'function') ? loadFeaturedIds() : [];
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
        ? `<div class="popular-card-media">${imgTag(t.imageUrl, t.title, 'popular-card-img', `style="object-position:${pos};transform:scale(${zoom/100});transform-origin:${pos};"`)}</div>`
        : `<div class="popular-card-media popular-card-media-empty">📷</div>`;
      return `
      <div class="popular-card${clone ? ' popular-card-clone' : ''}" data-tour-id="${esc(t.id)}" onclick="openTour('${esc(t.id)}')">
        ${media}
        <div class="popular-card-body">
          <div class="popular-card-region">${esc(t.region)}</div>
          <h4 class="popular-card-title">${esc(t.title)}</h4>
          <div class="popular-card-price">${fmtNPR(t.price)} / person</div>
        </div>
      </div>`;
    };
    // Triple the set so we can jump between copies for a seamless infinite loop
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

  function bindPopularNav(itemCount){
    const strip = $('fiPopularStrip');
    const left = $('fiPopLeft');
    const right = $('fiPopRight');
    if(!strip || !left || !right) return;

    // Always enable arrows for infinite loop (unless 0–1 cards)
    left.disabled = false;
    right.disabled = false;
    if (!itemCount || itemCount <= 1) {
      left.disabled = true;
      right.disabled = true;
      return;
    }

    let locked = false; // prevent jump thrashing mid-scroll

    const oneSetWidth = () => {
      // Middle copy starts after the first clone set
      const cards = strip.querySelectorAll('.popular-card');
      if (cards.length < itemCount * 2) return strip.scrollWidth / 3;
      const first = cards[0];
      const mid = cards[itemCount];
      return mid.offsetLeft - first.offsetLeft;
    };

    const jumpToMiddle = () => {
      const w = oneSetWidth();
      if (w > 0) strip.scrollLeft = w;
    };

    const step = () => {
      const card = strip.querySelector('.popular-card');
      if (card) return Math.round(card.offsetWidth + 14); // card + gap
      return Math.max(200, Math.floor(strip.clientWidth * 0.7));
    };

    // Keep the viewport inside the middle copy; when it drifts into a clone set, snap without animation
    const maintainLoop = () => {
      if (locked) return;
      const w = oneSetWidth();
      if (w <= 0) return;
      const x = strip.scrollLeft;
      // Near the end of the third set → jump back one set
      if (x >= w * 2 - 8) {
        locked = true;
        strip.scrollLeft = x - w;
        requestAnimationFrame(() => { locked = false; });
      }
      // Near the start of the first set → jump forward one set
      else if (x <= 8) {
        locked = true;
        strip.scrollLeft = x + w;
        requestAnimationFrame(() => { locked = false; });
      }
    };

    left.onclick = (e) => {
      e.preventDefault();
      strip.scrollBy({ left: -step(), behavior: 'smooth' });
    };
    right.onclick = (e) => {
      e.preventDefault();
      strip.scrollBy({ left: step(), behavior: 'smooth' });
    };

    strip.addEventListener('scroll', maintainLoop, { passive: true });
    // After layout: start on the middle copy so both directions loop
    requestAnimationFrame(() => {
      jumpToMiddle();
      setTimeout(jumpToMiddle, 80);
      setTimeout(jumpToMiddle, 250);
    });
    window.addEventListener('resize', () => {
      jumpToMiddle();
    });
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


  window.syncFeatCustomize = function(){
    // mirror into route builder checkboxes when present
    const h = document.getElementById('featHotel');
    const f = document.getElementById('featFood');
    const rh = document.getElementById('routeIncludeHotel');
    const rf = document.getElementById('routeIncludeFood');
    if(h && rh) rh.checked = h.checked;
    if(f && rf) rf.checked = f.checked;
    if(typeof recalcRouteEstimate === 'function') recalcRouteEstimate();
  };
  window.applyFeatToRouteBuilder = function(){
    const days = document.getElementById('featDays')?.value;
    const group = document.getElementById('featGroup')?.value;
    if(days && document.getElementById('routeDays')) document.getElementById('routeDays').value = days;
    if(group && document.getElementById('routePassengers')) document.getElementById('routePassengers').value = group;
    window.syncFeatCustomize();
  };
})();
