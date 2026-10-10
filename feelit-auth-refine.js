/* feelit-auth-refine.js — same Login for all; staff silent to ops; guests never see admin labels */
(function () {
  'use strict';
  if (window.__fiAuthRefine) return;
  window.__fiAuthRefine = true;
  var OWNER_EMAILS = ['feelitofficial@gmail.com'];
  var SUPABASE_URL = window.SUPABASE_URL || 'https://gsjkexvchfozviqllpvq.supabase.co';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';
  function getClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase) { try { return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (e) {} }
    return null;
  }
  async function isStaffEmailAsync(email) {
    email = String(email || '').toLowerCase().trim();
    if (!email) return false;
    if (OWNER_EMAILS.indexOf(email) >= 0) return true;
    var client = getClient();
    if (!client) return false;
    try {
      var r = await client.from('staff_roles').select('email,active').eq('email', email).eq('active', true).maybeSingle();
      return !!(r.data && r.data.email);
    } catch (e) { return false; }
  }
  function quietAuthButton() {
    var btn = document.getElementById('authNavBtn');
    if (btn) { btn.textContent = 'Login / Account'; btn.innerHTML = 'Login / Account'; }
  }
  async function routeAfterLogin(email) {
    email = String(email || '').toLowerCase().trim();
    if (await isStaffEmailAsync(email)) {
      try { sessionStorage.setItem('feelit_admin_session', JSON.stringify({ t: Date.now(), email: email })); } catch (e) {}
      window.location.href = 'ops.html';
      return true;
    }
    return false;
  }
  function patchLogin() {
    if (typeof window.handleStandardLogin !== 'function' || window.handleStandardLogin.__fiPatched) return;
    var orig = window.handleStandardLogin;
    window.handleStandardLogin = async function () {
      var email = ((document.getElementById('authEmail') || {}).value || '').trim().toLowerCase();
      var pass = ((document.getElementById('authPass') || {}).value) || '';
      if (!email || !pass) { if (typeof showToast === 'function') showToast('Enter email and password', 'error'); return; }
      var client = getClient();
      if (!client) return orig.apply(this, arguments);
      try {
        var res = await client.auth.signInWithPassword({ email: email, password: pass });
        if (res.error) { if (typeof showToast === 'function') showToast(res.error.message || 'Login failed', 'error'); return; }
        var uEmail = (res.data.user && res.data.user.email) || email;
        if (await routeAfterLogin(uEmail)) return;
        if (typeof renderUserDashboard === 'function') {
          renderUserDashboard({ name: uEmail.split('@')[0], email: uEmail });
        } else return orig.apply(this, arguments);
      } catch (e) { return orig.apply(this, arguments); }
    };
    window.handleStandardLogin.__fiPatched = true;
  }
  function patchOpenAuth() {
    window.openAuthModal = async function () {
      quietAuthButton();
      var client = getClient();
      var sessionUser = null;
      try {
        if (typeof checkActiveAuthUser === 'function') sessionUser = await checkActiveAuthUser();
        else if (client) {
          var s = await client.auth.getSession();
          if (s.data && s.data.session && s.data.session.user) sessionUser = { email: s.data.session.user.email };
        }
      } catch (e) {}
      if (sessionUser && sessionUser.email && (await isStaffEmailAsync(sessionUser.email))) {
        window.location.href = 'ops.html'; return;
      }
      if (sessionUser && typeof renderUserDashboard === 'function') { renderUserDashboard(sessionUser); return; }
      if (typeof showAuthTabs === 'function') showAuthTabs('login');
    };
    window.openStaffOrDashboard = window.openAuthModal;
  }
  function boot() {
    quietAuthButton(); patchOpenAuth(); patchLogin();
    var obs = new MutationObserver(function () { quietAuthButton(); patchLogin(); });
    try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); });
  else setTimeout(boot, 400);
})();
