/* =========================================================================
   Feel It Official — production client (GitHub Pages + Supabase)
   Fixes in this file:
   - Logout clears BOTH Supabase session AND local staff flag
   - Staff emails open Operations (not a fake "user dashboard")
   - Missing helpers defined (messages, ride pack, status classes)
   - Dual price (foreigner / local), payment proof, ride pack, rate/tip
   ========================================================================= */

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
const ADMIN_EMAIL = STAFF_EMAILS[0];
const ADMIN_PASS_HASH = '1bc57fec7b82137e1cfeefed41c9a9f5ded5e69de2a397151c504e139bffd324';
const ADMIN_LOGIN_MAX_TRIES = 5;
const ADMIN_SESSION_MS = 4 * 60 * 60 * 1000;

const EMAILJS_CONFIG = {
  enabled: false,
  publicKey: '',
  serviceId: '',
  bookingTemplateId: '',
  contactTemplateId: ''
};

const PAYMENT_METHODS = {
  bank: {
    key: 'bank',
    icon: '🏦',
    label: 'Bank Transfer',
    shortLabel: 'Laxmi Sunrise',
    accountName: 'Feel It Nepal',
    accountNumber: 'See QR',
    accountMeta: 'Laxmi Sunrise',
    qrImage: 'assets/bank-qr.png'
  },
  esewa: {
    key: 'esewa',
    icon: '📱',
    label: 'eSewa',
    shortLabel: 'Scan & pay',
    accountName: 'Feel It',
    accountNumber: 'eSewa ID on QR',
    accountMeta: 'eSewa',
    qrImage: 'assets/esewa-qr.png'
  }
};

const ROUTE_PRICING = {
  highway: { perKm: 18, perDayPerPerson: 1200, hotelPerDay: 1800, foodPerDay: 900, roadFactor: 1.15 },
  offroad: { perKm: 28, perDayPerPerson: 1800, hotelPerDay: 2200, foodPerDay: 1100, roadFactor: 1.35 }
};

const seedTours = [
  { id:'t1', title:'Sarangkot Sunrise Ridge', region:'Pokhara', duration:'Half day', price:5500, price_local:3500,
    guide:'Bikash Gurung', guide_phone:'+977-9812345678', bio:'11 years riding the Pokhara hills.',
    desc:'Dawn climb to Sarangkot for sunrise over the Annapurna range.',
    includes:['125cc bike','Helmet & jacket','Fuel','Local guide'], lat:28.2439, lng:83.9486, imageUrl:'' },
  { id:'t2', title:'Kathmandu Valley Rim Loop', region:'Kathmandu', duration:'Full day', price:9500, price_local:6500,
    guide:'Sunita Tamang', guide_phone:'+977-9823456789', bio:'Valley-rim specialist.',
    desc:'Full loop around Kathmandu ridges, Nagarkot and tea houses.',
    includes:['150cc bike','Full gear','Fuel & permits','Lunch'], lat:27.7172, lng:85.3240, imageUrl:'' },
  { id:'t3', title:'Upper Mustang Desert Crossing', region:'Mustang', duration:'5 days', price:72000, price_local:48000,
    guide:'Tenzin Lama', guide_phone:'+977-9834567890', bio:'Born in Lo Manthang.',
    desc:'High desert crossing past chörtens and canyon roads.',
    includes:['Off-road bike','Permit','Lodging','Fuel'], lat:28.7819, lng:83.7380, imageUrl:'' },
  { id:'hg1', title:'Nagarkot Sunset Ridge', region:'Kathmandu', duration:'Half day', price:4000, price_local:2500,
    guide:'Sunita Tamang', guide_phone:'+977-9823456789', bio:'Valley-rim specialist.',
    desc:'Afternoon climb to Nagarkot for sunset.',
    includes:['Bike','Helmet','Fuel','Guide'], lat:27.7154, lng:85.5205, imageUrl:'', hidden_gem:true },
  { id:'hg2', title:'Phewa Lakeside Loop', region:'Pokhara', duration:'3 hours', price:3000, price_local:1800,
    guide:'Bikash Gurung', guide_phone:'+977-9812345678', bio:'Pokhara hills.',
    desc:'Easy lakeside and village lanes around Phewa.',
    includes:['Bike','Helmet','Fuel'], lat:28.2096, lng:83.9856, imageUrl:'', hidden_gem:true },
  { id:'hg3', title:'Chobar Gorge Tea Run', region:'Kathmandu', duration:'Half day', price:3500, price_local:2200,
    guide:'Sunita Tamang', guide_phone:'+977-9823456789', bio:'Valley-rim specialist.',
    desc:'Short ride to Chobar gorge and a tea stop.',
    includes:['Bike','Helmet','Fuel','Guide'], lat:27.658, lng:85.289, imageUrl:'', hidden_gem:true }
];

let tours = [];
let pendingBooking = null;
let reviewStats = {};
let adminActiveThreadEmail = null;
let knownGuides = [];

/* ---------------- tiny utils ---------------- */
function $(id){ return document.getElementById(id); }
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>')
    .replace(/"/g,'"').replace(/'/g,'&#39;');
}
function fmtNPR(n){
  const v = Number(n) || 0;
  return 'NPR ' + v.toLocaleString('en-NP');
}
function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'')); }
async function sha256(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function inlineLoader(label){ return `<div class="empty-state">${esc(label || 'Loading…')}</div>`; }
function imgSrc(url){ return convertDriveLink(url || ''); }
function imgTag(url, alt, cls, extra){
  const src = imgSrc(url);
  if(!src) return '';
  return `<img src="${esc(src)}" alt="${esc(alt||'')}" class="${esc(cls||'')}" ${extra||''} loading="lazy">`;
}
function convertDriveLink(url){
  if(!url) return '';
  const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/) || String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if(m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  return url;
}
function setBusy(btn, label){
  if(!btn) return () => {};
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = label || '…';
  return () => { btn.disabled = false; btn.innerHTML = old; };
}
function showToast(msg, type){
  let t = $('fiToast');
  if(!t){
    t = document.createElement('div');
    t.id = 'fiToast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:12px 18px;border-radius:12px;font-size:14px;max-width:90%;box-shadow:0 8px 30px rgba(0,0,0,.35)';
    document.body.appendChild(t);
  }
  t.style.background = type === 'error' ? '#7f1d1d' : '#134e4a';
  t.style.color = '#fff';
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, 4200);
}
function showOverlay(){
  const o = $('overlay') || $('modalOverlay');
  if(o){ o.classList.add('open'); o.style.display = 'flex'; }
  document.body.style.overflow = 'hidden';
}
function closeOverlay(){
  const o = $('overlay') || $('modalOverlay');
  if(o){ o.classList.remove('open'); o.style.display = 'none'; }
  document.body.style.overflow = '';
}
async function sbWrite(promise, failMessage){
  if(!supabaseClient){ showToast(failMessage || 'Database not ready', 'error'); return false; }
  try {
    const { error } = await promise;
    if(error){
      console.error(failMessage, error);
      showToast((failMessage || 'Save failed') + ': ' + (error.message || ''), 'error');
      return false;
    }
    return true;
  } catch(e){
    console.error(failMessage, e);
    showToast(failMessage || 'Save failed', 'error');
    return false;
  }
}
function val(id){ const el = $(id); return el ? el.value : ''; }

