(function(){
'use strict';
const SB_URL='https://gsjkexvchfozviqllpvq.supabase.co';
const SB_KEY='sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';
const OWNERS=['admin@feelit.com','feelitofficial@gmail.com'];
const SESSION_MS=8*60*60*1000;
const ALL_PERMS=['bookings','live','riders','apps','messages','tours','featured','money','settings','staff'];
const LABELS={bookings:'Bookings',live:'Live fleet',riders:'Captains',apps:'Applications',messages:'Messages',tours:'Tours',featured:'Featured',money:'Costs',settings:'Settings',staff:'Staff access'};
if(!window.supabase){document.body.innerHTML='<div style="padding:40px;background:#0B0F19;color:#fff;font-family:system-ui"><h1>Supabase failed to load</h1><p>Disable adblock and refresh.</p></div>';return;}
const sb=window.supabase.createClient(SB_URL,SB_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).split('&').join('&'+'amp;').split('<').join('&'+'lt;').split('>').join('&'+'gt;').split('"').join('&'+'quot;');
const toast=m=>{const t=$('toast');if(!t)return;t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',3000);};
const isOwner=e=>OWNERS.some(o=>o===String(e||'').toLowerCase().trim());
const fullP=()=>{const p={};ALL_PERMS.forEach(k=>p[k]=true);return p;};
const emptyP=()=>{const p={};ALL_PERMS.forEach(k=>p[k]=false);return p;};
function loadStaff(){try{return JSON.parse(localStorage.getItem('feelit_staff_roles')||'[]');}catch(e){return[];}}
function saveStaff(list){localStorage.setItem('feelit_staff_roles',JSON.stringify(list));}
function staffRec(email){const e=String(email||'').toLowerCase();return loadStaff().find(s=>s.email===e&&s.active!==false);}
function readS(){try{const s=JSON.parse(sessionStorage.getItem('feelit_ops_session')||'null');if(!s||!s.email||!s.t||Date.now()-s.t>SESSION_MS)return null;return s;}catch(e){return null;}}
function writeS(email,role,perms){const e=String(email).toLowerCase();sessionStorage.setItem('feelit_ops_session',JSON.stringify({email:e,role,perms,t:Date.now()}));sessionStorage.setItem('feelit_admin_session',JSON.stringify({t:Date.now(),k:'ops',email:e}));}
function can(p){const s=readS();if(!s)return false;if(s.role==='owner')return true;return !!(s.perms&&s.perms[p]);}
let session=null,bookings=[],riders=[],apps=[],tours=[],messages=[],view='home',activeBooking=null,fleetMap=null,deskMap=null;
function packOf(b){try{return typeof b.ride_details==='string'?JSON.parse(b.ride_details||'{}'):(b.ride_details||{});}catch(e){return{};}}
function deny(){return '<div class="card"><h3>Restricted</h3><p class="muted">No access to this module.</p></div>';}
function approved(){return (riders||[]).filter(x=>(x.status||'approved')==='approved');}
function pendingApps(){return [...(riders||[]).filter(x=>x.status==='pending'),...(apps||[])];}
async function tryLogin(email,pass){
  email=String(email||'').trim().toLowerCase();pass=String(pass||'');
  if(!email||!pass)return{ok:false,err:'Enter email and password.'};
  try{
    const{data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(!error&&data&&data.user){
      const u=(data.user.email||email).toLowerCase();
      if(isOwner(u)){writeS(u,'owner',fullP());return{ok:true};}
      const rec=staffRec(u);
      if(rec){writeS(u,'staff',rec.perms||emptyP());return{ok:true};}
      await sb.auth.signOut();
      return{ok:false,err:'This Supabase user is not owner/staff. Use feelitofficial@gmail.com'};
    }
    if(error) return{ok:false,err:'Supabase: '+error.message};
  }catch(e){return{ok:false,err:String(e.message||e)}};
  return{ok:false,err:'Login failed. Check email/password in Supabase Auth → Users.'};
}
async function logout(){try{await sb.auth.signOut();}catch(e){}sessionStorage.removeItem('feelit_ops_session');sessionStorage.removeItem('feelit_admin_session');location.reload();}
async function refresh(){
  try{
    const[b,r,a,t,m]=await Promise.all([
      sb.from('bookings').select('*'),sb.from('riders').select('*'),sb.from('guide_apps').select('*'),
      sb.from('tours').select('*'),sb.from('messages').select('*').order('created_at',{ascending:true})
    ]);
    bookings=b.data||[];riders=r.data||[];apps=a.data||[];tours=t.data||[];messages=m.data||[];
  }catch(e){console.warn(e);}
}
function render(){
  if(!session)return;
  if(view!=='home'&&!can(view))view='home';
  const titles={home:'Overview',bookings:'Bookings',live:'Live fleet',riders:'Captains',apps:'Applications',messages:'Messages',tours:'Tours',featured:'Featured',money:'Costs',settings:'Settings',staff:'Staff access'};
  if($('viewTitle'))$('viewTitle').textContent=titles[view]||'Ops';
  const map={home:viewHome,bookings:viewBookings,live:viewLive,riders:viewRiders,apps:viewApps,messages:viewMessages,tours:viewTours,featured:viewFeatured,money:viewMoney,settings:viewSettings,staff:viewStaff};
  try{$('stage').innerHTML=map[view]?map[view]():deny();}catch(err){$('stage').innerHTML='<div class="card"><h3>Error</h3><p class="muted">'+esc(err.message)+'</p></div>';}
  if(view==='live')setTimeout(drawFleet,40);
  if(view==='bookings'&&activeBooking)setTimeout(()=>drawDesk(activeBooking),40);
}
function viewHome(){
  const pending=bookings.filter(b=>(b.status||'Pending')==='Pending').length;
  const live=bookings.filter(b=>b.status==='In Progress').length;
  return '<div class="kpis"><div class="kpi"><b>'+pending+'</b><span>To verify</span></div><div class="kpi"><b>'+live+'</b><span>Live</span></div><div class="kpi"><b>'+approved().length+'</b><span>Captains</span></div><div class="kpi"><b>'+pendingApps().length+'</b><span>Apps</span></div></div>'
    +'<div class="card"><h3>Your access</h3><p class="muted">'+(session.role==='owner'?'Owner — all modules.':'Staff — limited modules.')+'</p>'
    +'<div class="perm-grid">'+ALL_PERMS.map(p=>'<label><input type="checkbox" disabled '+(can(p)?'checked':'')+'> '+esc(LABELS[p])+'</label>').join('')+'</div></div>';
}
function viewBookings(){
  if(!can('bookings'))return deny();
  const rows=[...bookings].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  if(!rows.length)return '<div class="card"><p class="muted">No bookings yet.</p></div>';
  return rows.map(b=>{
    const st=b.status||'Pending';
    const roster=approved().map(r=>'<option value="'+esc(r.phone)+'" data-name="'+esc(r.name)+'">'+esc(r.name)+'</option>').join('');
    let actions='';
    if(st==='Pending'){
      actions='<label>Captain</label><select id="pick-'+esc(b.id)+'"><option value="">—</option>'+roster+'</select>'
        +'<div class="row"><button class="btn btn-p" type="button" data-act="confirm" data-id="'+esc(b.id)+'">Verify & assign</button>'
        +'<button class="btn btn-d" type="button" data-act="status" data-id="'+esc(b.id)+'" data-st="Cancelled">Decline</button></div>';
    } else {
      actions='<p>Captain: <strong>'+esc(b.guide||'—')+'</strong> '+esc(b.guide_phone||'')+'</p><div class="row">'
        +'<button class="btn btn-p" type="button" data-act="open" data-id="'+esc(b.id)+'">Dispatch</button>'
        +(st==='Confirmed'?'<button class="btn btn-p" type="button" data-act="status" data-id="'+esc(b.id)+'" data-st="In Progress">Start</button>':'')
        +(st==='In Progress'?'<button class="btn btn-p" type="button" data-act="status" data-id="'+esc(b.id)+'" data-st="Completed">Complete</button>':'')
        +'</div>';
    }
    const desk=activeBooking===b.id?deskHtml(b):'';
    return '<div class="card"><div class="row"><h3>'+esc(b.tour_title)+'</h3><span class="pill">'+esc(st)+'</span></div>'
      +'<p class="muted">'+esc(b.name)+' · '+esc(b.email)+' · '+esc(b.phone)+' · '+esc(b.date)+' · NPR '+esc(b.total)+'</p>'+actions+desk+'</div>';
  }).join('');
}
function deskHtml(b){
  const p=packOf(b);
  return '<div class="grid2" style="margin-top:12px"><div>'
    +'<label>Meeting</label><input id="d-meet" value="'+esc(p.meeting_point||'')+'">'
    +'<label>Time</label><input id="d-time" value="'+esc(p.meeting_time||'')+'">'
    +'<label>Itinerary</label><textarea id="d-itin" rows="3">'+esc(p.itinerary||'')+'</textarea>'
    +'<button class="btn btn-p" type="button" data-act="publish" data-id="'+esc(b.id)+'">Send briefing</button>'
    +'<p class="muted">Tap map: start → end → live pin</p></div><div id="deskMap"></div></div>';
}
function viewLive(){if(!can('live'))return deny();return '<div class="card"><div id="fleetMap"></div></div>';}
function drawFleet(){
  const el=$('fleetMap');if(!el||!window.L)return;
  if(fleetMap){try{fleetMap.remove();}catch(e){}fleetMap=null;}
  fleetMap=L.map(el).setView([28.1,84.1],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(fleetMap);
  bookings.filter(b=>b.status==='In Progress'||b.status==='Confirmed').forEach(b=>{
    const p=packOf(b);const lat=p.live_lat||p.start_lat,lng=p.live_lng||p.start_lng;if(!lat)return;
    L.circleMarker([lat,lng],{radius:9,color:'#00F5D4',fillColor:'#00F5D4',fillOpacity:.9}).addTo(fleetMap).bindPopup(esc(b.guide||b.tour_title||''));
  });
  setTimeout(()=>fleetMap.invalidateSize(),200);
}
function drawDesk(id){
  const b=bookings.find(x=>x.id===id);const el=$('deskMap');if(!b||!el||!window.L)return;
  if(deskMap){try{deskMap.remove();}catch(e){}deskMap=null;}
  const p=packOf(b);
  deskMap=L.map(el).setView([p.live_lat||p.start_lat||27.7,p.live_lng||p.start_lng||85.3],8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(deskMap);
  const mark=(lat,lng,lab)=>{if(lat)L.marker([lat,lng]).addTo(deskMap).bindPopup(lab);};
  mark(p.start_lat,p.start_lng,'Start');mark(p.dest_lat,p.dest_lng,'End');mark(p.live_lat,p.live_lng,'Live');
  deskMap.on('click',e=>{
    const lat=e.latlng.lat,lng=e.latlng.lng;
    if(!p.start_lat){p.start_lat=lat;p.start_lng=lng;}else if(!p.dest_lat){p.dest_lat=lat;p.dest_lng=lng;}else{p.live_lat=lat;p.live_lng=lng;}
    b._draft=p;L.marker([lat,lng]).addTo(deskMap);
  });
  setTimeout(()=>deskMap.invalidateSize(),200);
}
function viewRiders(){
  if(!can('riders'))return deny();
  return '<div class="card"><h3>Captains</h3>'+(approved().map(r=>'<div class="row"><strong>'+esc(r.name)+'</strong> '+esc(r.phone)+'</div>').join('')||'<p class="muted">None</p>')
    +'<label>Name</label><input id="nr-name"><label>Phone</label><input id="nr-phone">'
    +'<button class="btn btn-p" type="button" data-act="addRider">Add</button></div>';
}
function viewApps(){
  if(!can('apps'))return deny();
  return '<div class="card"><h3>Applications</h3>'+(pendingApps().map(r=>'<div class="row"><strong>'+esc(r.name)+'</strong> '+esc(r.phone)
    +'<button class="btn btn-p" type="button" data-act="approve" data-id="'+esc(r.id||'')+'" data-name="'+esc(r.name)+'" data-phone="'+esc(r.phone)+'">Confirm</button></div>').join('')||'<p class="muted">None</p>')+'</div>';
}
function viewMessages(){
  if(!can('messages'))return deny();
  const by={};messages.forEach(m=>by[m.email]=m);
  return '<div class="card">'+(Object.values(by).map(m=>'<div><strong>'+esc(m.name||m.email)+'</strong><div class="muted">'+esc((m.body||'').slice(0,100))+'</div></div>').join('')||'<p class="muted">None</p>')+'</div>';
}
function viewTours(){
  if(!can('tours'))return deny();
  return '<div class="card"><h3>Prices</h3>'+(tours.map(t=>'<div class="row"><span>'+esc(t.title)+'</span>'
    +'<input id="tp-'+esc(t.id)+'" value="'+esc(t.price)+'" style="width:90px;margin:0">'
    +'<input id="tpl-'+esc(t.id)+'" value="'+esc(t.price_local||'')+'" style="width:90px;margin:0">'
    +'<button class="btn btn-p" type="button" data-act="tourprice" data-id="'+esc(t.id)+'">Save</button></div>').join('')||'<p class="muted">No tours</p>')+'</div>';
}
function viewFeatured(){
  if(!can('featured'))return deny();
  let feat=[];try{feat=JSON.parse(localStorage.getItem('feelit_featured_ids')||'[]');}catch(e){}
  return '<div class="card"><h3>Featured</h3>'+tours.map(t=>'<label class="chk"><input type="checkbox" data-feat="'+esc(t.id)+'" '+(feat.includes(t.id)?'checked':'')+'> '+esc(t.title)+'</label>').join('')
    +'<button class="btn btn-p" type="button" data-act="saveFeat">Save</button></div>';
}
function viewMoney(){
  if(!can('money'))return deny();
  return '<div class="card"><h3>Costs</h3>'
    +'<label>Fuel</label><input id="m-fuel" value="'+esc(localStorage.getItem('feelit_fuel_price')||'180')+'">'
    +'<label>Hotel</label><input id="m-hotel" value="'+esc(localStorage.getItem('feelit_hotel_cost')||'2000')+'">'
    +'<label>Food</label><input id="m-food" value="'+esc(localStorage.getItem('feelit_food_cost')||'1000')+'">'
    +'<label>Driver %</label><input id="m-driver" value="'+esc(localStorage.getItem('feelit_driver_pct')||'40')+'">'
    +'<label>Owner %</label><input id="m-owner" value="'+esc(localStorage.getItem('feelit_owner_pct')||'60')+'">'
    +'<button class="btn btn-p" type="button" data-act="saveMoney">Save</button></div>';
}
function viewSettings(){
  if(!can('settings'))return deny();
  return '<div class="card"><h3>Settings</h3><label>Hero image</label><input id="s-bg" value="'+esc(localStorage.getItem('feelit_hero_bg')||'assets/1.png')+'">'
    +'<button class="btn btn-p" type="button" data-act="saveSettings">Save</button></div>';
}
function viewStaff(){
  if(!can('staff'))return deny();
  const list=loadStaff();
  return '<div class="card"><h3>Owners</h3><p class="muted">'+OWNERS.map(esc).join(', ')+'</p></div>'
    +'<div class="card"><h3>Add staff</h3><label>Email</label><input id="st-email"><label>Name</label><input id="st-name">'
    +'<div class="perm-grid">'+ALL_PERMS.filter(p=>p!=='staff').map(p=>'<label><input type="checkbox" value="'+p+'"> '+esc(LABELS[p])+'</label>').join('')+'</div>'
    +'<button class="btn btn-p" type="button" data-act="saveStaff">Save staff</button></div>'
    +'<div class="card"><h3>Staff</h3>'+(list.map((s,i)=>'<div class="row"><strong>'+esc(s.email)+'</strong><button class="btn btn-d" type="button" data-act="rmStaff" data-i="'+i+'">Remove</button></div>').join('')||'<p class="muted">None</p>')+'</div>';
}
function wire(){
  const stage=$('stage');if(!stage||stage._w)return;stage._w=true;
  stage.addEventListener('click',async ev=>{
    const t=ev.target.closest('[data-act]');if(!t)return;
    const act=t.getAttribute('data-act');const id=t.getAttribute('data-id');
    if(act==='open'){activeBooking=id;view='bookings';document.querySelectorAll('nav button[data-v]').forEach(b=>b.classList.toggle('active',b.dataset.v==='bookings'));render();return;}
    if(act==='confirm'){
      const sel=document.getElementById('pick-'+id);if(!sel||!sel.value){toast('Choose captain');return;}
      const phone=sel.value;const name=(sel.selectedOptions[0].getAttribute('data-name')||'').trim();
      const{error}=await sb.from('bookings').update({guide:name,guide_phone:phone,status:'Confirmed'}).eq('id',id);
      if(error)toast(error.message);else{toast('Assigned');await refresh();activeBooking=id;render();}return;
    }
    if(act==='status'){const st=t.getAttribute('data-st');const{error}=await sb.from('bookings').update({status:st}).eq('id',id);toast(error?error.message:st);await refresh();render();return;}
    if(act==='publish'){
      const b=bookings.find(x=>x.id===id);if(!b)return;const p=Object.assign(packOf(b),b._draft||{});
      p.meeting_point=($('d-meet')||{}).value||'';p.meeting_time=($('d-time')||{}).value||'';p.itinerary=($('d-itin')||{}).value||'';
      await sb.from('bookings').update({ride_details:JSON.stringify(p)}).eq('id',id);toast('Briefing saved');return;
    }
    if(act==='addRider'){
      const row={name:(($('nr-name')||{}).value||'').trim(),phone:(($('nr-phone')||{}).value||'').trim(),status:'approved'};
      if(!row.name||!row.phone){toast('Need name+phone');return;}await sb.from('riders').insert([row]);toast('Added');await refresh();render();return;
    }
    if(act==='approve'){await sb.from('riders').insert([{name:t.getAttribute('data-name'),phone:t.getAttribute('data-phone'),status:'approved'}]);if(id)await sb.from('guide_apps').delete().eq('id',id);toast('Confirmed');await refresh();render();return;}
    if(act==='tourprice'){const price=Number(($('tp-'+id)||{}).value||0),price_local=Number(($('tpl-'+id)||{}).value||0);await sb.from('tours').update({price,price_local}).eq('id',id);toast('Saved');await refresh();render();return;}
    if(act==='saveFeat'){const ids=[...document.querySelectorAll('[data-feat]:checked')].map(e=>e.getAttribute('data-feat'));localStorage.setItem('feelit_featured_ids',JSON.stringify(ids));toast('Saved');return;}
    if(act==='saveMoney'){['fuel_price','hotel_cost','food_cost','driver_pct','owner_pct'].forEach((k,i)=>{const ids=['m-fuel','m-hotel','m-food','m-driver','m-owner'];localStorage.setItem('feelit_'+k,($(ids[i])||{}).value||'');});toast('Saved');return;}
    if(act==='saveSettings'){localStorage.setItem('feelit_hero_bg',($('s-bg')||{}).value||'');toast('Saved');return;}
    if(act==='saveStaff'){
      const email=(($('st-email')||{}).value||'').trim().toLowerCase();if(!email){toast('Email required');return;}if(isOwner(email)){toast('Already owner');return;}
      const perms=emptyP();document.querySelectorAll('.perm-grid input:checked').forEach(el=>{if(el.value)perms[el.value]=true;});
      const list=loadStaff();const idx=list.findIndex(s=>s.email===email);const row={email,name:(($('st-name')||{}).value||'').trim(),perms,active:true};
      if(idx>=0)list[idx]=Object.assign({},list[idx],row);else list.push(row);saveStaff(list);toast('Staff saved');render();return;
    }
    if(act==='rmStaff'){const list=loadStaff();list.splice(Number(t.getAttribute('data-i')),1);saveStaff(list);render();}
  });
}
function showApp(){
  if($('loginGate'))$('loginGate').hidden=true;
  if($('opsApp'))$('opsApp').hidden=false;
  if($('who'))$('who').textContent=session.email;
  if($('roleTag'))$('roleTag').textContent=session.role==='owner'?'Owner · full access':'Staff · limited access';
  document.querySelectorAll('nav button[data-v]').forEach(btn=>{
    const v=btn.dataset.v;
    if(v==='out'){btn.onclick=()=>logout();return;}
    btn.disabled=(v!=='home'&&!can(v));
    btn.onclick=()=>{if(btn.disabled)return;document.querySelectorAll('nav button[data-v]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');view=v;render();};
  });
  wire();
}
function showLogin(msg){
  if($('loginGate'))$('loginGate').hidden=false;
  if($('opsApp'))$('opsApp').hidden=true;
  const err=$('opsLoginErr');
  if(err&&msg){err.textContent=msg;err.style.display='block';}
  const btn=$('opsLoginBtn');
  if(btn){
    btn.onclick=async()=>{
      if(err)err.style.display='none';
      btn.disabled=true;btn.textContent='Signing in…';
      try{
        const res=await tryLogin(($('opsEmail')||{}).value,($('opsPass')||{}).value);
        if(!res.ok){if(err){err.textContent=res.err;err.style.display='block';}return;}
        session=readS();showApp();await refresh();render();
      }catch(ex){if(err){err.textContent=String(ex.message||ex);err.style.display='block';}}
      finally{btn.disabled=false;btn.textContent='Login';}
    };
  }
  if($('opsPass'))$('opsPass').onkeydown=e=>{if(e.key==='Enter'&&btn)btn.click();};
}
async function resolveSession(){
  let s=readS();if(s)return s;
  try{
    const leg=JSON.parse(sessionStorage.getItem('feelit_admin_session')||'null');
    if(leg&&leg.t&&Date.now()-leg.t<SESSION_MS){
      const em=(leg.email||'').toLowerCase();
      if(em&&isOwner(em)){writeS(em,'owner',fullP());return readS();}
      if(em){const rec=staffRec(em);if(rec){writeS(em,'staff',rec.perms||emptyP());return readS();}}
    }
  }catch(e){}
  try{
    const{data:{user}}=await sb.auth.getUser();
    if(user&&user.email){
      const u=user.email.toLowerCase();
      if(isOwner(u)){writeS(u,'owner',fullP());return readS();}
      const rec=staffRec(u);if(rec){writeS(u,'staff',rec.perms||emptyP());return readS();}
    }
  }catch(e){}
  return null;
}
async function boot(){
  try{
    session=await resolveSession();
    if(!session){showLogin();return;}
    showApp();await refresh();render();
  }catch(e){showLogin('Startup error: '+(e.message||e));}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
