/* feelit-extras.js — load AFTER feelit-upgrade.js (index.html only):
   <script src="feelit-extras.js"></script>
   Adds: family + high-altitude safety section, sample GPS tracker, weather effects in the tour modal.
   Lag-safe: the tracker ticks every 2.6s and pauses off-screen / in background tabs;
   weather effects are ≤22 GPU-only CSS elements and respect "reduce motion". */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: ignore */ } }
  };

  document.head.insertAdjacentHTML('beforeend', `<style>
    .fi-fam{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;align-items:start}
    .fi-fam p,.fi-fam li{font-size:14px;color:var(--ink-soft);line-height:1.7}
    .fi-fam h3{color:var(--primary);margin:0 0 8px}
    .fi-fam ul{padding-left:18px;margin:0 0 16px}
    .fi-track{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);padding:16px}
    .fi-track-h{display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:8px}
    .fi-track-h small{margin-left:auto;color:var(--ink-soft);font-weight:400}
    .fi-live{width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 0 0 rgba(16,185,129,.6);animation:fiPulse 2s infinite}
    @keyframes fiPulse{70%{box-shadow:0 0 0 8px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}
    .fi-track svg{width:100%;height:auto;display:block}
    .fi-dot{transition:transform 2.4s linear;fill:var(--primary);filter:drop-shadow(0 0 4px var(--primary-glow))}
    .fi-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;font-size:12px;color:var(--ink-soft)}
    .fi-stats b{display:block;color:var(--ink);font-size:15px}
    .fi-fx{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;border-radius:inherit;opacity:.55}
    .fi-fx i{position:absolute;top:-20px;display:block;will-change:transform;animation:fiFall linear infinite}
    .fi-rain i{width:1px;height:16px;background:rgba(148,197,255,.7)}
    .fi-snow i{width:5px;height:5px;border-radius:50%;background:#fff}
    .fi-fog{background:linear-gradient(180deg,rgba(203,213,225,.22),rgba(203,213,225,.03));animation:fiDrift 12s ease-in-out infinite alternate}
    .fi-clear{background:radial-gradient(circle at 88% 0,rgba(250,204,21,.28),transparent 45%)}
    @keyframes fiFall{to{transform:translate3d(-24px,110vh,0)}}
    @keyframes fiDrift{to{transform:translateX(4%)}}
    @media (prefers-reduced-motion:reduce){.fi-fx,.fi-fx i,.fi-live{animation:none!important}}
  </style>`);

  /* ---- Family + high-altitude safety section (inserted after #safety) ---- */
  const safety = $('safety');
  if (safety) {
    safety.insertAdjacentHTML('afterend', `
    <section id="family" style="background:var(--bg);border-top:1px solid var(--line);border-bottom:1px solid var(--line);">
      <div class="wrap">
        <div class="section-head">
          <h2>For parents &amp; family</h2>
          <p>You shouldn’t have to wonder where your loved one is. Here is exactly how we keep you informed.</p>
        </div>
        <div class="fi-fam">
          <div>
            <h3>How we keep you in the loop</h3>
            <ul>
              <li>Before departure you get the route plan: overnight stops, altitude profile, nearest medical post and your rider’s name.</li>
              <li>Riders send a status message at agreed check-in times. On remote passes without mobile coverage, we use satellite check-ins.</li>
              <li>If a check-in is missed, our team calls the rider, then the next checkpoint, and reaches you directly — before you have to ask.</li>
              <li>Message us any time on <a href="https://wa.me/${CONTACT_INFO.whatsapp}" target="_blank" rel="noopener" style="color:var(--primary);">WhatsApp</a>; a real person answers.</li>
            </ul>
            <h3>High-altitude safety protocol</h3>
            <ul>
              <li>Routes above 3,000 m include acclimatisation time; we never compress the schedule to hit a destination.</li>
              <li>Riders monitor every traveller for altitude sickness (headache, nausea, dizziness, unusual fatigue). If symptoms appear, the group stops, and if they persist, descends.</li>
              <li>Medical evacuation is coordinated by our logistics partners, with helicopter extraction where terrain requires it. Travel insurance that covers high-altitude evacuation is required on these routes.</li>
              <li>Weather, road and landslide conditions are checked each morning; we change the day’s plan rather than the safety margin.</li>
            </ul>
          </div>
          <div class="fi-track" id="fiTrack">
            <div class="fi-track-h"><span class="fi-live"></span>Live tracking preview<small>sample data</small></div>
            <svg viewBox="0 0 300 120" role="img" aria-label="Sample route profile with a moving rider marker">
              <polyline points="10,100 40,88 75,80 105,60 140,64 175,40 210,46 245,26 290,14" fill="none" stroke="var(--line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <circle class="fi-dot" id="fiDot" r="5" cx="0" cy="0" style="transform:translate(10px,100px)"/>
            </svg>
            <div class="fi-stats">
              <div>Altitude<b id="fiAlt">1,400 m</b></div>
              <div>Speed<b id="fiSpd">— km/h</b></div>
              <div>Last check-in<b id="fiSeen">—</b></div>
            </div>
          </div>
        </div>
      </div>
    </section>`);

    const P = [[10, 100, 1400], [40, 88, 1900], [75, 80, 2500], [105, 60, 3000], [140, 64, 3400], [175, 40, 3700], [210, 46, 3500], [245, 26, 3800], [290, 14, 3840]];
    const dot = $('fiDot');
    let i = 0, timer = null, visible = false;
    const step = () => {
      i = (i + 1) % P.length;
      const [x, y, a] = P[i];
      dot.style.transform = `translate(${x}px,${y}px)`;
      $('fiAlt').textContent = (a + Math.round(Math.random() * 20 - 10)).toLocaleString('en-US') + ' m';
      $('fiSpd').textContent = (18 + Math.floor(Math.random() * 16)) + ' km/h';
      $('fiSeen').textContent = 'Just now';
    };
    const sync = () => {
      clearInterval(timer);
      timer = visible && !document.hidden && !reduce ? setInterval(step, 2600) : null;
    };
    new IntersectionObserver(e => { visible = e[0].isIntersecting; sync(); }).observe($('fiTrack'));
    document.addEventListener('visibilitychange', sync);
  }

  /* ---- Weather effects in the tour modal ----
     Admin/testing:  feelitFx.off() / feelitFx.on()  ·  feelitFx.preview('snow'|'rain'|'fog'|'clear')
     or open the site with ?fx=snow to force a preview. */
  const wxCache = new Map();
  async function weatherKind(lat, lng) {
    const k = lat.toFixed(1) + ',' + lng.toFixed(1);
    if (!wxCache.has(k)) {
      wxCache.set(k, fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
        .then(r => r.json()).then(d => d.current_weather ? d.current_weather.weathercode : null).catch(() => null));
    }
    const c = await wxCache.get(k);
    if (c == null) return null;
    if ([71, 73, 75, 77, 85, 86].includes(c)) return 'snow';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(c)) return 'rain';
    if ([45, 48].includes(c)) return 'fog';
    return c <= 1 ? 'clear' : null;
  }

  function paint(kind) {
    const m = $('modalContent');
    if (!m) return;
    m.querySelectorAll('.fi-fx').forEach(el => el.remove());
    if (!kind) return;
    if (getComputedStyle(m).position === 'static') m.style.position = 'relative';
    const n = kind === 'rain' ? 22 : kind === 'snow' ? 16 : 0;
    let bits = '';
    for (let j = 0; j < n; j++) {
      const dur = kind === 'rain' ? 0.9 + (j % 4) * 0.15 : 5 + (j % 5);
      bits += `<i style="left:${(j * 97) % 100}%;animation-delay:-${((j * 0.37) % 3).toFixed(2)}s;animation-duration:${dur}s"></i>`;
    }
    m.insertAdjacentHTML('afterbegin', `<div class="fi-fx fi-${kind}" aria-hidden="true">${bits}</div>`);
  }

  window.feelitFx = {
    on: () => store.set('fi_fx', 'on'),
    off: () => { store.set('fi_fx', 'off'); paint(null); },
    preview: kind => paint(kind)
  };

  // Site-wide switch set in Admin › Tours (site_settings table); missing table/row = effects on.
  let fxOffP;
  const fxOff = () => fxOffP || (fxOffP = (async () => {
    try {
      const { data } = await supabaseClient.from('site_settings').select('value').eq('key', 'weather_fx').maybeSingle();
      return !!data && data.value === 'off';
    } catch { return false; }
  })());

  const _open = window.openTour;
  window.openTour = function (id) {
    _open(id);
    if (store.get('fi_fx') === 'off') return;
    const t = tours.find(x => x.id === id), m = $('modalContent');
    if (!t || !t.lat || !t.lng || !m) return;
    const marker = m.firstElementChild; // replaced if the modal re-renders, so a late reply never paints the wrong screen
    const forced = new URLSearchParams(location.search).get('fx');
    Promise.all([fxOff(), forced ? Promise.resolve(forced) : weatherKind(+t.lat, +t.lng)]).then(([off, kind]) => {
      if (!off && kind && $('modalContent').firstElementChild === marker) paint(kind);
    });
  };
})();