function weatherIcon(code){
  if([0].includes(code)) return '☀️';
  if([1,2].includes(code)) return '🌤️';
  if([3].includes(code)) return '☁️';
  if([45,48].includes(code)) return '🌫️';
  if([51,53,55,61,63,65,80,81,82].includes(code)) return '🌧️';
  if([71,73,75,77,85,86].includes(code)) return '❄️';
  if([95,96,99].includes(code)) return '⛈️';
  return '🌡️';
}
function weatherLabel(code){
  if(code === 0) return 'Clear';
  if(code <= 2) return 'Partly cloudy';
  if(code === 3) return 'Overcast';
  if(code <= 48) return 'Fog';
  if(code <= 67) return 'Rain';
  if(code <= 86) return 'Snow';
  return 'Storm';
}
function hydrateWeatherChips(root){
  const scope = root || document;
  scope.querySelectorAll('[data-weather-pending]').forEach(async el => {
    const lat = el.getAttribute('data-weather-lat');
    const lng = el.getAttribute('data-weather-lng');
    if(!lat || !lng) return;
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`);
      const d = await r.json();
      const c = d.current;
      if(!c) return;
      el.textContent = `${weatherIcon(c.weather_code)} ${Math.round(c.temperature_2m)}° · ${weatherLabel(c.weather_code)}`;
      el.removeAttribute('data-weather-pending');
    } catch(e){ el.textContent = 'Weather n/a'; }
  });
}

/* ---------------- local messages + ride pack (MUST exist) ---------------- */
function loadLocalMessages(email){
  try {
    return JSON.parse(localStorage.getItem('feelit_messages') || '[]').filter(m => m.email === email);
  } catch(e){ return []; }
}
function saveLocalMessage(row){
  try {
    const all = JSON.parse(localStorage.getItem('feelit_messages') || '[]');
    all.push({ ...row, id: row.id || ('local_' + Date.now()), created_at: row.created_at || new Date().toISOString() });
    localStorage.setItem('feelit_messages', JSON.stringify(all));
  } catch(e){}
}
function loadAllLocalMessages(){
  try { return JSON.parse(localStorage.getItem('feelit_messages') || '[]'); } catch(e){ return []; }
}
function loadRidePack(bookingId){
  try {
    const all = JSON.parse(localStorage.getItem('feelit_ride_packs') || '{}');
    return all[String(bookingId)] || {};
  } catch(e){ return {}; }
}
function saveRidePackLocal(bookingId, pack){
  try {
    const all = JSON.parse(localStorage.getItem('feelit_ride_packs') || '{}');
    all[String(bookingId)] = { ...loadRidePack(bookingId), ...pack, updated_at: new Date().toISOString() };
    localStorage.setItem('feelit_ride_packs', JSON.stringify(all));
  } catch(e){}
}
function mergeBookingRidePack(b){
  if(!b) return {};
  const local = loadRidePack(b.id);
  let remote = {};
  if(b.ride_details){
    try { remote = typeof b.ride_details === 'string' ? JSON.parse(b.ride_details) : (b.ride_details || {}); }
    catch(e){ remote = {}; }
  }
  return {
    meeting_point: remote.meeting_point || local.meeting_point || '',
    meeting_time: remote.meeting_time || local.meeting_time || '',
    itinerary: remote.itinerary || local.itinerary || '',
    meals: remote.meals || local.meals || '',
    notes: remote.notes || local.notes || '',
    bring: remote.bring || local.bring || '',
    pickup: remote.pickup || local.pickup || '',
    emergency: remote.emergency || local.emergency || CONTACT_INFO.whatsapp,
    tip_npr: remote.tip_npr || local.tip_npr || b.tip_npr || 0,
    rated: !!(remote.rated || local.rated || b.rated)
  };
}
function statusClassFor(status){
  const s = String(status || 'Pending').toLowerCase();
  if(s === 'confirmed') return 'status-confirmed';
  if(s === 'in progress' || s === 'in_progress') return 'status-progress';
  if(s === 'completed') return 'status-completed';
  if(s === 'cancelled') return 'status-cancelled';
  return 'status-pending';
}
function renderRidePackCard(pack, opts){
  opts = opts || {};
  pack = pack || {};
  const empty = !pack.meeting_point && !pack.meeting_time && !pack.itinerary && !pack.meals && !pack.notes && !pack.bring;
  if(empty && opts.adminPreview) return '<div class="pending-note">No ride pack yet — fill the form so the customer sees every detail.</div>';
  if(empty) return '<div class="pending-note">Your full ride briefing appears here after our team publishes it.</div>';
  const lines = (s) => esc(s||'').replace(/\n/g,'<br>');
  return `<div class="ride-pack">
    <h4 class="ride-pack-title">Your ride briefing</h4>
    ${pack.meeting_point ? `<div class="ride-pack-row"><span>Meet</span><strong>${esc(pack.meeting_point)}</strong></div>` : ''}
    ${pack.meeting_time ? `<div class="ride-pack-row"><span>Time</span><strong>${esc(pack.meeting_time)}</strong></div>` : ''}
    ${pack.pickup ? `<div class="ride-pack-row"><span>Pickup</span><strong>${esc(pack.pickup)}</strong></div>` : ''}
    ${pack.itinerary ? `<div class="ride-pack-block"><span>Itinerary</span><p>${lines(pack.itinerary)}</p></div>` : ''}
    ${pack.meals ? `<div class="ride-pack-block"><span>Where you eat</span><p>${lines(pack.meals)}</p></div>` : ''}
    ${pack.bring ? `<div class="ride-pack-block"><span>Bring</span><p>${lines(pack.bring)}</p></div>` : ''}
    ${pack.notes ? `<div class="ride-pack-block"><span>Notes</span><p>${lines(pack.notes)}</p></div>` : ''}
    ${pack.emergency ? `<div class="ride-pack-row"><span>Emergency</span><strong>${esc(pack.emergency)}</strong></div>` : ''}
  </div>`;
}
function renderPaymentProofThumb(b){
  let src = b.payment_proof || '';
  if(!src){
    try { src = (JSON.parse(localStorage.getItem('feelit_payment_proofs')||'{}')[b.ref] || ''); } catch(e){}
  }
  if(!src) return '<div class="pending-note">No payment proof image.</div>';
  return `<div class="payment-proof-admin"><span>Payment proof</span><a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="Payment proof"></a></div>`;
}

function loadFeaturedIds(){
  try { return JSON.parse(localStorage.getItem('feelit_featured_ids') || '[]'); } catch(e){ return []; }
}
function saveFeaturedIds(ids){
  localStorage.setItem('feelit_featured_ids', JSON.stringify(ids || []));
}

/* ---------------- tours ---------------- */
function normalizeTour(t){
  return {
    ...t,
    desc: t.desc || t.description || '',
    guide_phone: t.guide_phone || t.guidePhone || '',
    imageUrl: t.image_url || t.imageUrl || '',
    includes: Array.isArray(t.includes) ? t.includes : (t.includes ? String(t.includes).split(',').map(s=>s.trim()).filter(Boolean) : []),
    hidden_gem: !!(t.hidden_gem || t.is_hidden_gem || t.hiddenGem),
    image_position: t.image_position || t.imagePosition || 'center',
    image_zoom: Number(t.image_zoom || t.imageZoom || 100),
    price: Number(t.price) || 0,
    price_local: Number(t.price_local != null ? t.price_local : Math.round((Number(t.price)||0)*0.7)) || 0
  };
}
async function loadTours(){
  try {
    const { data, error } = await supabaseClient.from('tours').select('*');
    if(error || !data || !data.length) tours = seedTours.map(normalizeTour);
    else tours = data.map(normalizeTour);
  } catch(e){ tours = seedTours.map(normalizeTour); }
  knownGuides = [...new Set(tours.map(t => t.guide).filter(Boolean))];
  await loadReviewStats();
  renderTours();
  renderHiddenGems();
  renderMapMarkers();
}
async function loadReviewStats(){
  reviewStats = {};
  try {
    const { data } = await supabaseClient.from('reviews').select('tour_id, rating');
    (data||[]).forEach(r => {
      const s = reviewStats[r.tour_id] || (reviewStats[r.tour_id] = { sum:0, count:0, avg:0 });
      s.sum += Number(r.rating)||0; s.count += 1;
    });
    Object.values(reviewStats).forEach(s => { s.avg = s.count ? s.sum/s.count : 0; });
  } catch(e){}
}
function starsHtml(avg){
  const n = Math.round(avg||0);
  return '★'.repeat(n) + '☆'.repeat(Math.max(0,5-n));
}
function ratingBadge(tourId){
  const s = reviewStats[tourId];
  if(!s || !s.count) return '';
  return `<div class="card-rating">${starsHtml(s.avg)}<span class="rating-count">${s.avg.toFixed(1)} · ${s.count}</span></div>`;
}
function cardHtml(t, gem){
  const zoom = Math.min(200, Math.max(100, Number(t.image_zoom)||100));
  const pos = esc(t.image_position || 'center');
  const art = t.imageUrl
    ? imgTag(t.imageUrl, t.title, 'card-photo', `style="object-fit:cover;object-position:${pos};transform:scale(${zoom/100});transform-origin:${pos};width:100%;height:100%;"`)
    : `<div class="card-art-fallback">Photo coming soon</div>`;
  return `<article class="card">
    <div class="card-art" style="overflow:hidden;">${gem ? '<span class="gem-badge">Hidden Gem</span>' : ''}${art}</div>
    <div class="card-body">
      <div class="card-region">${esc(t.region)}</div>
      <h3 class="card-title">${esc(t.title)}</h3>
      ${ratingBadge(t.id)}
      <div class="card-meta"><span>${esc(t.duration)}</span><span>Guide: ${esc(t.guide)}</span></div>
      <div class="card-price dual-price">
        <span class="price-foreign">${fmtNPR(t.price)} <small>foreigner</small></span>
        <span class="price-local">${fmtNPR(t.price_local)} <small>local</small></span>
      </div>
      <button class="btn btn-primary" onclick="openTour('${esc(t.id)}')">View & book</button>
    </div>
  </article>`;
}
function renderTours(){
  const el = $('toursGrid') || $('tours') && document.querySelector('#tours .cards, #toursGrid');
  const host = $('toursGrid') || document.querySelector('#tours .grid, #tours .cards');
  const box = host || $('toursGrid');
  if(!box) return;
  const list = tours.filter(t => !t.hidden_gem);
  box.innerHTML = list.length ? list.map(t => cardHtml(t,false)).join('') : '<div class="empty-state">Tours coming soon.</div>';
}
function renderHiddenGems(){
  const el = $('hiddenGemsGrid') || $('hiddenGems');
  if(!el) return;
  const gems = tours.filter(t => t.hidden_gem);
  if(!gems.length){ el.innerHTML = '<div class="empty-state">Hidden gems coming soon.</div>'; return; }
  el.innerHTML = gems.map(t => cardHtml(t,true)).join('');
}

function estimateTourDays(duration){
  const d = String(duration||'').toLowerCase();
  const m = d.match(/(\d+)\s*day/);
  if(m) return Math.max(1, parseInt(m[1],10));
  if(d.includes('half') || d.includes('hour')) return 1;
  return 1;
}
function calcTourAddons(t, travelers){
  const days = estimateTourDays(t.duration);
  const terrain = String(t.region||'').toLowerCase().includes('mustang') ? 'offroad' : 'highway';
  const rates = ROUTE_PRICING[terrain];
  const includeHotel = $('bookIncludeHotel')?.checked === true;
  const includeFood = $('bookIncludeFood')?.checked === true;
  const guestType = $('bookGuestType')?.value || 'foreigner';
  const unit = guestType === 'local' ? (Number(t.price_local)||0) : (Number(t.price)||0);
  const hotel = includeHotel ? (rates.hotelPerDay||0)*days*travelers : 0;
  const food = includeFood ? (rates.foodPerDay||0)*days*travelers : 0;
  const base = unit * travelers;
  return { days, includeHotel, includeFood, guestType, unitPrice: unit, hotel, food, base,
    total: Math.round((base+hotel+food)/100)*100 };
}
function updateTourBookingPrice(id){
  const t = tours.find(x => x.id === id);
  if(!t) return;
  const travelers = Math.max(1, parseInt($('tourTravelers')?.value || '1', 10));
  const c = calcTourAddons(t, travelers);
  const el = $('tourBookingPrice');
  if(!el) return;
  const bits = [];
  if(c.includeHotel) bits.push('hotel');
  if(c.includeFood) bits.push('food');
  el.innerHTML = `${fmtNPR(c.total)} <small>total · ${travelers} · ${c.guestType}${bits.length ? ' · '+bits.join(' + ') : ''}</small>`;
}
function openTour(id){
  const t = tours.find(x => x.id === id);
  if(!t) return;
  const mc = $('modalContent');
  if(!mc) return;
  mc.innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>${esc(t.title)}</h2>
    <p class="sub">${esc(t.region)} · ${esc(t.duration)} · Guide ${esc(t.guide)}</p>
    <p>${esc(t.desc)}</p>
    <p class="form-note">${(t.includes||[]).map(esc).join(' · ')}</p>
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
    <p class="addon-note">Guide & rider always included.</p>
    <div class="field">
      <label for="bookGuestType">Price type</label>
      <select id="bookGuestType" onchange="updateTourBookingPrice('${esc(t.id)}')">
        <option value="foreigner">Foreign visitor — ${fmtNPR(t.price)} / person</option>
        <option value="local">Nepal resident — ${fmtNPR(t.price_local)} / person</option>
      </select>
    </div>
    <div class="card-price" id="tourBookingPrice">${fmtNPR(t.price)} <small>/ person · foreigner</small></div>
    <button class="btn btn-primary" style="width:100%;" onclick="goToCheckout('${esc(t.id)}')">Continue to payment</button>
    <div id="tourReviews-${esc(t.id)}" class="review-block">${inlineLoader('Loading reviews')}</div>
  `;
  showOverlay();
  updateTourBookingPrice(t.id);
  renderTourReviews(t.id);
}
async function renderTourReviews(tourId){
  const holder = $(`tourReviews-${tourId}`);
  if(!holder) return;
  let list = [];
  try {
    const { data, error } = await supabaseClient.from('reviews').select('*').eq('tour_id', tourId).order('created_at', { ascending:false });
    if(!error) list = data || [];
  } catch(e){}
  holder.innerHTML = list.length
    ? list.map(r => `<div class="review-card"><span class="stars">${starsHtml(r.rating)}</span><p>${esc(r.comment||'')}</p><div class="review-who">${esc(r.name||'Rider')}</div></div>`).join('')
    : '<p class="form-note">No reviews yet.</p>';
}

async function goToCheckout(id){
  const t = tours.find(x => x.id === id);
  if(!t) return;
  const date = $('tourDate')?.value;
  const travelers = parseInt($('tourTravelers')?.value || '1', 10);
  if(!date){ showToast('Please select a tour date.', 'error'); return; }
  if(!travelers || travelers < 1 || travelers > 6){ showToast('Travelers must be 1–6.', 'error'); return; }
  const sessionUser = await checkActiveAuthUser();
  const c = calcTourAddons(t, travelers);
  pendingBooking = {
    tourId: t.id, title: t.title, date, travelers, total: c.total,
    includeHotel: c.includeHotel, includeFood: c.includeFood,
    guestType: c.guestType, unitPrice: c.unitPrice,
    sessionUser, paymentMethod: null, paymentProof: null
  };
  renderPaymentMethodSelector();
}
function renderPaymentMethodSelector(){
  if(!pendingBooking) return;
  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Choose a payment method</h2>
    <p class="sub">${esc(pendingBooking.title)} · ${esc(pendingBooking.date)} · ${pendingBooking.travelers} traveler(s) · <strong>${fmtNPR(pendingBooking.total)}</strong></p>
    <div class="payment-method-grid">
      ${Object.values(PAYMENT_METHODS).map(m => `
        <button class="payment-method-card" onclick="selectPaymentMethod('${m.key}')">
          <span class="pm-icon">${m.icon}</span>
          <span class="pm-name">${esc(m.label)}</span>
          <span class="pm-sub">${esc(m.shortLabel)}</span>
        </button>`).join('')}
    </div>`;
  showOverlay();
}
function selectPaymentMethod(methodKey){
  if(!pendingBooking) return;
  pendingBooking.paymentMethod = methodKey;
  renderPaymentForm();
}
function renderPaymentForm(){
  if(!pendingBooking || !pendingBooking.paymentMethod) return;
  const method = PAYMENT_METHODS[pendingBooking.paymentMethod];
  const su = pendingBooking.sessionUser || {};
  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <button type="button" class="btn-link-back" onclick="renderPaymentMethodSelector()">&larr; Different method</button>
    <h2>Scan & Pay — ${esc(method.label)}</h2>
    <p class="sub">${esc(pendingBooking.title)} · ${esc(pendingBooking.date)} · <strong>${fmtNPR(pendingBooking.total)}</strong> · ${esc(pendingBooking.guestType)}</p>
    <div class="qr-box">
      <img src="${esc(method.qrImage)}" alt="${esc(method.label)} QR" class="qr-img" onerror="this.alt='Add QR image in assets';">
      <p class="qr-account-name">${esc(method.accountName)}</p>
      <p class="qr-account-number">${esc(method.accountNumber)}</p>
    </div>
    <div class="field"><label>Full name *</label><input id="bkName" value="${esc(su.name||'')}"></div>
    <div class="field"><label>Email *</label><input id="bkEmail" type="email" value="${esc(su.email||'')}"></div>
    <div class="field"><label>Phone / WhatsApp *</label><input id="bkPhone" value="${esc(su.phone||'')}"></div>
    <div class="field"><label>Transaction reference *</label><input id="bkTxnRef" autocomplete="off" placeholder="Bank / eSewa ID"></div>
    <div class="field">
      <label>Payment proof photo *</label>
      <input type="file" id="bkPaymentProof" accept="image/*" capture="environment" onchange="handlePaymentProofFile(this)">
      <p class="form-note">Clear screenshot of the transfer. Max 4 MB.</p>
      <div id="bkProofPreview" class="proof-preview" hidden></div>
    </div>
    <div class="hp-field" aria-hidden="true"><label>Company</label><input type="text" id="bkCompany" tabindex="-1" autocomplete="off"></div>
    <label class="checkbox-field"><input type="checkbox" id="bkAgreeTerms"> I paid and agree to Terms & <a href="privacy.html" target="_blank">Privacy</a>.</label>
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="submitBookingBtn" onclick="submitFinalBooking()">Submit payment details</button>
  `;
  showOverlay();
}
async function handlePaymentProofFile(input){
  const file = input.files && input.files[0];
  const prev = $('bkProofPreview');
  if(!file){
    if(pendingBooking) pendingBooking.paymentProof = null;
    if(prev){ prev.hidden = true; prev.innerHTML = ''; }
    return;
  }
  if(!file.type.startsWith('image/')){ showToast('Upload an image file.', 'error'); input.value=''; return; }
  if(file.size > 4*1024*1024){ showToast('Image must be under 4 MB.', 'error'); input.value=''; return; }
  try {
    const dataUrl = await compressImageFile(file, 1280, 0.72);
    if(pendingBooking) pendingBooking.paymentProof = dataUrl;
    if(prev){
      prev.hidden = false;
      prev.innerHTML = `<img src="${dataUrl}" alt="Proof"><button type="button" class="btn btn-outline btn-sm" onclick="clearPaymentProof()">Remove</button>`;
    }
  } catch(e){ showToast('Could not read that image.', 'error'); }
}
function clearPaymentProof(){
  if(pendingBooking) pendingBooking.paymentProof = null;
  if($('bkPaymentProof')) $('bkPaymentProof').value = '';
  const prev = $('bkProofPreview');
  if(prev){ prev.hidden = true; prev.innerHTML = ''; }
}
function compressImageFile(file, maxW, quality){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if(w > maxW){ h = Math.round(h * maxW / w); w = maxW; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}
async function submitFinalBooking(){
  const name = ($('bkName')?.value||'').trim();
  const email = ($('bkEmail')?.value||'').trim();
  const phone = ($('bkPhone')?.value||'').trim();
  const txnRef = ($('bkTxnRef')?.value||'').trim();
  const agreed = $('bkAgreeTerms')?.checked;
  const hp = ($('bkCompany')?.value||'').trim();
  if(hp){ showToast('Submission blocked.', 'error'); return; }
  if(!name || name.length < 2){ showToast('Enter your full name.', 'error'); return; }
  if(!isValidEmail(email)){ showToast('Enter a valid email.', 'error'); return; }
  if(phone.replace(/\D/g,'').length < 7){ showToast('Enter a valid phone.', 'error'); return; }
  if(txnRef.length < 4){ showToast('Enter transaction reference.', 'error'); return; }
  if(!pendingBooking?.paymentProof){ showToast('Upload a payment proof photo.', 'error'); return; }
  if(!agreed){ showToast('Please agree to terms.', 'error'); return; }
  if(!pendingBooking?.paymentMethod){ showToast('Start booking again.', 'error'); return; }

  const restoreBtn = setBusy($('submitBookingBtn'), 'Submitting…');
  const ref = 'FEEL-' + Math.random().toString(36).slice(2,8).toUpperCase();
  const newBooking = {
    ref, tour_id: pendingBooking.tourId, tour_title: pendingBooking.title,
    date: pendingBooking.date, travelers: pendingBooking.travelers, total: pendingBooking.total,
    guest_type: pendingBooking.guestType || 'foreigner',
    name, email, phone, txn_ref: txnRef,
    payment_method: pendingBooking.paymentMethod,
    payment_proof: pendingBooking.paymentProof,
    status: 'Pending', guide: null, guide_phone: null
  };
  try {
    const proofs = JSON.parse(localStorage.getItem('feelit_payment_proofs')||'{}');
    proofs[ref] = pendingBooking.paymentProof;
    localStorage.setItem('feelit_payment_proofs', JSON.stringify(proofs));
  } catch(e){}

  const ok = await sbWrite(supabaseClient.from('bookings').insert([newBooking]), 'Could not submit booking');
  restoreBtn();
  if(!ok) return;
  showToast('Payment details submitted!', 'success');
  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Payment submitted — pending verification</h2>
    <p class="sub">Reference: <strong>${esc(ref)}</strong></p>
    <p>We verify the transfer, then assign your rider. Details appear in My Account.</p>
    <button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">Done</button>`;
  pendingBooking = null;
}

/* ---------------- AUTH: one logout for both locks ---------------- */
function isStaffEmail(email){
  if(!email) return false;
  return STAFF_EMAILS.some(s => s.toLowerCase() === String(email).toLowerCase().trim());
}
function isValidAdminSession(){
  try {
    const raw = sessionStorage.getItem('feelit_admin_session');
    if(!raw) return false;
    const s = JSON.parse(raw);
    if(!s || !s.t) return false;
    if(Date.now() - s.t > ADMIN_SESSION_MS){
      sessionStorage.removeItem('feelit_admin_session');
      return false;
    }
    return true;
  } catch(e){ return false; }
}
function writeStaffSession(email){
  const token = crypto.getRandomValues(new Uint8Array(16));
  const tokenHex = Array.from(token).map(b => b.toString(16).padStart(2,'0')).join('');
  sessionStorage.setItem('feelit_admin_session', JSON.stringify({
    t: Date.now(), k: tokenHex, email: String(email||'').toLowerCase()
  }));
}
async function logoutEverywhere(){
  try { if(supabaseClient) await supabaseClient.auth.signOut(); } catch(e){}
  try {
    sessionStorage.removeItem('feelit_admin_session');
    sessionStorage.removeItem('feelit_login_tries');
  } catch(e){}
  await checkUserSession();
  closeOverlay();
  showToast('Logged out on this device.', 'success');
}
async function handleUserLogout(){ return logoutEverywhere(); }
async function adminLogout(){ return logoutEverywhere(); }

async function checkActiveAuthUser(){
  if(!supabaseClient) return null;
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if(session && session.user){
      return {
        name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        email: session.user.email,
        phone: session.user.user_metadata?.phone || ''
      };
    }
  } catch(e){}
  return null;
}
async function checkUserSession(){
  const sessionUser = await checkActiveAuthUser();
  const btn = $('authNavBtn');
  if(btn){
    if(sessionUser && isStaffEmail(sessionUser.email)){
      btn.innerHTML = '<span class="auth-label-full">Operations</span><span class="auth-label-short">Ops</span>';
      if(!isValidAdminSession()) writeStaffSession(sessionUser.email);
    } else if(sessionUser){
      btn.innerHTML = '<span class="auth-label-full">My Account</span><span class="auth-label-short">Account</span>';
    } else if(isValidAdminSession()){
      btn.innerHTML = '<span class="auth-label-full">Operations</span><span class="auth-label-short">Ops</span>';
    } else {
      btn.innerHTML = '<span class="auth-label-full">Login / Account</span><span class="auth-label-short">Login</span>';
    }
  }
  renderContactSection();
}
async function openStaffOrDashboard(){
  const sessionUser = await checkActiveAuthUser();
  if(sessionUser && isStaffEmail(sessionUser.email)){
    if(!isValidAdminSession()) writeStaffSession(sessionUser.email);
    renderAdminPanel('bookings');
    return;
  }
  if(isValidAdminSession()){ renderAdminPanel('bookings'); return; }
  if(sessionUser){ renderUserDashboard(sessionUser); return; }
  showAuthTabs('login');
}
async function openAuthModal(){ await openStaffOrDashboard(); }

function showAuthTabs(mode){
  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>${mode === 'signup' ? 'Create account' : 'Login'}</h2>
    <p class="sub">Customers use any email. Staff use the Supabase account email.</p>
    <div class="field"><label>Email</label><input id="authEmail" type="email" onkeydown="if(event.key==='Enter'){event.preventDefault();handleStandardLogin();}"></div>
    <div class="field"><label>Password</label><input id="authPass" type="password" onkeydown="if(event.key==='Enter'){event.preventDefault();handleStandardLogin();}"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="loginBtn" onclick="handleStandardLogin()">Login</button>
    <button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="loginWithGoogle()">Continue with Google</button>
    <p class="form-note" style="margin-top:12px;">Other device? Same email + the password set in Supabase Auth — not the old website-only password.</p>
  `;
  showOverlay();
}
async function loginWithGoogle(){
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    if(error) showToast('Google login error', 'error');
  } catch(e){ showToast('Google login unavailable', 'error'); }
}
async function handleStandardLogin(){
  const email = ($('authEmail')?.value||'').trim();
  const pass = ($('authPass')?.value||'').trim();
  if(!email || !pass){ showToast('Enter an email and password.', 'error'); return; }

  let tries = 0;
  try { tries = parseInt(sessionStorage.getItem('feelit_login_tries')||'0',10); } catch(e){}
  if(tries >= ADMIN_LOGIN_MAX_TRIES){
    showToast('Too many attempts on this browser. Wait, use Incognito, or clear site data.', 'error');
    return;
  }

  const restoreBtn = setBusy($('loginBtn'), 'Checking…');
  const hashedPass = await sha256(pass);

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  if(!error && data?.user){
    restoreBtn();
    try { sessionStorage.removeItem('feelit_login_tries'); } catch(e){}
    const uEmail = (data.user.email||'').toLowerCase();
    if(isStaffEmail(uEmail)){
      writeStaffSession(uEmail);
      showToast('Staff session started.', 'success');
      await checkUserSession();
      renderAdminPanel('bookings');
      return;
    }
    await checkUserSession();
    renderUserDashboard({ name: uEmail.split('@')[0], email: uEmail });
    return;
  }

  if(isStaffEmail(email) && hashedPass === ADMIN_PASS_HASH){
    restoreBtn();
    try { sessionStorage.removeItem('feelit_login_tries'); } catch(e){}
    writeStaffSession(email);
    showToast('Legacy staff gate. Prefer the Supabase password on other devices.', 'success');
    await checkUserSession();
    renderAdminPanel('bookings');
    return;
  }

  restoreBtn();
  try { sessionStorage.setItem('feelit_login_tries', String(tries+1)); } catch(e){}
  showToast('Invalid email or password. On a new device use the Supabase Auth password.', 'error');
}

async function handleStandardSignup(){
  showAuthTabs('login');
  showToast('Ask the team to create your account, or login if you already have one.', 'success');
}

async function renderUserDashboard(user){
  let bookingsList = [];
  try {
    const { data } = await supabaseClient.from('bookings').select('*').eq('email', user.email);
    bookingsList = data || [];
  } catch(e){}
  try {
    const flags = JSON.parse(localStorage.getItem('feelit_booking_status')||'{}');
    bookingsList = bookingsList.map(b => {
      const pack = loadRidePack(b.id);
      const st = flags[String(b.id)];
      return { ...b, ...(st ? { status: st } : {}), ride_details: b.ride_details || JSON.stringify(pack) };
    });
  } catch(e){}

  const staffBtn = isStaffEmail(user.email)
    ? `<button class="btn btn-primary" type="button" onclick="renderAdminPanel('bookings')">Open Operations</button>` : '';

  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>${isStaffEmail(user.email) ? 'Staff account' : 'My Account'}</h2>
    <p class="sub">Welcome back, <strong>${esc(user.name)}</strong> (${esc(user.email)})</p>
    <div style="margin-bottom:24px;display:flex;flex-wrap:wrap;gap:10px;">
      ${staffBtn}
      <button class="btn btn-outline" onclick="handleUserLogout()">Logout</button>
    </div>
    <h3>My rides</h3>
    <p class="form-note">After we confirm payment you’ll see rider, meeting point, itinerary and meals here.</p>
    <div style="margin-top:14px;margin-bottom:28px;">
      ${bookingsList.length ? bookingsList.map(renderBookingRowForUser).join('') : '<div class="empty-state">No bookings yet.</div>'}
    </div>
    <h3>Messages with our team</h3>
    <div id="dashboardMessages" style="margin-top:14px;">${inlineLoader('Loading')}</div>
  `;
  showOverlay();
  const holder = $('dashboardMessages');
  if(holder) await renderMessageThreadInto(holder, user.email, user.name, { context: 'dashboard' });
  hydrateWeatherChips($('modalContent'));
}
function renderBookingRowForUser(b){
  const status = b.status || 'Pending';
  const pack = mergeBookingRidePack(b);
  const active = ['Confirmed','In Progress','Completed'].includes(status);
  let riderBlock = '';
  if(active && b.guide){
    const digits = String(b.guide_phone||'').replace(/[^0-9]/g,'');
    riderBlock = `<div class="rider-reveal-box"><strong>Your rider:</strong> ${esc(b.guide)}
      ${b.guide_phone ? ` — <a href="tel:${esc(b.guide_phone)}">${esc(b.guide_phone)}</a> · <a href="https://wa.me/${esc(digits)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div>`;
  } else if(status === 'Cancelled'){
    riderBlock = `<div class="pending-note">Cancelled. Message us if that looks wrong.</div>`;
  } else {
    riderBlock = `<div class="pending-note">Payment verification in progress.</div>`;
  }
  let afterRide = '';
  if(status === 'Completed'){
    afterRide = `<div class="after-ride-box">
      <h4>How was your ride?</h4>
      <div class="field"><label>Stars</label>
        <select id="rate-stars-${esc(b.id)}"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select>
      </div>
      <div class="field"><label>Review</label><textarea id="rate-text-${esc(b.id)}" rows="2"></textarea></div>
      <div class="field"><label>Tip NPR (optional)</label><input type="number" id="tip-npr-${esc(b.id)}" min="0" step="100"></div>
      <button class="btn btn-primary" type="button" onclick="submitPostRideFeedback('${esc(b.id)}','${esc(b.tour_id||'')}','${esc(b.guide||'')}','${esc(b.guide_phone||'')}','${esc(b.email||'')}')">Submit rating & tip</button>
    </div>`;
  } else if(status === 'In Progress'){
    afterRide = `<div class="pending-note">Ride in progress. After it ends you’ll rate your rider here.</div>`;
  }
  return `<div class="booking-row" style="flex-direction:column;align-items:stretch;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <strong>${esc(b.tour_title)}</strong>
      <span class="status ${statusClassFor(status)}">${esc(status)}</span>
    </div>
    <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">Date: ${esc(b.date)} · Ref: ${esc(b.ref||b.id)}</div>
    ${riderBlock}
    ${active ? renderRidePackCard(pack) : ''}
    ${afterRide}
  </div>`;
}
async function submitPostRideFeedback(bookingId, tourId, guideName, guidePhone, email){
  const stars = parseInt($(`rate-stars-${bookingId}`)?.value || '5', 10);
  const text = ($(`rate-text-${bookingId}`)?.value || '').trim();
  const tip = parseInt($(`tip-npr-${bookingId}`)?.value || '0', 10) || 0;
  try {
    await supabaseClient.from('reviews').insert([{ tour_id: tourId||'general', email, name: (email||'').split('@')[0], rating: stars, comment: text || `Rated ${guideName||'rider'}` }]);
  } catch(e){}
  const pack = { ...loadRidePack(bookingId), rated:true, tip_npr:tip, rating:stars, review:text };
  saveRidePackLocal(bookingId, pack);
  try { await supabaseClient.from('bookings').update({ ride_details: JSON.stringify(pack), rated:true, tip_npr:tip }).eq('id', bookingId); } catch(e){}
  showToast('Thanks for the feedback!', 'success');
  if(tip > 0 && guidePhone){
    const digits = String(guidePhone).replace(/[^0-9]/g,'');
    const withCountry = digits.startsWith('977') ? digits : `977${digits.replace(/^0+/,'')}`;
    window.open(`https://wa.me/${withCountry}?text=${encodeURIComponent('Feel It rider left a tip of NPR '+tip+'. Please arrange transfer with the office.')}`, '_blank');
  }
}

function openTermsModal(){
  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Terms & Conditions</h2>
    <p>Bookings stay Pending until we verify payment. Wear supplied gear. Refunds only if we cannot verify the transfer.</p>
    <button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">I Understand</button>`;
  showOverlay();
}

async function renderContactSection(){
  const holder = $('contactDynamic');
  if(!holder) return;
  const sessionUser = await checkActiveAuthUser();
  if(!sessionUser){
    holder.innerHTML = `
      <p style="margin:0 0 16px;color:var(--ink-soft);font-size:14px;">Log in to message us here, or WhatsApp instantly.</p>
      <a class="btn btn-primary" style="width:100%;margin-bottom:10px;" href="https://wa.me/${CONTACT_INFO.whatsapp}" target="_blank" rel="noopener">Chat on WhatsApp</a>
      <button class="btn btn-outline" style="width:100%;" onclick="openAuthModal()">Log in to message us</button>`;
    return;
  }
  await renderMessageThreadInto(holder, sessionUser.email, sessionUser.name, { context:'contact' });
}
function initContactDisplay(){
  if($('contactEmailDisplay')){ $('contactEmailDisplay').textContent = CONTACT_INFO.email; $('contactEmailDisplay').href = 'mailto:'+CONTACT_INFO.email; }
  if($('contactPhoneDisplay')){ $('contactPhoneDisplay').textContent = CONTACT_INFO.phone; }
  if($('contactWaLink')) $('contactWaLink').href = 'https://wa.me/'+CONTACT_INFO.whatsapp;
  if($('contactAddressDisplay')) $('contactAddressDisplay').textContent = CONTACT_INFO.address;
  renderContactSection();
}
async function renderMessageThreadInto(holder, email, displayName, opts){
  opts = opts || {};
  let msgs = [];
  let loadError = null;
  try {
    const { data, error } = await supabaseClient.from('messages').select('*').eq('email', email).order('created_at', { ascending:true });
    if(error) loadError = error;
    msgs = data || [];
  } catch(e){ loadError = e; }
  const local = loadLocalMessages(email);
  if(local.length){
    const keys = new Set(msgs.map(m => (m.body||'')+'|'+(m.created_at||'')+'|'+(m.sender||'')));
    local.forEach(m => {
      const k = (m.body||'')+'|'+(m.created_at||'')+'|'+(m.sender||'');
      if(!keys.has(k)) msgs.push(m);
    });
    msgs.sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));
  }
  const threadHtml = (!msgs.length && loadError)
    ? `<div class="empty-state">Could not load cloud messages. Local copies still work on this device.</div>`
    : (msgs.length ? msgs.map(m => `
        <div class="chat-bubble ${m.sender==='admin'?'chat-bubble-admin':'chat-bubble-customer'}">
          <div class="chat-bubble-sender">${m.sender==='admin'?'Feel It Team':esc(displayName||'You')}</div>
          <div class="chat-bubble-body">${esc(m.body)}</div>
        </div>`).join('') : '<div class="empty-state">No messages yet.</div>');
  const inputId = opts.context==='contact' ? 'contactMsgInput' : 'dashMsgInput';
  const btnId = opts.context==='contact' ? 'contactMsgBtn' : 'dashMsgBtn';
  holder.innerHTML = `
    <div class="chat-thread">${threadHtml}</div>
    <div class="field"><textarea id="${inputId}" rows="2" placeholder="Write a message…"></textarea></div>
    <button class="btn btn-primary" id="${btnId}" onclick="sendCustomerMessage('${esc(email)}','${esc(displayName||'')}','${inputId}','${btnId}','${esc(opts.context||'default')}')">Send</button>`;
}
async function sendCustomerMessage(email, name, inputId, btnId, context){
  const input = $(inputId);
  const body = (input?.value||'').trim();
  if(!body) return;
  const restoreBtn = setBusy($(btnId), '…');
  const row = { email, name: name || email.split('@')[0], sender:'customer', body, created_at: new Date().toISOString() };
  await sbWrite(supabaseClient.from('messages').insert([row]), 'Cloud save failed — kept on this device');
  saveLocalMessage(row);
  restoreBtn();
  input.value = '';
  const holder = context==='contact' ? $('contactDynamic') : $('dashboardMessages');
  if(holder) await renderMessageThreadInto(holder, email, name, { context });
}

