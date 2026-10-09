/* Feel It Official — production client */
const SUPABASE_URL = 'https://gsjkexvchfozviqllpvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const CONTACT_INFO = {
  email: 'feelitofficial@gmail.com',
  phone: '+977-9808747221',
  whatsapp: '9779825344810',
  address: 'Basundhara, Kathmandu, Nepal',
  instagram: 'feelitoffical'
};

const STAFF_EMAILS = ['admin@feelit.com', 'feelitofficial@gmail.com'];
const ADMIN_PASS_HASH = '1bc57fec7b82137e1cfeefed41c9a9f5ded5e69de2a397151c504e139bffd324';
const ADMIN_LOGIN_MAX_TRIES = 5;
const ADMIN_SESSION_MS = 4 * 60 * 60 * 1000;

const PAYMENT_METHODS = {
  bank: { key:'bank', icon:'🏦', label:'Bank Transfer', shortLabel:'Laxmi Sunrise', accountName:'Feel It Nepal', accountNumber:'See QR', qrImage:'assets/bank-qr.png' },
  esewa: { key:'esewa', icon:'📱', label:'eSewa', shortLabel:'Scan & pay', accountName:'Feel It', accountNumber:'eSewa ID on QR', qrImage:'assets/esewa-qr.png' }
};

const ROUTE_PRICING = {
  highway: { perKm:18, hotelPerDay:1800, foodPerDay:900 },
  offroad: { perKm:28, hotelPerDay:2200, foodPerDay:1100 }
};

const seedTours = [
  { id:'t1', title:'Sarangkot Sunrise Ridge', region:'Pokhara', duration:'Half day', price:5500, price_local:3500, guide:'Bikash Gurung', guide_phone:'+977-9812345678', desc:'Dawn climb to Sarangkot for sunrise.', includes:['125cc bike','Helmet','Fuel','Guide'], lat:28.2439, lng:83.9486, imageUrl:'' },
  { id:'t2', title:'Kathmandu Valley Rim Loop', region:'Kathmandu', duration:'Full day', price:9500, price_local:6500, guide:'Sunita Tamang', guide_phone:'+977-9823456789', desc:'Full loop around Kathmandu ridges.', includes:['150cc bike','Gear','Fuel','Lunch'], lat:27.7172, lng:85.3240, imageUrl:'' },
  { id:'t3', title:'Upper Mustang Desert Crossing', region:'Mustang', duration:'5 days', price:72000, price_local:48000, guide:'Tenzin Lama', guide_phone:'+977-9834567890', desc:'High desert crossing.', includes:['Off-road bike','Permit','Lodging'], lat:28.7819, lng:83.7380, imageUrl:'' },
  { id:'hg1', title:'Nagarkot Sunset Ridge', region:'Kathmandu', duration:'Half day', price:4000, price_local:2500, guide:'Sunita Tamang', guide_phone:'+977-9823456789', desc:'Afternoon climb to Nagarkot.', includes:['Bike','Helmet','Fuel'], lat:27.7154, lng:85.5205, imageUrl:'', hidden_gem:true },
  { id:'hg2', title:'Phewa Lakeside Loop', region:'Pokhara', duration:'3 hours', price:3000, price_local:1800, guide:'Bikash Gurung', guide_phone:'+977-9812345678', desc:'Easy lakeside lanes.', includes:['Bike','Helmet','Fuel'], lat:28.2096, lng:83.9856, imageUrl:'', hidden_gem:true }
];

