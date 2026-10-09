/* Feel It Operations — full desk + role-based staff access */
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

const sb = window.supabase.createClient(SB_URL, SB_KEY);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
const toast = (m) => { const t=$('toast'); t.textContent=m; t.style.display='block'; setTimeout(()=>t.style.display='none', 3200); };
const digits = (s) => String(s||'').replace(/\D/g,'');

async function sha256(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function loadStaffRoles(){
  try { return JSON.parse(localStorage.getItem('feelit_staff_roles')||'[]'); } catch(e){ return []; }
}
function saveStaffRoles(list){
  localStorage.setItem('feelit_staff_roles', JSON.stringify(list));
}
function isOwnerEmail(email){
  return OWNERS.some(o => o.toLowerCase() === String(email||'').toLowerCase().trim());
}
function staffRecord(email){
  return loadStaffRoles().find(s => s.email.toLowerCase() === String(email||'').toLowerCase().trim() && s.active !== false);
}
function fullPerms(){
  const p = {}; ALL_PERMS.forEach(k => p[k] = true); return p;
}
function emptyPerms(){
  const p = {}; ALL_PERMS.forEach(k => p[k] = false); return p;
}

function readSession(){
  try {
    const s = JSON.parse(sessionStorage.getItem('feelit_ops_session')||'null');
    if(!s || !s.email || !s.t) return null;
    if(Date.now() - s.t > SESSION_MS){ sessionStorage.removeItem('feelit_ops_session'); return null; }
    return s;
  } catch(e){ return null; }
}
function writeSession(email, role, perms){
  sessionStorage.setItem('feelit_ops_session', JSON.stringify({
    email: String(email).toLowerCase(), role, perms, t: Date.now()
  }));
  sessionStorage.setItem('feelit_admin_session', JSON.stringify({ t: Date.now(), k:'ops', email: String(email).toLowerCase() }));
}
function can(perm){
  const s = readSession();
  if(!s) return false;
  if(s.role === 'owner') return true;
  return !!(s.perms && s.perms[perm]);
}

let session = null;
let bookings = [], riders = [], apps = [], tours = [], messages = [];
let view = 'home';
let fleetMap, deskMap, activeBooking = null;
let tapMode = 'start', tapLat = 0, tapLng = 0;
const deskPins = {};

function packOf(b){
  try { return typeof b.ride_details === 'string' ? JSON.parse(b.ride_details||'{}') : (b.ride_details||{}); }
  catch(e){ return {}; }
}
function hav(a,b,c,d){
  if(!a||!c) return 0;
  const R=6371, x=(c-a)*Math.PI/180, y=(d-b)*Math.PI/180;
  const q=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;
  return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}

async function tryLogin(email, pass){
  email = String(email||'').trim().toLowerCase();
  pass = String(pass||'');
  if(!email || !pass) return { ok:false, err:'Enter email and password.' };
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(!error && data?.user){
      const uEmail = (data.user.email||email).toLowerCase();
      if(isOwnerEmail(uEmail)){
        writeSession(uEmail, 'owner', fullPerms());
        return { ok:true };
      }
      const rec = staffRecord(uEmail);
      if(rec){
        writeSession(uEmail, 'staff', rec.perms || emptyPerms());
        return { ok:true };
      }
      await sb.auth.signOut();
      return { ok:false, err:'This account is not on the staff list. Ask the owner to grant access.' };
    }
  } catch(e){}
  const hash = await sha256(pass);
  if(isOwnerEmail(email) && hash === OWNER_PASS_HASH){
    writeSession(email, 'owner', fullPerms());
    return { ok:true };
  }
  const rec = staffRecord(email);
  if(rec && rec.pass_hash && rec.pass_hash === hash){
    writeSession(email, 'staff', rec.perms || emptyPerms());
    return { ok:true };
  }
  return { ok:false, err:'Invalid email or password, or no staff access.' };
}

async function logout(){
  try { await sb.auth.signOut(); } catch(e){}
  sessionStorage.removeItem('feelit_ops_session');
  sessionStorage.removeItem('feelit_admin_session');
  location.reload();
}

