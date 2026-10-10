/* Feel It Operations — single file, owner full / staff limited */
(function () {
  'use strict';

  const SB_URL = 'https://gsjkexvchfozviqllpvq.supabase.co';
  const SB_KEY = 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';
  const OWNERS = ['admin@feelit.com', 'feelitofficial@gmail.com'];
  const OWNER_PASS_HASH = '1bc57fec7b82137e1cfeefed41c9a9f5ded5e69de2a397151c504e139bffd324';
  const SESSION_MS = 8 * 60 * 60 * 1000;
  const ALL_PERMS = ['bookings','live','riders','apps','messages','tours','featured','money','settings','staff'];
  const PERM_LABELS = {
    bookings: 'Bookings & dispatch desk',
    live: 'Live fleet map',
    riders: 'Captain roster',
    apps: 'Applications',
    messages: 'Messages',
    tours: 'Tours list / prices',
    featured: 'Featured tours & crop',
    money: 'Costs & profit splits',
    settings: 'Site settings',
    staff: 'Manage staff access'
  };

  if (!window.supabase) {
    document.body.innerHTML = '<div style="padding:40px;font-family:system-ui;background:#0B0F19;color:#fff;min-height:100vh"><h1>Ops failed to load</h1><p>Supabase library missing. Check internet / adblock, then refresh.</p><a href="index.html" style="color:#00F5D4">Back to site</a></div>';
    return;
  }

  const sb = window.supabase.createClient(SB_URL, SB_KEY);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s)
    .split('&').join('&')
    .split('<').join('<')
    .split('>').join('>')
    .split('"').join('"')
    .split("'").join('&#39;');
  const toast = (m) => {
    const t = $('toast');
    if (!t) return;
    t.textContent = m;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3200);
  };

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function loadStaffRoles() {
    try { return JSON.parse(localStorage.getItem('feelit_staff_roles') || '[]'); } catch (e) { return []; }
  }
  function saveStaffRoles(list) {
    localStorage.setItem('feelit_staff_roles', JSON.stringify(list));
  }
  function isOwnerEmail(email) {
    return OWNERS.some(o => o.toLowerCase() === String(email || '').toLowerCase().trim());
  }
  function staffRecord(email) {
    const e = String(email || '').toLowerCase().trim();
    return loadStaffRoles().find(s => s.email && s.email.toLowerCase() === e && s.active !== false);
  }
  function fullPerms() {
    const p = {}; ALL_PERMS.forEach(k => p[k] = true); return p;
  }
  function emptyPerms() {
    const p = {}; ALL_PERMS.forEach(k => p[k] = false); return p;
  }

  function readSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem('feelit_ops_session') || 'null');
      if (!s || !s.email || !s.t) return null;
      if (Date.now() - s.t > SESSION_MS) {
        sessionStorage.removeItem('feelit_ops_session');
        return null;
      }
      return s;
    } catch (e) { return null; }
  }
  function writeSession(email, role, perms) {
    const e = String(email).toLowerCase().trim();
    sessionStorage.setItem('feelit_ops_session', JSON.stringify({ email: e, role, perms, t: Date.now() }));
    sessionStorage.setItem('feelit_admin_session', JSON.stringify({ t: Date.now(), k: 'ops', email: e }));
  }
  function can(perm) {
    const s = readSession();
    if (!s) return false;
    if (s.role === 'owner') return true;
    return !!(s.perms && s.perms[perm]);
  }

  let session = null;
  let bookings = [], riders = [], apps = [], tours = [], messages = [];
  let view = 'home';
  let fleetMap = null, deskMap = null, activeBooking = null;
  const deskPins = {};

  function packOf(b) {
    try {
      return typeof b.ride_details === 'string' ? JSON.parse(b.ride_details || '{}') : (b.ride_details || {});
    } catch (e) { return {}; }
  }
  function hav(a, b, c, d) {
    if (!a || !c) return 0;
    const R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180;
    const q = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  }
  function deny() {
    return '<div class="card"><h3>Restricted</h3><p class="muted">The owner has not given you access to this module.</p></div>';
  }
  function localRiders() {
    try { return JSON.parse(localStorage.getItem('feelit_riders') || '[]'); } catch (e) { return []; }
  }
  function approved() {
    return (riders || []).filter(x => (x.status || 'approved') === 'approved');
  }
  function pendingApps() {
    return [...(riders || []).filter(x => x.status === 'pending'), ...(apps || [])];
  }

  async function tryLogin(email, pass) {
    email = String(email || '').trim().toLowerCase();
    pass = String(pass || '');
    if (!email || !pass) return { ok: false, err: 'Enter email and password.' };

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (!error && data && data.user) {
        const uEmail = (data.user.email || email).toLowerCase();
        if (isOwnerEmail(uEmail)) {
          writeSession(uEmail, 'owner', fullPerms());
          return { ok: true };
        }
        const rec = staffRecord(uEmail);
        if (rec) {
          writeSession(uEmail, 'staff', rec.perms || emptyPerms());
          return { ok: true };
        }
        await sb.auth.signOut();
        return { ok: false, err: 'Logged into Supabase, but this email is not an owner/staff. Use feelitofficial@gmail.com or ask owner to add you.' };
      }
      if (error) {
        console.warn('Supabase auth:', error.message);
      }
    } catch (e) {
      console.warn('Supabase auth exception', e);
    }

    const hash = await sha256(pass);
    if (isOwnerEmail(email) && hash === OWNER_PASS_HASH) {
      writeSession(email, 'owner', fullPerms());
      return { ok: true };
    }

    const rec = staffRecord(email);
    if (rec && rec.pass_hash && rec.pass_hash === hash) {
      writeSession(email, 'staff', rec.perms || emptyPerms());
      return { ok: true };
    }

    return { ok: false, err: 'Invalid email or password. Use the exact password from Supabase Authentication → Users.' };
  }

  async function logout() {
    try { await sb.auth.signOut(); } catch (e) {}
    sessionStorage.removeItem('feelit_ops_session');
    sessionStorage.removeItem('feelit_admin_session');
    location.reload();
  }

  async function refresh() {
    try {
      const [b, r, a, t, m] = await Promise.all([
        sb.from('bookings').select('*'),
        sb.from('riders').select('*'),
        sb.from('guide_apps').select('*'),
        sb.from('tours').select('*'),
        sb.from('messages').select('*').order('created_at', { ascending: true })
      ]);
      bookings = (b && b.data) || [];
      riders = (r && r.data) || localRiders();
      if (r && r.error) riders = localRiders();
      apps = (a && a.data) || [];
      tours = (t && t.data) || [];
      messages = (m && m.data) || [];
    } catch (e) {
      console.warn('refresh', e);
      bookings = bookings || [];
      riders = riders || localRiders();
