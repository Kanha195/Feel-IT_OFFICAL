
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

    /* ---- Weather effects (tour modal scope: .fi-fx) ---- */
    .fi-fx{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;border-radius:inherit;opacity:.6}
    .fi-fx.fi-fog{opacity:.85} /* the fog "haze" itself is already faint — see .fi-cloud below */

    .fi-fx .fi-drop{position:absolute;top:-24px;width:1.5px;border-radius:2px;
      background:linear-gradient(rgba(190,215,255,0),rgba(190,215,255,.8));
      transform:rotate(9deg);animation-name:fiRainFall;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform}
    .fi-fx.fi-thunder .fi-drop{background:linear-gradient(rgba(214,196,255,0),rgba(214,196,255,.85))}
    @keyframes fiRainFall{to{transform:translate3d(-20px,130%,0) rotate(9deg)}}

    /* Rain (and thunder) darken the scene, like an actual storm rolling in */
    .fi-fx.fi-rain{background:linear-gradient(180deg,rgba(15,23,42,.3),rgba(15,23,42,.5))}

    /* A warm "lamp" glow that stays lit through the storm — pure gradient + a
       slow opacity pulse, one element, no per-frame JS. */
    .fi-fx .fi-lamp{position:absolute;top:-15%;left:50%;width:75%;height:65%;transform:translateX(-50%);
      background:radial-gradient(ellipse at 50% 0%,rgba(255,224,130,.4),rgba(255,200,90,.1) 40%,transparent 72%);
      mix-blend-mode:screen;animation:fiLampPulse 5s ease-in-out infinite alternate;pointer-events:none}
    @keyframes fiLampPulse{from{opacity:.65}to{opacity:1}}

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
    .fi-fx .fi-bolt.fi-bolt-on{animation:fiBoltPulse .5s ease-out}
    .fi-fx .fi-flash{position:absolute;inset:0;background:#f5f0ff;opacity:0;mix-blend-mode:overlay}
    .fi-fx .fi-flash.fi-flash-on{animation:fiFlashPulse .5s ease-out}
    @keyframes fiBoltPulse{0%{opacity:0}10%{opacity:1}22%{opacity:.1}30%{opacity:.9}100%{opacity:0}}
    @keyframes fiFlashPulse{0%{opacity:0}10%{opacity:.55}22%{opacity:.05}30%{opacity:.4}100%{opacity:0}}

    /* The actual visible lightning bolt — a jagged shape, randomly repositioned
       each strike, that flickers on/off like a real strike rather than the
       screen just going white. */
    .fi-fx .fi-bolt-shape{position:absolute;top:-4%;width:120px;height:78%;opacity:0;pointer-events:none;
      filter:drop-shadow(0 0 10px rgba(232,224,255,.9)) drop-shadow(0 0 26px rgba(180,150,255,.6))}
    .fi-fx .fi-bolt-shape svg{width:100%;height:100%;display:block}
    .fi-fx .fi-bolt-shape.fi-bolt-on{animation:fiBoltFlicker .5s steps(1,end)}
    @keyframes fiBoltFlicker{0%{opacity:0}8%{opacity:1}16%{opacity:.15}24%{opacity:1}34%{opacity:0}50%{opacity:.85}60%{opacity:0}100%{opacity:0}}

    @media (prefers-reduced-motion:reduce){.fi-fx *,.fi-fx,.fi-live{animation:none!important}}
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

  /* ---- Weather effects: shared "recipe" for both the tour modal and the site-wide layer ----
     Admin/testing:  feelitFx.off() / feelitFx.on()  ·  feelitFx.preview('snow'|'rain'|'fog'|'thunder'|'clear')
     or open the site with ?fx=rain (also snow / fog / thunder / clear) to force a preview. */
  const wxCache = new Map();
  async function weatherKind(lat, lng) {
    const k = lat.toFixed(1) + ',' + lng.toFixed(1);
    if (!wxCache.has(k)) {
      wxCache.set(k, fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
        .then(r => r.json()).then(d => d.current_weather ? d.current_weather.weathercode : null).catch(() => null));
    }
    const c = await wxCache.get(k);
    if (c == null) return null;
    if ([95, 96, 99].includes(c)) return 'thunder';                                     // thunderstorm
    if ([71, 73, 75, 77, 85, 86].includes(c)) return 'snow';                            // snow / snow showers
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return 'rain'; // drizzle / rain / showers
    if ([45, 48].includes(c)) return 'fog';                                             // fog / freezing fog
    return c <= 1 ? 'clear' : null;                                                     // 0/1 = clear/mainly clear
  }

  // Builds the inner elements for one weather "kind". Reused by both the modal effect
  // and the site-wide layer so the physics (fall speed, sway, drift) match everywhere.
  // Element counts are intentionally small and fixed — no per-frame DOM work, ever.
  function buildBits(kind, big) {
    if (kind === 'rain' || kind === 'thunder') {
      const n = big ? (kind === 'thunder' ? 30 : 24) : (kind === 'thunder' ? 24 : 18);
      let out = '';
      for (let j = 0; j < n; j++) {
        const dur = 0.55 + (j % 6) * 0.13;                 // varied fall speed = depth
        const len = 14 + (j % 5) * 6;                      // varied streak length
        out += `<i class="fi-drop" style="left:${(j * 61) % 100}%;height:${len}px;animation-delay:-${((j * 0.41) % 3).toFixed(2)}s;animation-duration:${dur}s"></i>`;
      }
      out += `<div class="fi-lamp"></div>`; // a light stays on through the storm
      if (kind === 'thunder') {
        out += `<div class="fi-bolt-shape"><svg viewBox="0 0 60 200" preserveAspectRatio="none">` +
          `<polygon points="30,0 8,96 24,96 4,200 56,84 34,84 52,0" fill="#f5f0ff"/></svg></div>` +
          `<div class="fi-bolt"></div><div class="fi-flash"></div>`;
      }
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
      // A faint uniform haze (from the CSS background) plus a few large, slow,
      // blurred "cloud" bands drifting across at different heights/speeds — this
      // reads as real rolling fog without ever covering the page solidly, so
      // text stays readable underneath it.
      const bands = [
        { top: '2%', w: 75, dur: 42, op: .8 },
        { top: '28%', w: 95, dur: 58, op: .55 },
        { top: '55%', w: 85, dur: 50, op: .7 },
        { top: '78%', w: 100, dur: 65, op: .45 }
      ];
      return bands.map((b, i) => `<span class="fi-cloud" style="top:${b.top};width:${b.w}%;opacity:${b.op};animation-duration:${b.dur}s;animation-delay:-${i * 9}s"></span>`).join('');
    }
    return ''; // clear — the glow is pure CSS background, no elements needed
  }

  // Picks one real tour card (or popular-strip card) at random and gives it a
  // brief warm, fire-like glow — timed to the lightning, not fabricated data,
  // just a visual flourish. One class toggle + one timeout; nothing per-frame.
  function strikeRandomTour() {
    const cards = document.querySelectorAll('#tourGrid .card, .popular-card');
    if (!cards.length) return;
    const card = cards[Math.floor(Math.random() * cards.length)];
    card.classList.add('fi-struck');
    setTimeout(() => card.classList.remove('fi-struck'), 1800);
  }

  // Thunderstorms get occasional random lightning flashes — a real jagged bolt
  // shape (repositioned each time) plus a brief screen flash, not just a plain
  // white-out. One self-cancelling timer per container (modal vs. site-wide),
  // so switching weather never leaks timers.
  function flashLoop(container, tok) {
    const my = ++tok.n;
    const fire = () => {
      if (my !== tok.n) return; // superseded by a repaint — stop quietly
      const bolt = container.querySelector('.fi-bolt'), flash = container.querySelector('.fi-flash'),
        shape = container.querySelector('.fi-bolt-shape');
      if (bolt && flash && !reduce) {
        if (shape) shape.style.left = (8 + Math.random() * 78) + '%';
        bolt.classList.add('fi-bolt-on'); flash.classList.add('fi-flash-on'); shape?.classList.add('fi-bolt-on');
        setTimeout(() => { bolt.classList.remove('fi-bolt-on'); flash.classList.remove('fi-flash-on'); shape?.classList.remove('fi-bolt-on'); }, 520);
        strikeRandomTour();
      }
      setTimeout(fire, 4500 + Math.random() * 7000);
    };
    setTimeout(fire, 1200 + Math.random() * 2500);
  }

  function paint(kind) {
    const m = $('modalContent');
    if (!m) return;
    m.querySelectorAll('.fi-fx').forEach(el => el.remove());
    modalFlashTok.n++; // cancel any pending flash loop from the previous kind
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

  /* ---- Site-wide weather layer (the fixed #fiSiteFx div in index.html) ----
     Asks the VISITOR for location permission and, if they allow it, shows the
     real current weather at THEIR location. If they decline, it's not
     supported, or the request times out, it falls back to Feel It's
     Basundhara, Kathmandu base — so it always shows something sensible.
     Same on/off switch and ?fx= override as the tour-modal effect above. */
  const HQ_LAT = 27.7410, HQ_LNG = 85.3360; // Basundhara, Kathmandu (CONTACT_INFO.address) — fallback only
  const siteFlashTok = { n: 0 };
  let siteTimer = null;

  // Asked at most once per page load. Browsers already remember the visitor's
  // choice (granted/denied) across visits, so this never nags on repeat visits.
  let geoAsked = false, clientLoc = null; // clientLoc stays null forever if declined/unavailable
  function getClientLocation() {
    return new Promise(resolve => {
      if (clientLoc) return resolve(clientLoc);
      if (geoAsked || !('geolocation' in navigator)) return resolve(null);
      geoAsked = true;
      navigator.geolocation.getCurrentPosition(
        pos => resolve(clientLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null), // denied, blocked, or timed out — caller falls back to HQ
        { timeout: 8000, maximumAge: 20 * 60 * 1000 }
      );
    });
  }

  function paintSite(kind) {
    const el = $('fiSiteFx');
    if (!el) return;
    siteFlashTok.n++; // cancel any pending flash loop from the previous kind
    el.className = kind ? `fi-on fi-${kind}` : '';
    el.innerHTML = kind ? buildBits(kind, true) : '';
    if (kind === 'thunder' && !reduce) flashLoop(el, siteFlashTok);
  }

  async function refreshSite() {
    if (store.get('fi_fx') === 'off') return paintSite(null);
    const forced = new URLSearchParams(location.search).get('fx');
    if (forced) { paintSite((await fxOff()) ? null : forced); return; }
    // Race the geolocation lookup against a hard timeout — on some phones the
    // browser's success/error callback can be slow or (rarely) never fire, and
    // this app must never sit there showing nothing while it waits.
    const timeout = new Promise(res => setTimeout(() => res(null), 6500));
    const loc = await Promise.race([getClientLocation(), timeout]);
    const { lat, lng } = loc || { lat: HQ_LAT, lng: HQ_LNG };
    const [off, kind] = await Promise.all([fxOff(), weatherKind(lat, lng)]);
    paintSite(off ? null : kind);
  }

  function scheduleSite() {
    clearInterval(siteTimer);
    // Refetch every 15 min (re-using the visitor's already-known location, not
    // re-prompting); skip entirely while the tab is hidden.
    siteTimer = setInterval(() => { if (!document.hidden) refreshSite(); }, 15 * 60 * 1000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshSite(); });
  // Always run this — do NOT gate it behind `reduce`. A lot of phones default
  // to "reduce motion" (iOS accessibility setting, Android battery saver), and
  // gating the whole feature on that meant PHONES GOT NOTHING AT ALL: no tint,
  // no icon, nothing — which matches "shows on laptop, not on phone" exactly.
  // The CSS media query above already turns off the *motion* for those users;
  // this just makes sure the still weather look always shows for everyone.
  refreshSite();
  scheduleSite();

  window.feelitFx = {
    on: () => { store.set('fi_fx', 'on'); refreshSite(); },
    off: () => { store.set('fi_fx', 'off'); paint(null); paintSite(null); },
    preview: kind => { paint(kind); paintSite(kind); }
  };
  window.fiGetLocation = getClientLocation; // reused by feelit-hero.js so it never re-prompts
})();
