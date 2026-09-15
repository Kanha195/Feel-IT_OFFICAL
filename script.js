/* =========================================================================
   SUPABASE & STATE CONFIGURATION
   ========================================================================= */
const SUPABASE_URL = 'https://gsjkexvchfozviqllpvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G6Su-3CqSjBJaVdRuYwfMw_dDTE2S8s';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;

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

// Convert Google Drive view links to direct image rendering links
function formatImageUrl(url) {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return url;
}

/* =========================================================================
   AUTHENTICATION & SUPABASE OAUTH ("Continue with Google")
   ========================================================================= */
async function initAuth() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session?.user) {
    currentUser = data.session.user;
    updateAuthNavUI();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAuthNavUI();
  });
}

function updateAuthNavUI() {
  const btn = document.getElementById('authNavBtn');
  if (!btn) return;
  if (currentUser) {
    btn.innerText = 'Account / Admin';
  } else {
    btn.innerText = 'Login / Account';
  }
}

window.signInWithGoogle = async function() {
  if (!supabaseClient) {
    showToast('Supabase client not initialized!');
    return;
  }
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) showToast(error.message);
};

window.handleEmailAuth = async function(isSignUp) {
  const email = document.getElementById('authEmail')?.value.trim();
  const password = document.getElementById('authPass')?.value.trim();

  if (!email || !password) { showToast('Please enter both email and password'); return; }

  if (!supabaseClient) {
    currentUser = { email, id: 'demo-user' };
    updateAuthNavUI();
    showToast('Logged in (Demo Mode)');
    closeOverlay();
    return;
  }

  if (isSignUp) {
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) showToast(error.message);
    else { showToast('Signup successful! Check your email.'); closeOverlay(); }
  } else {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) showToast(error.message);
    else { showToast('Successfully logged in!'); closeOverlay(); }
  }
};

window.handleSignOut = async function() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthNavUI();
  showToast('Logged out');
  closeOverlay();
};

window.openAuthModal = function() {
  if (currentUser) {
    openAdminModal();
    return;
  }

  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2 style="margin-bottom:18px;">Welcome to Feel It</h2>
    
    <button class="btn btn-google" onclick="signInWithGoogle()">
      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
      Continue with Google
    </button>

    <div class="divider-text">OR EMAIL</div>

    <div class="field"><label>Email address</label><input id="authEmail" type="email" placeholder="you@example.com"></div>
    <div class="field"><label>Password</label><input id="authPass" type="password" placeholder="••••••••"></div>
    
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button class="btn btn-primary" style="flex:1;" onclick="handleEmailAuth(false)">Login</button>
      <button class="btn btn-outline" style="flex:1;" onclick="handleEmailAuth(true)">Sign Up</button>
    </div>
  `;
  showOverlay();
};

/* =========================================================================
   ADMIN DASHBOARD UI (TOURS & GALLERY PHOTO MANAGEMENT)
   ========================================================================= */
function openAdminModal() {
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <h2>Admin Dashboard</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:16px;">Logged in as: <strong>${esc(currentUser?.email || 'Admin')}</strong></p>
    
    <div class="admin-tab-bar">
      <button class="admin-tab active" onclick="switchAdminTab('galleryTab', this)">Add Photo to Gallery</button>
      <button class="admin-tab" onclick="switchAdminTab('tourTab', this)">Add New Tour</button>
    </div>

    <!-- GALLERY UPLOADER / MANAGER -->
    <div class="admin-panel active" id="galleryTab">
      <div class="field"><label>Photo Title</label><input id="adminPhotoTitle" placeholder="e.g. High Pass Ride"></div>
      <div class="field">
        <label>Region</label>
        <select id="adminPhotoRegion">
          <option value="Mustang">Mustang</option>
          <option value="Pokhara">Pokhara</option>
          <option value="Kathmandu">Kathmandu</option>
        </select>
      </div>
      <div class="field"><label>Image URL or Google Drive Link</label><input id="adminPhotoUrl" placeholder="https://drive.google.com/file/d/... or direct img link"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="saveGalleryPhoto()">Add Photo to Gallery</button>
    </div>

    <!-- TOUR CREATOR -->
    <div class="admin-panel" id="tourTab">
      <div class="field"><label>Tour Title</label><input id="adminTourTitle" placeholder="e.g. Pokhara Lake Circuit"></div>
      <div class="field"><label>Region</label><input id="adminTourRegion" placeholder="Pokhara"></div>
      <div class="field"><label>Duration</label><input id="adminTourDuration" placeholder="Full day"></div>
      <div class="field"><label>Price (NPR)</label><input id="adminTourPrice" type="number" placeholder="8000"></div>
      <div class="field"><label>Guide Name</label><input id="adminTourGuide" placeholder="Name"></div>
      <div class="field"><label>Cover Image URL / Drive Link</label><input id="adminTourImg" placeholder="Image link"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="saveNewTour()">Create Tour</button>
    </div>

    <hr style="border-color:var(--line);margin:20px 0;">
    <button class="btn btn-danger" style="width:100%;" onclick="handleSignOut()">Sign Out</button>
  `;
  showOverlay();
}

