const SB_URL = 'https://gsjkexvchfozviqllpvq.supabase.co';
const SB_KEY = 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';
const STAFF = ['admin@feelit.com', 'feelitofficial@gmail.com'];
const sb = window.supabase.createClient(SB_URL, SB_KEY);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = (m) => { const t=$('toast'); t.textContent=m; t.style.display='block'; setTimeout(()=>t.style.display='none', 3200); };
const digits = (s) => String(s||'').replace(/\D/g,'');

function isStaff(){
  try {
    const s = JSON.parse(sessionStorage.getItem('feelit_admin_session')||'null');
    if(s && s.t && Date.now()-s.t < 4*60*60*1000) return true;
  } catch(e){}
  return false;
}

let bookings = [];
let riders = [];
let apps = [];
let tours = [];
let messages = [];
let view = 'home';
let fleetMap, deskMap, activeBooking = null;
let tapMode = 'start';
let tapLat = 0, tapLng = 0;
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

async function boot(){
  if(!isStaff()){
    const { data:{ session } } = await sb.auth.getSession();
    const email = session?.user?.email || '';
    if(STAFF.some(s => s.toLowerCase() === email.toLowerCase())){
      sessionStorage.setItem('feelit_admin_session', JSON.stringify({ t: Date.now(), k:'ops', email }));
    } else {
      $('stage').innerHTML = `<div class="card"><h2>Operations is private</h2><p>Sign in from the guest site first.</p><a class="btn btn-p" href="index.html">Go to site</a></div>`;
      return;
    }
  }
  try {
    const { data:{ session } } = await sb.auth.getSession();
    $('who').textContent = session?.user?.email || 'Staff session';
  } catch(e){ $('who').textContent = 'Staff session'; }

  document.querySelectorAll('nav button[data-v]').forEach(btn => {
    btn.onclick = () => {
      if(btn.dataset.v === 'out') return logout();
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      view = btn.dataset.v;
      render();
    };
  });
  await refresh();
  render();
  setInterval(refreshQuiet, 15000);
}

async function logout(){
  try { await sb.auth.signOut(); } catch(e){}
  sessionStorage.removeItem('feelit_admin_session');
  location.href = 'index.html';
}

async function refresh(){
  const [b, r, a, t, m] = await Promise.all([
    sb.from('bookings').select('*'),
    sb.from('riders').select('*'),
    sb.from('guide_apps').select('*'),
    sb.from('tours').select('*'),
    sb.from('messages').select('*').order('created_at', { ascending:true })
  ]);
  bookings = b.data || [];
  riders = r.data || localRiders();
  apps = a.data || [];
  tours = t.data || [];
  messages = m.data || [];
  if(!r.data) riders = localRiders();
}
async function refreshQuiet(){ try { await refresh(); if(view==='live'||view==='home') render(); } catch(e){} }

function localRiders(){
  try { return JSON.parse(localStorage.getItem('feelit_riders')||'[]'); } catch(e){ return []; }
}
function saveLocalRiders(list){
  localStorage.setItem('feelit_riders', JSON.stringify(list));
  riders = list;
}

function approved(){ return riders.filter(x => (x.status||'approved') === 'approved'); }
function pendingApps(){
  const fromTable = riders.filter(x => x.status === 'pending');
  return [...fromTable, ...apps];
}

function render(){
  const titles = { home:'Overview', bookings:'Bookings', live:'Live fleet', riders:'Captain roster', apps:'Applications', messages:'Messages', tours:'Tours', money:'Costs' };
  $('viewTitle').textContent = titles[view] || 'Ops';
  const fn = { home: viewHome, bookings: viewBookings, live: viewLive, riders: viewRiders, apps: viewApps, messages: viewMessages, tours: viewTours, money: viewMoney }[view];
  $('stage').innerHTML = fn ? fn() : '';
  if(view === 'live') setTimeout(drawFleet, 40);
  if(view === 'bookings' && activeBooking) setTimeout(() => drawDesk(activeBooking), 40);
}

