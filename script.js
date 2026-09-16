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
  whatsapp: '9779825344810', // 977 + 9825344810, no leading 0 or +, as wa.me expects
  address: 'Basundhara, Kathmandu, Nepal',
  instagram: 'feelitoffical' // used exactly as given — double check this matches your real handle
};

// Turns a normal Google Drive "share" link into a direct, embeddable image
// URL. Accepts the usual share formats people copy/paste:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?id=FILE_ID  (already converted)
// Falls back to returning the input untouched if it isn't a Drive link,
// so plain image URLs (from anywhere) still work fine too.
// NOTE: the Drive file must be shared as "Anyone with the link" or it will
// not load on the site.
function convertDriveLink(url){
  if(!url) return url;
  const trimmed = url.trim();
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if(fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if(openMatch) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  const idParamMatch = trimmed.match(/[?&]id=([^&]+)/);
  if(trimmed.includes('drive.google.com') && idParamMatch) return `https://drive.google.com/uc?export=view&id=${idParamMatch[1]}`;
  return trimmed;
}

// SHA-256 Hashed admin passcode.
// Login with: admin@feelit.com / FeelIt@2026
// (the ORIGINAL hash in this file before this edit did not actually match
// its own comment — it was for a different password entirely, so admin
// login was silently broken. This one is verified to match.)
// NOTE: this is still a client-side check only — see the security note at
// the bottom of this file before relying on it for anything real.
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

// A static site (GitHub Pages) can't send real emails on its own — there's
// no server to hold an SMTP password. EmailJS is a client-side email
// service built for exactly this. To make emails actually send:
//   1. Create a free account at https://www.emailjs.com
//   2. Add an Email Service connected to feelitofficial@gmail.com
//   3. Create two templates (one for contact messages, one for bookings)
//   4. Paste your Public Key / Service ID / Template IDs below and flip
//      `enabled` to true.
// Until then, contact messages and bookings still save to Supabase and
// show up in the admin panel — you just won't get an email ping.
const EMAILJS_CONFIG = {
  enabled: false, // set to true once the 4 values below are filled in
  publicKey: 'YOUR_PUBLIC_KEY',
  serviceId: 'YOUR_SERVICE_ID',
  bookingTemplateId: 'YOUR_BOOKING_TEMPLATE_ID',
  contactTemplateId: 'YOUR_CONTACT_TEMPLATE_ID'
};

function initEmailJS(){
  if(EMAILJS_CONFIG.enabled && window.emailjs){
    try { emailjs.init(EMAILJS_CONFIG.publicKey); } catch(e){ console.error('EmailJS init failed', e); }
  }
}

// Fire-and-forget notification emails. Never blocks or fails the actual
// booking/contact flow — Supabase is always the source of truth.
async function notifyByEmail(templateId, payload){
  if(!EMAILJS_CONFIG.enabled || !window.emailjs) return;
  try {
    await emailjs.send(EMAILJS_CONFIG.serviceId, templateId, payload);
  } catch(e){
    console.error('EmailJS send failed', e);
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

// Supabase-js does NOT throw a JS exception when a write is blocked by a
// Row Level Security policy — it just returns { data: null, error }.
// A bare `try { await supabaseClient.from(...).update(...) } catch(e){}`
// will therefore look like it succeeded even when nothing was written.
// Route every write through this so RLS failures actually surface instead
// of failing silently.
async function sbWrite(promise, failMessage){
  try {
    const { error } = await promise;
    if(error){
      console.error(failMessage, error);
      showToast(`${failMessage}: ${error.message}`, 'error');
      return false;
    }
    return true;
  } catch(e){
    console.error(failMessage, e);
    showToast(failMessage, 'error');
    return false;
  }
}

const seedTours = [
  { id:'t1', title:'Sarangkot Sunrise Ridge', region:'Pokhara', duration:'Half day', price:3500,
    guide:'Bikash Gurung', guide_phone:'+977-9812345678', bio:'11 years riding the Pokhara hills, fluent English.',
    desc:'A dawn climb out of Pokhara to the Sarangkot ridgeline for a sunrise over the Annapurna range.',
    includes:['125cc bike','Helmet & jacket','Fuel','Local guide'], lat: 28.2439, lng: 83.9486, imageUrl: '' },
  { id:'t2', title:'Kathmandu Valley Rim Loop', region:'Kathmandu', duration:'Full day', price:6500,
    guide:'Sunita Tamang', guide_phone:'+977-9823456789', bio:'Grew up riding the valley rim roads, runs a small 4-bike outfit.',
    desc:'A full loop around the ridges ringing Kathmandu, stopping at Nagarkot and tea houses.',
    includes:['150cc bike','Full gear set','Fuel & permits','Lunch stop'], lat: 27.7172, lng: 85.3240, imageUrl: '' },
  { id:'t3', title:'Upper Mustang Desert Crossing', region:'Mustang', duration:'5 days', price:48000,
    guide:'Tenzin Lama', guide_phone:'+977-9834567890', bio:'Born in Lo Manthang, led Mustang crossings for 9 seasons.',
    desc:'High desert crossing past Chörtens and canyon roads.',
    includes:['Off-road bike','Restricted permit','Lodging','Fuel'], lat: 28.7819, lng: 83.7380, imageUrl: '' }
];

let tours = [];
let activeFilter = 'All';
let pendingBooking = null;
let leafletMap = null;
let mapMarkers = [];
let adminActiveThreadEmail = null; // which customer's conversation the admin has open, if any

// Overlay Helpers
function showOverlay() { document.getElementById('overlay')?.classList.remove('hidden'); }
function closeOverlay() {
  document.getElementById('overlay')?.classList.add('hidden');
  document.getElementById('modalContent')?.classList.remove('modal-admin');
  pendingBooking = null;
  adminActiveThreadEmail = null;
}

/* ---------------- Theme Engine ---------------- */
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
  return { ...t, guide_phone: t.guide_phone || t.guidePhone || '' };
}

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
    // A dropdown keeps this tidy on a page that already has a lot going
    // on, instead of a row of chips that wraps awkwardly on mobile.
    el.innerHTML = `
      <label for="regionFilterSelect" class="filter-select-label">Filter by region</label>
      <select id="regionFilterSelect" class="filter-select" onchange="setFilter(this.value)">
        ${regions.map(r => `<option value="${esc(r)}" ${r===activeFilter?'selected':''}>${esc(r)}</option>`).join('')}
      </select>
    `;
  }
}
function setFilter(r){
  activeFilter = r;
  renderFilters();
  renderTours();
  renderMapMarkers();
}

