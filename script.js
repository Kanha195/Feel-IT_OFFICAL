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
  instagram: 'feelitofficial', // Updated handle
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

const seedTours = [
  { id:'t1', title:'Sarangkot Sunrise Ridge', region:'Pokhara', duration:'Half day', price:4000, guide:'Bikash Gurung', guide_phone:'+977-9812345678', bio:'11 years riding Pokhara hills.', desc:'Sunrise view over Annapurna.', includes:['125cc bike','Helmet','Fuel'], lat:28.2439, lng:83.9486, image_url:'' },
  { id:'t2', title:'Kathmandu Valley Rim Loop', region:'Kathmandu', duration:'Full day', price:7000, guide:'Sunita Tamang', guide_phone:'+977-9823456789', bio:'Valley native rider.', desc:'Nagarkot ridge ride.', includes:['150cc bike','Gear','Permits'], lat:27.7172, lng:85.3240, image_url:'' },
  { id:'t3', title:'Upper Mustang Desert Crossing', region:'Mustang', duration:'Multi-day', price:105000, guide:'Tenzin Lama', guide_phone:'+977-9834567890', bio:'9 seasons in Lo Manthang.', desc:'High mountain desert trail.', includes:['Off-road bike','Permits','Lodging'], lat:28.7819, lng:83.7380, image_url:'' }
];

// Sample Google Drive photos (Converted direct thumbnail/embed format)
let galleryPhotos = [
  { id:'g1', title:'Mustang Canyon Pass', region:'Mustang', drive_url:'https://lh3.googleusercontent.com/d/1_SampleDriveImageKeyMustang' },
  { id:'g2', title:'Pokhara Lakeside Dawn', region:'Pokhara', drive_url:'https://lh3.googleusercontent.com/d/1_SampleDriveImageKeyPokhara' },
  { id:'g3', title:'Kathmandu Valley Ridge', region:'Kathmandu', drive_url:'https://lh3.googleusercontent.com/d/1_SampleDriveImageKeyKathmandu' }
];

let tours = [];
let pendingBooking = null;
let leafletMap = null;
let mapMarkers = [];
let activeAd = null;