let tours = [];
let pendingBooking = null;
let reviewStats = {};
let knownGuides = [];

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function fmtNPR(n){ return 'NPR ' + (Number(n)||0).toLocaleString('en-NP'); }
function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'')); }
async function sha256(text){ const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
function inlineLoader(label){ return `<div class="empty-state">${esc(label||'Loading…')}</div>`; }
function convertDriveLink(url){ if(!url) return ''; const m=String(url).match(/\/d\/([a-zA-Z0-9_-]+)/)||String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/); return m?`https://lh3.googleusercontent.com/d/${m[1]}=w1600`:url; }
function imgSrc(url){ return convertDriveLink(url||''); }
function imgTag(url, alt, cls, extra){ const src=imgSrc(url); if(!src) return ''; return `<img src="${esc(src)}" alt="${esc(alt||'')}" class="${esc(cls||'')}" ${extra||''} loading="lazy">`; }
function setBusy(btn, label){ if(!btn) return ()=>{}; const old=btn.innerHTML; btn.disabled=true; btn.innerHTML=label||'…'; return ()=>{btn.disabled=false;btn.innerHTML=old;}; }
function showToast(msg, type){ let t=$('fiToast'); if(!t){ t=document.createElement('div'); t.id='fiToast'; t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:12px 18px;border-radius:12px;font-size:14px;max-width:90%;box-shadow:0 8px 30px rgba(0,0,0,.35)'; document.body.appendChild(t);} t.style.background=type==='error'?'#7f1d1d':'#134e4a'; t.style.color='#fff'; t.textContent=msg; t.hidden=false; clearTimeout(showToast._t); showToast._t=setTimeout(()=>{t.hidden=true;},4200); }
function showOverlay(){ const o=$('overlay')||$('modalOverlay'); if(o){ o.classList.add('open'); o.style.display='flex'; } document.body.style.overflow='hidden'; }
function closeOverlay(){ const o=$('overlay')||$('modalOverlay'); if(o){ o.classList.remove('open'); o.style.display='none'; } document.body.style.overflow=''; }
async function sbWrite(promise, failMessage){ if(!supabaseClient){ showToast(failMessage||'Database not ready','error'); return false; } try { const { error }=await promise; if(error){ console.error(failMessage,error); showToast((failMessage||'Save failed')+': '+(error.message||''),'error'); return false; } return true; } catch(e){ showToast(failMessage||'Save failed','error'); return false; } }
function val(id){ const el=$(id); return el?el.value:''; }

/* helpers — messages + ride pack */
function loadLocalMessages(email){ try{ return JSON.parse(localStorage.getItem('feelit_messages')||'[]').filter(m=>m.email===email);}catch(e){return[];} }
function saveLocalMessage(row){ try{ const all=JSON.parse(localStorage.getItem('feelit_messages')||'[]'); all.push({...row,id:row.id||('local_'+Date.now()),created_at:row.created_at||new Date().toISOString()}); localStorage.setItem('feelit_messages',JSON.stringify(all)); }catch(e){} }
function loadAllLocalMessages(){ try{ return JSON.parse(localStorage.getItem('feelit_messages')||'[]'); }catch(e){return[];} }
function loadRidePack(bookingId){ try{ const all=JSON.parse(localStorage.getItem('feelit_ride_packs')||'{}'); return all[String(bookingId)]||{}; }catch(e){return{};} }
function saveRidePackLocal(bookingId, pack){ try{ const all=JSON.parse(localStorage.getItem('feelit_ride_packs')||'{}'); all[String(bookingId)]={...loadRidePack(bookingId),...pack,updated_at:new Date().toISOString()}; localStorage.setItem('feelit_ride_packs',JSON.stringify(all)); }catch(e){} }
function mergeBookingRidePack(b){
  if(!b) return {};
  const local=loadRidePack(b.id);
  let remote={};
  if(b.ride_details){ try{ remote=typeof b.ride_details==='string'?JSON.parse(b.ride_details):(b.ride_details||{}); }catch(e){ remote={}; } }
  return {
    meeting_point: remote.meeting_point||local.meeting_point||'',
    meeting_time: remote.meeting_time||local.meeting_time||'',
    itinerary: remote.itinerary||local.itinerary||'',
    meals: remote.meals||local.meals||'',
    notes: remote.notes||local.notes||'',
    bring: remote.bring||local.bring||'',
    pickup: remote.pickup||local.pickup||'',
    emergency: remote.emergency||local.emergency||CONTACT_INFO.whatsapp,
    start_name: remote.start_name||local.start_name||'',
    dest_name: remote.dest_name||local.dest_name||'',
    start_lat: Number(remote.start_lat||local.start_lat||0)||0,
    start_lng: Number(remote.start_lng||local.start_lng||0)||0,
    dest_lat: Number(remote.dest_lat||local.dest_lat||0)||0,
    dest_lng: Number(remote.dest_lng||local.dest_lng||0)||0,
    live_lat: Number(remote.live_lat||local.live_lat||0)||0,
    live_lng: Number(remote.live_lng||local.live_lng||0)||0,
    km: Number(remote.km||local.km||0)||0,
    avg_kph: Number(remote.avg_kph||local.avg_kph||35)||35,
    fuel_lph: Number(remote.fuel_lph||local.fuel_lph||3.2)||3.2,
    tank_l: Number(remote.tank_l||local.tank_l||12)||12,
    stops: remote.stops||local.stops||[],
    tip_npr: remote.tip_npr||local.tip_npr||b.tip_npr||0,
    rated: !!(remote.rated||local.rated||b.rated)
  };
}
function statusClassFor(status){
  const s=String(status||'Pending').toLowerCase();
  if(s==='confirmed') return 'status-confirmed';
  if(s==='in progress'||s==='in_progress') return 'status-progress';
  if(s==='completed') return 'status-completed';
  if(s==='cancelled') return 'status-cancelled';
  return 'status-pending';
}
function renderRidePackCard(pack, opts){
  opts=opts||{}; pack=pack||{};
  const empty=!pack.meeting_point&&!pack.meeting_time&&!pack.itinerary&&!pack.meals&&!pack.notes&&!pack.bring;
  if(empty&&opts.adminPreview) return '<div class="pending-note">No ride pack yet.</div>';
  if(empty) return '<div class="pending-note">Your full ride briefing appears here after our team publishes it.</div>';
  const lines=s=>esc(s||'').replace(/\n/g,'<br>');
  return `<div class="ride-pack">
    <h4 class="ride-pack-title">Your ride briefing</h4>
    ${pack.meeting_point?`<div class="ride-pack-row"><span>Meet</span><strong>${esc(pack.meeting_point)}</strong></div>`:''}
    ${pack.meeting_time?`<div class="ride-pack-row"><span>Time</span><strong>${esc(pack.meeting_time)}</strong></div>`:''}
    ${pack.pickup?`<div class="ride-pack-row"><span>Pickup</span><strong>${esc(pack.pickup)}</strong></div>`:''}
    ${pack.itinerary?`<div class="ride-pack-block"><span>Itinerary</span><p>${lines(pack.itinerary)}</p></div>`:''}
    ${pack.meals?`<div class="ride-pack-block"><span>Where you eat</span><p>${lines(pack.meals)}</p></div>`:''}
    ${pack.bring?`<div class="ride-pack-block"><span>Bring</span><p>${lines(pack.bring)}</p></div>`:''}
    ${pack.notes?`<div class="ride-pack-block"><span>Notes</span><p>${lines(pack.notes)}</p></div>`:''}
  </div>`;
}
function renderPaymentProofThumb(b){
  let src=b.payment_proof||'';
  if(!src){ try{ src=(JSON.parse(localStorage.getItem('feelit_payment_proofs')||'{}')[b.ref]||''); }catch(e){} }
  if(!src) return '<div class="pending-note">No payment proof image.</div>';
  return `<div class="payment-proof-admin"><span>Payment proof</span><a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="Payment proof"></a></div>`;
}

function normalizeTour(t){
  return { ...t, desc:t.desc||t.description||'', guide_phone:t.guide_phone||t.guidePhone||'', imageUrl:t.image_url||t.imageUrl||'',
    includes:Array.isArray(t.includes)?t.includes:(t.includes?String(t.includes).split(',').map(s=>s.trim()).filter(Boolean):[]),
    hidden_gem:!!(t.hidden_gem||t.is_hidden_gem||t.hiddenGem),
    price:Number(t.price)||0, price_local:Number(t.price_local!=null?t.price_local:Math.round((Number(t.price)||0)*0.7))||0 };
}
async function loadTours(){
  try {
    const { data, error }=await supabaseClient.from('tours').select('*');
    if(error||!data||!data.length) tours=seedTours.map(normalizeTour);
    else tours=data.map(normalizeTour);
  } catch(e){ tours=seedTours.map(normalizeTour); }
  knownGuides=[...new Set(tours.map(t=>t.guide).filter(Boolean))];
  renderTours(); renderHiddenGems();
}
function cardHtml(t, gem){
  const art=t.imageUrl?imgTag(t.imageUrl,t.title,'card-photo','style="object-fit:cover;width:100%;height:100%;"'):`<div class="card-art-fallback">Photo coming soon</div>`;
  return `<article class="card">
    <div class="card-art" style="overflow:hidden;">${gem?'<span class="gem-badge">Hidden Gem</span>':''}${art}</div>
    <div class="card-body">
      <div class="card-region">${esc(t.region)}</div>
      <h3 class="card-title">${esc(t.title)}</h3>
      <div class="card-meta"><span>${esc(t.duration)}</span><span>Guide: ${esc(t.guide)}</span></div>
      <div class="card-price dual-price">
        <span class="price-foreign">${fmtNPR(t.price)} <small>foreigner</small></span>
        <span class="price-local">${fmtNPR(t.price_local)} <small>local</small></span>
      </div>
      <button class="btn btn-primary" onclick="openTour('${esc(t.id)}')">View &amp; book</button>
    </div>
  </article>`;
}
function renderTours(){
  const box=$('toursGrid')||document.querySelector('#tours .grid, #tours .cards');
  if(!box) return;
  const list=tours.filter(t=>!t.hidden_gem);
  box.innerHTML=list.length?list.map(t=>cardHtml(t,false)).join(''):'<div class="empty-state">Tours coming soon.</div>';
}
function renderHiddenGems(){
  const el=$('hiddenGemsGrid')||$('hiddenGems');
  if(!el) return;
  const gems=tours.filter(t=>t.hidden_gem);
  el.innerHTML=gems.length?gems.map(t=>cardHtml(t,true)).join(''):'<div class="empty-state">Hidden gems coming soon.</div>';
}
function estimateTourDays(duration){ const d=String(duration||'').toLowerCase(); const m=d.match(/(\d+)\s*day/); if(m) return Math.max(1,parseInt(m[1],10)); return 1; }
function calcTourAddons(t, travelers){
  const days=estimateTourDays(t.duration);
  const rates=ROUTE_PRICING.highway;
  const includeHotel=$('bookIncludeHotel')?.checked===true;
  const includeFood=$('bookIncludeFood')?.checked===true;
  const guestType=$('bookGuestType')?.value||'foreigner';
  const unit=guestType==='local'?(Number(t.price_local)||0):(Number(t.price)||0);
  const hotel=includeHotel?(rates.hotelPerDay||0)*days*travelers:0;
  const food=includeFood?(rates.foodPerDay||0)*days*travelers:0;
  const base=unit*travelers;
  return { days, includeHotel, includeFood, guestType, unitPrice:unit, hotel, food, base, total:Math.round((base+hotel+food)/100)*100 };
}
function updateTourBookingPrice(id){
  const t=tours.find(x=>x.id===id); if(!t) return;
  const travelers=Math.max(1,parseInt($('tourTravelers')?.value||'1',10));
  const c=calcTourAddons(t,travelers);
  const el=$('tourBookingPrice'); if(!el) return;
  el.innerHTML=`${fmtNPR(c.total)} <small>total · ${travelers} · ${c.guestType}</small>`;
}
function openTour(id){
  const t=tours.find(x=>x.id===id); if(!t) return;
  const mc=$('modalContent'); if(!mc) return;
  mc.innerHTML=`
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>${esc(t.title)}</h2>
    <p class="sub">${esc(t.region)} · ${esc(t.duration)} · Guide ${esc(t.guide)}</p>
    <p>${esc(t.desc)}</p>
    <div class="row-2">
      <div class="field"><label>Date</label><input type="date" id="tourDate"></div>
      <div class="field"><label>Travelers</label>
        <select id="tourTravelers" onchange="updateTourBookingPrice('${esc(t.id)}')">
          ${[1,2,3,4,5,6].map(n=>`<option value="${n}">${n}</option>`).join('')}
        </select>
      </div>
    </div>
    <label class="checkbox-field"><input type="checkbox" id="bookIncludeHotel" onchange="updateTourBookingPrice('${esc(t.id)}')"> Include hotel</label>
    <label class="checkbox-field"><input type="checkbox" id="bookIncludeFood" onchange="updateTourBookingPrice('${esc(t.id)}')"> Include food</label>
    <div class="field">
      <label for="bookGuestType">Price type</label>
      <select id="bookGuestType" onchange="updateTourBookingPrice('${esc(t.id)}')">
        <option value="foreigner">Foreign visitor — ${fmtNPR(t.price)} / person</option>
        <option value="local">Nepal resident — ${fmtNPR(t.price_local)} / person</option>
      </select>
    </div>
    <div class="card-price" id="tourBookingPrice">${fmtNPR(t.price)} <small>/ person</small></div>
    <button class="btn btn-primary" style="width:100%;" onclick="goToCheckout('${esc(t.id)}')">Continue to payment</button>`;
  showOverlay();
  updateTourBookingPrice(t.id);
}

async function goToCheckout(id){
  const t=tours.find(x=>x.id===id); if(!t) return;
  const date=$('tourDate')?.value;
  const travelers=parseInt($('tourTravelers')?.value||'1',10);
  if(!date){ showToast('Please select a tour date.','error'); return; }
  if(!travelers||travelers<1){ showToast('Travelers must be 1–6.','error'); return; }
  const sessionUser=await checkActiveAuthUser();
  const c=calcTourAddons(t,travelers);
  pendingBooking={ tourId:t.id, title:t.title, date, travelers, total:c.total, includeHotel:c.includeHotel, includeFood:c.includeFood, guestType:c.guestType, unitPrice:c.unitPrice, sessionUser, paymentMethod:null, paymentProof:null };
  renderPaymentMethodSelector();
}
function renderPaymentMethodSelector(){
  if(!pendingBooking) return;
  $('modalContent').innerHTML=`
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Choose a payment method</h2>
    <p class="sub">${esc(pendingBooking.title)} · ${esc(pendingBooking.date)} · <strong>${fmtNPR(pendingBooking.total)}</strong></p>
    <div class="payment-method-grid">
      ${Object.values(PAYMENT_METHODS).map(m=>`
        <button class="payment-method-card" onclick="selectPaymentMethod('${m.key}')">
          <span class="pm-icon">${m.icon}</span>
          <span class="pm-name">${esc(m.label)}</span>
          <span class="pm-sub">${esc(m.shortLabel)}</span>
        </button>`).join('')}
    </div>`;
  showOverlay();
}
function selectPaymentMethod(methodKey){ if(!pendingBooking) return; pendingBooking.paymentMethod=methodKey; renderPaymentForm(); }
function renderPaymentForm(){
  if(!pendingBooking||!pendingBooking.paymentMethod) return;
  const method=PAYMENT_METHODS[pendingBooking.paymentMethod];
  const su=pendingBooking.sessionUser||{};
  $('modalContent').innerHTML=`
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <button type="button" class="btn-link-back" onclick="renderPaymentMethodSelector()">&larr; Different method</button>
    <h2>Scan &amp; Pay — ${esc(method.label)}</h2>
    <p class="sub">${esc(pendingBooking.title)} · <strong>${fmtNPR(pendingBooking.total)}</strong></p>
    <div class="qr-box">
      <img src="${esc(method.qrImage)}" alt="${esc(method.label)} QR" class="qr-img" onerror="this.alt='Add QR image in assets';">
      <p class="qr-account-name">${esc(method.accountName)}</p>
    </div>
    <div class="field"><label>Full name *</label><input id="bkName" value="${esc(su.name||'')}" maxlength="80"></div>
    <div class="field"><label>Email *</label><input id="bkEmail" type="email" value="${esc(su.email||'')}" maxlength="120"></div>
    <div class="field"><label>Phone / WhatsApp *</label><input id="bkPhone" value="${esc(su.phone||'')}" maxlength="20"></div>
    <div class="field"><label>Transaction reference *</label><input id="bkTxnRef" autocomplete="off" maxlength="60"></div>
    <div class="field">
      <label>Payment proof photo *</label>
      <input type="file" id="bkPaymentProof" accept="image/*" capture="environment" onchange="handlePaymentProofFile(this)">
      <div id="bkProofPreview" class="proof-preview" hidden></div>
    </div>
    <div class="hp-field" aria-hidden="true"><label>Company</label><input type="text" id="bkCompany" tabindex="-1" autocomplete="off"></div>
    <label class="checkbox-field"><input type="checkbox" id="bkAgreeTerms"> I paid and agree to Terms.</label>
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="submitBookingBtn" onclick="submitFinalBooking()">Submit payment details</button>`;
  showOverlay();
}
async function handlePaymentProofFile(input){
  const file=input.files&&input.files[0];
  const prev=$('bkProofPreview');
  if(!file){ if(pendingBooking) pendingBooking.paymentProof=null; if(prev){prev.hidden=true;prev.innerHTML='';} return; }
  if(!file.type.startsWith('image/')){ showToast('Upload an image file.','error'); input.value=''; return; }
  if(file.size>4*1024*1024){ showToast('Image must be under 4 MB.','error'); input.value=''; return; }
  try {
    const dataUrl=await compressImageFile(file,1280,0.72);
    if(pendingBooking) pendingBooking.paymentProof=dataUrl;
    if(prev){ prev.hidden=false; prev.innerHTML=`<img src="${dataUrl}" alt="Proof"><button type="button" class="btn btn-outline btn-sm" onclick="clearPaymentProof()">Remove</button>`; }
  } catch(e){ showToast('Could not read that image.','error'); }
}
function clearPaymentProof(){ if(pendingBooking) pendingBooking.paymentProof=null; if($('bkPaymentProof')) $('bkPaymentProof').value=''; const prev=$('bkProofPreview'); if(prev){prev.hidden=true;prev.innerHTML='';} }
function compressImageFile(file, maxW, quality){
  return new Promise((resolve,reject)=>{
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{ URL.revokeObjectURL(url); let w=img.width,h=img.height; if(w>maxW){h=Math.round(h*maxW/w);w=maxW;} const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h); resolve(canvas.toDataURL('image/jpeg',quality)); };
    img.onerror=reject; img.src=url;
  });
}
async function submitFinalBooking(){
  const name=($('bkName')?.value||'').trim();
  const email=($('bkEmail')?.value||'').trim();
  const phone=($('bkPhone')?.value||'').trim();
  const txnRef=($('bkTxnRef')?.value||'').trim();
  const agreed=$('bkAgreeTerms')?.checked;
  const hp=($('bkCompany')?.value||'').trim();
  if(hp){ showToast('Submission blocked.','error'); return; }
  if(!name||name.length<2){ showToast('Enter your full name.','error'); return; }
  if(!isValidEmail(email)){ showToast('Enter a valid email.','error'); return; }
  if(phone.replace(/\D/g,'').length<7){ showToast('Enter a valid phone.','error'); return; }
  if(txnRef.length<4){ showToast('Enter transaction reference.','error'); return; }
  if(!pendingBooking?.paymentProof){ showToast('Upload a payment proof photo.','error'); return; }
  if(!agreed){ showToast('Please agree to terms.','error'); return; }
  const restoreBtn=setBusy($('submitBookingBtn'),'Submitting…');
  const ref='FEEL-'+Math.random().toString(36).slice(2,8).toUpperCase();
  const newBooking={ ref, tour_id:pendingBooking.tourId, tour_title:pendingBooking.title, date:pendingBooking.date, travelers:pendingBooking.travelers, total:pendingBooking.total, guest_type:pendingBooking.guestType||'foreigner', name, email, phone, txn_ref:txnRef, payment_method:pendingBooking.paymentMethod, payment_proof:pendingBooking.paymentProof, status:'Pending', guide:null, guide_phone:null };
  try{ const proofs=JSON.parse(localStorage.getItem('feelit_payment_proofs')||'{}'); proofs[ref]=pendingBooking.paymentProof; localStorage.setItem('feelit_payment_proofs',JSON.stringify(proofs)); }catch(e){}
  const ok=await sbWrite(supabaseClient.from('bookings').insert([newBooking]),'Could not submit booking');
  restoreBtn();
  if(!ok) return;
  showToast('Payment details submitted!','success');
  $('modalContent').innerHTML=`<button class="modal-close" onclick="closeOverlay()">&times;</button><h2>Payment submitted</h2><p class="sub">Reference: <strong>${esc(ref)}</strong></p><p>We verify the transfer, then assign your rider. Details appear in My Account.</p><button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">Done</button>`;
  pendingBooking=null;
}

/* AUTH */
function isStaffEmail(email){ if(!email) return false; return STAFF_EMAILS.some(s=>s.toLowerCase()===String(email).toLowerCase().trim()); }
function isValidAdminSession(){ try{ const raw=sessionStorage.getItem('feelit_admin_session'); if(!raw) return false; const s=JSON.parse(raw); if(!s||!s.t) return false; if(Date.now()-s.t>ADMIN_SESSION_MS){ sessionStorage.removeItem('feelit_admin_session'); return false; } return true; }catch(e){ return false; } }
function writeStaffSession(email){ const token=crypto.getRandomValues(new Uint8Array(16)); const tokenHex=Array.from(token).map(b=>b.toString(16).padStart(2,'0')).join(''); sessionStorage.setItem('feelit_admin_session',JSON.stringify({ t:Date.now(), k:tokenHex, email:String(email||'').toLowerCase() })); }
async function logoutEverywhere(){ try{ if(supabaseClient) await supabaseClient.auth.signOut(); }catch(e){} try{ sessionStorage.removeItem('feelit_admin_session'); sessionStorage.removeItem('feelit_login_tries'); }catch(e){} await checkUserSession(); closeOverlay(); showToast('Logged out.','success'); }
async function handleUserLogout(){ return logoutEverywhere(); }
async function adminLogout(){ return logoutEverywhere(); }

async function checkActiveAuthUser(){
  if(!supabaseClient) return null;
  try{ const { data:{ session } }=await supabaseClient.auth.getSession(); if(session&&session.user){ return { name:session.user.user_metadata?.full_name||session.user.email.split('@')[0], email:session.user.email, phone:session.user.user_metadata?.phone||'' }; } }catch(e){}
  return null;
}
async function checkUserSession(){
  const sessionUser=await checkActiveAuthUser();
  const btn=$('authNavBtn');
  if(btn){
    if(sessionUser&&isStaffEmail(sessionUser.email)){ btn.innerHTML='<span class="auth-label-full">Operations</span><span class="auth-label-short">Ops</span>'; if(!isValidAdminSession()) writeStaffSession(sessionUser.email); }
    else if(sessionUser){ btn.innerHTML='<span class="auth-label-full">My Account</span><span class="auth-label-short">Account</span>'; }
    else if(isValidAdminSession()){ btn.innerHTML='<span class="auth-label-full">Operations</span><span class="auth-label-short">Ops</span>'; }
    else { btn.innerHTML='<span class="auth-label-full">Login / Account</span><span class="auth-label-short">Login</span>'; }
  }
  renderContactSection();
}
async function openStaffOrDashboard(){
  const sessionUser=await checkActiveAuthUser();
  if(sessionUser&&isStaffEmail(sessionUser.email)){ if(!isValidAdminSession()) writeStaffSession(sessionUser.email); window.location.href='ops.html'; return; }
  if(isValidAdminSession()){ window.location.href='ops.html'; return; }
  if(sessionUser){ renderUserDashboard(sessionUser); return; }
  showAuthTabs('login');
}
async function openAuthModal(){ await openStaffOrDashboard(); }

function showAuthTabs(mode){
  $('modalContent').innerHTML=`
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Login</h2>
    <div class="field"><label>Email</label><input id="authEmail" type="email" autocomplete="email" onkeydown="if(event.key==='Enter'){event.preventDefault();handleStandardLogin();}"></div>
    <div class="field"><label>Password</label><input id="authPass" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter'){event.preventDefault();handleStandardLogin();}"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:12px;" id="loginBtn" onclick="handleStandardLogin()">Login</button>
    <div class="auth-or" style="display:flex;align-items:center;gap:10px;margin:16px 0;color:var(--ink-soft);font-size:12px;text-transform:uppercase;"><span style="flex:1;height:1px;background:rgba(255,255,255,.12);"></span>or<span style="flex:1;height:1px;background:rgba(255,255,255,.12);"></span></div>
    <button type="button" class="btn-google" onclick="loginWithGoogle()">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
      Continue with Google
    </button>
    <style>.btn-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#fff;color:#1f1f1f;font-weight:600;cursor:pointer;font-size:15px;}.btn-google:hover{background:#f6f6f6;}</style>`;
  showOverlay();
}
async function loginWithGoogle(){ try{ const { error }=await supabaseClient.auth.signInWithOAuth({ provider:'google' }); if(error) showToast('Google login error','error'); }catch(e){ showToast('Google login unavailable','error'); } }
async function handleStandardLogin(){
  const email=($('authEmail')?.value||'').trim();
  const pass=($('authPass')?.value||'').trim();
  if(!email||!pass){ showToast('Enter an email and password.','error'); return; }
  let tries=0; try{ tries=parseInt(sessionStorage.getItem('feelit_login_tries')||'0',10); }catch(e){}
  if(tries>=ADMIN_LOGIN_MAX_TRIES){ showToast('Too many attempts. Use Incognito or clear site data.','error'); return; }
  const restoreBtn=setBusy($('loginBtn'),'Checking…');
  const hashedPass=await sha256(pass);
  const { data, error }=await supabaseClient.auth.signInWithPassword({ email, password:pass });
  if(!error&&data?.user){
    restoreBtn(); try{ sessionStorage.removeItem('feelit_login_tries'); }catch(e){}
    const uEmail=(data.user.email||'').toLowerCase();
    if(isStaffEmail(uEmail)){ writeStaffSession(uEmail); window.location.href='ops.html'; return; }
    await checkUserSession();
    renderUserDashboard({ name:uEmail.split('@')[0], email:uEmail });
    return;
  }
  if(isStaffEmail(email)&&hashedPass===ADMIN_PASS_HASH){ restoreBtn(); try{ sessionStorage.removeItem('feelit_login_tries'); }catch(e){} writeStaffSession(email); window.location.href='ops.html'; return; }
  restoreBtn(); try{ sessionStorage.setItem('feelit_login_tries',String(tries+1)); }catch(e){}
  showToast('Invalid email or password.','error');
}

async function renderUserDashboard(user){
  let bookingsList=[];
  try{ const { data }=await supabaseClient.from('bookings').select('*').eq('email',user.email); bookingsList=data||[]; }catch(e){}
  try{ const flags=JSON.parse(localStorage.getItem('feelit_booking_status')||'{}'); bookingsList=bookingsList.map(b=>{ const pack=loadRidePack(b.id); const st=flags[String(b.id)]; return {...b,...(st?{status:st}:{}), ride_details:b.ride_details||JSON.stringify(pack)}; }); }catch(e){}
  const staffBtn=isStaffEmail(user.email)?`<button class="btn btn-primary" type="button" onclick="location.href='ops.html'">Open Operations</button>`:'';
  $('modalContent').innerHTML=`
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>${isStaffEmail(user.email)?'Staff account':'My Account'}</h2>
    <p class="sub">Welcome back, <strong>${esc(user.name)}</strong> (${esc(user.email)})</p>
    <div style="margin-bottom:24px;display:flex;flex-wrap:wrap;gap:10px;">${staffBtn}<button class="btn btn-outline" onclick="handleUserLogout()">Logout</button></div>
    <h3>My rides</h3>
    <div style="margin-top:14px;margin-bottom:28px;">${bookingsList.length?bookingsList.map(renderBookingRowForUser).join(''):'<div class="empty-state">No bookings yet.</div>'}</div>
    <h3>Messages with our team</h3>
    <div id="dashboardMessages" style="margin-top:14px;">${inlineLoader('Loading')}</div>`;
  showOverlay();
  const holder=$('dashboardMessages');
  if(holder) await renderMessageThreadInto(holder,user.email,user.name,{context:'dashboard'});
}
function renderBookingRowForUser(b){
  const status=b.status||'Pending';
  const pack=mergeBookingRidePack(b);
  const active=['Confirmed','In Progress','Completed'].includes(status);
  let riderBlock='';
  if(active&&b.guide){
    const digits=String(b.guide_phone||'').replace(/[^0-9]/g,'');
    riderBlock=`<div class="rider-reveal-box"><strong>Your rider:</strong> ${esc(b.guide)}${b.guide_phone?` — <a href="tel:${esc(b.guide_phone)}">${esc(b.guide_phone)}</a> · <a href="https://wa.me/${esc(digits)}" target="_blank" rel="noopener">WhatsApp</a>`:''}</div>`;
  } else if(status==='Cancelled'){ riderBlock=`<div class="pending-note">Cancelled.</div>`; }
  else { riderBlock=`<div class="pending-note">Payment verification in progress.</div>`; }
  return `<div class="booking-row" style="flex-direction:column;align-items:stretch;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;"><strong>${esc(b.tour_title)}</strong><span class="status ${statusClassFor(status)}">${esc(status)}</span></div>
    <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">Date: ${esc(b.date)} · Ref: ${esc(b.ref||b.id)}</div>
    ${riderBlock}${active?renderRidePackCard(pack):''}
  </div>`;
}

async function renderContactSection(){
  const holder=$('contactDynamic'); if(!holder) return;
  const sessionUser=await checkActiveAuthUser();
  if(!sessionUser){
    holder.innerHTML=`<p style="margin:0 0 16px;color:var(--ink-soft);font-size:14px;">Log in to message us here, or WhatsApp instantly.</p>
      <a class="btn btn-primary" style="width:100%;margin-bottom:10px;" href="https://wa.me/${CONTACT_INFO.whatsapp}" target="_blank" rel="noopener">Chat on WhatsApp</a>
      <button class="btn btn-outline" style="width:100%;" onclick="openAuthModal()">Log in to message us</button>`;
    return;
  }
  await renderMessageThreadInto(holder,sessionUser.email,sessionUser.name,{context:'contact'});
}
function initContactDisplay(){
  if($('contactEmailDisplay')){ $('contactEmailDisplay').textContent=CONTACT_INFO.email; $('contactEmailDisplay').href='mailto:'+CONTACT_INFO.email; }
  if($('contactPhoneDisplay')){ $('contactPhoneDisplay').textContent=CONTACT_INFO.phone; $('contactPhoneDisplay').href='tel:'+CONTACT_INFO.phone.replace(/[^\d+]/g,''); }
  if($('contactWaLink')) $('contactWaLink').href='https://wa.me/'+CONTACT_INFO.whatsapp;
  if($('contactAddressDisplay')) $('contactAddressDisplay').textContent=CONTACT_INFO.address;
  renderContactSection();
}
async function renderMessageThreadInto(holder, email, displayName, opts){
  opts=opts||{}; let msgs=[];
  try{ const { data }=await supabaseClient.from('messages').select('*').eq('email',email).order('created_at',{ascending:true}); msgs=data||[]; }catch(e){}
  const local=loadLocalMessages(email);
  if(local.length){ const keys=new Set(msgs.map(m=>(m.body||'')+'|'+(m.created_at||'')+'|'+(m.sender||''))); local.forEach(m=>{ const k=(m.body||'')+'|'+(m.created_at||'')+'|'+(m.sender||''); if(!keys.has(k)) msgs.push(m); }); msgs.sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||''))); }
  const threadHtml=msgs.length?msgs.map(m=>`<div class="chat-bubble ${m.sender==='admin'?'chat-bubble-admin':'chat-bubble-customer'}"><div class="chat-bubble-sender">${m.sender==='admin'?'Feel It Team':esc(displayName||'You')}</div><div class="chat-bubble-body">${esc(m.body)}</div></div>`).join(''):'<div class="empty-state">No messages yet.</div>';
  const inputId=opts.context==='contact'?'contactMsgInput':'dashMsgInput';
  const btnId=opts.context==='contact'?'contactMsgBtn':'dashMsgBtn';
  holder.innerHTML=`<div class="chat-thread">${threadHtml}</div><div class="field"><textarea id="${inputId}" rows="2" maxlength="2000" placeholder="Write a message…"></textarea></div><button class="btn btn-primary" id="${btnId}" onclick="sendCustomerMessage('${esc(email)}','${esc(displayName||'')}','${inputId}','${btnId}','${esc(opts.context||'default')}')">Send</button>`;
}
async function sendCustomerMessage(email, name, inputId, btnId, context){
  const input=$(inputId); const body=(input?.value||'').trim(); if(!body) return;
  const restoreBtn=setBusy($(btnId),'…');
  const row={ email, name:name||email.split('@')[0], sender:'customer', body, created_at:new Date().toISOString() };
  await sbWrite(supabaseClient.from('messages').insert([row]),'Cloud save failed');
  saveLocalMessage(row); restoreBtn(); input.value='';
  const holder=context==='contact'?$('contactDynamic'):$('dashboardMessages');
  if(holder) await renderMessageThreadInto(holder,email,name,{context});
}