function viewHome(){
  const pending = bookings.filter(b => (b.status||'Pending')==='Pending').length;
  const live = bookings.filter(b => b.status==='In Progress').length;
  const caps = approved().length;
  const wait = pendingApps().length;
  return `
    <div class="kpis">
      <div class="kpi"><b>${pending}</b><span>Payments to verify</span></div>
      <div class="kpi"><b>${live}</b><span>Rides live now</span></div>
      <div class="kpi"><b>${caps}</b><span>Approved captains</span></div>
      <div class="kpi"><b>${wait}</b><span>Applications waiting</span></div>
    </div>
    <div class="card">
      <h3>How the desk works</h3>
      <ol style="color:#c9d4e5;line-height:1.7">
        <li>Captains apply on the guest site (Ride with us).</li>
        <li>You approve them here → they join the roster.</li>
        <li>A guest pays → you verify proof → pick a captain from the roster.</li>
        <li>Dispatch desk: briefing, map, stops, live pin.</li>
        <li>Captain opens captain console with booking ref + their phone.</li>
        <li>During the ride you can move the live pin, add a stop, and message both sides.</li>
      </ol>
    </div>
    <div class="grid2">
      <div class="card"><h3>Need verify</h3>${bookings.filter(b=>(b.status||'Pending')==='Pending').slice(0,6).map(miniBook).join('')||'<p>None.</p>'}</div>
      <div class="card"><h3>Live rides</h3>${bookings.filter(b=>b.status==='In Progress').map(miniBook).join('')||'<p>None live.</p>'}</div>
    </div>`;
}
function miniBook(b){
  return `<div class="row" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">
    <div><strong>${esc(b.tour_title)}</strong><div style="font-size:12px;color:var(--muted)">${esc(b.name)} · ${esc(b.date)}</div></div>
    <button class="btn btn-p" onclick="openBook('${esc(b.id)}')">Open</button>
  </div>`;
}

function viewBookings(){
  const rows = [...bookings].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  return `<div class="card">${rows.map(bookingCard).join('')||'<p>No bookings yet.</p>'}</div>`;
}

function bookingCard(b){
  const st = b.status || 'Pending';
  const pill = st==='In Progress'?'live': st==='Confirmed'?'ok': st==='Cancelled'?'warn':'';
  const roster = approved().map(r => `<option value="${esc(r.phone)}" data-name="${esc(r.name)}">${esc(r.name)} · ${esc(r.phone)}</option>`).join('');
  let actions = '';
  if(st==='Pending'){
    actions = `
      <label>Choose captain from roster</label>
      <select id="pick-${b.id}"><option value="">— select —</option>${roster}</select>
      <div class="row">
        <button class="btn btn-p" onclick="confirmPick('${esc(b.id)}')">Verify payment & assign</button>
        <button class="btn btn-d" onclick="setStatus('${esc(b.id)}','Cancelled')">Decline</button>
      </div>
      ${b.payment_proof?`<p><a href="${esc(b.payment_proof)}" target="_blank" rel="noopener">View payment proof</a></p>`:''}`;
  } else {
    actions = `
      <p>Captain: <strong>${esc(b.guide||'—')}</strong> · ${esc(b.guide_phone||'')}</p>
      <div class="row">
        <button class="btn btn-p" onclick="openBook('${esc(b.id)}')">Dispatch desk</button>
        ${st==='Confirmed'?`<button class="btn btn-p" onclick="setStatus('${esc(b.id)}','In Progress')">Start ride</button>`:''}
        ${st==='In Progress'?`<button class="btn btn-p" onclick="setStatus('${esc(b.id)}','Completed')">Complete</button>`:''}
        <button class="btn btn-d" onclick="setStatus('${esc(b.id)}','Cancelled')">Cancel</button>
      </div>`;
  }
  return `<div class="card" id="bk-${esc(b.id)}">
    <div class="row"><h3>${esc(b.tour_title)}</h3><span class="pill ${pill}">${esc(st)}</span></div>
    <p style="color:var(--muted);font-size:13px">${esc(b.name)} · ${esc(b.email)} · ${esc(b.phone)} · ${esc(b.date)} · NPR ${esc(b.total)} · ref ${esc(b.ref)}</p>
    ${actions}
    ${activeBooking===b.id ? deskHtml(b) : ''}
  </div>`;
}