function esc(str){ return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtNPR(n){ return 'NPR ' + (Number(n) || 0).toLocaleString(); }
function isValidEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  toast.innerHTML = `<span>${esc(message)}</span><button style="background:none;border:none;color:#aaa;" onclick="this.parentElement.remove()">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showOverlay() { document.getElementById('overlay')?.classList.remove('hidden'); }
function closeOverlay() {
  document.getElementById('overlay')?.classList.add('hidden');
  const mc = document.getElementById('modalContent');
  if(mc) mc.style.maxWidth = '';
  pendingBooking = null;
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme');
  const target = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('feelit_theme', target);
}

function toggleMobileMenu(){ document.getElementById('mobileMenu')?.classList.toggle('open'); }
function closeMobileMenu(){ document.getElementById('mobileMenu')?.classList.remove('open'); }

/* ---------------- TOURS & MAPS ---------------- */
function normalizeTour(t){
  return {
    ...t,
    guide_phone: t.guide_phone || t.guidePhone || '',
    image_url: t.image_url || t.imageUrl || '',
    coming_soon: !!(t.coming_soon || t.comingSoon)
  };
}

async function loadTours(){
  try {
    const { data, error } = await supabaseClient.from('tours').select('*');
    if (error || !data || data.length === 0) tours = seedTours.map(normalizeTour);
    else tours = data.map(normalizeTour);
  } catch (e) {
    tours = seedTours.map(normalizeTour);
  }
  populateFilterDropdowns();
  renderTours();
  initMap();
}

function populateFilterDropdowns(){
  const regions = ['All', ...new Set(tours.map(t => t.region))];
  const regSelect = document.getElementById('regionSelect');
  if(regSelect){
    regSelect.innerHTML = regions.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
  }
}

function handleTourFilterChange(){ renderTours(); }

function renderTours(){
  const reg = document.getElementById('regionSelect')?.value || 'All';
  const dur = document.getElementById('durationSelect')?.value || 'All';
  const sort = document.getElementById('sortSelect')?.value || 'default';

  let list = [...tours];

  if(reg !== 'All') list = list.filter(t => t.region === reg);
  if(dur !== 'All'){
    if(dur === 'Multi-day') list = list.filter(t => t.duration.includes('day') && !t.duration.includes('Half') && !t.duration.includes('Full'));
    else list = list.filter(t => t.duration === dur);
  }

  if(sort === 'price-low') list.sort((a,b) => (a.price||0) - (b.price||0));
  if(sort === 'price-high') list.sort((a,b) => (b.price||0) - (a.price||0));

  const el = document.getElementById('tourGrid');
  if(!el) return;
  if(list.length === 0){ el.innerHTML = '<div class="empty-state">No tours found matching selection.</div>'; return; }

  el.innerHTML = list.map(t => `
    <div class="card">
      <div class="card-art" style="${t.image_url ? `background-image:url('${esc(t.image_url)}');` : 'background:rgba(34,211,238,0.1)'}"></div>
      <div class="card-body">
        <div class="card-region">${esc(t.region)}</div>
        <h3 class="card-title">${esc(t.title)}</h3>
        <div class="card-meta"><span>${esc(t.duration)}</span><span>Guide: ${esc(t.guide)}</span></div>
        <div class="card-price">${t.price ? fmtNPR(t.price) : 'Coming Soon'}</div>
        <button class="btn btn-primary" onclick="openTour('${esc(t.id)}')">View & book</button>
      </div>
    </div>
  `).join('');
}

function initMap(){
  const container = document.getElementById('tourMap');
  if(!container || typeof L === 'undefined') return;

  if(!leafletMap){
    leafletMap = L.map('tourMap').setView([28.2096, 83.9856], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:18 }).addTo(leafletMap);
  }
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];

  tours.forEach(t => {
    if(t.lat && t.lng){
      const marker = L.marker([t.lat, t.lng]).addTo(leafletMap);
      marker.bindPopup(`<strong>${esc(t.title)}</strong><br>${fmtNPR(t.price)}`);
      mapMarkers.push(marker);
    }
  });
}

/* ---------------- PHOTO GALLERY (GOOGLE DRIVE) ---------------- */
async function loadGalleryPhotos(){
  try {
    const { data } = await supabaseClient.from('gallery').select('*');
    if(data && data.length) galleryPhotos = data;
  } catch(e){}
  renderGallery('All');
}

function renderGallery(filter = 'All'){
  const el = document.getElementById('galleryGrid');
  if(!el) return;

  const list = filter === 'All' ? galleryPhotos : galleryPhotos.filter(p => p.region === filter);

  el.innerHTML = list.map(p => `
    <div class="gallery-item" onclick="viewPhotoModal('${esc(p.drive_url)}', '${esc(p.title)}')">
      <img src="${esc(p.drive_url)}" alt="${esc(p.title)}" onerror="this.src='assets/logo-icon.png'">
      <div class="caption">${esc(p.title)}</div>
    </div>
  `).join('');
}

function filterGallery(region, btn){
  document.querySelectorAll('.gallery-controls .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderGallery(region);
}

function viewPhotoModal(url, title){
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <img src="${esc(url)}" style="width:100%;max-height:80vh;object-fit:contain;border-radius:8px;">
    <p style="text-align:center;margin-top:10px;font-weight:600;">${esc(title)}</p>
  `;
  showOverlay();
}

/* ---------------- BOOKING & CHECKOUT FLOW ---------------- */
function openTour(id){
  const t = tours.find(x => x.id === id);
  if(!t) return;
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <div class="card-region">${esc(t.region)} · ${esc(t.duration)}</div>
    <h2>${esc(t.title)}</h2>
    <p class="sub">${esc(t.desc)}</p>
    <div class="field"><label>Date</label><input type="date" id="tourDate"></div>
    <div class="field"><label>Travelers</label><input type="number" id="tourTravelers" value="1" min="1" max="6"></div>
    <button class="btn btn-primary" style="width:100%;" onclick="goToCheckout('${esc(t.id)}')">Proceed to Payment</button>
  `;
  showOverlay();
}

async function goToCheckout(id){
  const t = tours.find(x => x.id === id);
  const date = document.getElementById('tourDate').value;
  const travelers = parseInt(document.getElementById('tourTravelers').value || '1', 10);
  if(!date){ showToast('Select a date', 'error'); return; }

  const sessionUser = await checkActiveAuthUser();
  pendingBooking = { tourId: t.id, title: t.title, date, travelers, total: t.price * travelers, sessionUser };
  renderPaymentMethodSelector();
}

function renderPaymentMethodSelector(){
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Choose Payment Method</h2>
    <p class="sub">Total: <strong>${fmtNPR(pendingBooking.total)}</strong></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${Object.values(PAYMENT_METHODS).map(m => `
        <button class="form-card" style="text-align:center;" onclick="selectPaymentMethod('${m.key}')">
          <div style="font-size:24px;">${m.icon}</div>
          <strong>${esc(m.label)}</strong>
        </button>
      `).join('')}
    </div>
  `;
  showOverlay();
}

