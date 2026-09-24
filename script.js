/* =========================================================================
   SUPABASE CONFIGURATION & CREDENTIALS
   ========================================================================= */
const SUPABASE_URL = 'https://gsjkexvchfozviqllpvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONTACT_INFO = {
  email: 'feelitofficial@gmail.com',
  phone: '+977-9808747221',
  whatsapp: '9779825344810',
  instagram: 'feelitnepal',
  address: 'Basundhara, Kathmandu, Nepal'
};

const ADMIN_EMAIL = 'admin@feelit.com';
const ADMIN_PASS_HASH = '1bc57fec7b82137e1cfeefed41c9a9f5ded5e69de2a397151c504e139bffd324';

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

const CUSTOM_PRICING = {
  dailyRates: {
    t1: 3800,
    t2: 5200,
    t3: 8500,
    t4: 5500,
    t5: 7200,
    t6: 8200,
    t7: 5200,
    t8: 7800
  },
  hotelPerDay: 1800,
  foodPerDay: 1400
};

const customState = {
  hotel: true,
  food: true,
  guide: true
};

const WEATHER_CONFIG = {
  latitude: 27.7172,
  longitude: 85.3240,
  label: 'Kathmandu'
};

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
  if(n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return 'Price on request';
  return 'NPR ' + Number(n).toLocaleString('en-NP');
}

function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function setBusy(btn, busyText){
  if(!btn) return () => {};
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.dataset.originalText = original;
  btn.innerHTML = busyText || 'Please wait…';
  return () => { btn.disabled = false; btn.innerHTML = btn.dataset.originalText || original; };
}

/* ---------------------------------------------------------------------
   SEED TOUR DATA
--------------------------------------------------------------------- */
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
    desc:'High desert crossing past Chörtens and canyon roads to the walled city of Lo Manthang.',
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
    desc:"Nepal's remotest lake, reached via long, sparsely-fuelled far-west roads.",
    includes:['Off-road bike','Extra fuel carried','Rara National Park entry','Basic lodging','Local guide'], lat:29.5333, lng:82.0833, image_url:'' },

  { id:'t7', title:'Ilam Tea Garden Hills Ride', region:'Ilam', duration:'2 days', price:12000,
    guide:'Sarita Rai', guide_phone:'+977-9878901234', bio:'Eastern-hills native, rides the tea estate roads around Ilam.',
    desc:'Gentle, green switchbacks through rolling tea estates in the far east.',
    includes:['150cc bike','Full gear set','Fuel','Tea garden visit','Local guide'], lat:26.9096, lng:87.9310, image_url:'' },

  { id:'t8', title:'Manaslu Circuit Off-Road Adventure', region:'Manaslu', duration:'7 days', price:null,
    guide:'', guide_phone:'', bio:'',
    desc:'A restricted-area circuit around the eighth-highest mountain on earth — launching soon.',
    includes:['Off-road bike','Restricted area permit','Teahouse lodging','Fuel','Local guide'],
    lat:28.5561, lng:84.6339, image_url:'', coming_soon:true }
];

let tours = [];
let activeFilter = 'All';
let pendingBooking = null;
let leafletMap = null;
let mapMarkers = [];

