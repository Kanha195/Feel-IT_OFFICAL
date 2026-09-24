/* =========================================================================
   SUPABASE CONFIGURATION & CREDENTIALS
   ========================================================================= */
const SUPABASE_URL = 'https://gsjkexvchfozviqllpvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONTACT_INFO = {
  email: 'feelitofficial@gmail.com',
  phone: '+977-9808747221',
  whatsapp: '9779712065778', // wa.me needs country code + number, no + or leading 0
  instagram: 'feelitoffical', // <-- REPLACE with your real Instagram username (no @, no URL)
  address: 'Basundhara, Kathmandu, Nepal'
};

// SHA-256 hashed admin passcode for 'FeelIt@2026'
// NOTE: this is a client-side check only — see the security note at the
// bottom of this file before relying on it for anything real. The previous
// hash here was one character too long (65 hex chars, not 64) so it could
// never match any real SHA-256 output — admin login was silently broken.
const ADMIN_EMAIL = 'admin@feelit.com';
const ADMIN_PASS_HASH = '1bc57fec7b82137e1cfeefed41c9a9f5ded5e69de2a397151c504e139bffd324';

// Payment methods customers can pay with. QR images live in /assets.
// These are only ever shown once a date + traveler count has been chosen,
// at the actual payment step — never up front.
const PAYMENT_METHODS = {
  bank: {
    key: 'bank',
    label: 'Bank Transfer',
    shortLabel: 'Bank / Mobile Banking',
    icon: '🏦',
    accountName: 'Sushant Pariyar',
    accountNumber: '01420072132',
    accountMeta: 'Laxmi Sunrise · Savings Account',
    qrImage: 'assets/qr-bank.png'
  },
  esewa: {
    key: 'esewa',
    label: 'eSewa',
    shortLabel: 'Scan & Pay via eSewa',
    icon: '📱',
    accountName: 'Sushant Pariyar',
    accountNumber: '9808747221',
    accountMeta: 'eSewa Wallet',
    qrImage: 'assets/qr-esewa.png'
  }
};

// Flip enabled to true and fill in your real EmailJS keys (from
// emailjs.com → Account / Email Services / Email Templates) to make the
// contact form and booking confirmations actually send email. Until then,
// submissions are still saved to Supabase — they just won't email anyone.
const EMAILJS_CONFIG = {
  enabled: false,
  publicKey: 'YOUR_PUBLIC_KEY',
  serviceId: 'YOUR_SERVICE_ID',
  bookingTemplateId: 'YOUR_BOOKING_TEMPLATE_ID',
  contactTemplateId: 'YOUR_CONTACT_TEMPLATE_ID'
};

function initEmailJS(){
  if(EMAILJS_CONFIG.enabled && window.emailjs){
    emailjs.init(EMAILJS_CONFIG.publicKey);
  }
}

// Fire-and-log an EmailJS send. Never throws — a failed/unconfigured
// EmailJS send should never block a booking or contact message from
// being saved to Supabase.
async function sendEmailNotification(templateId, params){
  if(!EMAILJS_CONFIG.enabled || !window.emailjs) return;
  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, templateId, params);
  } catch(e){
    console.error('EmailJS send failed:', e);
  }
}