function selectPaymentMethod(key){
  pendingBooking.paymentMethod = key;
  const m = PAYMENT_METHODS[key];
  const u = pendingBooking.sessionUser;

  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>${esc(m.label)} Payment</h2>
    <div style="text-align:center;margin:10px 0;"><img src="${m.qrImage}" style="width:160px;height:160px;object-fit:contain;"></div>
    <div class="field"><label>Full Name</label><input id="bkName" value="${esc(u?.name||'')}"></div>
    <div class="field"><label>Email</label><input id="bkEmail" value="${esc(u?.email||'')}"></div>
    <div class="field"><label>Transaction Ref ID</label><input id="bkTxnRef" placeholder="e.g. ESW-9842109"></div>
    <button class="btn btn-primary" style="width:100%;" onclick="submitFinalBooking()">Confirm & Submit</button>
  `;
}

async function submitFinalBooking(){
  const name = document.getElementById('bkName').value.trim();
  const email = document.getElementById('bkEmail').value.trim();
  const txn_ref = document.getElementById('bkTxnRef').value.trim();
  if(!name || !email || !txn_ref){ showToast('Fill all fields', 'error'); return; }

  const ref = 'FEEL-' + Math.random().toString(36).slice(2,8).toUpperCase();
  const record = {
    ref, tour_id: pendingBooking.tourId, tour_title: pendingBooking.title,
    date: pendingBooking.date, travelers: pendingBooking.travelers,
    total: pendingBooking.total, name, email, txn_ref,
    payment_method: pendingBooking.paymentMethod, status: 'Pending'
  };

  try {
    await supabaseClient.from('bookings').insert([record]);
    showToast('Booking submitted!', 'success');
  } catch(e){}

  closeOverlay();
}

/* ---------------- AUTHENTICATION & DASHBOARD ---------------- */
async function checkActiveAuthUser(){
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if(session?.user){
      return { name: session.user.user_metadata?.full_name || session.user.email.split('@')[0], email: session.user.email };
    }
  } catch(e){}
  return null;
}

async function checkUserSession(){
  const user = await checkActiveAuthUser();
  const btn = document.getElementById('authNavBtn');
  if(btn) btn.textContent = user ? 'My Account' : 'Login / Account';
}

async function openAuthModal(){
  const u = await checkActiveAuthUser();
  if(u) renderUserDashboard(u);
  else showAuthTabs('login');
}

function showAuthTabs(mode){
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>${mode === 'register' ? 'Register Account' : 'Login'}</h2>
    <div class="field"><label>Email</label><input id="authEmail" type="email"></div>
    <div class="field"><label>Password</label><input id="authPass" type="password"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="handleStandardLogin()">Continue</button>
  `;
  showOverlay();
}

async function handleStandardLogin(){
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value.trim();
  const hashedPass = await sha256(pass);

  if(email.toLowerCase() === ADMIN_EMAIL && hashedPass === ADMIN_PASS_HASH){
    renderAdminPanel('bookings');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if(error) showToast(error.message, 'error');
    else { checkUserSession(); renderUserDashboard({ name: data.user.email, email: data.user.email }); }
  } catch(e){ showToast('Login failed', 'error'); }
}