function openGuideForm(){
  $('modalContent').innerHTML=`
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Ride with us</h2>
    <p class="sub">Apply as a Feel It captain. We review every application before you appear on the roster.</p>
    <div class="field"><label>Full name</label><input id="gName" maxlength="80"></div>
    <div class="field"><label>Phone / WhatsApp</label><input id="gPhone" inputmode="tel" maxlength="20"></div>
    <div class="field"><label>Email</label><input id="gEmail" type="email" maxlength="120"></div>
    <div class="field"><label>Bike</label><input id="gBike" maxlength="60"></div>
    <div class="field"><label>Regions you know</label><input id="gRegions" maxlength="120"></div>
    <div class="field"><label>Experience</label><textarea id="gExp" rows="3" maxlength="500"></textarea></div>
    <button class="btn btn-primary" onclick="submitGuideApp()">Submit application</button>`;
  showOverlay();
}
async function submitGuideApp(){
  const name=($('gName')?.value||'').trim();
  const phone=($('gPhone')?.value||'').trim();
  if(!name||!phone){ showToast('Name and phone are required.','error'); return; }
  const row={ name, phone, email:($('gEmail')?.value||'').trim(), experience:($('gExp')?.value||'').trim(), regions:($('gBike')?.value||'')+' | '+($('gRegions')?.value||'') };
  const ok=await sbWrite(supabaseClient.from('guide_apps').insert([row]),'Could not submit application');
  try{ await supabaseClient.from('riders').insert([{ name, phone, email:row.email, experience:row.experience, bike:($('gBike')?.value||'').trim(), regions:($('gRegions')?.value||'').trim(), status:'pending' }]); }catch(e){}
  if(ok){ showToast('Application received. We will contact you.','success'); closeOverlay(); }
}