async function boot(){
  session = readSession();
  if(!session){
    try {
      const legacy = JSON.parse(sessionStorage.getItem('feelit_admin_session')||'null');
      if(legacy && legacy.email && isOwnerEmail(legacy.email) && legacy.t && Date.now()-legacy.t < SESSION_MS){
        writeSession(legacy.email, 'owner', fullPerms());
        session = readSession();
      }
    } catch(e){}
  }
  if(!session){
    try {
      const { data:{ user } } = await sb.auth.getUser();
      if(user?.email){
        const u = user.email.toLowerCase();
        if(isOwnerEmail(u)){ writeSession(u,'owner',fullPerms()); session = readSession(); }
        else {
          const rec = staffRecord(u);
          if(rec){ writeSession(u,'staff',rec.perms||emptyPerms()); session = readSession(); }
        }
      }
    } catch(e){}
  }

  if(!session){
    $('loginGate').hidden = false;
    $('opsApp').hidden = true;
    $('opsLoginBtn').onclick = async () => {
      const err = $('opsLoginErr');
      err.style.display = 'none';
      const res = await tryLogin($('opsEmail').value, $('opsPass').value);
      if(!res.ok){ err.textContent = res.err; err.style.display = 'block'; return; }
      location.reload();
    };
    $('opsPass').onkeydown = (e) => { if(e.key==='Enter') $('opsLoginBtn').click(); };
    return;
  }

  $('loginGate').hidden = true;
  $('opsApp').hidden = false;
  $('who').textContent = session.email;
  $('roleTag').textContent = session.role === 'owner' ? 'Owner · full access' : 'Staff · limited access';

  document.querySelectorAll('nav button[data-v]').forEach(btn => {
    const v = btn.dataset.v;
    if(v === 'out'){ btn.onclick = logout; return; }
    if(v === 'home'){ btn.disabled = false; }
    else if(v === 'staff'){ btn.disabled = !can('staff'); }
    else { btn.disabled = !can(v); }
    btn.onclick = () => {
      if(btn.disabled) return;
      if(v === 'out') return logout();
      document.querySelectorAll('nav button[data-v]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      view = v;
      render();
    };
  });

  await refresh();
  render();
  setInterval(refreshQuiet, 20000);
}

async function refresh(){
  const [b,r,a,t,m] = await Promise.all([
    sb.from('bookings').select('*'),
    sb.from('riders').select('*'),
    sb.from('guide_apps').select('*'),
    sb.from('tours').select('*'),
    sb.from('messages').select('*').order('created_at',{ascending:true})
  ]);
  bookings = b.data || [];
  riders = r.data || localRiders();
  if(!r.data) riders = localRiders();
  apps = a.data || [];
  tours = t.data || [];
  messages = m.data || [];
}
async function refreshQuiet(){ try { await refresh(); if(view==='live'||view==='home') render(); } catch(e){} }
function localRiders(){ try { return JSON.parse(localStorage.getItem('feelit_riders')||'[]'); } catch(e){ return []; } }
function saveLocalRiders(list){ localStorage.setItem('feelit_riders', JSON.stringify(list)); riders = list; }
function approved(){ return riders.filter(x => (x.status||'approved')==='approved'); }
function pendingApps(){ return [...riders.filter(x=>x.status==='pending'), ...apps]; }

function render(){
  if(!can(view) && view !== 'home'){ view='home'; }
  const titles = {
    home:'Overview', bookings:'Bookings', live:'Live fleet', riders:'Captain roster', apps:'Applications',
    messages:'Messages', tours:'Tours', featured:'Featured & crop', money:'Costs & splits',
    settings:'Site settings', staff:'Staff access'
  };
  $('viewTitle').textContent = titles[view] || 'Ops';
  const map = {
    home:viewHome, bookings:viewBookings, live:viewLive, riders:viewRiders, apps:viewApps,
    messages:viewMessages, tours:viewTours, featured:viewFeatured, money:viewMoney,
    settings:viewSettings, staff:viewStaff
  };
  $('stage').innerHTML = map[view] ? map[view]() : '<div class="card">No access.</div>';
  if(view==='live') setTimeout(drawFleet, 40);
  if(view==='bookings' && activeBooking) setTimeout(()=>drawDesk(activeBooking), 40);
}

function viewHome(){
  const pending = bookings.filter(b=>(b.status||'Pending')==='Pending').length;
  const live = bookings.filter(b=>b.status==='In Progress').length;
  const caps = approved().length;
  const wait = pendingApps().length;
  return `
    <div class="kpis">
      <div class="kpi"><b>${pending}</b><span>Payments to verify</span></div>
      <div class="kpi"><b>${live}</b><span>Rides live</span></div>
      <div class="kpi"><b>${caps}</b><span>Captains</span></div>
      <div class="kpi"><b>${wait}</b><span>Applications</span></div>
    </div>
    <div class="card">
      <h3>Your access</h3>
      <p class="muted">${session.role==='owner'?'Owner — every desk is unlocked.':'Staff — only the modules the owner enabled for you.'}</p>
      <div class="perm-grid">${ALL_PERMS.map(p=>`<label><input type="checkbox" disabled ${can(p)?'checked':''}> ${esc(PERM_LABELS[p])}</label>`).join('')}</div>
    </div>
    <div class="grid2">
      <div class="card"><h3>Need verify</h3>${can('bookings')?bookings.filter(b=>(b.status||'Pending')==='Pending').slice(0,6).map(miniBook).join('')||'<p class="muted">None.</p>':'<p class="muted">No booking access.</p>'}</div>
      <div class="card"><h3>Live rides</h3>${can('live')?bookings.filter(b=>b.status==='In Progress').map(miniBook).join('')||'<p class="muted">None live.</p>':'<p class="muted">No fleet access.</p>'}</div>
    </div>`;
}
function miniBook(b){
  return `<div class="row" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">
    <div><strong>${esc(b.tour_title)}</strong><div class="muted">${esc(b.name)} · ${esc(b.date)}</div></div>
    ${can('bookings')?`<button class="btn btn-p" onclick="openBook('${esc(b.id)}')">Open</button>`:''}
  </div>`;
}

function viewBookings(){
  if(!can('bookings')) return deny();
  const rows = [...bookings].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  return `<div class="card">${rows.map(bookingCard).join('')||'<p class="muted">No bookings yet.</p>'}</div>`;
}
function deny(){ return `<div class="card"><h3>Restricted</h3><p class="muted">The owner has not given you access to this module.</p></div>`; }