/* ---------------- ADMIN ---------------- */
function requireStaffSession(){
  if(!isValidAdminSession()){
    showToast('Staff login required.', 'error');
    showAuthTabs('login');
    return false;
  }
  return true;
}
async function renderAdminPanel(tab){
  if(!requireStaffSession()) return;
  tab = tab || 'bookings';
  const tabs = ['bookings','tours','addTour','featured','costs','weather','settings','users','messages','reviews','photos','ad'];
  const labels = {
    bookings:'Bookings', tours:'Tours', addTour:'Add tour', featured:'Featured',
    costs:'Costs', weather:'Weather FX', settings:'Site', users:'Customers',
    messages:'Messages', reviews:'Reviews', photos:'Photos', ad:'Popup'
  };

  let allBookings = [];
  try {
    const { data } = await supabaseClient.from('bookings').select('*');
    allBookings = data || [];
  } catch(e){}
  try {
    const flags = JSON.parse(localStorage.getItem('feelit_booking_status')||'{}');
    allBookings = allBookings.map(b => {
      const pack = loadRidePack(b.id);
      const st = flags[String(b.id)];
      return { ...b, ...(st?{status:st}:{}) , ride_details: b.ride_details || (Object.keys(pack).length ? JSON.stringify(pack) : b.ride_details) };
    });
  } catch(e){}

  let body = '';
  if(tab==='bookings'){
    const list = [...allBookings].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    body = `<datalist id="knownGuidesList">${knownGuides.map(g=>`<option value="${esc(g)}">`).join('')}</datalist>`
      + (list.length ? list.map(renderBookingRowForAdmin).join('') : '<div class="empty-state">No bookings yet.</div>');
  } else if(tab==='tours'){
    body = tours.map(t => `
      <div class="booking-row" style="flex-direction:column;">
        <strong>${esc(t.title)}</strong>
        <div class="row-2">
          <div class="field"><label>Title</label><input id="adm-title-${esc(t.id)}" value="${esc(t.title)}"></div>
          <div class="field"><label>Region</label><input id="adm-region-${esc(t.id)}" value="${esc(t.region)}"></div>
        </div>
        <div class="row-2">
          <div class="field"><label>Duration</label><input id="adm-duration-${esc(t.id)}" value="${esc(t.duration)}"></div>
          <div class="field"><label>Foreigner NPR</label><input type="number" id="adm-price-${esc(t.id)}" value="${esc(t.price)}"></div>
        </div>
        <div class="field"><label>Local NPR</label><input type="number" id="adm-price-local-${esc(t.id)}" value="${esc(t.price_local)}"></div>
        <div class="row-2">
          <div class="field"><label>Guide</label><input id="adm-guide-${esc(t.id)}" value="${esc(t.guide)}"></div>
          <div class="field"><label>Guide phone</label><input id="adm-guidephone-${esc(t.id)}" value="${esc(t.guide_phone)}"></div>
        </div>
        <div class="field"><label>Description</label><textarea id="adm-desc-${esc(t.id)}" rows="2">${esc(t.desc||'')}</textarea></div>
        <div class="field"><label>Image URL</label><input id="adm-image-${esc(t.id)}" value="${esc(t.imageUrl||'')}"></div>
        <label class="checkbox-field"><input type="checkbox" id="adm-gem-${esc(t.id)}" ${t.hidden_gem?'checked':''}> Hidden gem</label>
        <button class="btn btn-primary" onclick="saveTourEdits('${esc(t.id)}')">Save tour</button>
        <button class="btn btn-outline" onclick="deleteTourAdmin('${esc(t.id)}')">Delete</button>
      </div>`).join('');
  } else if(tab==='addTour'){
    body = `<div class="form-card">
      <div class="field"><label>ID</label><input id="newTourId" placeholder="t4"></div>
      <div class="field"><label>Title</label><input id="newTourTitle"></div>
      <div class="field"><label>Region</label><input id="newTourRegion"></div>
      <div class="field"><label>Duration</label><input id="newTourDuration" placeholder="Full day"></div>
      <div class="field"><label>Foreigner price</label><input type="number" id="newTourPrice"></div>
      <div class="field"><label>Local price</label><input type="number" id="newTourPriceLocal"></div>
      <button class="btn btn-primary" onclick="createTourAdmin()">Create tour</button>
    </div>`;
  } else if(tab==='featured'){
    const ids = loadFeaturedIds();
    body = `<p class="form-note">Tick tours for the homepage Featured strip (order = check order).</p>`
      + tours.map(t => `<label class="checkbox-field"><input type="checkbox" class="feat-id" value="${esc(t.id)}" ${ids.includes(t.id)?'checked':''}> ${esc(t.title)}</label>`).join('')
      + `<button class="btn btn-primary" onclick="saveFeaturedAdmin()">Save featured</button>`;
  } else if(tab==='costs'){
    body = `<p class="form-note">Fuel / hotel / food rates used in custom route estimates. Edit ROUTE_PRICING in script or store in feelit_costs.</p>
      <div class="field"><label>Fuel NPR / km (highway)</label><input id="costFuel" type="number" value="${ROUTE_PRICING.highway.perKm}"></div>
      <div class="field"><label>Hotel / day</label><input id="costHotel" type="number" value="${ROUTE_PRICING.highway.hotelPerDay}"></div>
      <div class="field"><label>Food / day</label><input id="costFood" type="number" value="${ROUTE_PRICING.highway.foodPerDay}"></div>
      <button class="btn btn-primary" onclick="saveCostsAdmin()">Save costs</button>`;
  } else if(tab==='weather'){
    body = `<p class="form-note">Weather FX are driven by Open-Meteo + feelit-extras.js. Toggle stored in site_settings.</p>
      <button class="btn btn-primary" onclick="saveSiteSetting('weather_fx','on')">Enable FX</button>
      <button class="btn btn-outline" onclick="saveSiteSetting('weather_fx','off')">Disable FX</button>`;
  } else if(tab==='settings'){
    body = `<div class="field"><label>WhatsApp digits</label><input id="setWa" value="${esc(CONTACT_INFO.whatsapp)}"></div>
      <div class="field"><label>Instagram</label><input id="setIg" value="${esc(CONTACT_INFO.instagram)}"></div>
      <p class="form-note">Contact constants live in script.js. Hero photo is assets/1.png.</p>`;
  } else if(tab==='users'){
    const unique = [];
    const seen = new Set();
    allBookings.forEach(b => { if(b.email && !seen.has(b.email)){ seen.add(b.email); unique.push(b); } });
    body = unique.map(u => `<div class="booking-row">${esc(u.name)} · ${esc(u.email)} · ${esc(u.phone)}</div>`).join('') || '<div class="empty-state">No customers yet.</div>';
  } else if(tab==='messages'){
    body = await buildAdminMessagesBody();
  } else if(tab==='reviews'){
    let rows = [];
    try { const { data } = await supabaseClient.from('reviews').select('*').order('created_at',{ascending:false}); rows = data||[]; } catch(e){}
    body = rows.map(r => `<div class="booking-row">${starsHtml(r.rating)} ${esc(r.comment||'')} — ${esc(r.email||'')}</div>`).join('') || '<div class="empty-state">No reviews.</div>';
  } else if(tab==='photos'){
    body = await buildAdminPhotosBody();
  } else if(tab==='ad'){
    body = await buildAdminAdBody();
  }

  const pendingCount = allBookings.filter(b => (b.status||'Pending')==='Pending').length;
  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center;">
      <h2>Operations Panel</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a class="btn btn-outline btn-sm" href="admin.html">Financial Control</a>
        <button class="btn btn-danger btn-sm" type="button" onclick="adminLogout()">Logout</button>
      </div>
    </div>
    <p class="sub">Verify payments, publish ride packs, start/complete rides. Logout signs you out of this browser and Supabase.</p>
    <div class="admin-stat"><span>${allBookings.length}</span> bookings · <span>${pendingCount}</span> pending</div>
    <div class="filters admin-tabs">
      ${tabs.map(k=>`<button class="chip ${k===tab?'active':''}" onclick="renderAdminPanel('${k}')">${labels[k]}</button>`).join('')}
    </div>
    <div>${body}</div>`;
  showOverlay();
  hydrateWeatherChips($('modalContent'));
}

function renderBookingRowForAdmin(b){
  const statusClass = statusClassFor(b.status);
  const methodLabel = PAYMENT_METHODS[b.payment_method]?.label || b.payment_method || '—';
  const pid = esc(b.id);
  let actionBlock = '';
  if(b.status === 'Confirmed' || b.status === 'In Progress' || b.status === 'Completed'){
    const pack = mergeBookingRidePack(b);
    actionBlock = `
      <div class="rider-reveal-box"><strong>Rider:</strong> ${esc(b.guide||'—')} — ${esc(b.guide_phone||'')}</div>
      ${renderRidePackCard(pack, { adminPreview:true })}
      <details class="ride-pack-editor" ${pack.meeting_point?'':'open'}>
        <summary>Edit ride pack (customer sees this)</summary>
        <div class="ride-pack-form">
          <div class="row-2">
            <div class="field"><label>Meeting point</label><input id="rp-meet-${pid}" value="${esc(pack.meeting_point)}"></div>
            <div class="field"><label>Meeting time</label><input id="rp-time-${pid}" value="${esc(pack.meeting_time)}" placeholder="7:30 AM"></div>
          </div>
          <div class="field"><label>Pickup notes</label><input id="rp-pickup-${pid}" value="${esc(pack.pickup)}"></div>
          <div class="field"><label>Itinerary</label><textarea id="rp-itin-${pid}" rows="3">${esc(pack.itinerary)}</textarea></div>
          <div class="field"><label>Where they eat</label><textarea id="rp-meals-${pid}" rows="2">${esc(pack.meals)}</textarea></div>
          <div class="field"><label>What to bring</label><textarea id="rp-bring-${pid}" rows="2">${esc(pack.bring)}</textarea></div>
          <div class="field"><label>Notes</label><textarea id="rp-notes-${pid}" rows="2">${esc(pack.notes)}</textarea></div>
          <div class="field"><label>Emergency</label><input id="rp-emerg-${pid}" value="${esc(pack.emergency)}"></div>
          <button type="button" class="btn btn-primary" onclick="saveRidePackForBooking('${pid}')">Save ride pack</button>
          <button type="button" class="btn btn-outline" onclick="notifyCustomerRidePack('${pid}','${esc(b.phone||'')}','${esc(b.name||'')}','${esc(b.tour_title||'')}','${esc(b.date||'')}','${esc(b.guide||'')}','${esc(b.guide_phone||'')}')">WhatsApp briefing</button>
        </div>
      </details>
      <div class="ride-status-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        ${b.status==='Confirmed' ? `<button class="btn btn-primary" type="button" onclick="setBookingStatus('${pid}','In Progress')">Start ride</button>` : ''}
        ${b.status==='In Progress' ? `<button class="btn btn-primary" type="button" onclick="setBookingStatus('${pid}','Completed')">Complete ride</button>` : ''}
        ${b.status==='Completed' ? `<span class="pending-note">Completed — customer can rate & tip.</span>` : ''}
        <button class="btn btn-outline" style="border-color:#ef4444;color:#ef4444;" type="button" onclick="cancelBooking('${pid}')">Cancel</button>
      </div>`;
  } else if(b.status === 'Cancelled'){
    actionBlock = `<div class="pending-note">Cancelled.</div>`;
  } else {
    actionBlock = `
      <div class="row-2" style="margin-top:10px;">
        <div class="field"><label>Assign rider</label><input list="knownGuidesList" id="assign-guide-${b.id}"></div>
        <div class="field"><label>Rider phone</label><input id="assign-phone-${b.id}" placeholder="+977-98..."></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" id="confirm-btn-${b.id}" onclick="assignRiderToBooking('${esc(b.id)}','${esc(b.phone||'')}','${esc(b.name||'')}','${esc(b.tour_title||'')}','${esc(b.date||'')}')">Verify payment & confirm rider</button>
        <button class="btn btn-outline" style="border-color:#ef4444;color:#ef4444;" onclick="cancelBooking('${esc(b.id)}')">Cancel</button>
      </div>`;
  }
  return `<div class="booking-row admin-booking-row" style="flex-direction:column;align-items:stretch;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;">
      <strong>${esc(b.tour_title)} (${esc(b.date)})</strong>
      <span class="status ${statusClass}">${esc(b.status||'Pending')}</span>
    </div>
    <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">
      ${esc(b.name)} (${esc(b.email)} · ${esc(b.phone)})<br>
      ${esc(methodLabel)} · Txn ${esc(b.txn_ref)} · ${fmtNPR(b.total)} ${b.guest_type? '· '+esc(b.guest_type):''}
    </div>
    ${renderPaymentProofThumb(b)}
    ${actionBlock}
  </div>`;
}

async function assignRiderToBooking(bookingId, customerPhone, customerName, tourTitle, date){
  const guide = ($(`assign-guide-${bookingId}`)?.value||'').trim();
  const guidePhone = ($(`assign-phone-${bookingId}`)?.value||'').trim();
  if(!guide || !guidePhone){ showToast('Enter rider name and phone.', 'error'); return; }
  const restoreBtn = setBusy($(`confirm-btn-${bookingId}`), 'Confirming…');
  const ok = await sbWrite(
    supabaseClient.from('bookings').update({ guide, guide_phone: guidePhone, status:'Confirmed' }).eq('id', bookingId),
    'Could not confirm — log in with the Supabase staff user so RLS allows UPDATE'
  );
  restoreBtn();
  if(!ok) return;
  showToast('Confirmed.', 'success');
  renderAdminPanel('bookings');
  notifyCustomerWhatsApp(customerPhone, customerName, tourTitle, date, guide, guidePhone);
}
function notifyCustomerWhatsApp(customerPhone, customerName, tourTitle, date, guide, guidePhone){
  if(!customerPhone) return;
  const digits = String(customerPhone).replace(/[^0-9]/g,'');
  const withCountry = digits.startsWith('977') ? digits : `977${digits.replace(/^0+/,'')}`;
  const msg = `Hi ${customerName||'there'}! Your Feel It booking for "${tourTitle}" on ${date} is confirmed. Rider: ${guide} (${guidePhone}).`;
  window.open(`https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`, '_blank');
}
async function saveRidePackForBooking(bookingId){
  const pack = {
    meeting_point: ($(`rp-meet-${bookingId}`)?.value||'').trim(),
    meeting_time: ($(`rp-time-${bookingId}`)?.value||'').trim(),
    pickup: ($(`rp-pickup-${bookingId}`)?.value||'').trim(),
    itinerary: ($(`rp-itin-${bookingId}`)?.value||'').trim(),
    meals: ($(`rp-meals-${bookingId}`)?.value||'').trim(),
    bring: ($(`rp-bring-${bookingId}`)?.value||'').trim(),
    notes: ($(`rp-notes-${bookingId}`)?.value||'').trim(),
    emergency: ($(`rp-emerg-${bookingId}`)?.value||'').trim()
  };
  saveRidePackLocal(bookingId, pack);
  try {
    const { error } = await supabaseClient.from('bookings').update({ ride_details: JSON.stringify(pack) }).eq('id', bookingId);
    if(error) console.warn(error.message);
  } catch(e){}
  showToast('Ride pack saved.', 'success');
  renderAdminPanel('bookings');
}
async function setBookingStatus(bookingId, status){
  const ok = await sbWrite(
    supabaseClient.from('bookings').update({ status }).eq('id', bookingId),
    'Could not update status — use Supabase staff login'
  );
  if(!ok){
    try {
      const flags = JSON.parse(localStorage.getItem('feelit_booking_status')||'{}');
      flags[String(bookingId)] = status;
      localStorage.setItem('feelit_booking_status', JSON.stringify(flags));
    } catch(e){}
  } else showToast('Ride status → ' + status, 'success');
  renderAdminPanel('bookings');
}
function notifyCustomerRidePack(bookingId, customerPhone, customerName, tourTitle, date, guide, guidePhone){
  const pack = mergeBookingRidePack({ id: bookingId, guide, guide_phone: guidePhone });
  if(!customerPhone){ showToast('No customer phone.', 'error'); return; }
  const digits = String(customerPhone).replace(/[^0-9]/g,'');
  const withCountry = digits.startsWith('977') ? digits : `977${digits.replace(/^0+/,'')}`;
  const lines = [
    `Hi ${customerName||'there'}! Ride briefing for "${tourTitle}" (${date}):`,
    guide ? `Rider: ${guide} ${guidePhone||''}` : '',
    pack.meeting_point ? `Meet: ${pack.meeting_point}` : '',
    pack.meeting_time ? `Time: ${pack.meeting_time}` : '',
    pack.pickup ? `Pickup: ${pack.pickup}` : '',
    pack.itinerary ? `Itinerary:\n${pack.itinerary}` : '',
    pack.meals ? `Meals:\n${pack.meals}` : '',
    pack.bring ? `Bring: ${pack.bring}` : '',
    pack.notes ? `Notes: ${pack.notes}` : ''
  ].filter(Boolean);
  window.open(`https://wa.me/${withCountry}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}
async function cancelBooking(bookingId){
  if(!confirm('Cancel this booking?')) return;
  const ok = await sbWrite(supabaseClient.from('bookings').update({ status:'Cancelled' }).eq('id', bookingId), 'Could not cancel');
  if(ok) showToast('Cancelled.', 'success');
  renderAdminPanel('bookings');
}
async function saveTourEdits(id){
  const patch = {
    title: val(`adm-title-${id}`),
    region: val(`adm-region-${id}`),
    duration: val(`adm-duration-${id}`),
    price: parseFloat(val(`adm-price-${id}`)),
    price_local: parseFloat(val(`adm-price-local-${id}`)),
    guide: val(`adm-guide-${id}`),
    guide_phone: val(`adm-guidephone-${id}`),
    description: val(`adm-desc-${id}`),
    image_url: imgSrc(val(`adm-image-${id}`)),
    hidden_gem: !!$(`adm-gem-${id}`)?.checked
  };
  const ok = await sbWrite(supabaseClient.from('tours').update(patch).eq('id', id), 'Could not save tour');
  if(!ok) return;
  showToast('Tour saved.', 'success');
  await loadTours();
  renderAdminPanel('tours');
}
async function deleteTourAdmin(id){
  if(!confirm('Delete this tour?')) return;
  const ok = await sbWrite(supabaseClient.from('tours').delete().eq('id', id), 'Could not delete');
  if(ok){ await loadTours(); renderAdminPanel('tours'); }
}
async function createTourAdmin(){
  const row = {
    id: ($('newTourId')?.value||('t'+Date.now())).trim(),
    title: $('newTourTitle')?.value,
    region: $('newTourRegion')?.value,
    duration: $('newTourDuration')?.value,
    price: parseFloat($('newTourPrice')?.value||'0'),
    price_local: parseFloat($('newTourPriceLocal')?.value||'0'),
    hidden_gem: false
  };
  const ok = await sbWrite(supabaseClient.from('tours').insert([row]), 'Could not create tour');
  if(ok){ await loadTours(); renderAdminPanel('tours'); }
}
function saveFeaturedAdmin(){
  const ids = [...document.querySelectorAll('.feat-id:checked')].map(el => el.value);
  saveFeaturedIds(ids);
  showToast('Featured list saved.', 'success');
  if(typeof window.renderTours === 'function') window.renderTours();
}
function saveCostsAdmin(){
  ROUTE_PRICING.highway.perKm = parseFloat($('costFuel')?.value||ROUTE_PRICING.highway.perKm);
  ROUTE_PRICING.highway.hotelPerDay = parseFloat($('costHotel')?.value||ROUTE_PRICING.highway.hotelPerDay);
  ROUTE_PRICING.highway.foodPerDay = parseFloat($('costFood')?.value||ROUTE_PRICING.highway.foodPerDay);
  try { localStorage.setItem('feelit_route_pricing', JSON.stringify(ROUTE_PRICING)); } catch(e){}
  showToast('Costs saved on this device.', 'success');
}
async function saveSiteSetting(key, value){
  await sbWrite(supabaseClient.from('site_settings').upsert([{ key, value, updated_at: new Date().toISOString() }]), 'Could not save setting');
  showToast('Saved.', 'success');
}

async function buildAdminMessagesBody(){
  let allMsgs = [];
  try {
    const { data } = await supabaseClient.from('messages').select('*').order('created_at', { ascending:true });
    allMsgs = data || [];
  } catch(e){}
  loadAllLocalMessages().forEach(m => {
    if(!allMsgs.some(x => x.body===m.body && x.email===m.email && x.created_at===m.created_at)) allMsgs.push(m);
  });
  if(adminActiveThreadEmail){
    const thread = allMsgs.filter(m => m.email === adminActiveThreadEmail);
    const custName = thread.find(m => m.sender==='customer')?.name || adminActiveThreadEmail;
    const bubbles = thread.map(m => `
      <div class="chat-bubble ${m.sender==='admin'?'chat-bubble-admin':'chat-bubble-customer'}">
        <div class="chat-bubble-sender">${m.sender==='admin'?'You':' '+esc(custName)}</div>
        <div class="chat-bubble-body">${esc(m.body)}</div>
      </div>`).join('') || '<div class="empty-state">No messages in this thread.</div>';
    return `<button class="btn btn-outline btn-sm" onclick="adminBackToThreads()">Back</button>
      <h3>${esc(custName)}</h3>
      <div class="chat-thread">${bubbles}</div>
      <textarea id="adminReplyInput" rows="2"></textarea>
      <button class="btn btn-primary" id="adminReplyBtn" onclick="adminSendReply('${esc(adminActiveThreadEmail)}')">Reply</button>`;
  }
  const byEmail = {};
  allMsgs.forEach(m => { byEmail[m.email] = m; });
  const threads = Object.values(byEmail);
  if(!threads.length) return '<div class="empty-state">No conversations yet.</div>';
  return threads.map(m => `<button class="booking-row" style="width:100%;text-align:left;" onclick="adminOpenThread('${esc(m.email)}')">${esc(m.name||m.email)} — ${esc((m.body||'').slice(0,80))}</button>`).join('');
}
function adminBackToThreads(){ adminActiveThreadEmail = null; renderAdminPanel('messages'); }
function adminOpenThread(email){ adminActiveThreadEmail = email; renderAdminPanel('messages'); }
async function adminSendReply(email){
  const body = ($('adminReplyInput')?.value||'').trim();
  if(!body) return;
  const restoreBtn = setBusy($('adminReplyBtn'), 'Sending…');
  const row = { email, name:'Feel It Team', sender:'admin', body, created_at: new Date().toISOString() };
  await sbWrite(supabaseClient.from('messages').insert([row]), 'Cloud reply failed — saved locally');
  saveLocalMessage(row);
  restoreBtn();
  if($('adminReplyInput')) $('adminReplyInput').value = '';
  renderAdminPanel('messages');
}

async function buildAdminPhotosBody(){
  let photos = [];
  try { const { data } = await supabaseClient.from('photos').select('*').order('created_at',{ascending:false}); photos = data||[]; } catch(e){}
  return `<div class="field"><label>Image URL</label><input id="photoUrl"></div>
    <div class="field"><label>Caption</label><input id="photoCap"></div>
    <button class="btn btn-primary" onclick="addPhotoAdmin()">Add photo</button>
    ${photos.map(p => `<div class="booking-row"><img src="${esc(p.image_url)}" alt="" style="max-width:120px;"> ${esc(p.caption||'')} <button class="btn btn-outline" onclick="deletePhotoAdmin('${p.id}')">Delete</button></div>`).join('')}`;
}
async function addPhotoAdmin(){
  const image_url = imgSrc($('photoUrl')?.value||'');
  const caption = $('photoCap')?.value||'';
  if(!image_url){ showToast('Add an image URL.', 'error'); return; }
  const ok = await sbWrite(supabaseClient.from('photos').insert([{ image_url, caption }]), 'Could not add photo');
  if(ok) renderAdminPanel('photos');
}
async function deletePhotoAdmin(id){
  const ok = await sbWrite(supabaseClient.from('photos').delete().eq('id', id), 'Could not delete');
  if(ok) renderAdminPanel('photos');
}
async function buildAdminAdBody(){
  let ad = {};
  try { const { data } = await supabaseClient.from('popup_ad').select('*').eq('id',1).maybeSingle(); ad = data||{}; } catch(e){}
  return `<div class="field"><label>Image URL</label><input id="adImageUrl" value="${esc(ad.image_url||'')}"></div>
    <div class="field"><label>Link URL</label><input id="adLinkUrl" value="${esc(ad.link_url||'')}"></div>
    <label class="checkbox-field"><input type="checkbox" id="adEnabled" ${ad.enabled?'checked':''}> Enabled</label>
    <button class="btn btn-primary" id="saveAdBtn" onclick="savePopupAd()">Save</button>`;
}
async function savePopupAd(){
  const image_url = convertDriveLink(($('adImageUrl')?.value||'').trim());
  const link_url = ($('adLinkUrl')?.value||'').trim();
  const enabled = $('adEnabled')?.checked;
  const ok = await sbWrite(supabaseClient.from('popup_ad').upsert([{ id:1, image_url, link_url, enabled, updated_at: new Date().toISOString() }]), 'Could not save ad');
  if(ok) showToast('Popup saved.', 'success');
}

function openGuideForm(){
  $('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Apply as a guide</h2>
    <div class="field"><label>Name</label><input id="gName"></div>
    <div class="field"><label>Phone</label><input id="gPhone"></div>
    <div class="field"><label>Email</label><input id="gEmail"></div>
    <div class="field"><label>Experience</label><textarea id="gExp" rows="3"></textarea></div>
    <button class="btn btn-primary" onclick="submitGuideApp()">Submit</button>`;
  showOverlay();
}
async function submitGuideApp(){
  const row = { name:$('gName')?.value, phone:$('gPhone')?.value, email:$('gEmail')?.value, experience:$('gExp')?.value };
  const ok = await sbWrite(supabaseClient.from('guide_apps').insert([row]), 'Could not submit');
  if(ok){ showToast('Application sent.', 'success'); closeOverlay(); }
}

/* ---------------- maps (safe no-ops if Leaflet missing) ---------------- */
function initMap(){
  if(typeof L === 'undefined') return;
  const el = $('tourMap');
  if(!el || el._leaflet_id) return;
  try {
    const map = L.map('tourMap').setView([27.7, 85.3], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM' }).addTo(map);
    window._feelitMap = map;
    renderMapMarkers();
  } catch(e){ console.warn(e); }
}
function renderMapMarkers(){
  const map = window._feelitMap;
  if(!map || typeof L === 'undefined') return;
  tours.forEach(t => {
    if(t.lat && t.lng){
      L.marker([t.lat, t.lng]).addTo(map).bindPopup(`<strong>${esc(t.title)}</strong><br>${fmtNPR(t.price)}`);
    }
  });
}
function initTourMapSearch(){}
async function recalcRouteEstimate(){}
function applyFeatToRouteBuilder(){
  const days = $('featDays')?.value;
  const group = $('featGroup')?.value;
  if(days && $('routeDays')) $('routeDays').value = days;
  if(group && $('routePassengers')) $('routePassengers').value = group;
  syncFeatCustomize();
}
function syncFeatCustomize(){
  const h = $('featHotel'), f = $('featFood');
  if(h && $('routeIncludeHotel')) $('routeIncludeHotel').checked = h.checked;
  if(f && $('routeIncludeFood')) $('routeIncludeFood').checked = f.checked;
}

function loadTheme(){
  const t = localStorage.getItem('feelit_theme');
  if(t) document.documentElement.setAttribute('data-theme', t);
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', cur);
  localStorage.setItem('feelit_theme', cur);
}
function enforceHttps(){
  try {
    if(location.protocol === 'http:' && /github\.io$/.test(location.hostname)){
      location.replace('https://' + location.host + location.pathname + location.search + location.hash);
    }
  } catch(e){}
}
function initCookieConsent(){
  const banner = $('cookieBanner');
  if(!banner) return;
  let choice = null;
  try { choice = localStorage.getItem('feelit_cookie_consent'); } catch(e){}
  if(choice === 'all' || choice === 'essential') { if(choice==='all') loadAnalyticsIfAllowed(); return; }
  banner.hidden = false;
  $('cookieAccept')?.addEventListener('click', () => {
    try { localStorage.setItem('feelit_cookie_consent','all'); } catch(e){}
    banner.hidden = true;
    loadAnalyticsIfAllowed();
  });
  $('cookieReject')?.addEventListener('click', () => {
    try { localStorage.setItem('feelit_cookie_consent','essential'); } catch(e){}
    banner.hidden = true;
  });
}
function loadAnalyticsIfAllowed(){
  const GA_ID = '';
  if(!GA_ID || $('ga4-script')) return;
}

window.addEventListener('DOMContentLoaded', async () => {
  enforceHttps();
  initCookieConsent();
  loadTheme();
  try {
    const stored = localStorage.getItem('feelit_route_pricing');
    if(stored) Object.assign(ROUTE_PRICING, JSON.parse(stored));
  } catch(e){}
  initContactDisplay();
  await loadTours();
  initMap();
  await checkUserSession();
  if(new URLSearchParams(location.search).get('admin') === '1' && isValidAdminSession()){
    history.replaceState(null, '', location.pathname + location.hash);
    renderAdminPanel('bookings');
  }
  document.addEventListener('click', (e) => {
    if(e.target && (e.target.id === 'overlay' || e.target.id === 'modalOverlay')) closeOverlay();
  });
});

window.renderTours = renderTours;
window.openTour = openTour;
window.openAuthModal = openAuthModal;
window.handleUserLogout = handleUserLogout;
window.adminLogout = adminLogout;
window.logoutEverywhere = logoutEverywhere;