function loadTheme(){ const t=localStorage.getItem('feelit_theme'); if(t) document.documentElement.setAttribute('data-theme',t); }
function toggleTheme(){ const cur=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light'; document.documentElement.setAttribute('data-theme',cur); localStorage.setItem('feelit_theme',cur); }
function enforceHttps(){ try{ if(location.protocol==='http:'&&/github\.io$/.test(location.hostname)) location.replace('https://'+location.host+location.pathname+location.search+location.hash); }catch(e){} }
function initCookieConsent(){
  const banner=$('cookieBanner'); if(!banner) return;
  let choice=null; try{ choice=localStorage.getItem('feelit_cookie_consent'); }catch(e){}
  if(choice==='all'||choice==='essential') return;
  banner.hidden=false;
  $('cookieAccept')?.addEventListener('click',()=>{ try{ localStorage.setItem('feelit_cookie_consent','all'); }catch(e){} banner.hidden=true; });
  $('cookieReject')?.addEventListener('click',()=>{ try{ localStorage.setItem('feelit_cookie_consent','essential'); }catch(e){} banner.hidden=true; });
}

window.addEventListener('DOMContentLoaded', async ()=>{
  enforceHttps();
  initCookieConsent();
  loadTheme();
  initContactDisplay();
  await loadTours();
  await checkUserSession();
  if(new URLSearchParams(location.search).get('admin')==='1'&&isValidAdminSession()){ history.replaceState(null,'',location.pathname+location.hash); window.location.href='ops.html'; }
  document.addEventListener('click',(e)=>{ if(e.target&&(e.target.id==='overlay'||e.target.id==='modalOverlay')) closeOverlay(); });
});

window.renderTours=renderTours;
window.openTour=openTour;
window.openAuthModal=openAuthModal;
window.handleUserLogout=handleUserLogout;
window.adminLogout=adminLogout;
window.logoutEverywhere=logoutEverywhere;
window.openGuideForm=openGuideForm;
window.goToCheckout=goToCheckout;
window.selectPaymentMethod=selectPaymentMethod;
window.submitFinalBooking=submitFinalBooking;
window.handlePaymentProofFile=handlePaymentProofFile;
window.clearPaymentProof=clearPaymentProof;
window.handleStandardLogin=handleStandardLogin;
window.loginWithGoogle=loginWithGoogle;
window.updateTourBookingPrice=updateTourBookingPrice;
window.sendCustomerMessage=sendCustomerMessage;
window.submitGuideApp=submitGuideApp;
window.toggleTheme=toggleTheme;