function deskHtml(b){
  const p = packOf(b);
  const stops = Array.isArray(p.stops) ? p.stops : [];
  return `<div class="grid2" style="margin-top:12px">
    <div>
      <label>Meeting point</label><input id="d-meet" value="${esc(p.meeting_point||'')}">
      <label>Meeting time</label><input id="d-time" value="${esc(p.meeting_time||'')}">
      <label>Itinerary</label><textarea id="d-itin" rows="3">${esc(p.itinerary||'')}</textarea>
      <label>Food stops</label><textarea id="d-meals" rows="2">${esc(p.meals||'')}</textarea>
      <label>New stop name</label><input id="d-stop" placeholder="Tea house / viewpoint">
      <label>Note to captain about this stop</label><input id="d-stopnote" placeholder="Wait 20 min, guest photos">
      <div class="row">
        <button class="btn btn-g" type="button" onclick="addStop('${esc(b.id)}')">Add stop (uses last map tap)</button>
        <button class="btn btn-p" type="button" onclick="publishDesk('${esc(b.id)}')">Send briefing + map</button>
      </div>
      <button class="btn btn-g" type="button" onclick="waGuest('${esc(b.id)}')">Message guest</button>
      <button class="btn btn-g" type="button" onclick="waCap('${esc(b.id)}')">Message captain</button>
      <div>${stops.map((s,i)=>`<div class="row"><span>${esc(s.name)}</span><button class="btn btn-d" onclick="rmStop('${esc(b.id)}',${i})">Remove</button></div>`).join('')}</div>
      <p style="font-size:12px;color:var(--muted)">Map: 1st tap start, 2nd destination, later taps = live pin.</p>
    </div>
    <div id="deskMap"></div>
  </div>`;
}

window.openBook = (id) => { activeBooking = id; view='bookings';
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active', b.dataset.v==='bookings'));
  render();
};

window.confirmPick = async (id) => {
  const sel = document.getElementById('pick-'+id);
  const phone = sel.value;
  const name = sel.selectedOptions[0]?.dataset.name || sel.selectedOptions[0]?.textContent || '';
  if(!phone){ toast('Choose a captain from the roster.'); return; }
  const { error } = await sb.from('bookings').update({ guide: name.split('·')[0].trim(), guide_phone: phone, status:'Confirmed' }).eq('id', id);
  if(error){ toast('Could not confirm. Check staff login.'); return; }
  toast('Assigned. Opening dispatch.');
  await refresh();
  activeBooking = id;
  render();
};

window.setStatus = async (id, status) => {
  const { error } = await sb.from('bookings').update({ status }).eq('id', id);
  if(error) toast('Status not saved'); else toast('Updated: '+status);
  await refresh(); render();
};

