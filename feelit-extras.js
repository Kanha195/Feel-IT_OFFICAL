/* feelit-extras.js — load AFTER feelit-upgrade.js (index.html only):
   <script src="feelit-extras.js"></script>
   Adds: family + high-altitude safety section, sample GPS tracker, weather effects */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } }
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

    /* ---- Weather effects ---- */
    .fi-fx{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;border-radius:inherit;opacity:.6}
    .fi-fx.fi-fog{opacity:.85}
    .fi-fx .fi-drop{position:absolute;top:-24px;width:1.5px;border-radius:2px;
      background:linear-gradient(rgba(190,215,255,0),rgba(190,215,255,.8));
      transform:rotate(9deg);animation-name:fiRainFall;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform}
    .fi-fx.fi-thunder .fi-drop{background:linear-gradient(rgba(214,196,255,0),rgba(214,196,255,.85))}
    @keyframes fiRainFall{to{transform:translate3d(-20px,130%,0) rotate(9deg)}}

    .fi-fx .fi-flake{position:absolute;top:-12px;border-radius:50%;
      background:radial-gradient(circle,#fff,rgba(255,255,255,.55) 70%);
      animation-name:fiSnowFall,fiSnowSway;animation-timing-function:linear,ease-in-out;
      animation-iteration-count:infinite,infinite;animation-direction:normal,alternate;will-change:transform}
    @keyframes fiSnowFall{to{transform:translateY(130%)}}
    @keyframes fiSnowSway{from{margin-left:-12px}to{margin-left:12px}}

    .fi-fx.fi-fog{background:linear-gradient(180deg,rgba(203,213,225,.14),rgba(203,213,225,.03))}
    .fi-fx .fi-cloud{position:absolute;left:-35%;height:46%;border-radius:50%;
      background:radial-gradient(ellipse,rgba(226,232,240,.85),rgba(226,232,240,0) 70%);
      filter:blur(18px);animation:fiCloudDrift linear infinite;will-change:transform}
    @keyframes fiCloudDrift{to{transform:translateX(165%)}}

    .fi-fx.fi-clear{background:radial-gradient(circle at 88% 0,rgba(250,204,21,.28),transparent 45%)}
    .fi-fx.fi-thunder{background:linear-gradient(180deg,rgba(76,29,149,.4),rgba(12,4,26,.6))}
    .fi-fx .fi-bolt{position:absolute;inset:0;opacity:0;mix-blend-mode:screen;
      background:radial-gradient(ellipse at 30% -10%,rgba(232,224,255,.95),transparent 55%)}
    .fi-fx .fi-bolt.fi-bolt-on{animation:fiBoltPulse .22s ease-out}
    .fi-fx .fi-flash{position:absolute;inset:0;background:#f5f0ff;opacity:0;mix-blend-mode:overlay}
    .fi-fx .fi-flash.fi-flash-on{animation:fiFlashPulse .22s ease-out}
    @keyframes fiBoltPulse{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
    @keyframes fiFlashPulse{0%{opacity:0}15%{opacity:.8}100%{opacity:0}}
    @media (prefers-reduced-motion:reduce){.fi-fx *,.fi-fx,.fi-live{animation:none!important}}
  </style>`);

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
      $('fiSpd').textContent = (18 + Math.floor(Math.random() * 16)) + ' km/h';$('fiSeen').textContent = 'Just now';
    };
    const sync = () => {
      clearInterval(timer);
      timer = visible && !document.hidden && !reduce ? setInterval(step, 2600) : null;
    };
    new IntersectionObserver(e => { visible = e[0].isIntersecting; sync(); }).observe($('fiTrack'));
    document.addEventListener('visibilitychange', sync);
  }

  const wxCache = new Map();
  async function weatherKind(lat, lng) {
    const k = lat.toFixed(1) + ',' + lng.toFixed(1);
    if (!wxCache.has(k)) {
      wxCache.set(k, fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
        .then(r => r.json()).then(d => d.current_weather ? d.current_weather.weathercode : null).catch(() => null));
    }
    const c = await wxCache.get(k);
    if (c == null) return null;
    if ([95, 96, 99].includes(c)) return 'thunder';
    if ([71, 73, 75, 77, 85, 86].includes(c)) return 'snow';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return 'rain';
    if ([45, 48].includes(c)) return 'fog';
    return c <= 1 ? 'clear' : null;
  }

  function buildBits(kind, big) {
    if (kind === 'rain' || kind === 'thunder') {
      const n = big ? (kind === 'thunder' ? 30 : 24) : (kind === 'thunder' ? 24 : 18);
      let out = '';
      for (let j = 0; j < n; j++) {
        const dur = 0.55 + (j % 6) * 0.13;
        const len = 14 + (j % 5) * 6;
        out += `<i class="fi-drop" style="left:${(j * 61) % 100}%;height:${len}px;animation-delay:-${((j * 0.41) % 3).toFixed(2)}s;animation-duration:${dur}s"></i>`;
      }
      if (kind === 'thunder') out += `<div class="fi-bolt"></div><div class="fi-flash"></div>`;
      return out;
    }
    if (kind === 'snow') {
      const n = big ? 20 : 14;
      let out = '';
      for (let j = 0; j < n; j++) {
        const size = 3 + (j % 4) * 2;
        const fallDur = 7 + (j % 6);
        const swayDur = 3 + (j % 4);
        out += `<i class="fi-flake" style="left:${(j * 53) % 100}%;width:${size}px;height:${size}px;` +
          `opacity:${(0.35 + (j % 5) * 0.12).toFixed(2)};` +
          `animation-duration:${fallDur}s,${swayDur}s;` +
          `animation-delay:-${((j * 0.7) % 5).toFixed(2)}s,-${((j * 0.3) % 3).toFixed(2)}s"></i>`;
      }
      return out;
    }
    if (kind === 'fog') {
      const bands = [
        { top: '2%', w: 75, dur: 42, op: .8 },
        { top: '28%', w: 95, dur: 58, op: .55 },
        { top: '55%', w: 85, dur: 50, op: .7 },
        { top: '78%', w: 100, dur: 65, op: .45 }
      ];
      return bands.map((b, i) => `<span class="fi-cloud" style="top:${b.top};width:${b.w}%;opacity:${b.op};animation-duration:${b.dur}s;animation-delay:-${i * 9}s"></span>`).join('');
    }
    return '';
  }

  function flashLoop(container, tok) {
    const my = ++tok.n;
    const fire = () => {
      if (my !== tok.n) return;
      const bolt = container.querySelector('.fi-bolt'), flash = container.querySelector('.fi-flash');
      if (bolt && flash && !reduce) {
        bolt.classList.add('fi-bolt-on'); flash.classList.add('fi-flash-on');
        setTimeout(() => { bolt.classList.remove('fi-bolt-on'); flash.classList.remove('fi-flash-on'); }, 240);
      }
      setTimeout(fire, 4500 + Math.random() * 7000);
    };
    setTimeout(fire, 1200 + Math.random() * 2500);
  }

  function paint(kind) {
    const m = $('modalContent');
    if (!m) return;
    m.querySelectorAll('.fi-fx').forEach(el => el.remove());
    modalFlashTok.n++;
    if (!kind) return;
    if (getComputedStyle(m).position === 'static') m.style.position = 'relative';
    const wrap = document.createElement('div');
    wrap.className = `fi-fx fi-${kind}`;
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = buildBits(kind, false);
    m.insertAdjacentElement('afterbegin', wrap);
    if (kind === 'thunder' && !reduce) flashLoop(wrap, modalFlashTok);
  }
  const modalFlashTok = { n: 0 };

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
    const marker = m.firstElementChild;
    const forced = new URLSearchParams(location.search).get('fx');
    Promise.all([fxOff(), forced ? Promise.resolve(forced) : weatherKind(+t.lat, +t.lng)]).then(([off, kind]) => {
      if (!off && kind && $('modalContent').firstElementChild === marker) paint(kind);
    });
  };

  const HQ_LAT = 27.7410, HQ_LNG = 85.3360;
  const siteFlashTok = { n: 0 };
  let siteTimer = null;
  let geoAsked = false, clientLoc = null;

  function getClientLocation() {
    return new Promise(resolve => {
      if (clientLoc) return resolve(clientLoc);
      if (geoAsked || !('geolocation' in navigator)) return resolve(null);
      geoAsked = true;
      navigator.geolocation.getCurrentPosition(
        pos => resolve(clientLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 8000, maximumAge: 20 * 60 * 1000 }
      );
    });
  }

  function paintSite(kind) {
    const el = $('fiSiteFx');
    if (!el) return;
    siteFlashTok.n++;
    el.className = kind ? `fi-on fi-${kind}` : '';
    el.innerHTML = kind ? buildBits(kind, true) : '';
    if (kind === 'thunder' && !reduce) flashLoop(el, siteFlashTok);
  }

  async function refreshSite() {
    if (store.get('fi_fx') === 'off') return paintSite(null);
    const forced = new URLSearchParams(location.search).get('fx');
    if (forced) { paintSite((await fxOff()) ? null : forced); return; }
    const loc = await getClientLocation();
    const { lat, lng } = loc || { lat: HQ_LAT, lng: HQ_LNG };
    const [off, kind] = await Promise.all([fxOff(), weatherKind(lat, lng)]);
    paintSite(off ? null : kind);
  }

  function scheduleSite() {
    clearInterval(siteTimer);
    siteTimer = setInterval(() => { if (!document.hidden) refreshSite(); }, 15 * 60 * 1000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshSite(); });
  if (!reduce) { refreshSite(); scheduleSite(); }

  window.feelitFx = {
    on: () => { store.set('fi_fx', 'on'); refreshSite(); },
    off: () => { store.set('fi_fx', 'off'); paint(null); paintSite(null); },
    preview: kind => { paint(kind); paintSite(kind); }
  };
})();