function esc(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmtNPR(n){
  const num = Number(n) || 0;
  return 'NPR ' + num.toLocaleString();
}

function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  toast.innerHTML = `<span>${esc(message)}</span><button class="toast-close-btn" onclick="this.parentElement.remove()">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

// Toggle a button into/out of a disabled "Processing..." state so people
// can't double-submit forms while a Supabase call is in flight.
function setBusy(btn, busyText){
  if(!btn) return () => {};
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.dataset.originalText = original;
  btn.innerHTML = busyText || 'Please wait…';
  return () => { btn.disabled = false; btn.innerHTML = btn.dataset.originalText || original; };
}

// ---------------------------------------------------------------------
// SEED / DEMO TOUR DATA
// ---------------------------------------------------------------------
// This array is ONLY used as a fallback when the Supabase `tours` table
// is empty or unreachable (see loadTours() below) — it's what powers the
// site before you've added your own routes, and what it falls back to
// if Supabase has a hiccup. Everything here (guides, phone numbers,
// prices) is placeholder demo data — replace it for real routes using
// the "Manage Tours" / "Add New Tour" tabs in the Admin Panel once your
// Supabase table exists (see the setup checklist).
//
// A NOTE ON PRICING (NPR, per person):
// Short single-day rides (t1, t2) are priced to cover guide day-rate +
// fuel + a margin for both the rider and the company.
// Multi-day off-road routes (t3, t5, t6) additionally have to cover
// permits and lodging for every day on the road.
// Upper Mustang (t3) in particular got MUCH more expensive to run in
// 2026: Nepal replaced the old flat $500-for-10-days restricted area
// permit with a $50-PER-DAY-PER-PERSON fee (as of Dec 2025). A 5-day
// crossing now costs roughly $250 (~NPR 38,000) in permit fees ALONE,
// per traveler — on top of ACAP, TIMS, guide, fuel and lodging. The old
// NPR 48,000 price here would have lost you money on every booking.
// Re-check official permit rates before you rely on this price long-term
// — governments do revise these.
const seedTours = [
  { id:'t1', title:'Sarangkot Sunrise Ridge', region:'Pokhara', duration:'Half day', price:4000,
    guide:'Bikash Gurung', guide_phone:'+977-9812345678', bio:'11 years riding the Pokhara hills, fluent English.',
    desc:'A dawn climb out of Pokhara to the Sarangkot ridgeline for a sunrise over the Annapurna range.',
    includes:['125cc bike','Helmet & jacket','Fuel','Local guide'], lat:28.2439, lng:83.9486, image_url:'' },

  { id:'t2', title:'Kathmandu Valley Rim Loop', region:'Kathmandu', duration:'Full day', price:7000,
    guide:'Sunita Tamang', guide_phone:'+977-9823456789', bio:'Grew up riding the valley rim roads, runs a small 4-bike outfit.',
    desc:'A full loop around the ridges ringing Kathmandu, stopping at Nagarkot and tea houses.',
    includes:['150cc bike','Full gear set','Fuel & permits','Lunch stop'], lat:27.7172, lng:85.3240, image_url:'' },

  { id:'t3', title:'Upper Mustang Desert Crossing', region:'Mustang', duration:'5 days', price:105000,
    guide:'Tenzin Lama', guide_phone:'+977-9834567890', bio:'Born in Lo Manthang, led Mustang crossings for 9 seasons.',
    desc:'High desert crossing past Chörtens and canyon roads to the walled city of Lo Manthang. Price reflects the 2026 restricted-area permit rate of $50/person/day.',
    includes:['Off-road bike','Restricted area permit (RAP)','ACAP & TIMS','Teahouse lodging','Fuel'], lat:28.7819, lng:83.7380, image_url:'' },

  { id:'t4', title:'Chitwan Jungle & Riverside Ride', region:'Chitwan', duration:'2 days', price:14000,
    guide:'Rajan Chaudhary', guide_phone:'+977-9845678901', bio:'Tharu guide from Sauraha, rides the park-edge trails daily.',
    desc:'Warm lowland riding down to Chitwan, with a riverside camp and a walk along the national park buffer zone.',
    includes:['150cc bike','Full gear set','Fuel','Park entry fee','Local guide'], lat:27.5291, lng:84.3542, image_url:'' },

  { id:'t5', title:'Annapurna Circuit via Manang', region:'Manang', duration:'6 days', price:58000,
    guide:'Dawa Sherpa', guide_phone:'+977-9856789012', bio:'High-altitude specialist, has ridden the Manang loop for 6 seasons.',
    desc:'Switchbacks and suspension bridges up to Manang, with teahouse stops and thinning air above 3,500m.',
    includes:['Off-road bike','ACAP & TIMS permits','Teahouse lodging','Fuel','Local guide'], lat:28.6667, lng:84.0167, image_url:'' },

  { id:'t6', title:'Rara Lake Far-West Expedition', region:'Rara', duration:'6 days', price:72000,
    guide:'Karan Bohara', guide_phone:'+977-9867890123', bio:'Grew up in Mugu district, knows every fuel stop between here and Rara.',
    desc:"Nepal's remotest lake, reached via long, sparsely-fuelled far-west roads — bring patience and extra jerry cans.",
    includes:['Off-road bike','Extra fuel carried','Rara National Park entry','Basic lodging','Local guide'], lat:29.5333, lng:82.0833, image_url:'' },

  { id:'t7', title:'Ilam Tea Garden Hills Ride', region:'Ilam', duration:'2 days', price:12000,
    guide:'Sarita Rai', guide_phone:'+977-9878901234', bio:'Eastern-hills native, rides the tea estate roads around Ilam.',
    desc:'Gentle, green switchbacks through rolling tea estates in the far east — the calmest ride in the lineup.',
    includes:['150cc bike','Full gear set','Fuel','Tea garden visit','Local guide'], lat:26.9096, lng:87.9310, image_url:'' },

  // "Coming soon" entries have no price and no booking button — see the
  // coming_soon flag handling in renderTours() below. Use this pattern
  // to tease a route before it's actually bookable.
  { id:'t8', title:'Manaslu Circuit Off-Road Adventure', region:'Manaslu', duration:'7 days', price:null,
    guide:'', guide_phone:'', bio:'',
    desc:'A restricted-area circuit around the eighth-highest mountain on earth — in the works, launching soon.',
    includes:['Off-road bike','Restricted area permit','Teahouse lodging','Fuel','Local guide'],
    lat:28.5561, lng:84.6339, image_url:'', coming_soon:true }
];

let tours = [];
let activeFilter = 'All';
let pendingBooking = null;
let leafletMap = null;
let mapMarkers = [];

// Overlay Helpers — show/hide the single shared modal (#overlay > #modalContent)
// that every popup in this app (tour details, checkout, auth, admin, etc.)
// re-uses by swapping its innerHTML.
function showOverlay() { document.getElementById('overlay')?.classList.remove('hidden'); }
function closeOverlay() {
  document.getElementById('overlay')?.classList.add('hidden');
  const mc = document.getElementById('modalContent');
  if(mc) mc.style.maxWidth = ''; // reset any admin-panel widening
  pendingBooking = null;
}

/* ---------------- Theme Engine ---------------- */
// Dark/light mode, remembered in localStorage so it persists across visits.
async function loadTheme(){
  const saved = localStorage.getItem('feelit_theme') || 'dark';
  setTheme(saved);
}
function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme');
  const target = current === 'light' ? 'dark' : 'light';
  setTheme(target);
  localStorage.setItem('feelit_theme', target);
}
function setTheme(mode){
  if(mode === 'light'){
    document.documentElement.setAttribute('data-theme','light');
    if(document.getElementById('themeBtn')) document.getElementById('themeBtn').textContent = '🌙';
  }else{
    document.documentElement.removeAttribute('data-theme');
    if(document.getElementById('themeBtn')) document.getElementById('themeBtn').textContent = '☀️';
  }
}

function toggleMobileMenu(){ document.getElementById('mobileMenu')?.classList.toggle('open'); }
function closeMobileMenu(){ document.getElementById('mobileMenu')?.classList.remove('open'); }

/* ---------------- Tour & Map Sync ---------------- */
function normalizeTour(t){
  // Supabase rows and seed data may disagree on guidePhone vs guide_phone —
  // always settle on guide_phone so the rest of the app only has one shape.
  // Postgres also lower-cases unquoted column names, so a column typed as
  // "imageUrl" is actually stored (and returned) as "imageurl" — we settle
  // on snake_case `image_url` everywhere in this file to sidestep that trap.
  return {
    ...t,
    guide_phone: t.guide_phone || t.guidePhone || '',
    image_url: t.image_url || t.imageUrl || t.imageurl || '',
    coming_soon: !!(t.coming_soon || t.comingSoon)
  };
}

// Loads tours from Supabase; if that table doesn't exist yet (or the
// request fails for any reason — offline, RLS not set up yet, etc.) we
// fall back to the seed data above so the site never shows a blank page.
async function loadTours(){
  try {
    const { data, error } = await supabaseClient.from('tours').select('*');
    if (error || !data || data.length === 0) {
      tours = seedTours.map(normalizeTour);
    } else {
      tours = data.map(normalizeTour);
    }
  } catch (e) {
    tours = seedTours.map(normalizeTour);
  }
  renderFilters();
  renderTours();
  initMap();
}

function renderFilters(){
  const regions = ['All', ...new Set(tours.map(t=>t.region))];
  const el = document.getElementById('filters');
  if(el){
    el.innerHTML = regions.map(r=>
      `<button class="chip ${r===activeFilter?'active':''}" onclick="setFilter('${esc(r)}')">${esc(r)}</button>`
    ).join('');
  }
}
function setFilter(r){
  activeFilter = r;
  renderFilters();
  renderTours();
  renderMapMarkers();
}

// Renders the tour cards grid. "Coming soon" tours get a badge instead of
// a price, and a WhatsApp "notify me" link instead of a booking button —
// see the coming_soon branch below.
function renderTours(){
  const list = activeFilter==='All' ? tours : tours.filter(t=>t.region===activeFilter);
  const el = document.getElementById('tourGrid');
  if(!el) return;
  if(list.length===0){ el.innerHTML = '<div class="empty-state">No tours in this region yet.</div>'; return; }

  el.innerHTML = list.map(t=>{
    const bgStyle = t.image_url ? `background-image:url('${esc(t.image_url)}');` : `background:rgba(34,211,238,0.1);`;
    const artContent = t.image_url ? '' : `<svg width="70" height="46" viewBox="0 0 70 46" fill="none"><path d="M0 40 L18 12 L28 26 L40 4 L58 34 L70 22 L70 40 Z" fill="#22d3ee"/></svg>`;

    // Coming-soon card: no price, no booking button, just a teaser +
    // a WhatsApp link so interested travelers can ask to be notified.
    if(t.coming_soon){
      const waMsg = encodeURIComponent(`Hi! I'd like to be notified when the ${t.title} route opens for booking.`);
      return `
        <div class="card" style="opacity:0.88;">
          <div class="card-art" style="${bgStyle}">${artContent}</div>
          <div class="card-body">
            <div class="card-region">${esc(t.region)}</div>
            <h3 class="card-title">${esc(t.title)}</h3>
            <div class="card-meta"><span>${esc(t.duration)}</span><span class="badge" style="background:var(--primary-tint);color:var(--primary);border:1px solid var(--primary);border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;">COMING SOON</span></div>
            <p style="font-size:13px;color:var(--ink-soft);margin:4px 0 0;">${esc(t.desc)}</p>
            <a class="btn btn-outline" style="margin-top:12px;" href="https://wa.me/${CONTACT_INFO.whatsapp}?text=${waMsg}" target="_blank" rel="noopener">Notify me on WhatsApp</a>
          </div>
        </div>
      `;
    }

    return `
      <div class="card">
        <div class="card-art" style="${bgStyle}">${artContent}</div>
        <div class="card-body">
          <div class="card-region">${esc(t.region)}</div>
          <h3 class="card-title">${esc(t.title)}</h3>
          <div class="card-meta"><span>${esc(t.duration)}</span><span>Guide: ${esc(t.guide)}</span></div>
          <div class="card-price">${fmtNPR(t.price)} <small>/ person</small></div>
          <button class="btn btn-primary" onclick="openTour('${esc(t.id)}')">View & book</button>
        </div>
      </div>
    `;
  }).join('');
}