function showOverlay() { document.getElementById('overlay')?.classList.remove('hidden'); }
function closeOverlay() {
  document.getElementById('overlay')?.classList.add('hidden');
  const mc = document.getElementById('modalContent');
  if(mc) mc.style.maxWidth = '';
  pendingBooking = null;
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
  return {
    ...t,
    guide_phone: t.guide_phone || t.guidePhone || '',
    image_url: t.image_url || t.imageUrl || t.imageurl || '',
    custom_daily_rate: Number(t.custom_daily_rate) > 0 ? Number(t.custom_daily_rate) : (CUSTOM_PRICING.dailyRates[t.id] || 5000),
    coming_soon: !!(t.coming_soon || t.comingSoon)
  };
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
  populateCustomRouteOptions();
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

function renderTours(){
  const list = activeFilter==='All' ? tours : tours.filter(t=>t.region===activeFilter);
  const el = document.getElementById('tourGrid');
  if(!el) return;
  if(list.length===0){ el.innerHTML = '<div class="empty-state">No tours in this region yet.</div>'; return; }

  el.innerHTML = list.map(t=>{
    const bgStyle = t.image_url ? `background-image:url('${esc(t.image_url)}');` : `background:rgba(34,211,238,0.1);`;
    const artContent = t.image_url ? '' : `<svg width="70" height="46" viewBox="0 0 70 46" fill="none"><path d="M0 40 L18 12 L28 26 L40 4 L58 34 L70 22 L70 40 Z" fill="#22d3ee"/></svg>`;

    if(t.coming_soon){
      const waMsg = encodeURIComponent(`Hi! I'd like to be notified when the ${t.title} route opens for booking.`);
      return `
        <div class="card" style="opacity:0.88;">
          <div class="card-art" style="${bgStyle}">${artContent}</div>
          <div class="card-body">
            <div class="card-region">${esc(t.region)}</div>
            <h3 class="card-title">${esc(t.title)}</h3>
            <div class="card-meta"><span>${esc(t.duration)}</span><span class="badge" style="background:var(--primary);color:#032331;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;">COMING SOON</span></div>
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

/* ---------------- Tour Booking Flow ---------------- */
function openTour(id){
  const t = tours.find(x=>x.id===id);
  if(!t) return;
  if(t.coming_soon){ showToast('This route is not open for booking yet.', 'error'); return; }
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
    <div class="field">
      <label for="tourDate">Choose a date</label>
      <input type="date" id="tourDate" min="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="field">
      <label for="tourTravelers">Travelers</label>
      <input type="number" id="tourTravelers" value="1" min="1" max="6">
    </div>
    <div class="card-price" style="margin-bottom:18px;">${fmtNPR(t.price)} <small>/ person</small></div>
    <div class="modal-action-row">
      <button class="btn btn-outline" type="button" onclick="closeOverlay(); document.getElementById('customRoute').value='${esc(t.id)}'; populateCustomRouteOptions(); document.getElementById('customize').scrollIntoView({behavior:'smooth'});">Customize instead</button>
      <button class="btn btn-primary" type="button" onclick="goToCheckout('${esc(t.id)}')">Continue to payment</button>
    </div>
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

function renderPaymentMethodSelector(){
  if(!pendingBooking) return;
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Choose a payment method</h2>
    <p class="sub">${esc(pendingBooking.title)} · ${esc(pendingBooking.date)} · ${pendingBooking.travelers} traveler(s) · Total: <strong>${fmtNPR(pendingBooking.total)}</strong>${pendingBooking.customSummary ? `<br><span class="custom-summary-line">${esc(pendingBooking.customSummary)}</span>` : ''}</p>

    <div class="payment-method-grid">
      ${Object.values(PAYMENT_METHODS).map(m => `
        <button class="payment-method-card" onclick="selectPaymentMethod('${m.key}')">
          <span class="pm-icon">${m.icon}</span>
          <span class="pm-name">${esc(m.label)}</span>
          <span class="pm-sub">${esc(m.shortLabel)}</span>
        </button>
      `).join('')}
    </div>
  `;
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
  const sessionUser = pendingBooking.sessionUser;

  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <button type="button" class="btn-link-back" onclick="renderPaymentMethodSelector()">&larr; Choose a different payment method</button>
    <h2>Scan & Pay — ${esc(method.label)}</h2>
    <p class="sub">${esc(pendingBooking.title)} · ${esc(pendingBooking.date)} · Total: <strong>${fmtNPR(pendingBooking.total)}</strong></p>

    <div class="qr-box">
      <img src="${esc(method.qrImage)}" alt="Payment QR" class="qr-img" onerror="this.onerror=null; this.replaceWith(Object.assign(document.createElement('div'), {className:'qr-img qr-img-missing', innerText:'QR image not found — use account details below'}));">
      <p class="qr-account-name">${esc(method.accountName)}</p>
      <p class="qr-account-number">${esc(method.accountNumber)} <span class="qr-account-meta">· ${esc(method.accountMeta)}</span></p>
      <p class="qr-hint">Scan with your ${esc(method.label)} app for the exact amount above, then fill in your transaction reference below.</p>
    </div>

    <div class="row-2">
      <div class="field"><label>Full Name</label><input id="bkName" value="${esc(sessionUser?.name || '')}"></div>
      <div class="field"><label>Email Address</label><input id="bkEmail" type="email" value="${esc(sessionUser?.email || '')}"></div>
    </div>
    <div class="field"><label>Phone / WhatsApp</label><input id="bkPhone" value="${esc(sessionUser?.phone || '')}" placeholder="+977-98XXXXXXXX"></div>
    <div class="field"><label>Transaction Reference ID</label><input id="bkTxnRef" placeholder="e.g. ESW-9842109"></div>
    <label class="checkbox-field">
      <input type="checkbox" id="bkAgreeTerms">
      <span>I've completed payment and agree to the <a href="#" onclick="openTermsModal(); return false;">Terms &amp; Conditions</a>.</span>
    </label>
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="submitBookingBtn" onclick="submitFinalBooking()">Submit payment details</button>
  `;
  showOverlay();
}

async function submitFinalBooking(){
  const name = document.getElementById('bkName').value.trim();
  const email = document.getElementById('bkEmail').value.trim();
  const phone = document.getElementById('bkPhone').value.trim();
  const txnRef = document.getElementById('bkTxnRef').value.trim();
  const agreed = document.getElementById('bkAgreeTerms').checked;

  if(!name || !email || !phone || !txnRef){ showToast('Please complete all fields.', 'error'); return; }
  if(!isValidEmail(email)){ showToast('Please enter a valid email address.', 'error'); return; }
  if(!agreed){ showToast('Please agree to the Terms & Conditions.', 'error'); return; }

  const restoreBtn = setBusy(document.getElementById('submitBookingBtn'), 'Submitting…');
  const ref = 'FEEL-' + Math.random().toString(36).slice(2,8).toUpperCase();
  const newBooking = {
    ref,
    tour_id: pendingBooking.tourId,
    tour_title: pendingBooking.custom ? `${pendingBooking.title} · ${pendingBooking.customSummary}` : pendingBooking.title,
    date: pendingBooking.date,
    travelers: pendingBooking.travelers,
    total: pendingBooking.total,
    name, email, phone,
    txn_ref: txnRef,
    payment_method: pendingBooking.paymentMethod,
    status: 'Pending',
    guide: null,
    guide_phone: null
  };

  try {
    const { error } = await supabaseClient.from('bookings').insert([newBooking]);
    if(error) throw error;
  } catch(e){
    restoreBtn();
    showToast('Booking could not be saved to Supabase.', 'error');
    return;
  }

  restoreBtn();
  showToast('Payment details submitted successfully!', 'success');
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Payment submitted — pending verification</h2>
    <p class="sub">Booking Reference: <strong>${ref}</strong></p>
    <p>Our team verifies transaction references by hand. Once confirmed, your assigned rider's name and phone number will appear in <strong>My Account</strong>.</p>
    <button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">Done</button>
  `;
  pendingBooking = null;
}

/* ---------------- Auth & Account ---------------- */
async function checkActiveAuthUser(){
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if(session && session.user){
      return {
        id: session.user.id,
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
  const btn = document.getElementById('authNavBtn');
  if(btn) btn.textContent = sessionUser ? 'My Account' : 'Login / Account';
}

async function openAuthModal(){
  const sessionUser = await checkActiveAuthUser();
  if(sessionUser){
    if(sessionUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) renderAdminPanel('bookings');
    else renderUserDashboard(sessionUser);
  } else {
    showAuthTabs('login');
  }
}

function showAuthTabs(mode = 'login'){
  const formHtml = mode === 'register' ? `
      <div class="field"><label>Full Name</label><input id="regName" placeholder="Your Name"></div>
      <div class="field"><label>Email Address</label><input id="regEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>Password</label><input id="regPass" type="password" placeholder="At least 6 characters"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="registerBtn" onclick="handleRegister()">Create Account</button>
    ` : `
      <div class="field"><label>Email Address</label><input id="authEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>Password</label><input id="authPass" type="password" placeholder="••••••••"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="loginBtn" onclick="handleStandardLogin()">Login</button>
    `;

  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <div class="filters" style="margin-bottom:20px;">
      <button class="chip ${mode==='login'?'active':''}" onclick="showAuthTabs('login')">Login</button>
      <button class="chip ${mode==='register'?'active':''}" onclick="showAuthTabs('register')">Register</button>
    </div>
    ${formHtml}
  `;
  showOverlay();
}

async function handleRegister(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value.trim();
  if(!name || !email || !pass){ showToast('Fill in all fields.', 'error'); return; }

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
    if(error) { showToast(error.message, 'error'); return; }
    showToast('Account created successfully!', 'success');
    showAuthTabs('login');
  } catch(e){
    showToast('Registration error', 'error');
  }
}

async function handleStandardLogin(){
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value.trim();
  if(!email || !pass){ showToast('Enter email and password.', 'error'); return; }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if(error){ showToast('Invalid credentials.', 'error'); return; }
    checkUserSession();
    if(email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) renderAdminPanel('bookings');
    else renderUserDashboard({ name: data.user.user_metadata?.full_name, email });
  } catch(e){
    showToast('Login failed', 'error');
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
    <p class="sub">Welcome back, <strong>${esc(user.name)}</strong></p>
    <div style="margin-bottom:24px;"><button class="btn btn-outline" onclick="handleUserLogout()">Logout</button></div>
    <h3>My Tour Bookings</h3>
    <div style="margin-top:14px;">
      ${bookingsList.length ? bookingsList.map(b => renderBookingRowForUser(b)).join('') : '<div class="empty-state">No bookings found.</div>'}
    </div>
  `;
  showOverlay();
}

function renderBookingRowForUser(b){
  const statusClass = b.status === 'Confirmed' ? 'status-confirmed' : (b.status === 'Cancelled' ? 'status-cancelled' : 'status-pending');
  let riderBlock = b.status === 'Confirmed' && b.guide ? `
    <div class="rider-reveal-box"><strong>Assigned Rider:</strong> ${esc(b.guide)} — <a href="tel:${esc(b.guide_phone)}">${esc(b.guide_phone)}</a></div>
  ` : `<div class="pending-note">Payment verification in progress. Rider details will appear here once confirmed.</div>`;

  return `
    <div class="booking-row" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;">
        <strong>${esc(b.tour_title)}</strong>
        <span class="status ${statusClass}">${esc(b.status || 'Pending')}</span>
      </div>
      <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">Date: ${esc(b.date)} · Ref: ${esc(b.ref)}</div>
      ${riderBlock}
    </div>
  `;
}

async function handleUserLogout(){
  await supabaseClient.auth.signOut();
  checkUserSession();
  closeOverlay();
  showToast('Logged out.', 'success');
}

/* ---------------- Admin Control Panel ---------------- */
async function renderAdminPanel(tab){
  const sessionUser = await checkActiveAuthUser();
  if(!sessionUser || sessionUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()){
    showToast('Admin access restricted.', 'error');
    return;
  }
  const tabs = ['bookings', 'tours', 'addTour', 'contacts'];
  const labels = { bookings:'🧾 Bookings', tours:'🏍️ Manage Tours', addTour:'➕ Add Tour', contacts:'✉️ Messages' };

  let body = '';
  if(tab === 'bookings'){
    let list = [];
    try {
      const { data } = await supabaseClient.from('bookings').select('*').order('date', { ascending: true });
      list = data || [];
    } catch(e){}
    body = `<div style="display:flex;flex-direction:column;gap:14px;">${list.length ? list.map(b => renderBookingRowForAdmin(b)).join('') : '<div class="empty-state">No bookings.</div>'}</div>`;
  } else if(tab === 'tours'){
    body = `<div style="display:flex;flex-direction:column;gap:16px;">${tours.map(t => renderAdminTourCard(t)).join('')}</div>`;
  } else if(tab === 'addTour'){
    body = `
      <div class="form-card" style="max-width:100%;">
        <h3>Add New Route</h3>
        <div class="row-2">
          <div class="field"><label>Title</label><input id="newTitle"></div>
          <div class="field"><label>Region</label><input id="newRegion"></div>
        </div>
        <div class="row-2">
          <div class="field"><label>Duration</label><input id="newDuration" placeholder="3 days"></div>
          <div class="field"><label>Price (NPR)</label><input id="newPrice" type="number"></div>
        </div>
        <div class="field"><label>Description</label><textarea id="newDesc"></textarea></div>
        <button class="btn btn-primary" style="width:100%;" onclick="saveNewTour()">Publish Route</button>
      </div>`;
  } else if(tab === 'contacts'){
    let list = [];
    try {
      const { data } = await supabaseClient.from('contacts').select('*');
      list = data || [];
    } catch(e){}
    body = list.length ? list.map(c => `<div class="booking-row"><strong>${esc(c.name)}</strong> (${esc(c.email)})<br>${esc(c.message)}</div>`).join('') : '<div class="empty-state">No messages.</div>';
  }

  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '960px';
  mc.innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Admin Panel</h2>
    <div class="filters" style="margin-bottom:20px;">
      ${tabs.map(tKey=>`<button class="chip ${tKey===tab?'active':''}" onclick="renderAdminPanel('${tKey}')">${labels[tKey]}</button>`).join('')}
    </div>
    <div>${body}</div>
  `;
  showOverlay();
}

function renderAdminTourCard(t){
  return `
    <div class="admin-tour-card">
      <h4>${esc(t.title)} (${esc(t.region)})</h4>
      <div class="row-2">
        <div class="field"><label>Title</label><input id="adm-title-${t.id}" value="${esc(t.title)}"></div>
        <div class="field"><label>Price (NPR)</label><input id="adm-price-${t.id}" value="${t.price ?? ''}"></div>
      </div>
      <button class="btn btn-primary" onclick="saveTourEdits('${t.id}')">Save Changes</button>
    </div>
  `;
}

function renderBookingRowForAdmin(b){
  return `
    <div class="booking-row">
      <div><strong>${esc(b.tour_title)}</strong> (${esc(b.date)}) — <strong>${esc(b.status || 'Pending')}</strong><br>
      Customer: ${esc(b.name)} (${esc(b.phone)}) · Ref: ${esc(b.txn_ref)}</div>
      <div class="row-2" style="margin-top:10px;">
        <input id="assign-guide-${b.id}" placeholder="Rider Name">
        <input id="assign-phone-${b.id}" placeholder="Rider Phone">
      </div>
      <button class="btn btn-primary" style="margin-top:8px;" onclick="assignRiderToBooking('${esc(b.id)}')">Confirm &amp; Assign Rider</button>
    </div>
  `;
}

async function assignRiderToBooking(bookingId){
  const guide = document.getElementById(`assign-guide-${bookingId}`).value.trim();
  const guidePhone = document.getElementById(`assign-phone-${bookingId}`).value.trim();
  if(!guide || !guidePhone){ showToast('Enter guide name and phone.', 'error'); return; }
  try {
    await supabaseClient.from('bookings').update({ guide, guide_phone: guidePhone, status: 'Confirmed' }).eq('id', bookingId);
    showToast('Booking confirmed!', 'success');
    renderAdminPanel('bookings');
  } catch(e){ showToast('Error confirming booking', 'error'); }
}

async function saveTourEdits(id){
  const title = document.getElementById(`adm-title-${id}`).value.trim();
  const price = parseFloat(document.getElementById(`adm-price-${id}`).value) || null;
  try {
    await supabaseClient.from('tours').upsert({ id, title, price });
    showToast('Tour updated!', 'success');
    loadTours();
  } catch(e){ showToast('Error updating tour', 'error'); }
}

async function saveNewTour(){
  const title = document.getElementById('newTitle').value.trim();
  const region = document.getElementById('newRegion').value.trim();
  const duration = document.getElementById('newDuration').value.trim() || '2 days';
  const price = parseFloat(document.getElementById('newPrice').value) || 10000;
  if(!title || !region){ showToast('Fill in title and region.', 'error'); return; }
  try {
    await supabaseClient.from('tours').insert([{ id: 't' + Date.now(), title, region, duration, price, guide:'Bikash Gurung', guide_phone:'+977-9812345678', desc:'New tour route.', includes:['Bike','Fuel','Guide'], lat:28.2, lng:83.9 }]);
    showToast('Tour created!', 'success');
    loadTours();
    renderAdminPanel('tours');
  } catch(e){ showToast('Error creating tour', 'error'); }
}

/* ---------------- Weather Widget & Physics Animations ---------------- */
function weatherMeta(code){
  const c = Number(code);
  if(c === 0) return { icon:'☀️', label:'Clear sky' };
  if([1,2,3].includes(c)) return { icon:'⛅', label:'Partly cloudy' };
  if([61,63,65,66,67,80,81,82].includes(c)) return { icon:'🌧️', label:'Rain' };
  return { icon:'⛅', label:'Variable conditions' };
}

async function initWeatherWidget(){
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_CONFIG.latitude}&longitude=${WEATHER_CONFIG.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code`, { cache:'no-store' });
    const payload = await response.json();
    const current = payload.current || {};
    const meta = weatherMeta(current.weather_code);
    document.getElementById('weatherTemp').textContent = `${Math.round(current.temperature_2m || 22)}°C`;
    document.getElementById('weatherCondition').textContent = meta.label;
    document.getElementById('weatherHumidity').textContent = `${Math.round(current.relative_humidity_2m || 60)}%`;
    document.getElementById('weatherWind').textContent = `${Math.round(current.wind_speed_10m || 10)} km/h`;
    document.getElementById('weatherFeels').textContent = `${Math.round(current.apparent_temperature || 21)}°C`;
    
    // Adjust bulb swing physics based on live wind speed
    const bulbContainer = document.getElementById('physicsBulbContainer');
    if(bulbContainer && current.wind_speed_10m){
      const speed = Number(current.wind_speed_10m);
      bulbContainer.style.animationDuration = `${Math.max(1.2, 4 - (speed * 0.15))}s`;
    }
  } catch(e){
    document.getElementById('weatherCondition').textContent = 'Live weather active';
  }
}

// Generate real rain animation drops
function initRainSimulation(){
  const wrap = document.getElementById('rainCanvasWrap');
  if(!wrap) return;
  for(let i=0; i<45; i++){
    const drop = document.createElement('div');
    drop.className = 'rain-drop';
    drop.style.left = `${Math.random()*100}%`;
    drop.style.top = `${Math.random()*-50}px`;
    drop.style.animationDuration = `${0.6 + Math.random()*0.8}s`;
    drop.style.animationDelay = `${Math.random()*2}s`;
    wrap.appendChild(drop);
  }
}

/* ---------------- Custom Ride Builder ---------------- */
function getCustomRoute(){
  return tours.find(t => t.id === document.getElementById('customRoute')?.value) || tours.find(t => !t.coming_soon) || null;
}

function getCustomDays(route){
  const raw = Number(document.getElementById('customDays')?.value);
  if(raw > 0) return Math.min(14, Math.max(1, raw));
  const text = String(route?.duration || '1').toLowerCase();
  const match = text.match(/(\d+)/);
  return match ? Math.max(1, Math.min(14, Number(match[1]))) : 1;
}

function getCustomQuote(route = getCustomRoute()){
  if(!route) return null;
  const days = getCustomDays(route);
  const travelers = Math.min(6, Math.max(1, Number(document.getElementById('customTravelers')?.value) || 1));
  const dailyRate = Number(route.custom_daily_rate) > 0 ? Number(route.custom_daily_rate) : 5000;
  const ride = dailyRate * days;
  const hotel = customState.hotel ? CUSTOM_PRICING.hotelPerDay * days : 0;
  const food = customState.food ? CUSTOM_PRICING.foodPerDay * days : 0;
  const perPerson = ride + hotel + food;
  return { route, days, travelers, ride, hotel, food, perPerson, total: perPerson * travelers };
}

function updateCustomDaysForRoute(){
  const route = getCustomRoute();
  const daysSelect = document.getElementById('customDays');
  if(!route || !daysSelect) return;
  const suggested = Number(String(route.duration || '').match(/\d+/)?.[0] || 1);
  daysSelect.value = String(Math.max(1, Math.min(14, suggested)));
  updateCustomQuote();
}

function populateCustomRouteOptions(){
  const routeSelect = document.getElementById('customRoute');
  const daysSelect = document.getElementById('customDays');
  if(!routeSelect || !daysSelect) return;
  const available = tours.filter(t => !t.coming_soon);
  routeSelect.innerHTML = available.map(t => `<option value="${esc(t.id)}">${esc(t.title)} · ${esc(t.region)}</option>`).join('');
  daysSelect.innerHTML = Array.from({length:14}, (_,i)=>i+1).map(day => `<option value="${day}">${day} days</option>`).join('');
  updateCustomQuote();
}

function updateCustomQuote(){
  const quote = getCustomQuote();
  if(!quote) return;
  document.getElementById('customQuoteTitle').textContent = quote.route.title;
  document.getElementById('customQuoteDuration').textContent = `${quote.days} days · ${quote.travelers} traveler(s)`;
  document.getElementById('customQuoteTotal').textContent = fmtNPR(quote.perPerson);
  document.getElementById('customQuoteBreakdown').innerHTML = `
    <div><span>Riding (Day 1–${quote.days})</span><strong>${fmtNPR(quote.ride)}</strong></div>
    <div><span>Hotel Stay</span><strong>${fmtNPR(quote.hotel)}</strong></div>
    <div><span>Food &amp; Meals</span><strong>${fmtNPR(quote.food)}</strong></div>
    <div class="breakdown-total"><span>Total for ${quote.travelers} traveler(s)</span><strong>${fmtNPR(quote.total)}</strong></div>
  `;
}

function toggleCustomOption(kind){
  if(kind === 'guide') return;
  customState[kind] = !customState[kind];
  document.getElementById(kind === 'hotel' ? 'customHotelBtn' : 'customFoodBtn')?.classList.toggle('active', customState[kind]);
  updateCustomQuote();
}

function toggleHeroAddon(kind){
  customState[kind] = !customState[kind];
  document.getElementById(`mini${kind.charAt(0).toUpperCase() + kind.slice(1)}Btn`)?.classList.toggle('active', customState[kind]);
}

async function continueCustomBooking(){
  const route = getCustomRoute();
  const date = document.getElementById('customDate')?.value;
  const quote = getCustomQuote(route);
  if(!route || !quote){ showToast('Choose a route.', 'error'); return; }
  if(!date){ showToast('Choose your start date.', 'error'); return; }

  const sessionUser = await checkActiveAuthUser();
  pendingBooking = {
    tourId: route.id,
    title: route.title,
    date,
    travelers: quote.travelers,
    total: quote.total,
    sessionUser,
    paymentMethod: null,
    custom: true,
    customSummary: `${quote.days} days · Hotel ${customState.hotel?'included':'excluded'} · Food ${customState.food?'included':'excluded'}`
  };
  renderPaymentMethodSelector();
}

function initContactDisplay(){
  document.getElementById('contactEmailDisplay').innerHTML = `<a href="mailto:${CONTACT_INFO.email}">${esc(CONTACT_INFO.email)}</a>`;
  document.getElementById('contactPhoneDisplay').innerHTML = `<a href="tel:${CONTACT_INFO.phone}">${esc(CONTACT_INFO.phone)}</a>`;
  document.getElementById('contactAddressDisplay').textContent = CONTACT_INFO.address;
  document.getElementById('contactWaLink').href = `https://wa.me/${CONTACT_INFO.whatsapp}`;
  document.getElementById('contactIgLink').href = `https://ig.me/m/${CONTACT_INFO.instagram}`;
  document.getElementById('floatWaLink').href = `https://wa.me/${CONTACT_INFO.whatsapp}`;
  document.getElementById('floatIgLink').href = `https://ig.me/m/${CONTACT_INFO.instagram}`;
}

async function submitContact(){
  const name = document.getElementById('ctName').value.trim();
  const email = document.getElementById('ctEmail').value.trim();
  const message = document.getElementById('ctMessage').value.trim();
  if(!name || !email || !message){ showToast('Fill in name, email and message.', 'error'); return; }
  try {
    await supabaseClient.from('contacts').insert([{ name, email, message }]);
    showToast('Message sent successfully!', 'success');
  } catch(e){ showToast('Error sending message', 'error'); }
}

function openTermsModal(){
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Terms &amp; Conditions</h2>
    <p class="sub">Effective 2026</p>
    <p>Bookings are held as Pending until transaction references are manually verified. Riders and guides are assigned upon verification.</p>
    <button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="closeOverlay()">I Understand</button>
  `;
  showOverlay();
}

function openGuideForm(){
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Apply as Guide</h2>
    <div class="field"><label>Full Name</label><input id="gName"></div>
    <div class="field"><label>Phone</label><input id="gPhone"></div>
    <button class="btn btn-primary" style="width:100%;" onclick="closeGuideApp()">Submit Application</button>
  `;
  showOverlay();
}

async function closeGuideApp(){
  showToast('Guide application submitted!', 'success');
  closeOverlay();
}

window.addEventListener('DOMContentLoaded', () => {
  const preloader = document.getElementById('preloader');
  if(preloader){ setTimeout(() => preloader.classList.add('is-done'), 1000); setTimeout(() => preloader.remove(), 1600); }
  loadTheme();
  loadTours();
  initWeatherWidget();
  initRainSimulation();
  initContactDisplay();
  checkUserSession();
});