function drawDesk(id){
  const b = bookings.find(x => x.id === id);
  const el = $('deskMap');
  if(!b || !el || !window.L) return;
  if(deskMap){ try{ deskMap.remove(); }catch(e){} deskMap=null; }
  const p = packOf(b);
  deskMap = L.map(el).setView([p.live_lat||p.start_lat||27.7, p.live_lng||p.start_lng||85.3], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(deskMap);
  const put = (k,lat,lng,lab) => {
    if(!lat) return;
    if(deskPins[k]) deskMap.removeLayer(deskPins[k]);
    deskPins[k] = L.marker([lat,lng]).addTo(deskMap).bindPopup(lab);
  };
  put('s', p.start_lat, p.start_lng, 'Start');
  put('d', p.dest_lat, p.dest_lng, 'End');
  put('l', p.live_lat, p.live_lng, 'Live');
  (p.stops||[]).forEach((s,i)=> put('st'+i, s.lat, s.lng, s.name));
  tapMode = p.start_lat ? (p.dest_lat ? 'live' : 'dest') : 'start';
  deskMap.on('click', e => {
    tapLat = e.latlng.lat; tapLng = e.latlng.lng;
    if(tapMode==='start'){ p.start_lat=tapLat; p.start_lng=tapLng; put('s',tapLat,tapLng,'Start'); tapMode='dest'; }
    else if(tapMode==='dest'){ p.dest_lat=tapLat; p.dest_lng=tapLng; put('d',tapLat,tapLng,'End'); tapMode='live'; }
    else { p.live_lat=tapLat; p.live_lng=tapLng; put('l',tapLat,tapLng,'Live'); }
    b._draft = p;
  });
  setTimeout(()=>deskMap.invalidateSize(), 200);
}

window.addStop = async (id) => {
  if(!tapLat){ toast('Tap the map first for the stop.'); return; }
  const b = bookings.find(x => x.id===id);
  const p = Object.assign(packOf(b), b._draft||{});
  p.stops = p.stops || [];
  p.stops.push({ name: ($('d-stop')?.value||'Stop').trim(), note: ($('d-stopnote')?.value||'').trim(), lat: tapLat, lng: tapLng });
  b._draft = p;
  await savePack(id, p);
  toast('Stop published to captain map.');
  render();
};
window.rmStop = async (id, i) => {
  const b = bookings.find(x => x.id===id);
  const p = packOf(b);
  p.stops.splice(i,1);
  await savePack(id, p);
  render();
};
window.publishDesk = async (id) => {
  const b = bookings.find(x => x.id===id);
  const p = Object.assign(packOf(b), b._draft||{});
  p.meeting_point = $('d-meet')?.value||'';
  p.meeting_time = $('d-time')?.value||'';
  p.itinerary = $('d-itin')?.value||'';
  p.meals = $('d-meals')?.value||'';
  p.km = hav(p.start_lat,p.start_lng,p.dest_lat,p.dest_lng);
  await savePack(id, p);
  toast('Guest + captain updated.');
};
async function savePack(id, p){
  const { error } = await sb.from('bookings').update({ ride_details: JSON.stringify(p) }).eq('id', id);
  if(error) toast('Could not save map.');
  const b = bookings.find(x => x.id===id);
  if(b) b.ride_details = JSON.stringify(p);
}
window.waGuest = (id) => {
  const b = bookings.find(x => x.id===id); if(!b) return;
  const p = packOf(b);
  const d = digits(b.phone); const n = d.startsWith('977')?d:'977'+d.replace(/^0+/,'');
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(`Feel It update for ${b.tour_title}: meet ${p.meeting_point||''} ${p.meeting_time||''}. Check My Account for the full briefing.`)}`,'_blank');
};
window.waCap = (id) => {
  const b = bookings.find(x => x.id===id); if(!b) return;
  const d = digits(b.guide_phone); const n = d.startsWith('977')?d:'977'+d.replace(/^0+/,'');
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(`Ops update for ${b.ref}: open captain console. New pin/stop published.`)}`,'_blank');
};