function renderTours(){
  const list = activeFilter==='All' ? tours : tours.filter(t=>t.region===activeFilter);
  const el = document.getElementById('tourGrid');
  if(!el) return;
  if(list.length===0){ el.innerHTML = '<div class="empty-state">No tours in this region yet.</div>'; return; }

  el.innerHTML = list.map(t=>{
    const bgStyle = t.imageUrl ? `background-image:url('${esc(t.imageUrl)}');` : `background:rgba(34,211,238,0.1);`;
    const artContent = t.imageUrl ? '' : `<svg width="70" height="46" viewBox="0 0 70 46" fill="none"><path d="M0 40 L18 12 L28 26 L40 4 L58 34 L70 22 L70 40 Z" fill="#22d3ee"/></svg>`;
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
  const initials = t.guide.split(' ').map(w=>w[0]).join('');
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
           onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'qr-img-fallback', innerHTML:'QR image not found — check that the /assets folder was uploaded alongside this page.'}))">
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

  const bookingSaved = await sbWrite(
    supabaseClient.from('bookings').insert([newBooking]),
    'Could not submit your booking — please try again or contact us directly'
  );
  if(!bookingSaved){ restoreBtn(); return; }

  notifyByEmail(EMAILJS_CONFIG.bookingTemplateId, {
    to_email: CONTACT_INFO.email,
    booking_ref: ref,
    tour_title: newBooking.tour_title,
    date: newBooking.date,
    travelers: newBooking.travelers,
    total: newBooking.total,
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    payment_method: PAYMENT_METHODS[pendingBooking.paymentMethod]?.label || pendingBooking.paymentMethod,
    txn_ref: txnRef
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
async function checkActiveAuthUser(){
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(session && session.user){
    return {
      name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
      email: session.user.email,
      phone: session.user.user_metadata?.phone || ''
    };
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
  renderContactSection(); // keep the homepage Contact section in sync with login state
}

async function openAuthModal(){
  const sessionUser = await checkActiveAuthUser();
  if(sessionUser){
    renderUserDashboard(sessionUser);
  } else {
    showAuthTabs('login');
  }
}

function showAuthTabs(mode = 'login'){
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
      <div style="text-align:center;margin:16px 0;color:var(--ink-soft);font-size:13px;">— OR EMAIL / ADMIN LOGIN —</div>

      <div class="field"><label>Email Address or Admin ID</label><input id="authEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>Password or Admin Passcode</label><input id="authPass" type="password" placeholder="••••••••"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="loginBtn" onclick="handleStandardLogin()">Login</button>
    </div>
  `;
  showOverlay();
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

async function handleStandardLogin(){
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value.trim();
  if(!email || !pass){ showToast('Enter an email and password.', 'error'); return; }

  const restoreBtn = setBusy(document.getElementById('loginBtn'), 'Checking…');
  const hashedPass = await sha256(pass);

  // Check Secure Hash for Admin
  if(email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && hashedPass === ADMIN_PASS_HASH){
    restoreBtn();
    renderAdminPanel('bookings');
    return;
  }

  // Supabase standard user sign in
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  restoreBtn();
  if(error){
    showToast('Invalid credentials or admin passcode.', 'error');
  } else {
    checkUserSession();
    renderUserDashboard({ name: data.user.email.split('@')[0], email: data.user.email });
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
    <div style="margin-top:14px;margin-bottom:28px;">
      ${bookingsList.length ? bookingsList.map(b => renderBookingRowForUser(b)).join('') : '<div class="empty-state">No bookings found on your account.</div>'}
    </div>
    <h3>Messages with our team</h3>
    <div id="dashboardMessages" style="margin-top:14px;"><div class="empty-state">Loading…</div></div>
  `;
  showOverlay();

  const holder = document.getElementById('dashboardMessages');
  if(holder) await renderMessageThreadInto(holder, user.email, user.name, { context: 'dashboard' });
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

/* ---------------- Contact section: on-site messaging ----------------
   Logged in  -> a real reply thread with our team, stored in Supabase
                 `messages` (admin replies show up here once posted).
   Logged out -> no form at all — a direct "Chat on WhatsApp" button,
                 since there's no account to reply to on-site yet.
------------------------------------------------------------------------ */
function initContactDisplay(){
  const emailEl = document.getElementById('contactEmailDisplay');
  if(emailEl){ emailEl.textContent = CONTACT_INFO.email; emailEl.href = `mailto:${CONTACT_INFO.email}`; }

  const phoneEl = document.getElementById('contactPhoneDisplay');
  if(phoneEl){ phoneEl.textContent = CONTACT_INFO.phone; phoneEl.href = `tel:${CONTACT_INFO.phone.replace(/[^+\d]/g,'')}`; }

  const waLink = document.getElementById('contactWaLink');
  if(waLink) waLink.href = `https://wa.me/${CONTACT_INFO.whatsapp}`;

  if(document.getElementById('contactAddressDisplay')) document.getElementById('contactAddressDisplay').textContent = CONTACT_INFO.address;

  renderContactSection();
}

async function renderContactSection(){
  const holder = document.getElementById('contactDynamic');
  if(!holder) return; // this page doesn't have a contact section (e.g. the gallery page)

  holder.innerHTML = '<div class="empty-state">Loading…</div>';
  const sessionUser = await checkActiveAuthUser();

  if(!sessionUser){
    holder.innerHTML = `
      <p style="margin:0 0 16px;color:var(--ink-soft);font-size:14px;">
        Log in to send us a message and get a reply right here on the site — or chat with us instantly on WhatsApp.
      </p>
      <a class="btn btn-primary" style="width:100%;margin-bottom:10px;" href="https://wa.me/${CONTACT_INFO.whatsapp}" target="_blank" rel="noopener">Chat on WhatsApp</a>
      <button class="btn btn-outline" style="width:100%;" onclick="openAuthModal()">Log in to message us</button>
    `;
    return;
  }

  await renderMessageThreadInto(holder, sessionUser.email, sessionUser.name, { context: 'contact' });
}

// Shared thread renderer used by both the homepage Contact section and the
// My Account dashboard, so there's exactly one message UI to keep in sync.
async function renderMessageThreadInto(holder, email, displayName, opts = {}){
  let msgs = [];
  let loadError = null;
  try {
    const { data, error } = await supabaseClient.from('messages').select('*').eq('email', email).order('created_at', { ascending: true });
    if(error){ loadError = error; console.error('Loading messages failed', error); }
    msgs = data || [];
  } catch(e){ loadError = e; console.error('Loading messages failed', e); }

  const threadHtml = loadError
    ? `<div class="empty-state admin-load-error">Could not load messages (${esc(loadError.message || 'unknown error')}). Check that Supabase has a "messages" table with a SELECT policy.</div>`
    : (msgs.length
        ? msgs.map(m => `
            <div class="chat-bubble ${m.sender === 'admin' ? 'chat-bubble-admin' : 'chat-bubble-customer'}">
              <div class="chat-bubble-sender">${m.sender === 'admin' ? 'Feel It Team' : esc(displayName || 'You')}</div>
              <div class="chat-bubble-body">${esc(m.body)}</div>
            </div>
          `).join('')
        : '<div class="empty-state">No messages yet — say hello!</div>');

  const inputId = `msgInput-${opts.context || 'default'}`;
  const btnId = `msgSendBtn-${opts.context || 'default'}`;

  holder.innerHTML = `
    <div class="chat-thread">${threadHtml}</div>
    <div class="chat-compose">
      <textarea id="${inputId}" placeholder="Write a message…" rows="2"></textarea>
      <button class="btn btn-primary" id="${btnId}" onclick="sendCustomerMessage('${esc(email)}', '${esc((displayName||'').replace(/'/g,"\\'"))}', '${inputId}', '${btnId}', '${opts.context || 'default'}')">Send</button>
    </div>
  `;
}

async function sendCustomerMessage(email, name, inputId, btnId, context){
  const input = document.getElementById(inputId);
  const body = input.value.trim();
  if(!body) return;

  const restoreBtn = setBusy(document.getElementById(btnId), '…');
  const ok = await sbWrite(
    supabaseClient.from('messages').insert([{ email, name: name || email.split('@')[0], sender: 'customer', body }]),
    'Could not send your message — check that your Supabase RLS policy allows INSERT on messages'
  );
  restoreBtn();
  if(!ok) return;

  input.value = '';
  const holder = context === 'contact' ? document.getElementById('contactDynamic') : document.getElementById('dashboardMessages');
  if(holder) await renderMessageThreadInto(holder, email, name, { context });
}

// Small floating WhatsApp button, present on every page — the fastest
// path for a traveler with a quick question before they book.
function initFloatingWhatsApp(){
  if(document.getElementById('waFloatBtn')) return;
  const a = document.createElement('a');
  a.id = 'waFloatBtn';
  a.className = 'wa-float-btn';
  a.href = `https://wa.me/${CONTACT_INFO.whatsapp}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Chat with us on WhatsApp');
  a.title = 'Chat with us on WhatsApp';
  a.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.4-1.42a9.87 9.87 0 0 0 4.64 1.18h.01c5.46 0 9.9-4.45 9.9-9.91S17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.32-1.93 1.36-.5.05-1.02.24-3.42-.71-2.9-1.15-4.77-4.12-4.92-4.32-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.26-.29.58-.36.77-.36h.55c.18 0 .42-.03.65.5.24.55.83 1.9.9 2.04.07.14.12.31.02.5-.1.19-.15.31-.3.47-.14.17-.3.37-.43.5-.14.14-.29.29-.13.57.17.29.75 1.24 1.6 2.01 1.11 1 2.05 1.31 2.33 1.46.29.14.45.12.62-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.63-.14.26.1 1.63.77 1.9.91.28.14.46.21.53.33.07.12.07.68-.17 1.36Z"/></svg>`;
  document.body.appendChild(a);
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

  const ok = await sbWrite(
    supabaseClient.from('guide_apps').insert([{ name, phone, city, years, message }]),
    'Could not submit application — check that your Supabase RLS policy allows INSERT on guide_apps'
  );
  if(!ok) return;

  showToast('Guide application submitted!', 'success');
  closeOverlay();
}

/* ---------------- Professional Admin Panel ---------------- */
async function renderAdminPanel(tab){
  const tabs = ['bookings', 'tours', 'addTour', 'users', 'messages', 'photos', 'ad'];
  const labels = {
    bookings:'📋 Bookings', tours:'🏍️ Tours', addTour:'➕ Add Tour',
    users:'👥 Customers', messages:'💬 Messages', photos:'🖼️ Gallery', ad:'📢 Popup Ad'
  };
  let body = '<div class="empty-state">Loading data from Supabase...</div>';

  // Fetched once, on every tab, so the stats header up top is always
  // accurate regardless of which tab someone's looking at.
  let allBookings = [];
  let bookingsLoadError = null;
  try {
    const { data, error } = await supabaseClient.from('bookings').select('*');
    if(error){ bookingsLoadError = error; console.error('Loading bookings failed', error); }
    allBookings = data || [];
  } catch(e){ bookingsLoadError = e; console.error('Loading bookings failed', e); }
  const pendingCount = allBookings.filter(b => (b.status || 'Pending') === 'Pending').length;
  const confirmedBookings = allBookings.filter(b => b.status === 'Confirmed');
  const revenue = confirmedBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  const statsBar = `
    <div class="admin-stats-bar">
      <div class="admin-stat"><span class="admin-stat-num">${allBookings.length}</span><span class="admin-stat-label">Total Bookings</span></div>
      <div class="admin-stat admin-stat-warning"><span class="admin-stat-num">${pendingCount}</span><span class="admin-stat-label">Awaiting Verification</span></div>
      <div class="admin-stat admin-stat-success"><span class="admin-stat-num">${confirmedBookings.length}</span><span class="admin-stat-label">Confirmed</span></div>
      <div class="admin-stat"><span class="admin-stat-num">${fmtNPR(revenue)}</span><span class="admin-stat-label">Confirmed Revenue</span></div>
    </div>
  `;

  if(tab === 'tours'){
    body = `<div style="display:flex;flex-direction:column;gap:16px;">
      ${tours.map(t => `
        <div class="admin-tour-card">
          <h4>${esc(t.title)} (${esc(t.region)})</h4>
          <div class="row-2">
            <div class="field"><label>Price (NPR)</label><input type="number" id="adm-price-${t.id}" value="${t.price}"></div>
            <div class="field"><label>Default Guide Name</label><input id="adm-guide-${t.id}" value="${esc(t.guide)}"></div>
          </div>
          <div class="field"><label>Default Guide Phone</label><input id="adm-guidephone-${t.id}" value="${esc(t.guide_phone || '')}"></div>
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
          <div class="field"><label>Price (NPR)</label><input id="newPrice" type="number" placeholder="25000"></div>
        </div>
        <div class="row-2">
          <div class="field"><label>Default Guide Name</label><input id="newGuide" placeholder="Tenzin Lama"></div>
          <div class="field"><label>Default Guide Phone</label><input id="newGuidePhone" placeholder="+977-9800000000"></div>
        </div>
        <div class="field"><label>Description</label><textarea id="newDesc" placeholder="Route description..."></textarea></div>
        <button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="saveNewTour()">Publish New Route to Supabase</button>
      </div>
    `;
  }

  if(tab === 'bookings'){
    const list = [...allBookings].sort((a,b) => (a.date || '').localeCompare(b.date || ''));

    const knownGuides = Array.from(new Map(tours.map(t => [t.guide, t.guide_phone])).entries());
    const guideOptions = knownGuides.map(([name]) => `<option value="${esc(name)}">`).join('');

    const emptyMsg = bookingsLoadError
      ? `<div class="empty-state admin-load-error">Could not load bookings from Supabase (${esc(bookingsLoadError.message || 'unknown error')}). This is almost always a missing Row Level Security SELECT policy on the "bookings" table — see the console for details.</div>`
      : '<div class="empty-state">No bookings recorded yet.</div>';

    body = `
      <datalist id="knownGuidesList">${guideOptions}</datalist>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${list.length ? list.map(b => renderBookingRowForAdmin(b)).join('') : emptyMsg}
      </div>
    `;
  }

  if(tab === 'users'){
    const uniqueMap = new Map();
    allBookings.filter(b => b.email).forEach(b => uniqueMap.set(b.email, b));
    const list = Array.from(uniqueMap.values());
    body = list.length ? `<table class="admin-table"><tr><th>Customer Name</th><th>Email</th><th>Phone</th><th>Bookings</th></tr>
      ${list.map(u => {
        const count = allBookings.filter(b => b.email === u.email).length;
        return `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone || '—')}</td><td>${count}</td></tr>`;
      }).join('')}
    </table>` : '<div class="empty-state">No customer accounts managed yet.</div>';
  }

  if(tab === 'messages'){
    body = await buildAdminMessagesBody();
  }

  if(tab === 'photos'){
    body = await buildAdminPhotosBody();
  }

  if(tab === 'ad'){
    body = await buildAdminAdBody();
  }

  const modalEl = document.getElementById('modalContent');
  modalEl.classList.add('modal-admin');
  modalEl.innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <div class="admin-header">
      <h2>Admin Control Panel</h2>
      <p class="sub" style="margin:0;">Verify payments, assign riders, and manage routes — nothing reaches a customer until you confirm it here.</p>
    </div>
    ${statsBar}
    <div class="filters admin-tabs">
      ${tabs.map(tKey=>`<button class="chip ${tKey===tab?'active':''}" onclick="renderAdminPanel('${tKey}')">${labels[tKey]}</button>`).join('')}
    </div>
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

/* ---------------- Admin: Messages tab (two-way chat) ---------------- */
async function buildAdminMessagesBody(){
  let allMsgs = [];
  let loadError = null;
  try {
    const { data, error } = await supabaseClient.from('messages').select('*').order('created_at', { ascending: true });
    if(error){ loadError = error; console.error('Loading messages failed', error); }
    allMsgs = data || [];
  } catch(e){ loadError = e; console.error('Loading messages failed', e); }

  if(loadError){
    return `<div class="empty-state admin-load-error">Could not load messages (${esc(loadError.message || 'unknown error')}). Check that Supabase has a "messages" table with a SELECT policy for anon.</div>`;
  }

  // If a thread is open, show that conversation full-screen with a reply box.
  if(adminActiveThreadEmail){
    const thread = allMsgs.filter(m => m.email === adminActiveThreadEmail);
    const custName = thread.find(m => m.sender === 'customer')?.name || adminActiveThreadEmail;
    const bubbles = thread.length ? thread.map(m => `
      <div class="chat-bubble ${m.sender === 'admin' ? 'chat-bubble-admin' : 'chat-bubble-customer'}">
        <div class="chat-bubble-sender">${m.sender === 'admin' ? 'You (Admin)' : esc(custName)}</div>
        <div class="chat-bubble-body">${esc(m.body)}</div>
      </div>
    `).join('') : '<div class="empty-state">No messages in this thread yet.</div>';

    return `
      <button type="button" class="btn-link-back" onclick="adminBackToThreads()">&larr; All conversations</button>
      <h3 style="margin:4px 0 12px;">${esc(custName)} <span style="font-size:13px;color:var(--ink-soft);font-family:'Work Sans';">(${esc(adminActiveThreadEmail)})</span></h3>
      <div class="chat-thread">${bubbles}</div>
      <div class="chat-compose">
        <textarea id="adminReplyInput" placeholder="Type your reply…" rows="2"></textarea>
        <button class="btn btn-primary" id="adminReplyBtn" onclick="adminSendReply('${esc(adminActiveThreadEmail)}')">Reply</button>
      </div>
    `;
  }

  // Otherwise show the list of conversations, most recently active first.
  const byEmail = new Map();
  allMsgs.forEach(m => {
    const existing = byEmail.get(m.email);
    if(!existing || new Date(m.created_at) > new Date(existing.created_at)){
      byEmail.set(m.email, m);
    }
  });
  const threads = Array.from(byEmail.entries()).sort((a,b) => new Date(b[1].created_at) - new Date(a[1].created_at));

  if(!threads.length) return '<div class="empty-state">No conversations yet — messages customers send from the Contact section will show up here.</div>';

  return threads.map(([email, latest]) => {
    const displayName = allMsgs.find(m => m.email === email && m.sender === 'customer')?.name || email;
    return `
      <div class="booking-row" onclick="adminOpenThread('${esc(email)}')" style="cursor:pointer;">
        <div>
          <strong>${esc(displayName)}</strong> <span style="font-size:12px;color:var(--ink-soft);">${esc(email)}</span>
          <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${latest.sender === 'admin' ? '<em>You:</em> ' : ''}${esc(latest.body).slice(0,80)}${latest.body.length > 80 ? '…' : ''}</div>
        </div>
        <button class="btn btn-outline" onclick="event.stopPropagation(); adminOpenThread('${esc(email)}')">Open</button>
      </div>
    `;
  }).join('');
}

function adminBackToThreads(){
  adminActiveThreadEmail = null;
  renderAdminPanel('messages');
}

function adminOpenThread(email){
  adminActiveThreadEmail = email;
  renderAdminPanel('messages');
}

async function adminSendReply(email){
  const input = document.getElementById('adminReplyInput');
  const body = input.value.trim();
  if(!body) return;

  const restoreBtn = setBusy(document.getElementById('adminReplyBtn'), 'Sending…');
  const ok = await sbWrite(
    supabaseClient.from('messages').insert([{ email, sender: 'admin', body }]),
    'Could not send reply — check that your Supabase RLS policy allows INSERT on messages'
  );
  restoreBtn();
  if(!ok) return;
  renderAdminPanel('messages');
}

/* ---------------- Admin: Gallery tab (Google Drive links) ---------------- */
async function buildAdminPhotosBody(){
  let list = [];
  let loadError = null;
  try {
    const { data, error } = await supabaseClient.from('photos').select('*').order('created_at', { ascending: false });
    if(error){ loadError = error; console.error('Loading photos failed', error); }
    list = data || [];
  } catch(e){ loadError = e; console.error('Loading photos failed', e); }

  const listHtml = loadError
    ? `<div class="empty-state admin-load-error">Could not load gallery photos (${esc(loadError.message || 'unknown error')}). Check that Supabase has a "photos" table with a SELECT policy for anon.</div>`
    : (list.length
        ? `<div class="admin-photo-grid">${list.map(p => `
            <div class="admin-photo-card">
              <img src="${esc(p.image_url)}" alt="${esc(p.caption || '')}" onerror="this.src='';this.classList.add('img-broken')">
              <div class="admin-photo-caption">${esc(p.caption || '(no caption)')}</div>
              <button class="btn btn-outline" style="border-color:#ef4444;color:#ef4444;width:100%;" onclick="deletePhotoAdmin('${esc(p.id)}')">Delete</button>
            </div>
          `).join('')}</div>`
        : '<div class="empty-state">No photos yet — add your first one below.</div>');

  return `
    ${listHtml}
    <div class="form-card" style="max-width:100%;margin-top:20px;">
      <h3>Add a photo</h3>
      <p class="form-note" style="margin-top:-4px;">Paste a Google Drive share link (set to "Anyone with the link") or any direct image URL.</p>
      <div class="field"><label>Image link</label><input id="newPhotoUrl" placeholder="https://drive.google.com/file/d/…/view"></div>
      <div class="row-2">
        <div class="field"><label>Caption</label><input id="newPhotoCaption" placeholder="Sunrise over Sarangkot"></div>
        <div class="field"><label>Region (optional)</label><input id="newPhotoRegion" placeholder="Pokhara"></div>
      </div>
      <button class="btn btn-primary" style="width:100%;" id="addPhotoBtn" onclick="addPhotoAdmin()">Add to Gallery</button>
    </div>
  `;
}

async function addPhotoAdmin(){
  const rawUrl = document.getElementById('newPhotoUrl').value.trim();
  const caption = document.getElementById('newPhotoCaption').value.trim();
  const region = document.getElementById('newPhotoRegion').value.trim();
  if(!rawUrl){ showToast('Paste an image link first.', 'error'); return; }

  const image_url = convertDriveLink(rawUrl);
  const restoreBtn = setBusy(document.getElementById('addPhotoBtn'), 'Adding…');
  const ok = await sbWrite(
    supabaseClient.from('photos').insert([{ image_url, caption, region }]),
    'Could not add photo — check that your Supabase RLS policy allows INSERT on photos'
  );
  restoreBtn();
  if(!ok) return;
  showToast('Photo added!', 'success');
  renderAdminPanel('photos');
}

async function deletePhotoAdmin(id){
  if(!confirm('Remove this photo from the gallery?')) return;
  const ok = await sbWrite(
    supabaseClient.from('photos').delete().eq('id', id),
    'Could not delete photo — check that your Supabase RLS policy allows DELETE on photos'
  );
  if(!ok) return;
  showToast('Photo removed.', 'success');
  renderAdminPanel('photos');
}

/* ---------------- Admin: Popup Ad tab ---------------- */
// Single settings row (id fixed at 1) — simplest possible "one ad at a
// time" model. Re-saving replaces it; visitors who already closed THIS ad
// (tracked by updated_at) won't see it again until it changes.
async function buildAdminAdBody(){
  let ad = null;
  let loadError = null;
  try {
    const { data, error } = await supabaseClient.from('popup_ad').select('*').eq('id', 1).maybeSingle();
    if(error){ loadError = error; console.error('Loading popup ad failed', error); }
    ad = data;
  } catch(e){ loadError = e; console.error('Loading popup ad failed', e); }

  if(loadError){
    return `<div class="empty-state admin-load-error">Could not load the popup ad (${esc(loadError.message || 'unknown error')}). Check that Supabase has a "popup_ad" table with a SELECT policy for anon.</div>`;
  }

  return `
    <div class="form-card" style="max-width:100%;">
      <h3>Homepage Popup Ad</h3>
      <p class="form-note" style="margin-top:-4px;">Shows once to each visitor on the landing page, with a close (×) button. Paste a Google Drive share link or any direct image URL.</p>
      <div class="field"><label>Image link</label><input id="adImageUrl" value="${esc(ad?.image_url || '')}" placeholder="https://drive.google.com/file/d/…/view"></div>
      <div class="field"><label>Link when clicked (optional)</label><input id="adLinkUrl" value="${esc(ad?.link_url || '')}" placeholder="https://wa.me/... or a tour link"></div>
      <label class="checkbox-field">
        <input type="checkbox" id="adEnabled" ${ad?.enabled ? 'checked' : ''}>
        <span>Show this ad on the homepage</span>
      </label>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="saveAdBtn" onclick="savePopupAd()">Save</button>
        <button class="btn btn-outline" style="border-color:#ef4444;color:#ef4444;" onclick="removePopupAd(this)">Remove Ad</button>
      </div>
    </div>
  `;
}

async function savePopupAd(){
  const rawUrl = document.getElementById('adImageUrl').value.trim();
  const linkUrl = document.getElementById('adLinkUrl').value.trim();
  const enabled = document.getElementById('adEnabled').checked;
  if(enabled && !rawUrl){ showToast('Add an image link before enabling the ad.', 'error'); return; }

  const image_url = convertDriveLink(rawUrl);
  const restoreBtn = setBusy(document.getElementById('saveAdBtn'), 'Saving…');
  const ok = await sbWrite(
    supabaseClient.from('popup_ad').upsert([{ id: 1, image_url, link_url: linkUrl, enabled, updated_at: new Date().toISOString() }]),
    'Could not save the popup ad — check that your Supabase RLS policy allows INSERT/UPDATE on popup_ad'
  );
  restoreBtn();
  if(!ok) return;
  showToast('Popup ad saved.', 'success');
  renderAdminPanel('ad');
}

async function removePopupAd(btnEl){
  const restoreBtn = setBusy(btnEl, 'Removing…');
  const ok = await sbWrite(
    supabaseClient.from('popup_ad').upsert([{ id: 1, enabled: false, updated_at: new Date().toISOString() }]),
    'Could not remove the popup ad — check that your Supabase RLS policy allows UPDATE on popup_ad'
  );
  if(restoreBtn) restoreBtn();
  if(!ok) return;
  showToast('Popup ad removed.', 'success');
  renderAdminPanel('ad');
}

async function assignRiderToBooking(bookingId){
  const guideInput = document.getElementById(`assign-guide-${bookingId}`);
  const phoneInput = document.getElementById(`assign-phone-${bookingId}`);
  const guide = guideInput.value.trim();
  const guidePhone = phoneInput.value.trim();

  if(!guide || !guidePhone){ showToast('Enter both a rider name and phone number before confirming.', 'error'); return; }

  const restoreBtn = setBusy(document.getElementById(`confirm-btn-${bookingId}`), 'Confirming…');
  const ok = await sbWrite(
    supabaseClient.from('bookings').update({ guide, guide_phone: guidePhone, status: 'Confirmed' }).eq('id', bookingId),
    'Could not confirm booking — check that your Supabase RLS policy allows UPDATE on bookings'
  );
  restoreBtn();
  if(!ok) return;
  showToast('Rider assigned — booking confirmed for the customer.', 'success');
  renderAdminPanel('bookings');
}

async function cancelBooking(bookingId){
  if(!confirm('Cancel this booking? The customer will see it as cancelled.')) return;
  const ok = await sbWrite(
    supabaseClient.from('bookings').update({ status: 'Cancelled' }).eq('id', bookingId),
    'Could not cancel booking — check that your Supabase RLS policy allows UPDATE on bookings'
  );
  if(!ok) return;
  showToast('Booking cancelled.', 'success');
  renderAdminPanel('bookings');
}

async function saveTourEdits(id){
  const price = parseFloat(document.getElementById(`adm-price-${id}`).value);
  const guide = document.getElementById(`adm-guide-${id}`).value.trim();
  const guidePhone = document.getElementById(`adm-guidephone-${id}`).value.trim();

  const ok = await sbWrite(
    supabaseClient.from('tours').update({ price, guide, guide_phone: guidePhone }).eq('id', id),
    'Could not update tour — check that your Supabase RLS policy allows UPDATE on tours'
  );
  if(!ok) return;
  showToast('Tour updated successfully!', 'success');
  loadTours();
}

async function deleteTour(id){
  if(!confirm('Delete this tour route?')) return;
  const ok = await sbWrite(
    supabaseClient.from('tours').delete().eq('id', id),
    'Could not delete tour — check that your Supabase RLS policy allows DELETE on tours'
  );
  if(!ok) return;
  showToast('Tour deleted', 'success');
  loadTours();
  renderAdminPanel('tours');
}

async function saveNewTour(){
  const title = document.getElementById('newTitle').value.trim();
  const region = document.getElementById('newRegion').value.trim();
  const duration = document.getElementById('newDuration').value.trim() || '1 day';
  const price = parseFloat(document.getElementById('newPrice').value);
  const guide = document.getElementById('newGuide').value.trim();
  const guidePhone = document.getElementById('newGuidePhone').value.trim();
  const desc = document.getElementById('newDesc').value.trim();

  if(!title || !region || !price || !guide){ showToast('Fill in all required fields.', 'error'); return; }

  const newRoute = {
    id: 't' + Date.now(),
    title, region, duration, price, guide,
    guide_phone: guidePhone || '+977-9800000000',
    desc: desc || 'Guided motorcycle journey.',
    includes: ['Bike', 'Helmet', 'Fuel', 'Guide'],
    lat: 28.2096, lng: 83.9856
  };

  const ok = await sbWrite(
    supabaseClient.from('tours').insert([newRoute]),
    'Could not publish tour — check that your Supabase RLS policy allows INSERT on tours'
  );
  if(!ok) return;
  showToast('New tour published!', 'success');
  loadTours();
  renderAdminPanel('tours');
}

/* ---------------- Public Gallery Page (gallery.html) ----------------
   Guarded by an element check, so including script.js on index.html
   never tries to load into a grid that doesn't exist there.
------------------------------------------------------------------------ */
async function loadPhotoGallery(){
  const grid = document.getElementById('photoGalleryGrid');
  if(!grid) return;

  grid.innerHTML = '<div class="empty-state">Loading photos…</div>';
  let list = [];
  let loadError = null;
  try {
    const { data, error } = await supabaseClient.from('photos').select('*').order('created_at', { ascending: false });
    if(error){ loadError = error; console.error('Loading photos failed', error); }
    list = data || [];
  } catch(e){ loadError = e; console.error('Loading photos failed', e); }

  if(loadError){
    grid.innerHTML = `<div class="empty-state admin-load-error">Could not load the gallery (${esc(loadError.message || 'unknown error')}). If you're the site owner, check that Supabase has a "photos" table with a public SELECT policy.</div>`;
    return;
  }
  if(!list.length){
    grid.innerHTML = '<div class="empty-state">No photos yet — check back soon!</div>';
    return;
  }

  grid.innerHTML = list.map(p => `
    <div class="gallery-card">
      <img src="${esc(p.image_url)}" alt="${esc(p.caption || 'Feel It Nepal photo')}" loading="lazy"
           onerror="this.closest('.gallery-card').classList.add('img-broken')">
      ${p.caption || p.region ? `<div class="gallery-caption">${esc(p.caption || '')}${p.region ? ` <span class="gallery-region">· ${esc(p.region)}</span>` : ''}</div>` : ''}
    </div>
  `).join('');
}

/* ---------------- Homepage Popup Ad ---------------- */
async function loadPopupAd(){
  // Only relevant on the landing page, and only if the overlay exists.
  if(!document.getElementById('overlay') || !document.getElementById('top')) return;

  let ad = null;
  try {
    const { data } = await supabaseClient.from('popup_ad').select('*').eq('id', 1).maybeSingle();
    ad = data;
  } catch(e){ return; }

  if(!ad || !ad.enabled || !ad.image_url) return;

  const dismissKey = `feelit_ad_dismissed_${ad.updated_at || ad.image_url}`;
  if(localStorage.getItem(dismissKey)) return;

  const overlay = document.createElement('div');
  overlay.className = 'ad-popup-overlay';
  overlay.innerHTML = `
    <div class="ad-popup-box">
      <button class="ad-close-btn" aria-label="Close">&times;</button>
      ${ad.link_url ? `<a href="${esc(ad.link_url)}" target="_blank" rel="noopener">` : ''}
        <img src="${esc(ad.image_url)}" alt="Announcement">
      ${ad.link_url ? `</a>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.ad-close-btn').addEventListener('click', () => {
    localStorage.setItem(dismissKey, '1');
    overlay.remove();
  });
  overlay.addEventListener('click', (e) => { if(e.target === overlay){ localStorage.setItem(dismissKey, '1'); overlay.remove(); } });
}

/* ---------------- Initialization ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadTours();
  initContactDisplay();
  initFloatingWhatsApp();
  initEmailJS();
  checkUserSession();
  loadPhotoGallery();
  loadPopupAd();

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
