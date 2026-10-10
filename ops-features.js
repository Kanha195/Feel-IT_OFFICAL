/* ops-features.js — extra Ops views without rewriting ops-core */
(function () {
  'use strict';
  if (window.__opsFeatures) return;
  window.__opsFeatures = true;

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) { console.log(msg); return; }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  function getSb() {
    return window.opsSb || window.supabaseClient || window.sb || null;
  }

  function stage() { return document.getElementById('stage'); }

  function addNav() {
    var nav = document.querySelector('#opsApp nav');
    if (!nav || document.querySelector('[data-v="calendar"]')) return;
    var foot = nav.querySelector('.nav-foot');
    var items = [
      ['calendar', 'Blocked dates'],
      ['vouchers', 'Vouchers'],
      ['reviews', 'Reviews'],
      ['dispatch', 'Dispatch & notify']
    ];
    items.forEach(function (pair) {
      var b = document.createElement('button');
      b.setAttribute('data-v', pair[0]);
      b.textContent = pair[1];
      if (foot) nav.insertBefore(b, foot);
      else nav.appendChild(b);
      b.addEventListener('click', function () {
        nav.querySelectorAll('button[data-v]').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var title = document.getElementById('viewTitle');
        if (title) title.textContent = pair[1];
        render(pair[0]);
      });
    });
  }

  async function render(view) {
    var s = stage();
    if (!s) return;
    var sb = getSb();
    if (!sb) {
      // try create from config
      try {
        var url = window.SUPABASE_URL || 'https://gsjkexvchfozviqllpvq.supabase.co';
        var key = window.SUPABASE_ANON_KEY || 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';
        if (window.supabase) sb = window.supabase.createClient(url, key);
      } catch (e) {}
    }
    if (view === 'calendar') return renderCalendar(s, sb);
    if (view === 'vouchers') return renderVouchers(s, sb);
    if (view === 'reviews') return renderReviews(s, sb);
    if (view === 'dispatch') return renderDispatch(s, sb);
  }

  async function renderCalendar(s, sb) {
    s.innerHTML = '<div class="card"><h2>Blocked dates</h2><p class="muted">Guests cannot book these days.</p>' +
      '<div class="row"><input type="date" id="blkDay" style="max-width:200px"><input id="blkReason" placeholder="Reason" style="max-width:280px">' +
      '<button class="btn btn-p" id="blkAdd">Block</button></div><div id="blkList">Loading…</div></div>';
    async function refresh() {
      var list = document.getElementById('blkList');
      if (!sb) { list.textContent = 'Database not ready — login first'; return; }
      var r = await sb.from('blocked_dates').select('*').order('day');
      if (r.error) { list.textContent = r.error.message + ' (run FEATURES-UPGRADE.sql)'; return; }
      if (!r.data.length) { list.innerHTML = '<p class="muted">No blocked dates</p>'; return; }
      list.innerHTML = r.data.map(function (row) {
        return '<div class="row" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span>' + row.day + ' — ' + (row.reason || '') +
          '</span><button class="btn" data-del="' + row.day + '">Remove</button></div>';
      }).join('');
      list.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.onclick = async function () {
          await sb.from('blocked_dates').delete().eq('day', btn.getAttribute('data-del'));
          toast('Removed');
          refresh();
        };
      });
    }
    document.getElementById('blkAdd').onclick = async function () {
      var day = document.getElementById('blkDay').value;
      var reason = document.getElementById('blkReason').value;
      if (!day) return toast('Pick a date');
      var r = await sb.from('blocked_dates').upsert({ day: day, reason: reason });
      if (r.error) toast(r.error.message); else { toast('Blocked'); refresh(); }
    };
    refresh();
  }

  async function renderVouchers(s, sb) {
    s.innerHTML = '<div class="card"><h2>Voucher codes</h2>' +
      '<div class="grid2"><div><label>Code</label><input id="vCode" placeholder="FEELIT10"></div>' +
      '<div><label>% off</label><input id="vPct" type="number" min="1" max="100" value="10"></div></div>' +
      '<div class="grid2"><div><label>Max uses</label><input id="vMax" type="number" value="50"></div>' +
      '<div><label>Expires</label><input id="vExp" type="date"></div></div>' +
      '<button class="btn btn-p" id="vAdd">Create voucher</button><div id="vList" style="margin-top:14px">Loading…</div></div>';
    async function refresh() {
      var list = document.getElementById('vList');
      if (!sb) { list.textContent = 'Login required'; return; }
      var r = await sb.from('vouchers').select('*').order('code');
      if (r.error) { list.textContent = r.error.message; return; }
      list.innerHTML = (r.data || []).map(function (v) {
        return '<div class="row" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span><b>' + v.code + '</b> ' + v.percent_off +
          '% · used ' + (v.used_count || 0) + '/' + (v.max_uses || '∞') + (v.active ? '' : ' (off)') +
          '</span><button class="btn" data-toggle="' + v.code + '" data-on="' + (v.active ? '0' : '1') + '">' + (v.active ? 'Disable' : 'Enable') + '</button></div>';
      }).join('') || '<p class="muted">No vouchers</p>';
      list.querySelectorAll('[data-toggle]').forEach(function (btn) {
        btn.onclick = async function () {
          await sb.from('vouchers').update({ active: btn.getAttribute('data-on') === '1' }).eq('code', btn.getAttribute('data-toggle'));
          refresh();
        };
      });
    }
    document.getElementById('vAdd').onclick = async function () {
      var code = (document.getElementById('vCode').value || '').trim().toUpperCase();
      var pct = Number(document.getElementById('vPct').value);
      if (!code || !pct) return toast('Code + % required');
      var row = { code: code, percent_off: pct, max_uses: Number(document.getElementById('vMax').value) || 50, expires_at: document.getElementById('vExp').value || null, active: true, used_count: 0 };
      var r = await sb.from('vouchers').upsert(row);
      if (r.error) toast(r.error.message); else { toast('Saved'); refresh(); }
    };
    refresh();
  }

  async function renderReviews(s, sb) {
    s.innerHTML = '<div class="card"><h2>Reviews moderation</h2><div id="revList">Loading…</div></div>';
    var list = document.getElementById('revList');
    if (!sb) { list.textContent = 'Login required'; return; }
    var r = await sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(50);
    if (r.error) { list.textContent = r.error.message + ' — run FEATURES-UPGRADE.sql'; return; }
    list.innerHTML = (r.data || []).map(function (rev) {
      return '<div class="card" style="margin:8px 0"><div class="row"><b>' + (rev.stars || '?') + '★</b> <span class="muted">' + (rev.email || '') + '</span> ' +
        (rev.approved ? '<span class="pill">Approved</span>' : '<span class="pill">Pending</span>') + '</div>' +
        '<p>' + (rev.comment || '') + '</p>' +
        (rev.tip_npr ? '<p class="muted">Tip: NPR ' + rev.tip_npr + '</p>' : '') +
        (!rev.approved ? '<button class="btn btn-p" data-ap="' + rev.id + '">Approve</button>' : '') +
        '</div>';
    }).join('') || '<p class="muted">No reviews yet</p>';
    list.querySelectorAll('[data-ap]').forEach(function (btn) {
      btn.onclick = async function () {
        await sb.from('reviews').update({ approved: true }).eq('id', btn.getAttribute('data-ap'));
        toast('Approved');
        renderReviews(s, sb);
      };
    });
  }

  async function renderDispatch(s, sb) {
    s.innerHTML = '<div class="card"><h2>Dispatch & notify</h2><p class="muted">Assign captain, then WhatsApp guest + rider.</p><div id="disList">Loading…</div></div>';
    var list = document.getElementById('disList');
    if (!sb) { list.textContent = 'Login required'; return; }
    var bookings = await sb.from('bookings').select('*').order('created_at', { ascending: false }).limit(30);
    var riders = await sb.from('riders').select('*').eq('status', 'approved');
    if (bookings.error) { list.textContent = bookings.error.message; return; }
    var riderOpts = (riders.data || []).map(function (r) {
      return '<option value="' + (r.id || r.phone) + '" data-name="' + (r.name || '') + '" data-phone="' + (r.phone || '') + '">' + (r.name || 'Rider') + ' · ' + (r.phone || '') + '</option>';
    }).join('');
    list.innerHTML = (bookings.data || []).map(function (b) {
      var id = b.id;
      var phone = String(b.phone || b.whatsapp || '').replace(/\D/g, '');
      var email = b.email || '';
      return '<div class="card" style="margin:8px 0"><div class="row"><b>' + (b.tour_title || b.tour || 'Ride') + '</b><span class="pill">' + (b.status || '') + '</span></div>' +
        '<p class="muted">' + (b.name || '') + ' · ' + email + ' · ' + (b.ride_date || b.date || '') + '</p>' +
        '<label>Captain</label><select id="r_' + id + '"><option value="">Select rider</option>' + riderOpts + '</select>' +
        '<label>Meeting point</label><input id="m_' + id + '" placeholder="Basundhara gate / hotel">' +
        '<label>Meeting time</label><input id="t_' + id + '" placeholder="9:00 AM">' +
        '<div class="row" style="margin-top:8px">' +
        '<button class="btn btn-p" data-assign="' + id + '">Assign + save</button>' +
        '<button class="btn" data-wa-guest="' + id + '" data-phone="' + phone + '">WhatsApp guest</button>' +
        '<button class="btn" data-wa-rider="' + id + '">WhatsApp rider</button>' +
        '<a class="btn" href="ride.html?email=' + encodeURIComponent(email) + '" target="_blank">Status page</a>' +
        '</div></div>';
    }).join('') || '<p class="muted">No bookings</p>';

    list.querySelectorAll('[data-assign]').forEach(function (btn) {
      btn.onclick = async function () {
        var id = btn.getAttribute('data-assign');
        var sel = document.getElementById('r_' + id);
        var opt = sel.options[sel.selectedIndex];
        if (!opt || !opt.value) return toast('Select rider');
        var name = opt.getAttribute('data-name') || opt.textContent;
        var rphone = opt.getAttribute('data-phone') || '';
        var meet = (document.getElementById('m_' + id) || {}).value || '';
        var time = (document.getElementById('t_' + id) || {}).value || '';
        var pack = { meeting_point: meet, meeting_time: time, captain_name: name, captain_phone: rphone };
        var upd = { status: 'rider_assigned', rider_name: name, rider_phone: rphone, ride_pack: pack };
        var r = await sb.from('bookings').update(upd).eq('id', id);
        if (r.error) { delete upd.ride_pack; r = await sb.from('bookings').update(upd).eq('id', id); }
        if (r.error) toast(r.error.message); else toast('Assigned — WhatsApp guest & rider');
      };
    });

    list.querySelectorAll('[data-wa-guest]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-wa-guest');
        var phone = btn.getAttribute('data-phone');
        var sel = document.getElementById('r_' + id);
        var opt = sel.options[sel.selectedIndex];
        var name = opt ? (opt.getAttribute('data-name') || '') : '';
        var rphone = opt ? (opt.getAttribute('data-phone') || '') : '';
        var meet = (document.getElementById('m_' + id) || {}).value || '';
        var time = (document.getElementById('t_' + id) || {}).value || '';
        var text = 'Namaste from Feel It! Your ride is confirmed.\nCaptain: ' + name + ' (' + rphone + ')\nMeet: ' + meet + ' at ' + time + '\nTrack: https://kanha195.github.io/Feel-IT_OFFICAL/ride.html';
        if (!phone) return toast('No guest phone');
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(text), '_blank');
      };
    });

    list.querySelectorAll('[data-wa-rider]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-wa-rider');
        var sel = document.getElementById('r_' + id);
        var opt = sel.options[sel.selectedIndex];
        if (!opt || !opt.value) return toast('Select rider first');
        var rphone = String(opt.getAttribute('data-phone') || '').replace(/\D/g, '');
        var meet = (document.getElementById('m_' + id) || {}).value || '';
        var time = (document.getElementById('t_' + id) || {}).value || '';
        var text = 'Feel It dispatch: New guest assigned.\nMeet: ' + meet + ' at ' + time + '\nConsole: https://kanha195.github.io/Feel-IT_OFFICAL/rider.html';
        if (!rphone) return toast('Rider has no phone');
        window.open('https://wa.me/' + rphone + '?text=' + encodeURIComponent(text), '_blank');
      };
    });
  }

  function boot() {
    addNav();
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      addNav();
      if (tries > 40) clearInterval(t);
    }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