function viewLive(){
  const live = bookings.filter(b => b.status==='In Progress' || b.status==='Confirmed');
  return `<div class="card"><div id="fleetMap"></div></div>
    <div class="card">${live.map(b=>{
      const p=packOf(b);
      const remain = hav(p.live_lat||p.start_lat, p.live_lng||p.start_lng, p.dest_lat, p.dest_lng);
      return `<div class="row"><div><strong>${esc(b.guide||'Unassigned')}</strong> · ${esc(b.tour_title)}<div style="font-size:12px;color:var(--muted)">${remain.toFixed(1)} km remaining</div></div>
        <button class="btn btn-p" onclick="openBook('${esc(b.id)}')">Control this ride</button></div>`;
    }).join('')||'<p>No live rides. Start a ride from Bookings.</p>'}</div>`;
}
function drawFleet(){
  const el = $('fleetMap'); if(!el || !window.L) return;
  if(fleetMap){ try{ fleetMap.remove(); }catch(e){} fleetMap=null; }
  fleetMap = L.map(el).setView([28.1,84.1], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(fleetMap);
  bookings.filter(b => b.status==='In Progress' || b.status==='Confirmed').forEach(b => {
    const p = packOf(b);
    const lat = p.live_lat || p.start_lat; const lng = p.live_lng || p.start_lng;
    if(!lat) return;
    L.circleMarker([lat,lng],{radius:9,color:'#00F5D4',fillColor:'#00F5D4',fillOpacity:.9})
      .addTo(fleetMap).bindPopup(`${esc(b.guide||'Captain')}<br>${esc(b.tour_title)}`);
    if(p.dest_lat) L.polyline([[lat,lng],[p.dest_lat,p.dest_lng]],{color:'#FFB703'}).addTo(fleetMap);
  });
  setTimeout(()=>fleetMap.invalidateSize(), 200);
}

function viewRiders(){
  const list = approved();
  return `<div class="card">
    <h3>Approved captains (${list.length})</h3>
    <p style="color:var(--muted)">These names appear when you assign a booking.</p>
    ${list.map(r => `<div class="row" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <div><strong>${esc(r.name)}</strong><div style="font-size:12px;color:var(--muted)">${esc(r.phone)} · ${esc(r.bike||'')} · ${esc(r.regions||'')}</div></div>
      <button class="btn btn-d" onclick="setRider('${esc(r.id)}','suspended')">Suspend</button>
    </div>`).join('')||'<p>No approved captains yet. Approve someone under Applications.</p>'}
  </div>
  <div class="card">
    <h3>Add captain manually</h3>
    <label>Name</label><input id="nr-name">
    <label>Phone</label><input id="nr-phone">
    <label>Bike</label><input id="nr-bike">
    <label>Regions</label><input id="nr-reg">
    <button class="btn btn-p" onclick="addRider()">Add to roster</button>
  </div>`;
}

function viewApps(){
  const list = pendingApps();
  return `<div class="card">
    <h3>Waiting for your decision (${list.length})</h3>
    ${list.map((r) => `<div class="row" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <div><strong>${esc(r.name)}</strong><div style="font-size:12px;color:var(--muted)">${esc(r.phone)} · ${esc(r.email||'')} · ${esc(r.experience||r.regions||'')}</div></div>
      <div class="row">
        <button class="btn btn-p" onclick="approveApp('${esc(r.id||'')}','${esc(r.name)}','${esc(r.phone)}','${esc(r.email||'')}','${esc(r.experience||'')}','${esc(r.regions||'')}','${esc(r.bike||'')}')">Confirm as captain</button>
        <button class="btn btn-d" onclick="rejectApp('${esc(r.id||'')}')">Reject</button>
      </div>
    </div>`).join('')||'<p>No pending applications.</p>'}
  </div>`;
}

window.addRider = async () => {
  const row = { name:$('nr-name').value.trim(), phone:$('nr-phone').value.trim(), bike:$('nr-bike').value.trim(), regions:$('nr-reg').value.trim(), status:'approved' };
  if(!row.name||!row.phone){ toast('Name and phone required'); return; }
  const { error, data } = await sb.from('riders').insert([row]).select();
  if(error){
    const list = localRiders(); list.push({ ...row, id: 'local-'+Date.now() }); saveLocalRiders(list);
  } else if(data) { riders = [...riders, ...data]; }
  toast('Captain on roster.');
  await refresh(); render();
};
window.setRider = async (id, status) => {
  await sb.from('riders').update({ status }).eq('id', id);
  riders = riders.map(r => r.id===id ? {...r,status} : r);
  toast('Roster updated'); render();
};
window.approveApp = async (id, name, phone, email, experience, regions, bike) => {
  const row = { name, phone, email, experience, regions, bike, status:'approved' };
  if(id && !String(id).startsWith('local')){
    const { error } = await sb.from('riders').update({ status:'approved', name, phone }).eq('id', id);
    if(error) await sb.from('riders').insert([row]);
  } else {
    await sb.from('riders').insert([row]);
  }
  if(id) await sb.from('guide_apps').delete().eq('id', id);
  toast(name+' is now a captain.');
  await refresh(); render();
};
window.rejectApp = async (id) => {
  if(id) await sb.from('guide_apps').delete().eq('id', id);
  if(id) await sb.from('riders').update({ status:'rejected' }).eq('id', id);
  toast('Rejected'); await refresh(); render();
};

function viewMessages(){
  const by = {};
  messages.forEach(m => { by[m.email] = m; });
  return `<div class="card">${Object.values(by).map(m => `<div class="row"><div><strong>${esc(m.name||m.email)}</strong><div style="font-size:12px;color:var(--muted)">${esc((m.body||'').slice(0,80))}</div></div></div>`).join('')||'<p>No guest threads.</p>'}</div>`;
}
function viewTours(){
  return `<div class="card">${tours.map(t=>`<div class="row"><strong>${esc(t.title)}</strong><span>NPR ${esc(t.price)} / local ${esc(t.price_local||'—')}</span></div>`).join('')||'<p>Tours load from the database.</p>'}</div>`;
}
function viewMoney(){
  return `<div class="card"><p>Use Financial Control for splits.</p><a class="btn btn-g" href="admin.html">Open financial control</a></div>`;
}

boot();