function initMap(){
  const mapContainer = document.getElementById('tourMap');
  if(!mapContainer || typeof L === 'undefined') return;

  if(!leafletMap){
    leafletMap = L.map('tourMap').setView([28.2096, 83.9856], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap'
    }).addTo(leafletMap);
  }
  renderMapMarkers();
}

function renderMapMarkers(){
  if(!leafletMap) return;
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];

  const visibleTours = activeFilter === 'All' ? tours : tours.filter(t => t.region === activeFilter);
  const bounds = [];

  visibleTours.forEach(t => {
    if(t.lat && t.lng){
      const marker = L.marker([t.lat, t.lng]).addTo(leafletMap);
      marker.bindPopup(`
        <strong>${esc(t.title)}</strong><br>
        Region: ${esc(t.region)}<br>
        Price: ${fmtNPR(t.price)}<br>
        <button class="map-popup-btn" onclick="openTour('${esc(t.id)}')">View Details</button>
      `);
      mapMarkers.push(marker);
      bounds.push([t.lat, t.lng]);
    }
  });

  if(bounds.length > 0){
    leafletMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
  }
}

/* ---------------- Tour Booking Flow ----------------
   Step 1: openTour            -> pick date & travelers
   Step 2: goToCheckout        -> validate + choose payment method (no QR yet)
   Step 3: selectPaymentMethod -> QR + payment details form appears here only
   Step 4: submitFinalBooking  -> booking saved as "Pending"; NO rider info
                                   is shown to the customer at this point.
   The admin panel is solely responsible for verifying payment and
   assigning/revealing a rider (see renderAdminPanel / assignRiderToBooking).
------------------------------------------------------------------------ */
function openTour(id){
  const t = tours.find(x=>x.id===id);
  if(!t) return;
  if(t.coming_soon){ showToast('This route isn\u2019t open for booking yet — use the WhatsApp link to get notified.', 'error'); return; }
  const initials = (t.guide || '').split(' ').filter(Boolean).map(w=>w[0]).join('') || '?';
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <div class="card-region">${esc(t.region)} · ${esc(t.duration)}</div>
    <h2>${esc(t.title)}</h2>
    <p class="sub">${esc(t.desc)}</p>
    <ul class="include-list">${(t.includes||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>
    <div class="guide-box">
      <div class="avatar">${esc(initials)}</div>
      <div><strong>${esc(t.guide)}</strong><br><span style="font-size:13px;color:var(--ink-soft);">${esc(t.bio)}</span></div>
    </div>
    <p class="form-note" style="margin:-6px 0 18px;">Your exact rider is confirmed by our team after payment — this is one of our regular guides for this route.</p>
    <div class="field">
      <label for="tourDate">Choose a date</label>
      <input type="date" id="tourDate" min="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="field">
      <label for="tourTravelers">Travelers</label>
      <input type="number" id="tourTravelers" value="1" min="1" max="6">
    </div>
    <div class="card-price" style="margin-bottom:18px;">${fmtNPR(t.price)} <small>/ person</small></div>
    <button class="btn btn-primary" style="width:100%;" onclick="goToCheckout('${esc(t.id)}')">Continue to payment</button>
  `;
  showOverlay();
}

async function goToCheckout(id){
  const t = tours.find(x=>x.id===id);
  if(!t) return;
  const date = document.getElementById('tourDate').value;
  const travelers = parseInt(document.getElementById('tourTravelers').value || '1',10);

  if(!date){ showToast('Please select a tour date.', 'error'); return; }
  if(!travelers || travelers < 1 || travelers > 6){ showToast('Travelers must be between 1 and 6.', 'error'); return; }

  const sessionUser = await checkActiveAuthUser();

  pendingBooking = {
    tourId: t.id,
    title: t.title,
    date,
    travelers,
    total: t.price * travelers,
    sessionUser,
    paymentMethod: null
  };

  renderPaymentMethodSelector();
}

// Step 2: pick HOW to pay. No QR is shown on this screen — it only
// appears once a specific method has been chosen.
function renderPaymentMethodSelector(){
  if(!pendingBooking) return;
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Choose a payment method</h2>
    <p class="sub">${esc(pendingBooking.title)} · ${esc(pendingBooking.date)} · ${pendingBooking.travelers} traveler(s) · Total: <strong>${fmtNPR(pendingBooking.total)}</strong></p>

    <div class="payment-method-grid">
      ${Object.values(PAYMENT_METHODS).map(m => `
        <button class="payment-method-card" onclick="selectPaymentMethod('${m.key}')">
          <span class="pm-icon">${m.icon}</span>
          <span class="pm-name">${esc(m.label)}</span>
          <span class="pm-sub">${esc(m.shortLabel)}</span>
        </button>
      `).join('')}
    </div>
    <p class="form-note" style="margin-top:16px;">You'll see the QR code and payment form after picking a method.</p>
  `;
  showOverlay();
}

function selectPaymentMethod(methodKey){
  if(!pendingBooking) return;
  pendingBooking.paymentMethod = methodKey;
  renderPaymentForm();
}

// Step 3: the QR itself only renders here, after date/travelers are
// locked in AND a payment method has been chosen.
function renderPaymentForm(){
  if(!pendingBooking || !pendingBooking.paymentMethod) return;
  const method = PAYMENT_METHODS[pendingBooking.paymentMethod];
  const sessionUser = pendingBooking.sessionUser;

  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <button type="button" class="btn-link-back" onclick="renderPaymentMethodSelector()">&larr; Choose a different payment method</button>
    <h2>Scan & Pay — ${esc(method.label)}</h2>
    <p class="sub">${esc(pendingBooking.title)} · ${esc(pendingBooking.date)} · Total: <strong>${fmtNPR(pendingBooking.total)}</strong></p>

    <div class="qr-box">
      <img src="${esc(method.qrImage)}" alt="${esc(method.label)} payment QR code" class="qr-img"
           onerror="this.onerror=null; this.replaceWith(Object.assign(document.createElement('div'), {className:'qr-img qr-img-missing', innerText:'QR image not found — use the account details below'}));">
      <p class="qr-account-name">${esc(method.accountName)}</p>
      <p class="qr-account-number">${esc(method.accountNumber)} <span class="qr-account-meta">· ${esc(method.accountMeta)}</span></p>
      <p class="qr-hint">Scan with your ${esc(method.label)} app for the exact amount above, then fill in your transaction reference below.</p>
    </div>

    <div class="row-2">
      <div class="field"><label>Full Name</label><input id="bkName" value="${esc(sessionUser?.name || '')}"></div>
      <div class="field"><label>Email Address</label><input id="bkEmail" type="email" value="${esc(sessionUser?.email || '')}"></div>
    </div>
    <div class="field"><label>Phone / WhatsApp</label><input id="bkPhone" value="${esc(sessionUser?.phone || '')}" placeholder="+977-98XXXXXXXX"></div>
    <div class="field">
      <label>Transaction Reference ID</label>
      <input id="bkTxnRef" placeholder="e.g. ESW-9842109 or Bank Ref Number">
    </div>
    <label class="checkbox-field">
      <input type="checkbox" id="bkAgreeTerms">
      <span>I've completed the payment and agree to the <a href="#" onclick="openTermsModal(); return false;">Terms &amp; Conditions</a>.</span>
    </label>
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="submitBookingBtn" onclick="submitFinalBooking()">Submit payment details</button>
    <p class="form-note" style="margin-top:12px;">Once submitted, our team verifies your payment and assigns your rider — you'll see their name and phone number in <strong>My Account</strong> once confirmed.</p>
  `;
  showOverlay();
}

async function submitFinalBooking(){
  const name = document.getElementById('bkName').value.trim();
  const email = document.getElementById('bkEmail').value.trim();
  const phone = document.getElementById('bkPhone').value.trim();
  const txnRef = document.getElementById('bkTxnRef').value.trim();
  const agreed = document.getElementById('bkAgreeTerms').checked;

  if(!name || !email || !phone || !txnRef){ showToast('Please complete all fields including your transaction reference ID.', 'error'); return; }
  if(!isValidEmail(email)){ showToast('Please enter a valid email address.', 'error'); return; }
  if(!agreed){ showToast('Please confirm you\u2019ve paid and agree to the Terms & Conditions.', 'error'); return; }
  if(!pendingBooking || !pendingBooking.paymentMethod){ showToast('Something went wrong — please start the booking again.', 'error'); return; }

  const restoreBtn = setBusy(document.getElementById('submitBookingBtn'), 'Submitting…');

  const ref = 'FEEL-' + Math.random().toString(36).slice(2,8).toUpperCase();
  const newBooking = {
    ref,
    tour_id: pendingBooking.tourId,
    tour_title: pendingBooking.title,
    date: pendingBooking.date,
    travelers: pendingBooking.travelers,
    total: pendingBooking.total,
    name,
    email,
    phone,
    txn_ref: txnRef,
    payment_method: pendingBooking.paymentMethod,
    // Nothing is auto-confirmed anymore. An admin has to verify the
    // transaction reference and assign a rider before this becomes
    // "Confirmed" and the rider's details become visible to the customer.
    status: 'Pending',
    guide: null,
    guide_phone: null
  };

  try {
    await supabaseClient.from('bookings').insert([newBooking]);
  } catch(e){
    console.error('Supabase booking insert error:', e);
  }

  await sendEmailNotification(EMAILJS_CONFIG.bookingTemplateId, {
    to_name: name, to_email: email, tour_title: newBooking.tour_title,
    date: newBooking.date, total: fmtNPR(newBooking.total), ref,
    payment_method: PAYMENT_METHODS[pendingBooking.paymentMethod]?.label || ''
  });

  restoreBtn();
  showToast('Payment details submitted!', 'success');

  const methodLabel = PAYMENT_METHODS[pendingBooking.paymentMethod]?.label || 'your selected method';

  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Payment submitted — pending verification</h2>
    <p class="sub">Your booking reference: <strong>${ref}</strong></p>
    <div class="pending-box">
      <p style="margin:4px 0;">We've received your ${esc(methodLabel)} payment details for <strong>${esc(newBooking.tour_title)}</strong> on <strong>${esc(newBooking.date)}</strong>.</p>
      <p style="margin:4px 0;">Our team verifies each transaction reference and assigns your rider by hand — this is usually quick, but never automatic.</p>
      <p style="margin:4px 0;font-size:13px;color:var(--ink-soft);">Once confirmed, your rider's name and phone number will appear under <strong>My Account</strong>, and you'll also be reachable at ${esc(email)}.</p>
    </div>
    <button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">Done</button>
  `;
  pendingBooking = null;
}

/* ---------------- Authentication & Google OAuth ---------------- */
// Wrapped in try/catch: if Supabase is unreachable (offline, wrong URL/key,
// CORS issue, etc.) this must NOT crash the whole page load — it should
// just behave as "nobody is logged in" instead.
async function checkActiveAuthUser(){
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if(session && session.user){
      return {
        name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        email: session.user.email,
        phone: session.user.user_metadata?.phone || ''
      };
    }
  } catch(e){
    console.error('checkActiveAuthUser failed:', e);
  }
  return null;
}

async function checkUserSession(){
  const sessionUser = await checkActiveAuthUser();
  const btn = document.getElementById('authNavBtn');
  if(btn){
    if(sessionUser){
      btn.textContent = 'My Account';
    } else {
      btn.textContent = 'Login / Account';
    }
  }
}

async function openAuthModal(){
  const sessionUser = await checkActiveAuthUser();
  if(sessionUser){
    renderUserDashboard(sessionUser);
  } else {
    showAuthTabs('login');
  }
}

// Renders the shared auth modal. Google sign-in works from either tab
// (it always creates/logs into a Supabase Auth account either way) — the
// tabs only change what's below the divider: existing-account login vs.
// a real signUp() form. Previously "Register" just showed the login form
// again with no way to actually create an account — that's fixed below.
function showAuthTabs(mode = 'login'){
  const formHtml = mode === 'register' ? `
      <div class="field"><label>Full Name</label><input id="regName" placeholder="Your name"></div>
      <div class="field"><label>Email Address</label><input id="regEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>Password</label><input id="regPass" type="password" placeholder="At least 6 characters"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="registerBtn" onclick="handleRegister()">Create Account</button>
    ` : `
      <div class="field"><label>Email Address or Admin ID</label><input id="authEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>Password or Admin Passcode</label><input id="authPass" type="password" placeholder="••••••••"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="loginBtn" onclick="handleStandardLogin()">Login</button>
    `;

  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <div class="filters" style="margin-bottom:20px;">
      <button class="chip ${mode==='login'?'active':''}" onclick="showAuthTabs('login')">Login / Admin</button>
      <button class="chip ${mode==='register'?'active':''}" onclick="showAuthTabs('register')">Register</button>
    </div>

    <div id="authFormsWrap">
      <button class="btn btn-google" onclick="loginWithGoogle()">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.15C3.21 21.34 7.28 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.19C.43 8.14 0 9.89 0 12s.43 3.86 1.19 5.39l4.08-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.28 0 3.21 2.66 1.19 6.61l4.08 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
        Continue with Google
      </button>
      <div style="text-align:center;margin:16px 0;color:var(--ink-soft);font-size:13px;">— OR ${mode==='register' ? 'CREATE AN ACCOUNT' : 'EMAIL / ADMIN LOGIN'} —</div>
      ${formHtml}
    </div>
  `;
  showOverlay();
}

// Real email/password sign-up via Supabase Auth. Depending on your
// Supabase project's Auth settings, "Confirm email" may be turned on —
// if so, signUp() succeeds but there's no active session yet until the
// user clicks the confirmation link, so we show a "check your email"
// message rather than assuming they're logged in immediately.
async function handleRegister(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value.trim();

  if(!name || !email || !pass){ showToast('Fill in your name, email and password.', 'error'); return; }
  if(!isValidEmail(email)){ showToast('Please enter a valid email address.', 'error'); return; }
  if(pass.length < 6){ showToast('Password should be at least 6 characters.', 'error'); return; }

  const restoreBtn = setBusy(document.getElementById('registerBtn'), 'Creating account…');
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name } }
    });
    restoreBtn();
    if(error){ showToast(error.message, 'error'); return; }

    if(data.session){
      // Email confirmation is off — the user is already logged in.
      checkUserSession();
      showToast('Account created — you\u2019re logged in!', 'success');
      renderUserDashboard({ name, email });
    } else {
      // Email confirmation is on — no session until they click the link.
      showToast('Account created! Check your email to confirm before logging in.', 'success');
      showAuthTabs('login');
    }
  } catch(e){
    restoreBtn();
    showToast('Sign-up failed — check your connection and try again.', 'error');
    console.error('handleRegister error:', e);
  }
}

async function loginWithGoogle(){
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if(error) showToast(error.message, 'error');
  } catch(e) {
    showToast('Google login error', 'error');
  }
}

// Handles the single Login form that doubles as both admin login and
// normal customer login. This used to have a real bug: sha256() below
// uses crypto.subtle, which browsers ONLY expose on a secure origin
// (https://, or http://localhost) — on a plain http:// page (or a file
// double-clicked open from disk) crypto.subtle is undefined, sha256()
// throws, and the button used to just hang on "Checking…" forever with
// no explanation. It's now wrapped in try/catch so that specific failure
// shows an actual message instead of silently doing nothing. GitHub
// Pages serves everything over https, so this won't come up once it's
// live — it mainly bit local file:// testing.
async function handleStandardLogin(){
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value.trim();
  if(!email || !pass){ showToast('Enter an email and password.', 'error'); return; }

  const restoreBtn = setBusy(document.getElementById('loginBtn'), 'Checking…');

  let hashedPass;
  try {
    hashedPass = await sha256(pass);
  } catch(e){
    restoreBtn();
    showToast('Login needs a secure connection (https). This will work once the site is live on GitHub Pages.', 'error');
    console.error('sha256/crypto.subtle failed — likely running on http:// or file:// instead of https:', e);
    return;
  }

  // Check Secure Hash for Admin
  if(email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && hashedPass === ADMIN_PASS_HASH){
    restoreBtn();
    renderAdminPanel('bookings');
    return;
  }

  // Supabase standard user sign in
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    restoreBtn();
    if(error){
      showToast('Invalid credentials or admin passcode.', 'error');
    } else {
      checkUserSession();
      renderUserDashboard({ name: data.user.email.split('@')[0], email: data.user.email });
    }
  } catch(e){
    restoreBtn();
    showToast('Login failed — check your connection and try again.', 'error');
    console.error('Supabase sign-in error:', e);
  }
}

async function renderUserDashboard(user){
  let bookingsList = [];
  try {
    const { data } = await supabaseClient.from('bookings').select('*').eq('email', user.email);
    bookingsList = data || [];
  } catch(e){}

  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>User Dashboard</h2>
    <p class="sub">Welcome back, <strong>${esc(user.name)}</strong> (${esc(user.email)})</p>
    <div style="margin-bottom:24px;">
      <button class="btn btn-outline" onclick="handleUserLogout()">Logout</button>
    </div>
    <h3>My Tour Bookings</h3>
    <div style="margin-top:14px;">
      ${bookingsList.length ? bookingsList.map(b => renderBookingRowForUser(b)).join('') : '<div class="empty-state">No bookings found on your account.</div>'}
    </div>
  `;
  showOverlay();
}

function renderBookingRowForUser(b){
  const statusClass = b.status === 'Confirmed' ? 'status-confirmed' : (b.status === 'Cancelled' ? 'status-cancelled' : 'status-pending');
  let riderBlock = '';
  if(b.status === 'Confirmed' && b.guide){
    riderBlock = `
      <div class="rider-reveal-box">
        <strong>Assigned Rider:</strong> ${esc(b.guide)} — <a href="tel:${esc(b.guide_phone)}">${esc(b.guide_phone)}</a>
      </div>`;
  } else if(b.status === 'Cancelled'){
    riderBlock = `<div class="pending-note">This booking was cancelled. Contact us if that's unexpected.</div>`;
  } else {
    riderBlock = `<div class="pending-note">Payment verification in progress — your rider will appear here once confirmed.</div>`;
  }

  return `
    <div class="booking-row" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;">
        <strong>${esc(b.tour_title)}</strong>
        <span class="status ${statusClass}">${esc(b.status || 'Pending')}</span>
      </div>
      <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">Date: ${esc(b.date)} · Ref: ${esc(b.ref)} · Paid via ${esc(PAYMENT_METHODS[b.payment_method]?.label || b.payment_method || '—')}</div>
      ${riderBlock}
    </div>
  `;
}

async function handleUserLogout(){
  await supabaseClient.auth.signOut();
  checkUserSession();
  closeOverlay();
  showToast('Logged out successfully.', 'success');
}

/* ---------------- Terms & Conditions Modal ---------------- */
function openTermsModal(){
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Terms & Conditions</h2>
    <p class="sub">Effective Date: 2026</p>
    <div style="max-height:300px;overflow-y:auto;font-size:14px;color:var(--ink-soft);line-height:1.8;padding-right:10px;">
      <p>1. <strong>Booking & Payment:</strong> All motorbike tours require payment via Bank Transfer or eSewa. Bookings are held as "Pending" until our team manually verifies your transaction reference — your rider is assigned and revealed only after that verification.</p>
      <p>2. <strong>License & Safety:</strong> Travelers must possess a valid international driving permit or national motorbike license and wear supplied safety gear at all times.</p>
      <p>3. <strong>Liability:</strong> Feel It Nepal and its independent guide partners operate with high safety standards but assume no liability for unforced road hazards or extreme Himalayan weather disruptions.</p>
      <p>4. <strong>Refunds:</strong> If your transaction reference cannot be verified, our team will contact you using the details provided at booking before any cancellation.</p>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="closeOverlay()">I Understand</button>
  `;
  showOverlay();
}

/* ---------------- Contact Form ---------------- */
// Fills in every contact touchpoint on the page (footer text, Contact
// section links, and the floating WhatsApp/Instagram buttons) from the
// single CONTACT_INFO object above — change a number once, it updates
// everywhere. ig.me/m/<username> is Instagram's official "open a DM"
// deep link (works for business/creator accounts); a plain profile link
// (instagram.com/<username>) still opens fine even if that one 404s.
function initContactDisplay(){
  const emailEl = document.getElementById('contactEmailDisplay');
  if(emailEl) emailEl.innerHTML = `<a href="mailto:${CONTACT_INFO.email}">${esc(CONTACT_INFO.email)}</a>`;

  const phoneEl = document.getElementById('contactPhoneDisplay');
  if(phoneEl) phoneEl.innerHTML = `<a href="tel:${CONTACT_INFO.phone.replace(/[^+\d]/g,'')}">${esc(CONTACT_INFO.phone)}</a>`;

  const waUrl = `https://wa.me/${CONTACT_INFO.whatsapp}`;
  const igUrl = `https://ig.me/m/${CONTACT_INFO.instagram}`;

  const waEl = document.getElementById('contactWaLink');
  if(waEl) waEl.href = waUrl;

  const igEl = document.getElementById('contactIgLink');
  if(igEl) igEl.href = igUrl;

  const floatWa = document.getElementById('floatWaLink');
  if(floatWa) floatWa.href = waUrl;

  const floatIg = document.getElementById('floatIgLink');
  if(floatIg) floatIg.href = igUrl;

  const addrEl = document.getElementById('contactAddressDisplay');
  if(addrEl) addrEl.textContent = CONTACT_INFO.address;
}

async function submitContact(){
  const name = document.getElementById('ctName').value.trim();
  const email = document.getElementById('ctEmail').value.trim();
  const message = document.getElementById('ctMessage').value.trim();
  const noteEl = document.getElementById('contactNote');
  if(!name || !email || !message){ noteEl.textContent = 'Fill in name, email and message.'; return; }
  if(!isValidEmail(email)){ noteEl.textContent = 'Please enter a valid email address.'; return; }

  try {
    await supabaseClient.from('contacts').insert([{ name, email, message }]);
  } catch(e){}

  await sendEmailNotification(EMAILJS_CONFIG.contactTemplateId, {
    from_name: name, from_email: email, message,
    to_email: CONTACT_INFO.email
  });

  noteEl.textContent = 'Message sent successfully!';
  showToast('Message sent!', 'success');
  document.getElementById('ctName').value = '';
  document.getElementById('ctEmail').value = '';
  document.getElementById('ctMessage').value = '';
}

function openGuideForm(){
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Apply as a Guide</h2>
    <p class="sub">Join our network of elite local Himalayan riders.</p>
    <div class="row-2">
      <div class="field"><label>Full Name</label><input id="gName"></div>
      <div class="field"><label>Phone / WhatsApp</label><input id="gPhone"></div>
    </div>
    <div class="row-2">
      <div class="field"><label>Base Region / City</label><input id="gCity" placeholder="Pokhara"></div>
      <div class="field"><label>Professional Experience (Years)</label><input id="gYears" type="number"></div>
    </div>
    <div class="field"><label>Routes Known</label><textarea id="gMessage" placeholder="Mustang, Annapurna circuit, etc."></textarea></div>
    <button class="btn btn-primary" style="width:100%;" onclick="submitGuideApp()">Submit Application</button>
  `;
  showOverlay();
}

async function submitGuideApp(){
  const name = document.getElementById('gName').value.trim();
  const phone = document.getElementById('gPhone').value.trim();
  const city = document.getElementById('gCity').value.trim();
  const years = document.getElementById('gYears').value.trim();
  const message = document.getElementById('gMessage').value.trim();
  if(!name || !phone){ showToast('Provide name and phone.', 'error'); return; }

  try {
    await supabaseClient.from('guide_apps').insert([{ name, phone, city, years, message }]);
  } catch(e){}

  showToast('Guide application submitted!', 'success');
  closeOverlay();
}

/* ---------------- Professional Admin Panel ---------------- */
async function renderAdminPanel(tab){
  const tabs = ['bookings', 'tours', 'addTour', 'users', 'contacts'];
  const labels = {
    bookings:'🧾 Bookings & Riders', tours:'🏍️ Manage Tours', addTour:'➕ Add New Tour',
    users:'👥 Customers', contacts:'✉️ Messages'
  };
  let body = '<div class="empty-state">Loading data from Supabase...</div>';
  let statsHtml = '';

  if(tab === 'tours'){
    // Full editable card per tour — this is the "control everything" admin
    // view: every field that shows up on the public tour card/detail modal
    // can be changed here and saved straight back to Supabase.
    body = `<div style="display:flex;flex-direction:column;gap:16px;">
      ${tours.map(t => `
        <div class="admin-tour-card">
          <h4>${esc(t.title)} (${esc(t.region)}) ${t.coming_soon ? '<span class="status status-pending" style="margin-left:8px;">Coming Soon</span>' : ''}</h4>
          <div class="row-2">
            <div class="field"><label>Tour Title</label><input id="adm-title-${t.id}" value="${esc(t.title)}"></div>
            <div class="field"><label>Region / Destination</label><input id="adm-region-${t.id}" value="${esc(t.region)}"></div>
          </div>
          <div class="row-2">
            <div class="field"><label>Duration</label><input id="adm-duration-${t.id}" value="${esc(t.duration)}"></div>
            <div class="field"><label>Price (NPR) — leave blank for "coming soon"</label><input type="number" id="adm-price-${t.id}" value="${t.price ?? ''}"></div>
          </div>
          <div class="row-2">
            <div class="field"><label>Default Guide Name</label><input id="adm-guide-${t.id}" value="${esc(t.guide)}"></div>
            <div class="field"><label>Default Guide Phone</label><input id="adm-guidephone-${t.id}" value="${esc(t.guide_phone || '')}"></div>
          </div>
          <div class="field"><label>Description</label><textarea id="adm-desc-${t.id}">${esc(t.desc || '')}</textarea></div>
          <div class="field"><label>Includes (comma-separated)</label><input id="adm-includes-${t.id}" value="${esc((t.includes||[]).join(', '))}"></div>
          <div class="row-2">
            <div class="field"><label>Map Latitude</label><input id="adm-lat-${t.id}" type="number" step="any" value="${t.lat ?? ''}"></div>
            <div class="field"><label>Map Longitude</label><input id="adm-lng-${t.id}" type="number" step="any" value="${t.lng ?? ''}"></div>
          </div>
          <div class="field"><label>Card Image URL (optional — blank uses the default icon)</label><input id="adm-image-${t.id}" value="${esc(t.image_url || '')}"></div>
          <label class="checkbox-field">
            <input type="checkbox" id="adm-comingsoon-${t.id}" ${t.coming_soon ? 'checked' : ''}>
            <span>Mark as "Coming Soon" (hides price &amp; booking button, shows a WhatsApp notify-me link instead)</span>
          </label>
          <div style="display:flex;gap:10px;margin-top:10px;">
            <button class="btn btn-primary" onclick="saveTourEdits('${t.id}')">Save Changes</button>
            <button class="btn btn-outline" style="border-color:#ef4444;color:#ef4444;" onclick="deleteTour('${t.id}')">Delete Tour</button>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  if(tab === 'addTour'){
    body = `
      <div class="form-card" style="max-width:100%;">
        <h3>Add New Route / Destination</h3>
        <div class="row-2">
          <div class="field"><label>Tour Title</label><input id="newTitle" placeholder="Mustang Desert Loop"></div>
          <div class="field"><label>Region / Destination</label><input id="newRegion" placeholder="Mustang"></div>
        </div>
        <div class="row-2">
          <div class="field"><label>Duration</label><input id="newDuration" placeholder="3 days"></div>
          <div class="field"><label>Price (NPR) — leave blank for "coming soon"</label><input id="newPrice" type="number" placeholder="25000"></div>
        </div>
        <div class="row-2">
          <div class="field"><label>Default Guide Name</label><input id="newGuide" placeholder="Tenzin Lama"></div>
          <div class="field"><label>Default Guide Phone</label><input id="newGuidePhone" placeholder="+977-9800000000"></div>
        </div>
        <div class="field"><label>Description</label><textarea id="newDesc" placeholder="Route description..."></textarea></div>
        <div class="field"><label>Includes (comma-separated)</label><input id="newIncludes" placeholder="Off-road bike, Fuel, Local guide"></div>
        <div class="row-2">
          <div class="field"><label>Map Latitude</label><input id="newLat" type="number" step="any" placeholder="28.2096"></div>
          <div class="field"><label>Map Longitude</label><input id="newLng" type="number" step="any" placeholder="83.9856"></div>
        </div>
        <div class="field"><label>Card Image URL (optional)</label><input id="newImage" placeholder="https://..."></div>
        <label class="checkbox-field">
          <input type="checkbox" id="newComingSoon">
          <span>Publish as "Coming Soon" (no price or booking button yet)</span>
        </label>
        <button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="saveNewTour()">Publish New Route to Supabase</button>
      </div>
    `;
  }

  if(tab === 'bookings'){
    let list = [];
    try {
      const { data } = await supabaseClient.from('bookings').select('*').order('date', { ascending: true });
      list = data || [];
    } catch(e){}

    const knownGuides = Array.from(new Map(tours.map(t => [t.guide, t.guide_phone])).entries());
    const guideOptions = knownGuides.map(([name]) => `<option value="${esc(name)}">`).join('');

    const pendingCount = list.filter(b => !b.status || b.status === 'Pending').length;
    const confirmedList = list.filter(b => b.status === 'Confirmed');
    const cancelledCount = list.filter(b => b.status === 'Cancelled').length;
    const revenue = confirmedList.reduce((sum, b) => sum + (Number(b.total) || 0), 0);

    statsHtml = `
      <div class="admin-stats">
        <div class="admin-stat-card"><div class="num">${list.length}</div><div class="label">Total Bookings</div></div>
        <div class="admin-stat-card"><div class="num" style="color:var(--warning);">${pendingCount}</div><div class="label">Awaiting Verification</div></div>
        <div class="admin-stat-card"><div class="num" style="color:var(--success);">${confirmedList.length}</div><div class="label">Confirmed</div></div>
        <div class="admin-stat-card"><div class="num" style="color:var(--danger);">${cancelledCount}</div><div class="label">Cancelled</div></div>
        <div class="admin-stat-card"><div class="num">${fmtNPR(revenue)}</div><div class="label">Confirmed Revenue</div></div>
      </div>
    `;

    body = `
      <datalist id="knownGuidesList">${guideOptions}</datalist>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${list.length ? list.map(b => renderBookingRowForAdmin(b)).join('') : '<div class="empty-state">No bookings recorded yet.</div>'}
      </div>
    `;
  }

  if(tab === 'users'){
    let list = [];
    try {
      const { data } = await supabaseClient.from('bookings').select('name, email, phone').not('email', 'is', null);
      const uniqueMap = new Map();
      (data || []).forEach(item => uniqueMap.set(item.email, item));
      list = Array.from(uniqueMap.values());
    } catch(e){}
    body = list.length ? `<table class="admin-table"><tr><th>Customer Name</th><th>Email</th><th>Phone</th></tr>
      ${list.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone || '—')}</td></tr>`).join('')}
    </table>` : '<div class="empty-state">No customer accounts managed yet.</div>';
  }

  if(tab === 'contacts'){
    let list = [];
    try {
      const { data } = await supabaseClient.from('contacts').select('*');
      list = data || [];
    } catch(e){}
    body = list.length ? list.map(c => `
      <div class="booking-row">
        <div><strong>${esc(c.name)}</strong> (${esc(c.email)})<br><span style="font-size:13px;color:var(--ink-soft);">${esc(c.message)}</span></div>
        <a class="btn btn-outline" href="mailto:${encodeURIComponent(c.email)}">Reply</a>
      </div>
    `).join('') : '<div class="empty-state">No messages.</div>';
  }

  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '960px';
  mc.innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <div class="admin-head">
      <h2>Admin Control Panel</h2>
      <p class="sub" style="margin:0;">Feel It Nepal · bookings, tours &amp; messages, all in one place.</p>
    </div>
    <div class="filters" style="margin-bottom:20px;">
      ${tabs.map(tKey=>`<button class="chip ${tKey===tab?'active':''}" onclick="renderAdminPanel('${tKey}')">${labels[tKey]}</button>`).join('')}
    </div>
    ${statsHtml}
    <div>${body}</div>
  `;
  showOverlay();
}

// One booking row in the admin panel. Pending bookings get an inline
// "assign rider & confirm" form; this is the ONLY place a rider gets
// attached to a booking, and the customer only sees it after this runs.
function renderBookingRowForAdmin(b){
  const statusClass = b.status === 'Confirmed' ? 'status-confirmed' : (b.status === 'Cancelled' ? 'status-cancelled' : 'status-pending');
  const methodLabel = PAYMENT_METHODS[b.payment_method]?.label || b.payment_method || '—';

  let actionBlock = '';
  if(b.status === 'Confirmed'){
    actionBlock = `
      <div class="rider-reveal-box">
        <strong>Assigned Rider:</strong> ${esc(b.guide)} — <a href="tel:${esc(b.guide_phone)}">${esc(b.guide_phone)}</a>
      </div>
      <button class="btn btn-outline" style="margin-top:8px;border-color:#ef4444;color:#ef4444;" onclick="cancelBooking('${esc(b.id)}')">Cancel booking</button>
    `;
  } else if(b.status === 'Cancelled'){
    actionBlock = `<div class="pending-note">Cancelled.</div>`;
  } else {
    actionBlock = `
      <div class="row-2" style="margin-top:10px;">
        <div class="field"><label>Assign Rider Name</label><input list="knownGuidesList" id="assign-guide-${b.id}" placeholder="e.g. Bikash Gurung"></div>
        <div class="field"><label>Rider Phone</label><input id="assign-phone-${b.id}" placeholder="+977-98XXXXXXXX"></div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="confirm-btn-${b.id}" onclick="assignRiderToBooking('${esc(b.id)}')">Verify payment &amp; confirm rider</button>
        <button class="btn btn-outline" style="border-color:#ef4444;color:#ef4444;" onclick="cancelBooking('${esc(b.id)}')">Cancel booking</button>
      </div>
    `;
  }

  return `
    <div class="booking-row admin-booking-row" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;">
        <strong>${esc(b.tour_title)} (${esc(b.date)})</strong>
        <span class="status ${statusClass}">${esc(b.status || 'Pending')}</span>
      </div>
      <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">
        Customer: ${esc(b.name)} (${esc(b.email)} · ${esc(b.phone)})<br>
        Paid via <strong>${esc(methodLabel)}</strong> · Txn Ref: <strong>${esc(b.txn_ref)}</strong> · Total: ${fmtNPR(b.total)}
      </div>
      ${actionBlock}
    </div>
  `;
}

async function assignRiderToBooking(bookingId){
  const guideInput = document.getElementById(`assign-guide-${bookingId}`);
  const phoneInput = document.getElementById(`assign-phone-${bookingId}`);
  const guide = guideInput.value.trim();
  const guidePhone = phoneInput.value.trim();

  if(!guide || !guidePhone){ showToast('Enter both a rider name and phone number before confirming.', 'error'); return; }

  const restoreBtn = setBusy(document.getElementById(`confirm-btn-${bookingId}`), 'Confirming…');
  try {
    await supabaseClient.from('bookings').update({ guide, guide_phone: guidePhone, status: 'Confirmed' }).eq('id', bookingId);
    showToast('Rider assigned — booking confirmed for the customer.', 'success');
    renderAdminPanel('bookings');
  } catch(e){
    restoreBtn();
    showToast('Error confirming booking', 'error');
  }
}

async function cancelBooking(bookingId){
  if(!confirm('Cancel this booking? The customer will see it as cancelled.')) return;
  try {
    await supabaseClient.from('bookings').update({ status: 'Cancelled' }).eq('id', bookingId);
    showToast('Booking cancelled.', 'success');
    renderAdminPanel('bookings');
  } catch(e){
    showToast('Error cancelling booking', 'error');
  }
}

// Saves every editable field for one tour back to Supabase, then
// re-loads the tour list so the public site immediately reflects the
// change. `includes` is stored as a real array in Supabase, so the
// comma-separated text field gets split/trimmed/filtered before saving.
//
// Uses upsert() rather than update(): if your Supabase `tours` table is
// still empty, the site is currently showing the in-memory seed/demo
// data (see loadTours()) — a plain .update().eq('id', id) would silently
// match ZERO real rows in that case (the row doesn't exist in the
// database yet), so the edit would look successful but vanish on
// reload. upsert() inserts the row if it's missing and updates it if it
// already exists, so this works correctly either way.
async function saveTourEdits(id){
  const priceRaw = document.getElementById(`adm-price-${id}`).value;
  const includesRaw = document.getElementById(`adm-includes-${id}`).value;

  const updated = {
    id,
    title: document.getElementById(`adm-title-${id}`).value.trim(),
    region: document.getElementById(`adm-region-${id}`).value.trim(),
    duration: document.getElementById(`adm-duration-${id}`).value.trim(),
    price: priceRaw === '' ? null : parseFloat(priceRaw),
    guide: document.getElementById(`adm-guide-${id}`).value.trim(),
    guide_phone: document.getElementById(`adm-guidephone-${id}`).value.trim(),
    desc: document.getElementById(`adm-desc-${id}`).value.trim(),
    includes: includesRaw.split(',').map(s => s.trim()).filter(Boolean),
    lat: parseFloat(document.getElementById(`adm-lat-${id}`).value) || null,
    lng: parseFloat(document.getElementById(`adm-lng-${id}`).value) || null,
    image_url: document.getElementById(`adm-image-${id}`).value.trim(),
    coming_soon: document.getElementById(`adm-comingsoon-${id}`).checked
  };

  if(!updated.title || !updated.region){ showToast('Title and region are required.', 'error'); return; }

  try {
    const { error } = await supabaseClient.from('tours').upsert(updated);
    if(error) throw error;
    showToast('Tour updated successfully!', 'success');
    loadTours();
  } catch(e){
    console.error('saveTourEdits error:', e);
    showToast('Error updating tour — check that your Supabase "tours" table has all these columns.', 'error');
  }
}

async function deleteTour(id){
  if(!confirm('Delete this tour route?')) return;
  try {
    const { error } = await supabaseClient.from('tours').delete().eq('id', id);
    if(error) throw error;
    showToast('Tour deleted', 'success');
    loadTours();
    renderAdminPanel('tours');
  } catch(e){
    console.error('deleteTour error:', e);
    showToast('Error deleting tour', 'error');
  }
}

async function saveNewTour(){
  const title = document.getElementById('newTitle').value.trim();
  const region = document.getElementById('newRegion').value.trim();
  const duration = document.getElementById('newDuration').value.trim() || '1 day';
  const priceRaw = document.getElementById('newPrice').value;
  const guide = document.getElementById('newGuide').value.trim();
  const guidePhone = document.getElementById('newGuidePhone').value.trim();
  const desc = document.getElementById('newDesc').value.trim();
  const includesRaw = document.getElementById('newIncludes').value.trim();
  const lat = parseFloat(document.getElementById('newLat').value);
  const lng = parseFloat(document.getElementById('newLng').value);
  const image_url = document.getElementById('newImage').value.trim();
  const comingSoon = document.getElementById('newComingSoon').checked;

  if(!title || !region){ showToast('Title and region are required.', 'error'); return; }
  if(!comingSoon && !priceRaw){ showToast('Give it a price, or tick "Coming Soon" if it has none yet.', 'error'); return; }

  const newRoute = {
    id: 't' + Date.now(),
    title, region, duration,
    price: priceRaw === '' ? null : parseFloat(priceRaw),
    guide, guide_phone: guidePhone || '+977-9800000000',
    desc: desc || 'Guided motorcycle journey.',
    includes: includesRaw ? includesRaw.split(',').map(s => s.trim()).filter(Boolean) : ['Bike', 'Helmet', 'Fuel', 'Guide'],
    lat: isNaN(lat) ? 28.2096 : lat,
    lng: isNaN(lng) ? 83.9856 : lng,
    image_url,
    coming_soon: comingSoon
  };

  try {
    const { error } = await supabaseClient.from('tours').insert([newRoute]);
    if(error) throw error;
    showToast('New tour published!', 'success');
    loadTours();
    renderAdminPanel('tours');
  } catch(e){
    console.error('saveNewTour error:', e);
    showToast('Error creating tour — check that your Supabase "tours" table has all these columns.', 'error');
  }
}

/* ---------------- Initialization ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadTours();
  initContactDisplay();
  initEmailJS();
  checkUserSession();

  // Handle Supabase Google Auth redirect hash tokens
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if(event === 'SIGNED_IN' && session) {
      checkUserSession();
      showToast('Successfully logged in!', 'success');
    }
  });
});

/* =========================================================================
   SECURITY NOTE (read this before going live)
   -------------------------------------------------------------------------
   The admin check above (ADMIN_EMAIL / ADMIN_PASS_HASH) runs entirely in
   the browser. That means:
   - Anyone can view this file's source and see the hash.
   - Anyone can open the browser console and call
     renderAdminPanel('bookings') directly, with no password at all,
     bypassing the login form completely.
   This is fine for a quick prototype, but NOT enough to protect real
   customer data or bookings once you're live. To actually lock this down:
   1. Create a real Supabase Auth user for the admin account.
   2. Add Row Level Security (RLS) policies on `tours` and `bookings` so
      writes (and ideally reads of `bookings`) require that authenticated
      admin user — not just "the browser said so".
   3. Gate `renderAdminPanel` behind `supabaseClient.auth.getSession()`
      checking that the signed-in user's ID matches your admin user,
      instead of the local hash compare.
   Happy to wire this up properly if/when you're ready — it's a bigger
   change since it touches your Supabase project settings, not just this
   file.
   ========================================================================= */
