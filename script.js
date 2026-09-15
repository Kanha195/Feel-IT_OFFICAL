/* =========================================================================
   SUPABASE & CONFIG
   ========================================================================= */
const SUPABASE_URL = 'https://gsjkexvchfozviqllpvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const CONTACT_INFO = {
  phone: '+977-9808747221',
  whatsapp: '9779825344810',
  instagram: 'feelitoffical',
  address: 'Basundhara, Kathmandu, Nepal'
};

const seedTours = [
  { id:'t1', title:'Sarangkot Sunrise Ridge', region:'Pokhara', duration:'Half day', price:4000, guide:'Bikash Gurung', desc:'Sunrise view over Annapurna mountain range.', lat:28.2439, lng:83.9486 },
  { id:'t2', title:'Kathmandu Valley Rim Loop', region:'Kathmandu', duration:'Full day', price:7000, guide:'Sunita Tamang', desc:'Nagarkot ridge and scenic valley roads.', lat:27.7172, lng:85.3240 },
  { id:'t3', title:'Upper Mustang Desert Crossing', region:'Mustang', duration:'Multi-day', price:105000, guide:'Tenzin Lama', desc:'High mountain desert trail to Lo Manthang.', lat:28.7819, lng:83.7380 }
];

let galleryPhotos = [
  { id:'g1', title:'Mustang Canyon Pass', region:'Mustang', drive_url:'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80' },
  { id:'g2', title:'Pokhara Lakeside Dawn', region:'Pokhara', drive_url:'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80' },
  { id:'g3', title:'Kathmandu Ridge Ride', region:'Kathmandu', drive_url:'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80' }
];

let tours = [];
let leafletMap = null;
let mapMarkers = [];

function esc(str){ return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtNPR(n){ return 'NPR ' + (Number(n) || 0).toLocaleString(); }

function showToast(message) {
  const container = document.getElementById('toast-container');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  toast.innerHTML = `<span>${esc(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* =========================================================================
   GLOBAL CONTROLS (THEME, MENU, MODALS)
   ========================================================================= */
window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme');
  const target = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('feelit_theme', target);
};

window.toggleMobileMenu = function() {
  document.getElementById('mobileMenu')?.classList.toggle('open');
};

window.closeMobileMenu = function() {
  document.getElementById('mobileMenu')?.classList.remove('open');
};

window.openAuthModal = function() {
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Login to Feel It</h2>
    <div class="field"><label>Email address</label><input id="authEmail" type="email" placeholder="you@example.com"></div>
    <div class="field"><label>Password</label><input id="authPass" type="password" placeholder="••••••••"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="handleLogin()">Continue</button>
  `;
  showOverlay();
};

window.handleLogin = function() {
  const email = document.getElementById('authEmail')?.value.trim();
  if(!email) { showToast('Please enter your email'); return; }
  showToast('Logged in as ' + email);
  closeOverlay();
};

function showOverlay() { document.getElementById('overlay')?.classList.remove('hidden'); }
window.closeOverlay = function() { document.getElementById('overlay')?.classList.add('hidden'); };

/* =========================================================================
   TOURS & MAP RENDERING
   ========================================================================= */
async function loadTours() {
  try {
    if(supabaseClient) {
      const { data, error } = await supabaseClient.from('tours').select('*');
      if(!error && data && data.length > 0) tours = data;
      else tours = seedTours;
    } else {
      tours = seedTours;
    }
  } catch(e) {
    tours = seedTours;
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

window.handleTourFilterChange = function() { renderTours(); };

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

  if(list.length === 0){
    el.innerHTML = '<div style="color:var(--ink-soft);grid-column:1/-1;">No tours found matching selection.</div>';
    return;
  }

  el.innerHTML = list.map(t => `
    <div class="card">
      <div class="card-art" style="${t.image_url ? `background-image:url('${esc(t.image_url)}');` : ''}"></div>
      <div class="card-body">
        <div class="card-region">${esc(t.region)}</div>
        <h3 class="card-title">${esc(t.title)}</h3>
        <div class="card-meta"><span>${esc(t.duration)}</span><span>Guide: ${esc(t.guide)}</span></div>
        <div class="card-price">${fmtNPR(t.price)}</div>
        <button class="btn btn-primary" onclick="openTour('${esc(t.id)}')">View & book</button>
      </div>
    </div>
  `).join('');
}

window.openTour = function(id) {
  const t = tours.find(x => x.id === id);
  if(!t) return;
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <div class="card-region">${esc(t.region)} · ${esc(t.duration)}</div>
    <h2 style="margin:6px 0;">${esc(t.title)}</h2>
    <p style="color:var(--ink-soft);font-size:14px;">${esc(t.desc)}</p>
    <div class="field"><label>Tour Date</label><input type="date" id="tourDate"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="submitBooking('${esc(t.title)}')">Confirm Booking (${fmtNPR(t.price)})</button>
  `;
  showOverlay();
};

window.submitBooking = function(title) {
  const date = document.getElementById('tourDate')?.value;
  if(!date) { showToast('Select a date first'); return; }
  showToast(`Booking request sent for ${title} on ${date}!`);
  closeOverlay();
};

function initMap(){
  const container = document.getElementById('tourMap');
  if(!container || typeof L === 'undefined') return;

  if(!leafletMap){
    leafletMap = L.map('tourMap').setView([28.2096, 83.9856], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:18 }).addTo(leafletMap);
  }
  
  setTimeout(() => { if(leafletMap) leafletMap.invalidateSize(); }, 300);

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

/* =========================================================================
   GALLERY & CONTACT
   ========================================================================= */
function renderGallery(filter = 'All'){
  const el = document.getElementById('galleryGrid');
  if(!el) return;
  const list = filter === 'All' ? galleryPhotos : galleryPhotos.filter(p => p.region === filter);

  el.innerHTML = list.map(p => `
    <div class="gallery-item">
      <img src="${esc(p.drive_url)}" alt="${esc(p.title)}">
      <div class="caption">${esc(p.title)}</div>
    </div>
  `).join('');
}

window.filterGallery = function(region, btn){
  document.querySelectorAll('.gallery-controls .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderGallery(region);
};

window.submitContact = function() {
  const name = document.getElementById('ctName')?.value.trim();
  const email = document.getElementById('ctEmail')?.value.trim();
  const message = document.getElementById('ctMessage')?.value.trim();

  if(!name || !email || !message){ showToast('Please complete all message fields'); return; }

  const waText = encodeURIComponent(`Hi Feel It Nepal!\nName: ${name}\nEmail: ${email}\nMessage: ${message}`);
  window.open(`https://wa.me/${CONTACT_INFO.whatsapp}?text=${waText}`, '_blank');
  showToast('Redirecting to WhatsApp...');
};

/* =========================================================================
   INITIALIZATION
   ========================================================================= */
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('feelit_theme');
  if(savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

  loadTours();
  renderGallery('All');
});