window.switchAdminTab = function(panelId, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId)?.classList.add('active');
};

window.saveGalleryPhoto = async function() {
  const title = document.getElementById('adminPhotoTitle')?.value.trim();
  const region = document.getElementById('adminPhotoRegion')?.value;
  const rawUrl = document.getElementById('adminPhotoUrl')?.value.trim();

  if(!title || !rawUrl) { showToast('Please enter title and image URL'); return; }

  const formattedUrl = formatImageUrl(rawUrl);
  const newPhoto = { id: 'g' + Date.now(), title, region, drive_url: formattedUrl };

  galleryPhotos.unshift(newPhoto);

  if (supabaseClient) {
    await supabaseClient.from('gallery').insert([{ title, region, drive_url: formattedUrl }]);
  }

  renderGallery('All');
  showToast('Photo added to gallery successfully!');
  closeOverlay();
};

window.saveNewTour = async function() {
  const title = document.getElementById('adminTourTitle')?.value.trim();
  const region = document.getElementById('adminTourRegion')?.value.trim();
  const duration = document.getElementById('adminTourDuration')?.value.trim();
  const price = Number(document.getElementById('adminTourPrice')?.value);
  const guide = document.getElementById('adminTourGuide')?.value.trim();
  const rawImg = document.getElementById('adminTourImg')?.value.trim();

  if(!title || !price) { showToast('Please complete title and price'); return; }

  const newTour = {
    id: 't' + Date.now(), title, region: region || 'Nepal',
    duration: duration || 'Full day', price, guide: guide || 'Local Rider',
    image_url: formatImageUrl(rawImg), desc: 'Custom adventure route.', lat: 27.7172, lng: 85.3240
  };

  tours.unshift(newTour);

  if (supabaseClient) {
    await supabaseClient.from('tours').insert([newTour]);
  }

  renderTours();
  initMap();
  showToast('New tour created!');
  closeOverlay();
};

/* =========================================================================
   GLOBAL CONTROLS & MAP
   ========================================================================= */
window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme');
  const target = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('feelit_theme', target);
};

window.toggleMobileMenu = function() { document.getElementById('mobileMenu')?.classList.toggle('open'); };
window.closeMobileMenu = function() { document.getElementById('mobileMenu')?.classList.remove('open'); };
function showOverlay() { document.getElementById('overlay')?.classList.remove('hidden'); }
window.closeOverlay = function() { document.getElementById('overlay')?.classList.add('hidden'); };

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

function renderGallery(filter = 'All'){
  const el = document.getElementById('galleryGrid');
  if(!el) return;
  const list = filter === 'All' ? galleryPhotos : galleryPhotos.filter(p => p.region === filter);

  el.innerHTML = list.map(p => `
    <div class="gallery-item">
      <img src="${esc(p.drive_url)}" alt="${esc(p.title)}" onerror="this.src='https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80'">
      <div class="caption">
        <span>${esc(p.title)}</span>
        <span style="color:var(--primary);">${esc(p.region)}</span>
      </div>
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
  window.open(`https://wa.me/9779825344810?text=${waText}`, '_blank');
  showToast('Redirecting to WhatsApp...');
};

window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('feelit_theme');
  if(savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  initAuth();
  loadTours();
  renderGallery('All');
});
