/* ops-staff.js — owner creates staff emails + permissions */
(function () {
  'use strict';
  if (window.__opsStaffUi) return;
  window.__opsStaffUi = true;
  var PERM_KEYS = [['bookings','Bookings'],['live','Live fleet'],['riders','Riders'],['apps','Applications'],['messages','Messages'],['tours','Tours'],['featured','Featured'],['money','Costs'],['settings','Settings'],['staff','Manage staff']];
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2500);
  }
  function isOwner() {
    var u = window.__opsUser;
    return u && (u.role === 'owner' || (u.perms && u.perms.staff));
  }
  async function renderStaffPanel() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    if (!isOwner()) { stage.innerHTML = '<div class="card"><p class="muted">Only the owner can manage staff access.</p></div>'; return; }
    var sb = window.opsSb;
    stage.innerHTML = '<div class="card"><h2>Create staff access</h2><p class="muted">1) Create user in Supabase Auth.<br>2) Add email here + permissions.</p><label>Staff email</label><input id="stEmail" type="email"><label>Display name</label><input id="stName" type="text"><div class="perm-grid" id="stPerms"></div><button class="btn btn-p" id="stSave">Save staff</button></div><div class="card"><h2>Current staff</h2><div id="stList">Loading…</div></div>';
    var grid = document.getElementById('stPerms');
    grid.innerHTML = PERM_KEYS.map(function (p) { return '<label><input type="checkbox" data-perm="'+p[0]+'" checked> '+p[1]+'</label>'; }).join('');
    document.getElementById('stSave').onclick = async function () {
      var email = (document.getElementById('stEmail').value || '').trim().toLowerCase();
      var name = (document.getElementById('stName').value || '').trim();
      if (!email) return toast('Email required');
      var perms = {};
      grid.querySelectorAll('[data-perm]').forEach(function (c) { perms[c.getAttribute('data-perm')] = !!c.checked; });
      var r = await sb.from('staff_roles').upsert({ email: email, name: name || email, role: 'staff', perms: perms, active: true });
      if (r.error) toast(r.error.message); else { toast('Staff saved'); loadList(); }
    };
    async function loadList() {
      var list = document.getElementById('stList');
      var r = await sb.from('staff_roles').select('*').order('email');
      if (r.error) { list.textContent = r.error.message; return; }
      list.innerHTML = (r.data || []).map(function (s) {
        return '<div class="row" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span><b>'+s.email+'</b> · '+(s.role||'')+(s.active?'':' (off)')+'</span>'+(s.role==='owner'?'':'<button class="btn" data-off="'+s.email+'">Disable</button>')+'</div>';
      }).join('') || '<p class="muted">No staff rows</p>';
      list.querySelectorAll('[data-off]').forEach(function (btn) {
        btn.onclick = async function () {
          await sb.from('staff_roles').update({ active: false }).eq('email', btn.getAttribute('data-off'));
          toast('Disabled'); loadList();
        };
      });
    }
    loadList();
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-v') === 'staff') setTimeout(renderStaffPanel, 50);
  });
})();
