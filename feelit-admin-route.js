/* feelit-admin-route.js — load LAST in index.html, after feelit-upgrade.js and feelit-extras.js:
   <script src="feelit-admin-route.js"></script>
   1) Admin › Tours tab: cost, resident price, slots, included/not-included, live profit, site-wide weather toggle
   2) Custom route builder: permits, checkpoints, place info, start date → automatic return date */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const num = s => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };
  const lines = s => { s = String(s || ''); return (s.includes('\n') ? s.split('\n') : s.split(',')).map(x => x.trim()).filter(Boolean); };
  const nl = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
  const localOf = price => { const r = window.FI_RULES || { localFactor: 0.6, roundTo: 100 }; return Math.round(price * r.localFactor / r.roundTo) * r.roundTo; };

  document.head.insertAdjacentHTML('beforeend', `<style>
    .fi-route h4{margin:12px 0 4px;font-size:14px}
    .fi-route ul{padding-left:18px;margin:0;font-size:13px;color:var(--ink-soft)}
    .fi-route p{font-size:13px;margin:4px 0}
  </style>`);

  /* ================= 1) ADMIN ================= */
  const adminHost = () => { const m = $('modalContent'); return m && m.classList.contains('modal-admin') ? m.querySelector('.admin-tabs')?.nextElementSibling : null; };

  function profitHtml(price, local, cost) {
    if (cost == null) return '<span style="color:var(--ink-soft)">Enter the cost per person to see profit.</span>';
    const row = (label, p) => {
      const m = p - cost, pct = p ? Math.round(m / p * 100) : 0;
      const colour = m < 0 ? 'var(--danger)' : pct < 15 ? 'var(--warning)' : 'var(--success)';
      return `<div style="color:${colour}">${label}: ${fmtNPR(p)} − ${fmtNPR(cost)} = <strong>${fmtNPR(m)}</strong> (${pct}%)${m < 0 ? ' — loss' : pct < 15 ? ' — thin margin' : ''}</div>`;
    };
    return row('Visitor', price) + row('Nepali resident', local);
  }

  function liveProfit(id) {
    const price = num($('adm-price-' + id)?.value) || 0;
    const local = num($('fi-local-' + id).value) ?? localOf(price);
    $('fi-profit-' + id).innerHTML = profitHtml(price, local, num($('fi-cost-' + id).value));
  }

  function tourBlock(t) {
    const id = esc(t.id);
    return `<div class="form-card" style="max-width:100%;margin:10px 0;">
      <h4 style="margin:0 0 8px;">💰 Pricing, profit &amp; lists</h4>
      <div class="row-2">
        <div class="field"><label>Our cost per person (NPR)</label><input type="number" id="fi-cost-${id}" value="${esc(t.cost ?? '')}"></div>
        <div class="field"><label>Nepali-resident price (blank = auto)</label><input type="number" id="fi-local-${id}" value="${esc(t.price_local ?? '')}"></div>
      </div>
      <div class="field"><label>Max riders per date (blank = no limit)</label><input type="number" id="fi-slots-${id}" value="${esc(t.max_slots ?? '')}"></div>
      <div class="field"><label>What’s included — one per line</label><textarea id="fi-inc-${id}" rows="4">${esc((t.includes || []).join('\n'))}</textarea></div>
      <div class="field"><label>What’s NOT included — one per line</label><textarea id="fi-exc-${id}" rows="4">${esc(lines(t.excludes).join('\n'))}</textarea></div>
      <div id="fi-profit-${id}" style="font-size:13px;margin-bottom:10px;"></div>
      <button class="btn btn-primary" id="fi-save-${id}" onclick="fiSaveExtras('${id}')">Save pricing &amp; lists</button>
    </div>`;
  }

  window.fiSaveExtras = async id => {
    const slots = num($('fi-slots-' + id).value);
    const patch = {
      cost: num($('fi-cost-' + id).value), price_local: num($('fi-local-' + id).value),
      max_slots: slots == null ? null : Math.round(slots),
      includes: nl($('fi-inc-' + id).value), excludes: nl($('fi-exc-' + id).value).join('\n')
    };
    const restore = setBusy($('fi-save-' + id), 'Saving…');
    const ok = await sbWrite(supabaseClient.from('tours').update(patch).eq('id', id),
      'Could not save — run supabase-upgrade.sql first, and check RLS allows UPDATE on tours');
    restore();
    if (!ok) return;
    showToast('Pricing & lists saved.', 'success');
    await loadTours();
    renderAdminPanel('tours');
  };

  window.fiSetFx = async v => {
    const ok = await sbWrite(supabaseClient.from('site_settings').upsert({ key: 'weather_fx', value: v }),
      'Could not save the setting — run supabase-upgrade.sql first');
    if (ok && $('fiFxState')) {$('fiFxState').textContent = v.toUpperCase(); showToast(`Weather effects ${v} for all visitors.`, 'success'); }
  };

  async function fxCard(host) {
    host.insertAdjacentHTML('afterbegin', `<div class="form-card" style="max-width:100%;margin-bottom:12px;">
      <h3>🌦️ Weather effects</h3>
      <p class="form-note">Site-wide: <strong id="fiFxState">checking…</strong> — shows each visitor's own weather (after they allow location), or Kathmandu if they decline</p>
      <p class="form-note">Applies on visitors' next page load.</p>
      <div class="admin-actions" style="flex-wrap:wrap;gap:8px;">
        <button class="btn btn-outline btn-sm" onclick="fiSetFx('on')">Turn on</button>
        <button class="btn btn-outline btn-sm" onclick="fiSetFx('off')">Turn off</button>
        ${['snow', 'rain', 'fog', 'thunder', 'clear'].map(k => `<button class="btn btn-outline btn-sm" onclick="window.feelitFx&&feelitFx.preview('${k}')">Preview ${k}</button>`).join('')}
        <button class="btn btn-outline btn-sm" onclick="window.feelitFx&&feelitFx.preview(null)">Stop preview</button>
      </div></div>`);
    const { data } = await supabaseClient.from('site_settings').select('value').eq('key', 'weather_fx').maybeSingle();
    if ($('fiFxState'))$('fiFxState').textContent = data && data.value === 'off' ? 'OFF' : 'ON';
  }

  async function profitSummary(host) {
    const { data, error } = await supabaseClient.from('bookings').select('tour_id, travelers, total, status');
    if (error || !data) return;
    let rev = 0, cost = 0, skipped = 0;
    data.filter(b => b.status === 'Confirmed').forEach(b => {
      const t = tours.find(x => x.id === b.tour_id);
      if (t && t.cost != null && t.cost !== '') { rev += Number(b.total) || 0; cost += Number(t.cost) * (Number(b.travelers) || 0); } else skipped++;
    });
    host.insertAdjacentHTML('afterbegin', `<div class="form-card" style="max-width:100%;margin-bottom:12px;">
      <h3>📈 Confirmed profit</h3>
      <p style="margin:0;">Revenue ${fmtNPR(rev)} − costs ${fmtNPR(cost)} = <strong>${fmtNPR(rev - cost)}</strong></p>
      ${skipped ? `<p class="form-note">${skipped} confirmed booking(s) left out: no cost set for their tour.</p>` : ''}</div>`);
  }

  const _admin = window.renderAdminPanel;
  window.renderAdminPanel = async function (tab) {
    await _admin(tab);
    if (tab !== 'tours') return;
    tours.forEach(t => {
      const save = $('adm-save-' + t.id);
      const actions = save && save.closest('.admin-actions');
      if (!actions) return;
      actions.insertAdjacentHTML('beforebegin', tourBlock(t));
      const upd = () => liveProfit(t.id);
      ['adm-price-', 'fi-cost-', 'fi-local-'].forEach(p => $(p + t.id)?.addEventListener('input', upd));
      upd();
    });
    const host = adminHost();
    if (host) { fxCard(host); profitSummary(host); }
  };

  /* ================= 2) ROUTE: permits, places, return date ================= */
  const ZONES = [
    { name: 'Upper Mustang (restricted area)', box: [28.83, 29.5, 83.5, 84.4], high: true, check: 'Kagbeni',
      alt: 'up to ~3,800 m at Lo Manthang',
      foreign: 'Restricted Area Permit, about US$500 per person for the first 10 days then US$50/day, issued through a registered agency',
      local: 'no restricted-area permit fee; carry your citizenship card',
      go: ['Kagbeni', 'Tsarang', 'Lo Manthang walled city', 'Chhoser caves', 'Lo Gekar monastery'] },
    { name: 'Annapurna Conservation Area', box: [28.3, 28.83, 83.6, 84.6], high: false, check: 'Jomsom / Manang check posts',
      alt: '2,000–3,800 m (Muktinath ~3,800 m)',
      foreign: 'ACAP entry permit, about NPR 3,000',
      local: 'reduced or waived; we confirm at booking',
      go: ['Jomsom', 'Marpha apple orchards', 'Muktinath temple', 'Kali Gandaki gorge'] },
    { name: 'Everest region (Khumbu)', box: [27.6, 28.15, 86.5, 87.1], high: true, check: 'Monjo (Sagarmatha National Park gate)',
      alt: '2,800–3,500 m around Namche',
      foreign: 'Sagarmatha National Park permit (about NPR 3,000) plus the local Khumbu municipality permit',
      local: 'reduced fees; we confirm at booking',
      go: ['Lukla', 'Namche Bazaar', 'Tengboche monastery'] },
    { name: 'Langtang National Park', box: [28.0, 28.4, 85.2, 85.8], high: true, check: 'Dhunche park gate',
      alt: '1,500–3,900 m (Kyanjin Gompa ~3,870 m)',
      foreign: 'Langtang National Park entry permit, about NPR 3,000',
      local: 'reduced fees; we confirm at booking',
      go: ['Syabrubesi', 'Langtang village', 'Kyanjin Gompa'] }
  ];
  const zoneOf = s => ZONES.find(z => s.lat >= z.box[0] && s.lat <= z.box[1] && s.lng >= z.box[2] && s.lng <= z.box[3]);

  const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const fd = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  let last = null;
  const rcache = new Map(), _road = window.getRoadDistanceKm;
  window.getRoadDistanceKm = async (points, terrain) => {
    const k = terrain + '|' + points.map(p => p.lat.toFixed(4) + ',' + p.lng.toFixed(4)).join(';');
    if (!rcache.has(k)) rcache.set(k, _road(points, terrain));
    last = await rcache.get(k);
    return last;
  };

  let tok = 0, daysTouched = false;
  function ensureStartField() {
    if ($('routeStart')) return;
    const days = $('routeDays');
    if (!days) return;
    days.closest('.field').insertAdjacentHTML('afterend',
      '<div class="field"><label for="routeStart">Start date</label><input type="date" id="routeStart" oninput="recalcRouteEstimate()"></div>');
    $('routeStart').min = new Date().toISOString().slice(0, 10);
    days.addEventListener('input', () => { daysTouched = true; });
  }

  function suggestDays() {
    const high = routeStops.some(s => zoneOf(s)?.high);
    return Math.max(1, Math.ceil((last.durationMin * 2 / 60) / 6) + (high ? 1 : 0));
  }

  const zoneHtml = z => `<div class="route-panel-card" style="margin:8px 0;"><strong>${esc(z.name)}</strong>
    <div style="font-size:13px;line-height:1.6;color:var(--ink-soft)">Visitors: ${esc(z.foreign)}<br>Nepali citizens: ${esc(z.local)}<br>Checkpoint: ${esc(z.check)}<br>Altitude: ${esc(z.alt)}<br>Worth seeing: ${z.go.map(esc).join(' · ')}</div></div>`;

  function renderRouteInfo() {
    const host = $('routeSummaryBody');
    if (!host) return;
    const days = Math.max(1, parseInt($('routeDays').value, 10) \vert{}\vert{} 1), start =$('routeStart').value, zones = [];
    const rows = routeStops.map(s => {
      const z = zoneOf(s);
      if (z && !zones.includes(z)) zones.push(z);
      return `<li>${esc(s.name)} — ${z ? esc(z.name) : 'open road, no special permit'}</li>`;
    });
    host.insertAdjacentHTML('beforeend', `<div class="fi-route">
      <h4>Dates</h4>
      <p>${start ? `Departs ${fd(start)} → returns <strong>${fd(addDays(start, days - 1))}</strong> (${days} day${days > 1 ? 's' : ''})` : 'Pick a start date to see your return date.'}</p>
      <p style="color:var(--ink-soft)">Days are suggested from riding time (about 6 hours a day, there and back${zones.some(z => z.high) ? ', plus an acclimatisation day' : ''}). You can change them.</p>
      <h4>Stops</h4><ul>${rows.join('')}</ul>
      <h4>Permits &amp; checkpoints</h4>
      ${zones.length ? zones.map(zoneHtml).join('') : '<p>No special permits needed on this route.</p>'}
      <p class="route-summary-note">Permit rules and fees are indicative and change; we confirm exact requirements before you pay.</p></div>`);
  }

  const _recalc = window.recalcRouteEstimate, _reset = window.resetRouteBuilder;
  window.recalcRouteEstimate = async function () {
    const my = ++tok;
    ensureStartField();
    await _recalc();
    if (my !== tok || !routeStops.length || !last) return;
    const need = suggestDays(), inp = $('routeDays');
    if (!daysTouched && inp && +inp.value !== need) {
      inp.value = need;
      await _recalc();
      if (my !== tok) return;
    }
    renderRouteInfo();
  };
  window.resetRouteBuilder = function () { daysTouched = false; _reset(); };
})();
