/* ops-gate.js — no password form; staff session only */
(function () {
  'use strict';
  var SUPABASE_URL = window.SUPABASE_URL || 'https://gsjkexvchfozviqllpvq.supabase.co';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';
  var OWNER_EMAILS = ['feelitofficial@gmail.com'];
  function $(id) { return document.getElementById(id); }
  function deny(msg) {
    var g = $('opsGate'); var app = $('opsApp');
    if (app) app.hidden = true;
    if (g) { g.hidden = false; var m = $('opsGateMsg'); if (m) m.textContent = msg || 'Access denied.'; }
    try { sessionStorage.removeItem('feelit_admin_session'); } catch (e) {}
  }
  function allow(email, role, perms) {
    window.__opsUser = { email: email, role: role || 'staff', perms: perms || {} };
    var g = $('opsGate'); var app = $('opsApp');
    if (g) g.hidden = true; if (app) app.hidden = false;
    var tag = $('roleTag'); if (tag) tag.textContent = (role || 'staff') + ' · ' + email;
    var who = $('who'); if (who) who.textContent = email;
    try { sessionStorage.setItem('feelit_admin_session', JSON.stringify({ t: Date.now(), email: email, role: role || 'staff' })); } catch (e) {}
    window.dispatchEvent(new CustomEvent('ops-auth-ready', { detail: window.__opsUser }));
  }
  async function lookupRole(client, email) {
    email = String(email || '').toLowerCase().trim();
    if (OWNER_EMAILS.indexOf(email) >= 0) {
      return { role: 'owner', perms: { bookings:true, live:true, riders:true, apps:true, messages:true, tours:true, featured:true, money:true, settings:true, staff:true } };
    }
    try {
      var r = await client.from('staff_roles').select('*').eq('email', email).eq('active', true).maybeSingle();
      if (r.data) return { role: r.data.role || 'staff', perms: r.data.perms || {} };
    } catch (e) {}
    return null;
  }
  async function boot() {
    if (!window.supabase) { deny('System not ready.'); return; }
    var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.opsSb = client;
    var session = null;
    try { var res = await client.auth.getSession(); session = res.data && res.data.session; } catch (e) {}
    if (!session || !session.user || !session.user.email) {
      deny('Sign in on the main website first (Login / Account), then open this page.');
      setTimeout(function () { if (!window.__opsUser) location.replace('index.html'); }, 2500);
      return;
    }
    var email = session.user.email.toLowerCase();
    var roleInfo = await lookupRole(client, email);
    if (!roleInfo) {
      deny('This account does not have operations access.');
      setTimeout(function () { if (!window.__opsUser) location.replace('index.html'); }, 2500);
      return;
    }
    allow(email, roleInfo.role, roleInfo.perms);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-v') === 'out') {
      e.preventDefault();
      var c = window.opsSb;
      Promise.resolve(c && c.auth.signOut()).finally(function () {
        try { sessionStorage.removeItem('feelit_admin_session'); } catch (err) {}
        location.replace('index.html');
      });
    }
  });
})();