async function renderUserDashboard(user){
  let bookings = [];
  let userMessages = [];

  try {
    const { data: bData } = await supabaseClient.from('bookings').select('*').eq('email', user.email);
    bookings = bData || [];

    const { data: mData } = await supabaseClient.from('contacts').select('*').eq('email', user.email);
    userMessages = mData || [];
  } catch(e){}

  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>User Dashboard</h2>
    <p class="sub">Welcome, <strong>${esc(user.name)}</strong></p>
    
    <h3>My Tour Bookings</h3>
    <div style="margin-bottom:20px;">
      ${bookings.length ? bookings.map(b => `
        <div class="admin-tour-card">
          <div style="display:flex;justify-content:space-between;">
            <strong>${esc(b.tour_title)} (${esc(b.date)})</strong>
            <span class="badge">${esc(b.status)}</span>
          </div>
          ${b.status === 'Confirmed' && b.guide ? `
            <div style="margin-top:8px;color:var(--primary);">
              Assigned Rider: <strong>${esc(b.guide)}</strong> (${esc(b.guide_phone)})
            </div>
          ` : '<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">Rider assignment pending payment verification.</div>'}
        </div>
      `).join('') : '<div class="empty-state">No bookings yet.</div>'}
    </div>

    <h3>My Messages & Admin Replies</h3>
    <div>
      ${userMessages.length ? userMessages.map(m => `
        <div class="admin-tour-card">
          <p><strong>Message:</strong> ${esc(m.message)}</p>
          ${m.reply ? `<p style="color:var(--primary);margin-top:4px;"><strong>Admin Reply:</strong> ${esc(m.reply)}</p>` : '<p style="font-size:12px;color:var(--ink-soft);">Awaiting admin response...</p>'}
        </div>
      `).join('') : '<div class="empty-state">No messages sent yet.</div>'}
    </div>
  `;
  showOverlay();
}

/* ---------------- CONTACT & IN-APP REPLIES ---------------- */
async function submitContact(){
  const name = document.getElementById('ctName').value.trim();
  const email = document.getElementById('ctEmail').value.trim();
  const message = document.getElementById('ctMessage').value.trim();

  if(!name || !email || !message){ showToast('Complete all fields', 'error'); return; }

  const sessionUser = await checkActiveAuthUser();

  if(!sessionUser){
    // Non-logged-in user: redirect directly to WhatsApp
    const waText = encodeURIComponent(`Hi Feel It Nepal!\nName: ${name}\nEmail: ${email}\nMessage: ${message}`);
    window.open(`https://wa.me/${CONTACT_INFO.whatsapp}?text=${waText}`, '_blank');
    showToast('Redirecting to WhatsApp...', 'success');
  } else {
    // Logged-in user: save message to Supabase for internal reply system
    try {
      await supabaseClient.from('contacts').insert([{ name, email, message }]);
      showToast('Message sent! View replies in My Account.', 'success');
      document.getElementById('ctName').value = '';
      document.getElementById('ctEmail').value = '';
      document.getElementById('ctMessage').value = '';
    } catch(e){
      showToast('Error sending message', 'error');
    }
  }
}

/* ---------------- ADMIN CONTROL PANEL ---------------- */
async function renderAdminPanel(tab){
  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '900px';

  let body = '';

  if(tab === 'bookings'){
    let list = [];
    try {
      const { data } = await supabaseClient.from('bookings').select('*');
      list = data || [];
    } catch(e){}

    body = list.map(b => `
      <div class="admin-tour-card">
        <strong>${esc(b.tour_title)} - ${esc(b.name)} (${esc(b.email)})</strong>
        <div>Txn Ref: ${esc(b.txn_ref)} | Status: <strong>${esc(b.status)}</strong></div>
        ${b.status !== 'Confirmed' ? `
          <div class="row-2" style="margin-top:10px;">
            <input id="guide-${b.id}" placeholder="Rider Name">
            <input id="phone-${b.id}" placeholder="Rider Phone">
          </div>
          <button class="btn btn-primary" style="margin-top:8px;" onclick="adminAssignRider('${b.id}')">Verify & Assign Rider</button>
        ` : `<div>Assigned: ${esc(b.guide)} (${esc(b.guide_phone)})</div>`}
      </div>
    `).join('');
  }

  if(tab === 'messages'){
    let list = [];
    try {
      const { data } = await supabaseClient.from('contacts').select('*');
      list = data || [];
    } catch(e){}

    body = list.map(m => `
      <div class="admin-tour-card">
        <strong>From: ${esc(m.name)} (${esc(m.email)})</strong>
        <p>${esc(m.message)}</p>
        <div class="field">
          <textarea id="reply-${m.id}" placeholder="Type reply for website dashboard...">${esc(m.reply||'')}</textarea>
        </div>
        <button class="btn btn-primary" onclick="adminSendReply('${m.id}')">Send Reply to User Dashboard</button>
      </div>
    `).join('');
  }

  if(tab === 'gallery'){
    body = `
      <h3>Add New Google Drive Photo</h3>
      <div class="field"><label>Photo Title</label><input id="gTitle" placeholder="Mustang High Pass"></div>
      <div class="field"><label>Region Category</label><input id="gRegion" placeholder="Mustang"></div>
      <div class="field"><label>Google Drive Direct Image URL</label><input id="gUrl" placeholder="https://lh3.googleusercontent.com/d/YOUR_IMAGE_ID"></div>
      <button class="btn btn-primary" onclick="adminAddGalleryPhoto()">Add Photo to Website</button>
    `;
  }

  if(tab === 'popupAd'){
    body = `
      <h3>Manage Landing Page Popup Announcement</h3>
      <div class="field"><label>Ad Image URL</label><input id="adImg" value="${esc(activeAd?.img||'')}"></div>
      <div class="field"><label>Ad Title</label><input id="adTitle" value="${esc(activeAd?.title||'')}"></div>
      <div class="field"><label>Offer Message</label><textarea id="adText">${esc(activeAd?.text||'')}</textarea></div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" onclick="savePopupAd(true)">Publish Popup Ad</button>
        <button class="btn btn-outline" style="border-color:var(--danger);color:var(--danger);" onclick="savePopupAd(false)">Remove Ad</button>
      </div>
    `;
  }

  mc.innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Admin Panel</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
      <button class="btn btn-outline" onclick="renderAdminPanel('bookings')">Bookings</button>
      <button class="btn btn-outline" onclick="renderAdminPanel('messages')">Messages</button>
      <button class="btn btn-outline" onclick="renderAdminPanel('gallery')">Drive Gallery</button>
      <button class="btn btn-outline" onclick="renderAdminPanel('popupAd')">Popup Ad</button>
    </div>
    ${body}
  `;
  showOverlay();
}

async function adminAssignRider(id){
  const guide = document.getElementById(`guide-${id}`).value.trim();
  const guide_phone = document.getElementById(`phone-${id}`).value.trim();
  if(!guide || !guide_phone){ showToast('Enter guide name and phone', 'error'); return; }

  await supabaseClient.from('bookings').update({ guide, guide_phone, status:'Confirmed' }).eq('id', id);
  showToast('Rider assigned & booking confirmed!', 'success');
  renderAdminPanel('bookings');
}

async function adminSendReply(id){
  const reply = document.getElementById(`reply-${id}`).value.trim();
  if(!reply){ showToast('Type a reply', 'error'); return; }

  await supabaseClient.from('contacts').update({ reply }).eq('id', id);
  showToast('Reply saved! User can read it in their account.', 'success');
}

async function adminAddGalleryPhoto(){
  const title = document.getElementById('gTitle').value.trim();
  const region = document.getElementById('gRegion').value.trim();
  const drive_url = document.getElementById('gUrl').value.trim();

  if(!title || !drive_url){ showToast('Fill title and Drive URL', 'error'); return; }

  const photo = { title, region: region || 'All', drive_url };
  try {
    await supabaseClient.from('gallery').insert([photo]);
    showToast('Photo added to gallery!', 'success');
    loadGalleryPhotos();
  } catch(e){
    galleryPhotos.push(photo);
    renderGallery('All');
  }
}

function savePopupAd(active){
  if(!active){
    activeAd = null;
    localStorage.removeItem('feelit_ad');
    showToast('Popup Ad removed', 'success');
  } else {
    activeAd = {
      img: document.getElementById('adImg').value.trim(),
      title: document.getElementById('adTitle').value.trim(),
      text: document.getElementById('adText').value.trim()
    };
    localStorage.setItem('feelit_ad', JSON.stringify(activeAd));
    showToast('Popup Ad published!', 'success');
  }
}

function checkAndDisplayPopupAd(){
  const saved = localStorage.getItem('feelit_ad');
  if(!saved) return;
  activeAd = JSON.parse(saved);
  if(activeAd && activeAd.title){
    setTimeout(() => {
      document.getElementById('modalContent').innerHTML = `
        <button class="modal-close" onclick="closeOverlay()">&times;</button>
        <div class="ad-modal-box">
          ${activeAd.img ? `<img src="${esc(activeAd.img)}" class="ad-img">` : ''}
          <h2>${esc(activeAd.title)}</h2>
          <p>${esc(activeAd.text)}</p>
          <button class="btn btn-primary" onclick="closeOverlay()">Explore Now</button>
        </div>
      `;
      showOverlay();
    }, 1500);
  }
}

function initContactDisplay(){
  document.getElementById('contactEmailDisplay').innerHTML = `<a href="mailto:${CONTACT_INFO.email}">${esc(CONTACT_INFO.email)}</a>`;
  document.getElementById('contactPhoneDisplay').innerHTML = `<a href="tel:${CONTACT_INFO.phone}">${esc(CONTACT_INFO.phone)}</a>`;
  document.getElementById('contactWaLink').href = `https://wa.me/${CONTACT_INFO.whatsapp}`;
  document.getElementById('contactIgLink').href = `https://instagram.com/${CONTACT_INFO.instagram}`;
  document.getElementById('floatWaLink').href = `https://wa.me/${CONTACT_INFO.whatsapp}`;
  document.getElementById('floatIgLink').href = `https://instagram.com/${CONTACT_INFO.instagram}`;
  document.getElementById('contactAddressDisplay').textContent = CONTACT_INFO.address;
}

window.addEventListener('DOMContentLoaded', () => {
  loadTours();
  loadGalleryPhotos();
  initContactDisplay();
  checkUserSession();
  checkAndDisplayPopupAd();
});
