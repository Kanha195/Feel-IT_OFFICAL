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

/* ---------------- Google Drive image handling ----------------
   WHY THIS CHANGED: the old code turned Drive share links into
   `https://drive.google.com/uc?export=view&id=…`. Google no longer serves
   that endpoint to <img> tags — it answers with a redirect to an HTML
   "virus scan / sign in" page, so the browser gets HTML where it wanted a
   JPEG and renders a broken image. That is exactly why nothing you
   uploaded ever appeared on the site.

   `https://drive.google.com/thumbnail?id=…&sz=w1600` DOES still serve a
   real image to <img> tags, so that's what we use now.

   Everything is normalised at DISPLAY time (not just when saving), so the
   photos already sitting in your Supabase table with the old broken URL
   start working the moment you upload this file — you don't have to
   re-add a single one.
--------------------------------------------------------------------- */

// Pull the file ID out of any Drive URL shape people actually paste.
function driveFileId(url){
  if(!url) return '';
  const u = String(url).trim();
  if(!u.includes('drive.google.com') && !u.includes('googleusercontent.com')) return '';
  const m =
    u.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/) ||        // /file/d/ID/view
    u.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)     ||        // ?id=ID / uc?export=view&id=ID
    u.match(/\/d\/([a-zA-Z0-9_-]{10,})/);                // lh3.../d/ID
  return m ? m[1] : '';
}

// The URL we actually put in src="". Non-Drive links pass through untouched,
// so a plain https://…/photo.jpg from anywhere still works fine.
function imgSrc(url, size = 1600){
  if(!url) return '';
  const id = driveFileId(url);
  if(id) return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
  return String(url).trim();
}

// Kept under its old name because other code (and your muscle memory) calls
// it — but it now produces the working URL shape.
function convertDriveLink(url){
  return imgSrc(url);
}

// Drive occasionally rate-limits one endpoint but not another, so if the
// first URL fails we quietly try the other two before giving up. Without
// this, one hiccup = a permanently blank gallery tile.
function handleImgError(img){
  const id = img.dataset.driveId || '';
  const step = Number(img.dataset.imgStep || 0);
  img.onerror = null;
  if(id && step === 0){
    img.dataset.imgStep = '1';
    img.onerror = () => handleImgError(img);
    img.src = `https://lh3.googleusercontent.com/d/${id}=w1600`;
    return;
  }
  if(id && step === 1){
    img.dataset.imgStep = '2';
    img.onerror = () => handleImgError(img);
    img.src = `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
    return;
  }
  img.dataset.imgStep = 'failed';
  img.classList.add('img-failed');
  const holder = img.closest('[data-img-holder]');
  if(holder) holder.classList.add('img-broken');
}

// Single place that builds an <img> for any admin-supplied photo link.
function imgTag(rawUrl, alt, cls, extra = ''){
  const id = driveFileId(rawUrl);
  return `<img src="${esc(imgSrc(rawUrl))}" alt="${esc(alt || '')}"${cls ? ` class="${cls}"` : ''} loading="lazy"` +
         `${id ? ` data-drive-id="${esc(id)}"` : ''} data-img-step="0" onerror="handleImgError(this)"${extra ? ' ' + extra : ''}>`;
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

// Region names and captions come from the admin panel, so an apostrophe in
// one would otherwise break out of the inline onclick string.
function jsArg(str){
  return esc(String(str ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}

/* =========================================================================
   WEATHER (Open-Meteo — free, no API key needed)
   Any element rendered with class="weather-chip" and data-weather-pending
   plus data-weather-lat / data-weather-lng (and optionally data-weather-date
   as YYYY-MM-DD) gets filled in the next time hydrateWeatherChips() runs.
   Call hydrateWeatherChips() right after you inject HTML containing chips —
   it only touches chips still marked "pending" so it's safe to call often.
   ========================================================================= */
function weatherIcon(code){
  if(code === 0) return '☀️';
  if([1,2].includes(code)) return '🌤️';
  if(code === 3) return '☁️';
  if([45,48].includes(code)) return '🌫️';
  if([51,53,55,56,57,80,81,82].includes(code)) return '🌦️';
  if([61,63,65,66,67].includes(code)) return '🌧️';
  if([71,73,75,77,85,86].includes(code)) return '❄️';
  if([95,96,99].includes(code)) return '⛈️';
  return '🌡️';
}
function weatherLabel(code){
  const map = {
    0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Freezing fog',
    51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Freezing drizzle',57:'Freezing drizzle',
    61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',
    71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',
    80:'Rain showers',81:'Rain showers',82:'Violent rain showers',
    85:'Snow showers',86:'Snow showers',95:'Thunderstorm',96:'Thunderstorm w/ hail',99:'Thunderstorm w/ hail'
  };
  return map[code] || 'Weather';
}

const weatherFetchCache = new Map();

async function fetchWeatherFor(lat, lng, dateStr){
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}|${dateStr || ''}`;
  if(weatherFetchCache.has(key)) return weatherFetchCache.get(key);

  const promise = (async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=16`;
      const res = await fetch(url);
      const data = await res.json();

      if(dateStr && data.daily?.time){
        const idx = data.daily.time.indexOf(dateStr);
        if(idx > -1){
          const code = data.daily.weathercode[idx];
          const max = Math.round(data.daily.temperature_2m_max[idx]);
          const min = Math.round(data.daily.temperature_2m_min[idx]);
          return `${weatherIcon(code)} ${weatherLabel(code)}, ${min}°–${max}°C on your ride date`;
        }
        if(data.current_weather){
          return `${weatherIcon(data.current_weather.weathercode)} Currently ${Math.round(data.current_weather.temperature)}°C at this location — the forecast for your exact date isn't out yet (only ~16 days ahead), check back closer to it`;
        }
      }
      if(data.current_weather){
        return `${weatherIcon(data.current_weather.weathercode)} Currently ${Math.round(data.current_weather.temperature)}°C, ${weatherLabel(data.current_weather.weathercode)}`;
      }
      return '';
    } catch(e){
      return '';
    }
  })();

  weatherFetchCache.set(key, promise);
  return promise;
}

function hydrateWeatherChips(root){
  const scope = root || document;
  const chips = scope.querySelectorAll('.weather-chip[data-weather-pending]');
  chips.forEach(chip => {
    chip.removeAttribute('data-weather-pending'); // claim immediately so a second call can't double-fetch it
    const lat = parseFloat(chip.dataset.weatherLat), lng = parseFloat(chip.dataset.weatherLng);
    if(Number.isNaN(lat) || Number.isNaN(lng)){ chip.remove(); return; }
    fetchWeatherFor(lat, lng, chip.dataset.weatherDate || '').then(html => {
      if(html) chip.innerHTML = html; else chip.remove();
    });
  });
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
    includes:['Off-road bike','Restricted permit','Lodging','Fuel'], lat: 28.7819, lng: 83.7380, imageUrl: '' },
  { id:'hg1', title:'Nagarkot Sunset Ridge', region:'Kathmandu', duration:'Half day', price:2500,
    guide:'Sunita Tamang', guide_phone:'+977-9823456789', bio:'Valley-rim specialist.',
    desc:'Short afternoon climb to Nagarkot for sunset over the Himalaya — tea stop included.',
    includes:['Bike','Helmet','Fuel','Local guide'], lat: 27.7154, lng: 85.5205, imageUrl: '', hidden_gem: true },
  { id:'hg2', title:'Phewa Lakeside Loop', region:'Pokhara', duration:'3 hours', price:1800,
    guide:'Bikash Gurung', guide_phone:'+977-9812345678', bio:'11 years on Pokhara hills.',
    desc:'Easy lakeside and village lanes around Phewa — perfect first ride in Nepal.',
    includes:['Bike','Helmet','Fuel'], lat: 28.2096, lng: 83.9856, imageUrl: '', hidden_gem: true },
  { id:'hg3', title:'Chobar Gorge Tea Run', region:'Kathmandu', duration:'Half day', price:2200,
    guide:'Sunita Tamang', guide_phone:'+977-9823456789', bio:'Valley-rim specialist.',
    desc:'Quick run to Chobar gorge and a hillside tea house — short, scenic, local.',
    includes:['Bike','Helmet','Fuel','Tea stop'], lat: 27.6588, lng: 85.2917, imageUrl: '', hidden_gem: true }
];

let tours = [];
let activeFilter = 'All';
let pendingBooking = null;
let leafletMap = null;
let mapMarkers = [];
let adminActiveThreadEmail = null; // which customer's conversation the admin has open, if any
let reviewStats = {};              // { tourId: { sum, count, avg } } — powers the star badges on cards
let galleryPhotos = [];            // cached gallery rows so the lightbox can page through them

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
  // Supabase rows and seed data may disagree on guidePhone vs guide_phone,
  // and on image_url vs imageUrl — settle on one shape so the rest of the
  // app never has to care which spelling a given row happens to use.
  return {
    ...t,
    guide_phone: t.guide_phone || t.guidePhone || '',
    imageUrl: t.image_url || t.imageUrl || '',
    includes: Array.isArray(t.includes) ? t.includes : (t.includes ? String(t.includes).split(',').map(s => s.trim()).filter(Boolean) : []),
    hidden_gem: !!(t.hidden_gem || t.is_hidden_gem || t.hiddenGem),
    image_position: t.image_position || t.imagePosition || 'center',
    image_zoom: Number(t.image_zoom || t.imageZoom || 100)
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
  // Apply admin crop overrides from this browser
  try {
    const cropMap = JSON.parse(localStorage.getItem('feelit_tour_crop') || '{}');
    tours = tours.map(t => cropMap[t.id] ? { ...t, ...cropMap[t.id] } : t);
  } catch(e){}
  await loadReviewStats();
  renderFilters();
  renderTours();
  initMap();
}

/* ---------------- Reviews ----------------
   Every reviews call is wrapped so that if the `reviews` table doesn't
   exist yet (i.e. you haven't run the SQL), the site carries on exactly as
   before instead of breaking. Nothing here can take the page down.
------------------------------------------------------------------------ */
async function loadReviewStats(){
  reviewStats = {};
  try {
    const { data, error } = await supabaseClient.from('reviews').select('tour_id, rating');
    if(error || !data) return;
    data.forEach(r => {
      const s = reviewStats[r.tour_id] || (reviewStats[r.tour_id] = { sum: 0, count: 0 });
      s.sum += Number(r.rating) || 0;
      s.count += 1;
    });
    Object.values(reviewStats).forEach(s => { s.avg = s.count ? (s.sum / s.count) : 0; });
  } catch(e){ /* table not set up yet — reviews simply don't appear */ }
}

// Renders N filled stars out of 5. Used on cards, in the tour modal and in
// the admin reviews tab, so the rating always looks the same everywhere.
function starsHtml(rating){
  const r = Math.round(Number(rating) || 0);
  return `<span class="stars" aria-label="${r} out of 5">${
    [1,2,3,4,5].map(i => `<span class="${i <= r ? 'star-on' : 'star-off'}">★</span>`).join('')
  }</span>`;
}

function ratingBadge(tourId){
  const s = reviewStats[tourId];
  if(!s || !s.count) return '';
  return `<div class="card-rating">${starsHtml(s.avg)}<span class="rating-count">${s.avg.toFixed(1)} · ${s.count} review${s.count === 1 ? '' : 's'}</span></div>`;
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
  // Main grid: exclude pure hidden gems unless filter is All and we still show everything
  const base = activeFilter==='All' ? tours : tours.filter(t=>t.region===activeFilter);
  const list = base.filter(t => !t.hidden_gem || activeFilter !== 'All' ? true : !t.hidden_gem);
  // Simpler: main grid shows non-gem tours; gems have their own section
  const mainList = (activeFilter==='All' ? tours : tours.filter(t=>t.region===activeFilter)).filter(t => !t.hidden_gem);
  const el = document.getElementById('tourGrid');
  if(!el) return;
  if(mainList.length===0){ el.innerHTML = '<div class="empty-state">No tours in this region yet.</div>'; return; }

  el.innerHTML = mainList.map(t=>{
    const zoom = Math.min(200, Math.max(100, Number(t.image_zoom) || 100));
    const pos = esc(t.image_position || 'center');
    const art = t.imageUrl
      ? imgTag(t.imageUrl, t.title, 'card-photo', `style="object-fit:cover;object-position:${pos};transform:scale(${zoom/100});transform-origin:${pos};width:100%;height:100%;"`)
      : `<svg class="card-art-placeholder" width="70" height="46" viewBox="0 0 70 46" fill="none"><path d="M0 40 L18 12 L28 26 L40 4 L58 34 L70 22 L70 40 Z" fill="#22d3ee"/></svg>`;
    return `
      <article class="card">
        <div class="card-art" data-img-holder style="overflow:hidden;">${art}<span class="card-art-fallback">Photo coming soon</span></div>
        <div class="card-body">
          <div class="card-region">${esc(t.region)}</div>
          <h3 class="card-title">${esc(t.title)}</h3>
          ${ratingBadge(t.id)}
          <div class="card-meta"><span>${esc(t.duration)}</span><span>Guide: ${esc(t.guide)}</span></div>
          <div class="card-price">${fmtNPR(t.price)} <small>/ person</small></div>
          <button class="btn btn-primary" onclick="openTour('${esc(t.id)}')">View &amp; book</button>
        </div>
      </article>
    `;
  }).join('');
  renderHiddenGems();
}

function renderHiddenGems(){
  const el = document.getElementById('hiddenGemsGrid');
  if(!el) return;
  const gems = tours.filter(t => t.hidden_gem);
  if(!gems.length){
    el.innerHTML = '<div class="empty-state">Short local rides will show up here soon.</div>';
    return;
  }
  el.innerHTML = gems.map(t=>{
    const zoom = Math.min(200, Math.max(100, Number(t.image_zoom) || 100));
    const pos = esc(t.image_position || 'center');
    const art = t.imageUrl
      ? imgTag(t.imageUrl, t.title, 'card-photo', `style="object-fit:cover;object-position:${pos};transform:scale(${zoom/100});transform-origin:${pos};width:100%;height:100%;"`)
      : `<svg class="card-art-placeholder" width="70" height="46" viewBox="0 0 70 46" fill="none"><path d="M0 40 L18 12 L28 26 L40 4 L58 34 L70 22 L70 40 Z" fill="#fbbf24"/></svg>`;
    return `
      <article class="card">
        <div class="card-art" data-img-holder style="overflow:hidden;">
          <span class="gem-badge">Hidden Gem</span>
          ${art}<span class="card-art-fallback">Photo coming soon</span>
        </div>
        <div class="card-body">
          <div class="card-region">${esc(t.region)}</div>
          <h3 class="card-title">${esc(t.title)}</h3>
          ${ratingBadge(t.id)}
          <div class="card-meta"><span>${esc(t.duration)}</span><span>Guide: ${esc(t.guide)}</span></div>
          <div class="card-price">${fmtNPR(t.price)} <small>/ person</small></div>
          <button class="btn btn-primary" onclick="openTour('${esc(t.id)}')">View &amp; book</button>
        </div>
      </article>
    `;
  }).join('');
}

/* =========================================================================
   CUSTOM ROUTE BUILDER
   A separate, independent Leaflet map from #tourMap above — visitors drop
   their own stops and get a live distance + price estimate. Nothing here
   touches the preset-tours map or its data.
   ========================================================================= */
const ROUTE_START = { name: 'Basundhara, Kathmandu', lat: 27.7410, lng: 85.3360 };

// PLACEHOLDER PRICING — these numbers are not researched real-world rates,
// just a clearly-structured starting formula so the widget works out of
// the box. Edit them to match actual costs; nothing else needs to change.
//   perKm            → NPR charged per road-km, per passenger
//   perDayPerPerson  → NPR charged per day, per passenger (covers rider +
//                      food + accommodation + margin, bundled)
//   roadFactor       → used ONLY when the live routing service can't
//                      return a real road distance (see getRoadDistanceKm)
const ROUTE_PRICING = {
  // Tuned down — guide/rider always included; hotel & food are optional add-ons
  highway: { perKm: 25, perDayPerPerson: 2800, roadFactor: 1.3, hotelPerDay: 1200, foodPerDay: 800 },
  offroad: { perKm: 40, perDayPerPerson: 3800, roadFactor: 1.55, hotelPerDay: 1500, foodPerDay: 1000 }
};

let routeMap = null;
let routeStops = [];        // [{ name, lat, lng, marker }]
let routeLine = null;
let routeGeocodeTimer = null;
let routeCalcToken = 0;     // discards a slow, now-stale calculation if a newer one has started

function initRouteBuilder(){
  const mapEl = document.getElementById('routeBuilderMap');
  if(!mapEl || typeof L === 'undefined') return; // section not on this page (e.g. gallery.html), or Leaflet failed to load

  routeMap = L.map('routeBuilderMap').setView([ROUTE_START.lat, ROUTE_START.lng], 8);
  addMapLayerToggle(routeMap);

  L.marker([ROUTE_START.lat, ROUTE_START.lng])
    .addTo(routeMap)
    .bindPopup(`<strong>${esc(ROUTE_START.name)}</strong><br>Every custom trip starts here.`);

  routeMap.on('click', e => addRouteStopFromLatLng(e.latlng.lat, e.latlng.lng));

  const searchInput = document.getElementById('routeSearchInput');
  if(searchInput){
    searchInput.addEventListener('input', () => {
      clearTimeout(routeGeocodeTimer);
      const q = searchInput.value.trim();
      if(q.length < 3){ renderRouteSearchResults([]); return; }
      // Debounced — Nominatim's shared public endpoint asks for roughly
      // 1 request/second max. Fine at this site's traffic; if this widget
      // ever gets heavy use, switch to a paid geocoder (Mapbox, LocationIQ)
      // or a self-hosted Nominatim instance instead.
      routeGeocodeTimer = setTimeout(() => searchNepalPlaces(q), 450);
    });
    document.addEventListener('click', e => {
      if(!e.target.closest('.route-search-wrap')) renderRouteSearchResults([]);
    });
  }

  renderRouteItinerary();
  recalcRouteEstimate();
}

async function searchNepalPlaces(query){
  const box = document.getElementById('routeSearchResults');
  if(box){ box.classList.add('open'); box.innerHTML = `<div class="route-search-status">${inlineLoader('Searching')}</div>`; }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=np&limit=6&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    renderRouteSearchResults(data || []);
  } catch(e){
    if(box) box.innerHTML = `<div class="route-search-status">Search is unavailable right now — try clicking directly on the map instead.</div>`;
  }
}

function renderRouteSearchResults(results){
  const box = document.getElementById('routeSearchResults');
  if(!box) return;
  window._routeSearchCache = results;
  if(!results.length){ box.innerHTML = ''; box.classList.remove('open'); return; }
  box.classList.add('open');
  box.innerHTML = results.map((r, i) =>
    `<button type="button" class="route-search-item" onclick="pickRouteSearchResult(${i})">${esc(r.display_name)}</button>`
  ).join('');
}

function pickRouteSearchResult(i){
  const r = (window._routeSearchCache || [])[i];
  if(!r) return;
  addRouteStop(r.display_name.split(',')[0].trim(), parseFloat(r.lat), parseFloat(r.lon));
  const input = document.getElementById('routeSearchInput');
  if(input) input.value = '';
  renderRouteSearchResults([]);
}

async function addRouteStopFromLatLng(lat, lng){
  // Reverse-geocode so the itinerary shows a real place name instead of
  // raw coordinates. Falls back to the coordinates themselves if the
  // lookup fails — the stop still gets added either way.
  let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    if(data && data.display_name) name = data.display_name.split(',').slice(0, 2).join(',').trim();
  } catch(e){ /* keep the coordinate fallback */ }
  addRouteStop(name, lat, lng);
}

function addRouteStop(name, lat, lng){
  if(routeStops.length >= 8){ showToast("That's a lot of stops already — 8 is the practical limit for one route.", 'error'); return; }

  const marker = L.marker([lat, lng], { draggable: true }).addTo(routeMap);
  const stop = { name, lat, lng, marker };
  marker.bindPopup(esc(name));

  marker.on('dragend', async () => {
    const pos = marker.getLatLng();
    stop.lat = pos.lat; stop.lng = pos.lng;
    stop.name = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}`);
      const data = await res.json();
      if(data && data.display_name) stop.name = data.display_name.split(',').slice(0, 2).join(',').trim();
    } catch(e){}
    redrawRouteLine();
    renderRouteItinerary();
    recalcRouteEstimate();
  });

  routeStops.push(stop);
  redrawRouteLine();
  renderRouteItinerary();
  recalcRouteEstimate();
}

function removeRouteStop(index){
  const stop = routeStops[index];
  if(!stop) return;
  routeMap.removeLayer(stop.marker);
  routeStops.splice(index, 1);
  redrawRouteLine();
  renderRouteItinerary();
  recalcRouteEstimate();
}

function resetRouteBuilder(){
  routeStops.forEach(s => routeMap.removeLayer(s.marker));
  routeStops = [];
  redrawRouteLine();
  renderRouteItinerary();
  recalcRouteEstimate();
  routeMap.setView([ROUTE_START.lat, ROUTE_START.lng], 8);
}

function redrawRouteLine(){
  if(routeLine){ routeMap.removeLayer(routeLine); routeLine = null; }
  const points = [[ROUTE_START.lat, ROUTE_START.lng], ...routeStops.map(s => [s.lat, s.lng])];
  if(points.length > 1){
    routeLine = L.polyline(points, { color: '#22d3ee', weight: 4, opacity: 0.85 }).addTo(routeMap);
    routeMap.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
  }
}

function renderRouteItinerary(){
  const list = document.getElementById('routeItineraryList');
  if(!list) return;
  list.innerHTML = `
    <li class="route-stop route-stop-fixed"><span>📍 ${esc(ROUTE_START.name)}</span><small>Start</small></li>
    ${routeStops.map((s, i) => `
      <li class="route-stop">
        <span>${i + 1}. ${esc(s.name)}</span>
        <button type="button" class="route-stop-remove" onclick="removeRouteStop(${i})" aria-label="Remove stop">&times;</button>
      </li>
    `).join('')}
  `;
}

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getRoadDistanceKm(points, terrain){
  // Tries a real road distance first, via OSRM's public demo routing
  // server (built on OpenStreetMap's road network — decent coverage of
  // Nepal's numbered highways). Falls back to straight-line distance × a
  // winding-road multiplier if OSRM can't route it, which happens on very
  // remote tracks with no mapped road. The fallback is a rough ESTIMATE,
  // not a survey, and can be off by a fair margin on technical mountain
  // terrain — it's flagged as such in the UI whenever it's used.
  // Also asks OSRM for the actual road geometry (not just the distance)
  // so the map can draw the real route along the roads instead of a
  // straight line between stops.
  try {
    const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    const data = await res.json();
    if(data && data.code === 'Ok' && data.routes && data.routes[0]){
      const route = data.routes[0];
      const geometry = (route.geometry?.coordinates || []).map(c => [c[1], c[0]]); // GeoJSON is [lng,lat] — Leaflet wants [lat,lng]
      return { km: route.distance / 1000, durationMin: route.duration / 60, source: 'road', geometry };
    }
  } catch(e){ /* fall through to the estimate below */ }

  let straight = 0;
  for(let i = 0; i < points.length - 1; i++){
    straight += haversineKm(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
  }
  const factor = ROUTE_PRICING[terrain]?.roadFactor || 1.35;
  const km = straight * factor;
  // Rough time estimate when we have no real routing: ~35km/h on Nepal's
  // mountain roads, slower again on off-road terrain.
  const avgSpeed = terrain === 'offroad' ? 22 : 35;
  return { km, durationMin: (km / avgSpeed) * 60, source: 'estimate', geometry: null };
}

async function recalcRouteEstimate(){
  const summaryEl = document.getElementById('routeSummaryBody');
  if(!summaryEl) return;

  if(routeStops.length === 0){
    summaryEl.innerHTML = `<p class="route-summary-empty">Search a destination or click the map to start building a route.</p>`;
    return;
  }

  const myToken = ++routeCalcToken;
  summaryEl.innerHTML = inlineLoader('Calculating distance');

  const terrain = document.getElementById('routeTerrain')?.value || 'highway';
  const days = Math.max(1, parseInt(document.getElementById('routeDays')?.value, 10) || 1);
  const passengers = Math.max(1, parseInt(document.getElementById('routePassengers')?.value, 10) || 1);

  const points = [ROUTE_START, ...routeStops];
  const { km, durationMin, source, geometry } = await getRoadDistanceKm(points, terrain);
  if(myToken !== routeCalcToken) return; // a newer calculation started while this one was in flight — drop it

  // Swap the straight preview line for the real road path, once we have it.
  if(geometry && geometry.length && routeMap){
    if(routeLine) routeMap.removeLayer(routeLine);
    routeLine = L.polyline(geometry, { color: '#22d3ee', weight: 4, opacity: 0.85 }).addTo(routeMap);
    routeMap.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
  }

  const rates = ROUTE_PRICING[terrain];
  const includeHotel = document.getElementById('routeIncludeHotel')?.checked !== false;
  const includeFood = document.getElementById('routeIncludeFood')?.checked !== false;
  const hotelCost = includeHotel ? (rates.hotelPerDay || 0) * days * passengers : 0;
  const foodCost = includeFood ? (rates.foodPerDay || 0) * days * passengers : 0;
  // perDayPerPerson covers guide/rider + margin (always on)
  const base = (rates.perKm * km + rates.perDayPerPerson * days) * passengers;
  const total = Math.round((base + hotelCost + foodCost) / 100) * 100;
  const hours = Math.floor(durationMin / 60), mins = Math.round(durationMin % 60);
  const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const dest = routeStops[routeStops.length - 1];

  summaryEl.innerHTML = `
    <div class="route-summary-grid">
      <div><span>Distance</span><strong>${km.toFixed(0)} km</strong></div>
      <div><span>Est. riding time</span><strong>${timeLabel}</strong></div>
      <div><span>Duration</span><strong>${days} day${days > 1 ? 's' : ''}</strong></div>
      <div><span>Passengers</span><strong>${passengers}</strong></div>
      <div><span>Terrain</span><strong>${terrain === 'highway' ? 'Highway' : 'Extreme Off-Road'}</strong></div>
    </div>
    <div style="margin:10px 0;">
      <span class="weather-chip" data-weather-pending data-weather-lat="${dest.lat}" data-weather-lng="${dest.lng}">Loading weather…</span>
    </div>
    <div class="route-total"><span>Estimated package price</span><strong>${fmtNPR(total)}</strong></div>
    <p class="route-summary-note">Includes guide &amp; rider${includeHotel ? ' · hotel' : ''}${includeFood ? ' · food' : ''}. Guide/rider cannot be removed.</p>
    ${source === 'estimate' ? `<p class="route-summary-note">Road-routing service unavailable for this route — showing a straight-line estimate and rough time instead. Actual distance/time on Nepal's mountain roads may be higher.</p>` : ''}
    <p class="route-summary-note">This is an automatic estimate. We confirm the exact price once our team reviews the route.</p>
    <button type="button" class="btn btn-primary" style="width:100%;margin-top:6px;" onclick="requestRouteQuote(${km.toFixed(0)}, ${days}, ${passengers}, '${terrain}', ${total})">Enquire about this route on WhatsApp</button>
  `;
  hydrateWeatherChips(summaryEl);
}

function requestRouteQuote(km, days, passengers, terrain, total){
  const stopNames = routeStops.map(s => s.name).join(' → ');
  const msg = `Hi Feel It! I built a custom route on your website:\n${ROUTE_START.name} → ${stopNames || '(no stops added)'}\n~${km} km, ${days} day(s), ${passengers} passenger(s), ${terrain === 'highway' ? 'Highway' : 'Extreme Off-Road'} terrain.\nEstimated price: ${fmtNPR(total)}. Can you confirm availability and final pricing?`;
  window.open(`https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

function initMap(){
  const mapContainer = document.getElementById('tourMap');
  if(!mapContainer || typeof L === 'undefined') return;

  if(!leafletMap){
    leafletMap = L.map('tourMap').setView([28.2096, 83.9856], 7);
    addMapLayerToggle(leafletMap);
  }
  renderMapMarkers();
  initTourMapSearch();
}

// Adds a free satellite/street toggle to any Leaflet map — street (OSM) is
// on by default; the button switches to Esri's free World Imagery satellite
// tiles (no API key needed) and back. Used by both the "Where we ride" map
// and the route builder map so a customer can see actual terrain, not just
// a flat street map, before picking a route.
function addMapLayerToggle(map){
  const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© OpenStreetMap'
  }).addTo(map);
  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18, attribution: 'Tiles © Esri'
  });

  const control = L.control({ position: 'topright' });
  const btnId = `mapLayerBtn-${L.stamp(map)}`;
  control.onAdd = function(){
    const div = L.DomUtil.create('div', 'map-layer-toggle');
    div.innerHTML = `<button type="button" class="map-layer-btn" id="${btnId}">🛰️ Satellite</button>`;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  control.addTo(map);

  let showingSatellite = false;
  const btn = document.getElementById(btnId);
  if(btn){
    btn.addEventListener('click', () => {
      showingSatellite = !showingSatellite;
      if(showingSatellite){
        map.removeLayer(streetLayer);
        satelliteLayer.addTo(map);
        btn.textContent = '🗺️ Map';
      } else {
        map.removeLayer(satelliteLayer);
        streetLayer.addTo(map);
        btn.textContent = '🛰️ Satellite';
      }
    });
  }
}

/* ---------------- Search box on the "Where we ride" map ----------------
   Typing a place name geocodes it (same Nominatim endpoint the route
   builder uses) and flies the map there. If a tour marker sits within
   ~15km of the result, its popup opens automatically so the place name
   the visitor typed is what they see. */
let tourMapSearchTimer = null;
let tourMapSearchCache = [];
let tourMapSearchMarker = null;

function initTourMapSearch(){
  const input = document.getElementById('tourMapSearchInput');
  if(!input || input.dataset.bound) return;
  input.dataset.bound = '1';
  input.addEventListener('input', () => {
    clearTimeout(tourMapSearchTimer);
    const q = input.value.trim();
    if(q.length < 3){ renderTourMapSearchResults([]); return; }
    tourMapSearchTimer = setTimeout(() => searchTourMapPlaces(q), 450);
  });
  document.addEventListener('click', e => {
    if(!e.target.closest('#map .route-search-wrap')) renderTourMapSearchResults([]);
  });
}

async function searchTourMapPlaces(query){
  const box = document.getElementById('tourMapSearchResults');
  if(box){ box.classList.add('open'); box.innerHTML = `<div class="route-search-status">${inlineLoader('Searching')}</div>`; }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=np&limit=6&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    tourMapSearchCache = data || [];
    renderTourMapSearchResults(tourMapSearchCache);
  } catch(e){
    if(box) box.innerHTML = `<div class="route-search-status">Search is unavailable right now.</div>`;
  }
}

function renderTourMapSearchResults(results){
  const box = document.getElementById('tourMapSearchResults');
  if(!box) return;
  if(!results.length){ box.innerHTML = ''; box.classList.remove('open'); return; }
  box.classList.add('open');
  box.innerHTML = results.map((r, i) =>
    `<button type="button" class="route-search-item" onclick="pickTourMapSearchResult(${i})">${esc(r.display_name)}</button>`
  ).join('');
}

function pickTourMapSearchResult(i){
  const r = tourMapSearchCache[i];
  if(!r || !leafletMap) return;
  const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
  leafletMap.flyTo([lat, lng], 10);

  if(tourMapSearchMarker){ leafletMap.removeLayer(tourMapSearchMarker); tourMapSearchMarker = null; }

  // If a real tour sits nearby, show that instead of a bare pin.
  const nearby = tours.find(t => t.lat && t.lng && haversineKm(lat, lng, t.lat, t.lng) < 15);
  if(nearby){
    const marker = mapMarkers.find(m => m.getLatLng().lat === nearby.lat && m.getLatLng().lng === nearby.lng);
    if(marker) marker.openPopup();
  } else {
    tourMapSearchMarker = L.marker([lat, lng]).addTo(leafletMap).bindPopup(esc(r.display_name.split(',')[0].trim())).openPopup();
  }

  const input = document.getElementById('tourMapSearchInput');
  if(input) input.value = r.display_name.split(',')[0].trim();
  renderTourMapSearchResults([]);
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
  // A tour saved without a guide name used to crash this line and the modal
  // would simply never open.
  const initials = String(t.guide || '?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const hero = t.imageUrl
    ? `<div class="modal-hero" data-img-holder>${imgTag(t.imageUrl, t.title, '')}</div>`
    : '';
  document.getElementById('modalContent').innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    ${hero}
    <div class="card-region">${esc(t.region)} · ${esc(t.duration)}</div>
    <h2>${esc(t.title)}</h2>
    ${ratingBadge(t.id)}
    ${t.lat && t.lng ? `<div style="margin:6px 0 12px;"><span class="weather-chip" data-weather-pending data-weather-lat="${t.lat}" data-weather-lng="${t.lng}">Loading weather…</span></div>` : ''}
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
      <input type="number" id="tourTravelers" value="1" min="1" max="6" oninput="updateTourBookingPrice('${esc(t.id)}')">
    </div>
    <div class="addon-toggles">
      <label class="addon-toggle">
        <input type="checkbox" id="bookIncludeHotel" checked onchange="updateTourBookingPrice('${esc(t.id)}')">
        <span>Include hotel <small>(comfortable stays · optional)</small></span>
      </label>
      <label class="addon-toggle">
        <input type="checkbox" id="bookIncludeFood" checked onchange="updateTourBookingPrice('${esc(t.id)}')">
        <span>Include food <small>(local meals · optional)</small></span>
      </label>
      <p class="addon-note">Guide &amp; rider are always included and cannot be removed.</p>
    </div>
    <div class="card-price" style="margin-bottom:18px;" id="tourBookingPrice">${fmtNPR(t.price)} <small>/ person base</small></div>
    <button class="btn btn-primary" style="width:100%;" onclick="goToCheckout('${esc(t.id)}')">Continue to payment</button>
    <div id="tourReviews-${esc(t.id)}" class="review-block">${inlineLoader('Loading reviews')}</div>
  `;
  showOverlay();
  renderTourReviews(t.id);
  hydrateWeatherChips(document.getElementById('modalContent'));
}

/* ---------------- Reviews on a tour ---------------- */
async function renderTourReviews(tourId){
  const holder = document.getElementById(`tourReviews-${tourId}`);
  if(!holder) return;

  let list = [];
  let tableMissing = false;
  try {
    const { data, error } = await supabaseClient
      .from('reviews').select('*').eq('tour_id', tourId).order('created_at', { ascending: false });
    if(error) tableMissing = true;
    list = data || [];
  } catch(e){ tableMissing = true; }

  if(tableMissing){ holder.innerHTML = ''; return; } // reviews not set up — show nothing rather than an error

  const sessionUser = await checkActiveAuthUser();
  const alreadyReviewed = sessionUser && list.some(r => r.email === sessionUser.email);

  const listHtml = list.length
    ? list.map(r => `
        <div class="review-item">
          <div class="review-head">
            <strong>${esc(r.name || 'Traveler')}</strong>
            ${starsHtml(r.rating)}
          </div>
          <p>${esc(r.body || '')}</p>
        </div>
      `).join('')
    : '<p class="review-empty">No reviews on this route yet. Ride it and tell us how it went.</p>';

  let formHtml = '';
  if(!sessionUser){
    formHtml = `<button class="btn btn-outline review-cta" onclick="openAuthModal()">Log in to leave a review</button>`;
  } else if(alreadyReviewed){
    formHtml = `<p class="review-empty">You've already reviewed this route — thank you.</p>`;
  } else {
    formHtml = `
      <div class="review-form">
        <label for="reviewRating-${esc(tourId)}">Your rating</label>
        <div class="star-picker" id="starPicker-${esc(tourId)}">
          ${[1,2,3,4,5].map(i => `<button type="button" class="star-pick" data-value="${i}" onclick="pickStar('${esc(tourId)}',${i})" aria-label="${i} star${i>1?'s':''}">★</button>`).join('')}
        </div>
        <input type="hidden" id="reviewRating-${esc(tourId)}" value="5">
        <textarea id="reviewBody-${esc(tourId)}" rows="3" placeholder="How was the road, the bike, the rider?"></textarea>
        <button class="btn btn-primary" id="reviewBtn-${esc(tourId)}" onclick="submitReview('${esc(tourId)}')">Post review</button>
      </div>
    `;
  }

  holder.innerHTML = `
    <h3 class="review-heading">Reviews</h3>
    <div class="review-list">${listHtml}</div>
    ${formHtml}
  `;
  if(sessionUser && !alreadyReviewed) pickStar(tourId, 5);
}

function pickStar(tourId, value){
  const input = document.getElementById(`reviewRating-${tourId}`);
  if(input) input.value = value;
  document.querySelectorAll(`#starPicker-${CSS.escape(tourId)} .star-pick`).forEach(btn => {
    btn.classList.toggle('star-on', Number(btn.dataset.value) <= value);
  });
}

async function submitReview(tourId){
  const sessionUser = await checkActiveAuthUser();
  if(!sessionUser){ showToast('Please log in first.', 'error'); return; }

  const rating = Number(document.getElementById(`reviewRating-${tourId}`)?.value || 5);
  const body = (document.getElementById(`reviewBody-${tourId}`)?.value || '').trim();
  if(!body){ showToast('Write a few words about the ride.', 'error'); return; }

  const restoreBtn = setBusy(document.getElementById(`reviewBtn-${tourId}`), 'Posting…');
  const ok = await sbWrite(
    supabaseClient.from('reviews').insert([{
      tour_id: tourId, email: sessionUser.email,
      name: sessionUser.name || sessionUser.email.split('@')[0],
      rating, body
    }]),
    'Could not post your review — check that your Supabase RLS policy allows INSERT on reviews'
  );
  restoreBtn();
  if(!ok) return;

  showToast('Review posted. Thank you!', 'success');
  await loadReviewStats();
  renderTours();
  renderTourReviews(tourId);
}

// Days estimated from duration string ("3 days", "Half day", "Full day")
function estimateTourDays(duration){
  const d = String(duration || '').toLowerCase();
  if(d.includes('half') || d.includes('hour')) return 1;
  const m = d.match(/(\d+)/);
  if(m) return Math.max(1, parseInt(m[1], 10));
  return 1;
}

function calcTourAddons(t, travelers){
  const days = estimateTourDays(t.duration);
  const terrain = (String(t.region || '').toLowerCase().includes('mustang') || String(t.duration||'').toLowerCase().includes('off')) ? 'offroad' : 'highway';
  const rates = ROUTE_PRICING[terrain] || ROUTE_PRICING.highway;
  const includeHotel = document.getElementById('bookIncludeHotel')?.checked === true;
  const includeFood = document.getElementById('bookIncludeFood')?.checked === true;
  const hotel = includeHotel ? (rates.hotelPerDay || 0) * days * travelers : 0;
  const food = includeFood ? (rates.foodPerDay || 0) * days * travelers : 0;
  const base = (Number(t.price) || 0) * travelers;
  return {
    days, includeHotel, includeFood,
    hotel, food,
    base,
    total: Math.round((base + hotel + food) / 100) * 100
  };
}

function updateTourBookingPrice(id){
  const t = tours.find(x => x.id === id);
  if(!t) return;
  const travelers = Math.max(1, parseInt(document.getElementById('tourTravelers')?.value || '1', 10));
  const c = calcTourAddons(t, travelers);
  const el = document.getElementById('tourBookingPrice');
  if(!el) return;
  const bits = [];
  if(c.includeHotel) bits.push('hotel');
  if(c.includeFood) bits.push('food');
  el.innerHTML = `${fmtNPR(c.total)} <small>total · ${travelers} traveler(s)${bits.length ? ' · ' + bits.join(' + ') : ' · guide only'}</small>`;
}

async function goToCheckout(id){
  const t = tours.find(x=>x.id===id);
  if(!t) return;
  const date = document.getElementById('tourDate').value;
  const travelers = parseInt(document.getElementById('tourTravelers').value || '1',10);

  if(!date){ showToast('Please select a tour date.', 'error'); return; }
  if(!travelers || travelers < 1 || travelers > 6){ showToast('Travelers must be between 1 and 6.', 'error'); return; }

  const sessionUser = await checkActiveAuthUser();
  const c = calcTourAddons(t, travelers);

  pendingBooking = {
    tourId: t.id,
    title: t.title,
    date,
    travelers,
    total: c.total,
    includeHotel: c.includeHotel,
    includeFood: c.includeFood,
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
      btn.innerHTML = '<span class="auth-label-full">My Account</span><span class="auth-label-short">Account</span>';
    } else {
      btn.innerHTML = '<span class="auth-label-full">Login / Account</span><span class="auth-label-short">Login</span>';
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
      <div style="text-align:center;margin:16px 0;color:var(--ink-soft);font-size:13px;">— OR EMAIL LOGIN —</div>

      <div class="field"><label>Email Address</label><input id="authEmail" type="email" placeholder="you@example.com" onkeydown="if(event.key==='Enter'){event.preventDefault();handleStandardLogin();}"></div>
      <div class="field"><label>Password</label><input id="authPass" type="password" placeholder="••••••••" onkeydown="if(event.key==='Enter'){event.preventDefault();handleStandardLogin();}"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="loginBtn" onclick="handleStandardLogin()">Login</button>
    </div>
  `;
  showOverlay();
  document.getElementById('authEmail')?.focus();
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
    // Session flag: timestamp + random token. admin.html checks age (< 4h).
    // This is still client-side only — see SECURITY note. Real protection needs
    // Supabase Auth + RLS that denies anon writes.
    const token = crypto.getRandomValues(new Uint8Array(16));
    const tokenHex = Array.from(token).map(b => b.toString(16).padStart(2,'0')).join('');
    sessionStorage.setItem('feelit_admin_session', JSON.stringify({ t: Date.now(), k: tokenHex }));
    window.location.href = 'index.html?admin=1';
    return;
  }

  // Supabase standard user sign in
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  restoreBtn();
  if(error){
    showToast('Invalid email or password.', 'error');
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
  hydrateWeatherChips(document.getElementById('modalContent'));
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

  const tourRef = tours.find(t => t.id === b.tour_id);
  const weatherBlock = tourRef?.lat && tourRef?.lng
    ? `<div style="margin-top:6px;"><span class="weather-chip" data-weather-pending data-weather-lat="${tourRef.lat}" data-weather-lng="${tourRef.lng}" data-weather-date="${esc(b.date || '')}">Loading weather…</span></div>`
    : '';

  return `
    <div class="booking-row" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;">
        <strong>${esc(b.tour_title)}</strong>
        <span class="status ${statusClass}">${esc(b.status || 'Pending')}</span>
      </div>
      <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">Date: ${esc(b.date)} · Ref: ${esc(b.ref)} · Paid via ${esc(PAYMENT_METHODS[b.payment_method]?.label || b.payment_method || '—')}</div>
      ${weatherBlock}
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

  holder.innerHTML = inlineLoader('Loading messages');
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
  // Prefer the explicit float-socials (WA + IG) in the HTML — avoid a second WA that covers IG on mobile
  if(document.querySelector('.float-socials') || document.getElementById('waFloatBtn')) return;
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
  const tabs = ['bookings', 'tours', 'addTour', 'featured', 'costs', 'weather', 'settings', 'users', 'messages', 'reviews', 'photos', 'ad'];
  const labels = {
    bookings:'📋 Bookings', tours:'🏍️ Tours', addTour:'➕ Add Tour', featured:'⭐ Featured',
    costs:'⛽ Costs', weather:'🌦️ Weather FX', settings:'⚙️ Site',
    users:'👥 Customers', messages:'💬 Messages', reviews:'⭐ Reviews',
    photos:'🖼️ Gallery', ad:'📢 Popup Ad'
  };
  let body = inlineLoader('Loading data');

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
    body = `<div class="admin-section-intro">Edit any route below — including its photo. Changes go live the moment you save.</div>
    <div style="display:flex;flex-direction:column;gap:16px;">
      ${tours.map(t => `
        <div class="admin-tour-card">
          <div class="admin-tour-head">
            <div class="admin-tour-thumb" data-img-holder>
              ${t.imageUrl ? imgTag(t.imageUrl, t.title, '') : '<span class="admin-tour-thumb-empty">No photo</span>'}
            </div>
            <h4>${esc(t.title)}<span>${esc(t.region)} · ${esc(t.duration || '')}</span></h4>
          </div>
          <div class="row-2">
            <div class="field"><label for="adm-title-${esc(t.id)}">Tour title</label><input id="adm-title-${esc(t.id)}" value="${esc(t.title)}"></div>
            <div class="field"><label for="adm-region-${esc(t.id)}">Region</label><input id="adm-region-${esc(t.id)}" value="${esc(t.region)}"></div>
          </div>
          <div class="row-2">
            <div class="field"><label for="adm-duration-${esc(t.id)}">Duration</label><input id="adm-duration-${esc(t.id)}" value="${esc(t.duration || '')}"></div>
            <div class="field"><label for="adm-price-${esc(t.id)}">Price (NPR)</label><input type="number" id="adm-price-${esc(t.id)}" value="${esc(t.price)}"></div>
          </div>
          <div class="row-2">
            <div class="field"><label for="adm-guide-${esc(t.id)}">Default rider name</label><input id="adm-guide-${esc(t.id)}" value="${esc(t.guide || '')}"></div>
            <div class="field"><label for="adm-guidephone-${esc(t.id)}">Rider phone</label><input id="adm-guidephone-${esc(t.id)}" value="${esc(t.guide_phone || '')}"></div>
          </div>
          <div class="field"><label for="adm-desc-${esc(t.id)}">Description</label><textarea id="adm-desc-${esc(t.id)}" rows="2">${esc(t.desc || '')}</textarea></div>
          <div class="field">
            <label for="adm-image-${esc(t.id)}">Tour photo — Google Drive share link or any image URL</label>
            <div class="link-with-preview">
              <input id="adm-image-${esc(t.id)}" value="${esc(t.imageUrl || '')}" placeholder="https://drive.google.com/file/d/…/view">
              <button class="btn btn-outline" type="button" onclick="previewImageLink('adm-image-${esc(t.id)}','adm-preview-${esc(t.id)}')">Preview</button>
            </div>
            <div class="img-preview" id="adm-preview-${esc(t.id)}"></div>
            <div class="row-2" style="margin-top:8px;">
              <div class="field"><label for="adm-imgpos-${esc(t.id)}">Photo crop position</label>
                <select id="adm-imgpos-${esc(t.id)}">
                  <option value="center" ${(t.image_position||'center')==='center'?'selected':''}>Center</option>
                  <option value="top" ${t.image_position==='top'?'selected':''}>Top</option>
                  <option value="bottom" ${t.image_position==='bottom'?'selected':''}>Bottom</option>
                  <option value="left" ${t.image_position==='left'?'selected':''}>Left</option>
                  <option value="right" ${t.image_position==='right'?'selected':''}>Right</option>
                </select>
              </div>
              <div class="field"><label for="adm-imgzoom-${esc(t.id)}">Photo zoom %</label>
                <input type="number" id="adm-imgzoom-${esc(t.id)}" min="100" max="200" value="${esc(t.image_zoom || 100)}" placeholder="100">
              </div>
            </div>
          </div>
          <div class="row-2">
            <div class="field"><label for="adm-lat-${esc(t.id)}">Map latitude</label><input id="adm-lat-${esc(t.id)}" value="${esc(t.lat ?? '')}" placeholder="28.2096"></div>
            <div class="field"><label for="adm-lng-${esc(t.id)}">Map longitude</label><input id="adm-lng-${esc(t.id)}" value="${esc(t.lng ?? '')}" placeholder="83.9856"></div>
          </div>
          <label class="addon-toggle" style="margin-bottom:12px;">
            <input type="checkbox" id="adm-gem-${esc(t.id)}" ${t.hidden_gem ? 'checked' : ''}>
            <span>Hidden Gem <small>(short ride — shows in Hidden Gems section)</small></span>
          </label>
          <div class="admin-actions">
            <button class="btn btn-primary" id="adm-save-${esc(t.id)}" onclick="saveTourEdits('${esc(t.id)}')">Save changes</button>
            <button class="btn btn-danger" onclick="deleteTour('${esc(t.id)}')">Delete route</button>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  if(tab === 'addTour'){
    body = `
      <div class="form-card" style="max-width:100%;">
        <h3>Add a new route</h3>
        <p class="form-note" style="margin-top:-4px;">Type the region below and the map coordinates and a suggested price fill in on their own — both stay editable if you want to override them.</p>
        <div class="row-2">
          <div class="field"><label for="newTitle">Tour title</label><input id="newTitle" placeholder="Mustang Desert Loop" oninput="scheduleNewTourAutofill()"></div>
          <div class="field"><label for="newRegion">Region / destination</label><input id="newRegion" placeholder="Mustang" oninput="scheduleNewTourAutofill()"></div>
        </div>
        <div class="row-2">
          <div class="field"><label for="newDuration">Duration</label><input id="newDuration" placeholder="3 days" oninput="scheduleNewTourPriceCalc()"></div>
          <div class="field"><label for="newTerrain">Road terrain</label>
            <select id="newTerrain" onchange="scheduleNewTourPriceCalc()">
              <option value="highway">Highway</option>
              <option value="offroad">Extreme Off-Road</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="newPrice">Price (NPR, per person)</label>
          <input id="newPrice" type="number" placeholder="25000">
          <div id="newTourPriceHint" class="form-note" style="margin-top:4px;">Add a region and duration above for a suggested price.</div>
        </div>
        <div class="row-2">
          <div class="field"><label for="newGuide">Default rider name</label><input id="newGuide" placeholder="Tenzin Lama"></div>
          <div class="field"><label for="newGuidePhone">Rider phone</label><input id="newGuidePhone" placeholder="+977-9800000000"></div>
        </div>
        <div class="field"><label for="newDesc">Description</label><textarea id="newDesc" placeholder="What the road is like, what you'll see, where you stop."></textarea></div>
        <div class="field">
          <label for="newImage">Tour photo</label>
          <div class="admin-photo-upload-row">
            <input type="file" id="newImageFile" accept="image/*" onchange="handleAdminPhotoFile(this,'newImage','newImagePreview','tours','newImageUploadStatus')">
            <span class="form-note">or paste a link —</span>
            <input id="newImage" placeholder="https://…/photo.jpg" oninput="previewImageLink('newImage','newImagePreview')" style="flex:1;">
          </div>
          <div class="img-preview" id="newImagePreview"></div>
          <div id="newImageUploadStatus" class="form-note"></div>
        </div>
        <div class="field"><label for="newIncludes">What's included (comma separated)</label><input id="newIncludes" placeholder="Bike, Helmet, Fuel, Guide"></div>
        <div class="row-2">
          <div class="field"><label for="newLat">Map latitude</label><input id="newLat" placeholder="28.7819"></div>
          <div class="field"><label for="newLng">Map longitude</label><input id="newLng" placeholder="83.7380"></div>
        </div>
        <div id="newTourLocateStatus" class="form-note"></div>
        <label class="addon-toggle" style="margin:12px 0;">
          <input type="checkbox" id="newHiddenGem">
          <span>Hidden Gem <small>(short ride — appears under Hidden Gems)</small></span>
        </label>
        <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="publishTourBtn" onclick="saveNewTour()">Publish route</button>
      </div>
    `;
  }

  if(tab === 'reviews'){
    body = await buildAdminReviewsBody();
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

  if(tab === 'costs'){
    body = buildAdminCostsBody();
  }

  if(tab === 'weather'){
    body = buildAdminWeatherBody();
  }

  if(tab === 'featured'){
    body = buildAdminFeaturedBody();
  }

  if(tab === 'settings'){
    body = buildAdminSettingsBody();
  }

  const modalEl = document.getElementById('modalContent');
  modalEl.classList.add('modal-admin');
  modalEl.innerHTML = `
    <button class="modal-close" onclick="closeOverlay()">&times;</button>
    <div class="admin-header">
      <div class="admin-header-top">
        <h2>Operations Panel</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a class="btn btn-outline btn-sm" href="admin.html">💰 Financial Control</a>
          <button class="btn btn-danger btn-sm" type="button" onclick="adminLogout()">Logout</button>
        </div>
      </div>
      <p class="sub" style="margin:0;">Verify payments, assign riders, set costs, and manage routes — nothing reaches a customer until you confirm it here.</p>
    </div>
    ${statsBar}
    <div class="filters admin-tabs">
      ${tabs.map(tKey=>`<button class="chip ${tKey===tab?'active':''}" onclick="renderAdminPanel('${tKey}')">${labels[tKey]}</button>`).join('')}
    </div>
    <div>${body}</div>
  `;
  showOverlay();
  hydrateWeatherChips(modalEl);
}

// One booking row in the admin panel. Pending bookings get an inline
// "assign rider & confirm" form; this is the ONLY place a rider gets
// attached to a booking, and the customer only sees it after this runs.
function renderBookingRowForAdmin(b){
  const statusClass = b.status === 'Confirmed' ? 'status-confirmed' : (b.status === 'Cancelled' ? 'status-cancelled' : 'status-pending');
  const methodLabel = PAYMENT_METHODS[b.payment_method]?.label || b.payment_method || '—';
  const tourRef = tours.find(t => t.id === b.tour_id);
  const weatherBlock = tourRef?.lat && tourRef?.lng
    ? `<div style="margin-top:6px;"><span class="weather-chip" data-weather-pending data-weather-lat="${tourRef.lat}" data-weather-lng="${tourRef.lng}" data-weather-date="${esc(b.date || '')}">Loading weather…</span></div>`
    : '';

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
        <button class="btn btn-primary" id="confirm-btn-${b.id}" onclick="assignRiderToBooking('${esc(b.id)}', '${esc(b.phone||'')}', '${esc(b.name||'')}', '${esc(b.tour_title||'')}', '${esc(b.date||'')}')">Verify payment &amp; confirm rider</button>
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
      ${weatherBlock}
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
            <div class="admin-photo-card" data-img-holder>
              ${imgTag(p.image_url, p.caption || 'Gallery photo', '')}
              <span class="admin-photo-fail">Didn't load — check Drive sharing</span>
              <div class="admin-photo-caption">${esc(p.caption || '(no caption)')}</div>
              <button class="btn btn-danger btn-sm" style="width:100%;" onclick="deletePhotoAdmin('${esc(p.id)}')">Delete</button>
            </div>
          `).join('')}</div>`
        : '<div class="empty-state">No photos yet. Add your first one below and it appears on the Gallery page straight away.</div>');

  return `
    ${listHtml}
    <div class="form-card" style="max-width:100%;margin-top:20px;">
      <h3>Add a photo</h3>
      <p class="form-note" style="margin-top:-4px;">Upload a photo straight from your phone or computer, or paste any image link (Google Drive included).</p>
      <div class="field">
        <label for="newPhotoUrl">Photo</label>
        <div class="admin-photo-upload-row">
          <input type="file" id="newPhotoFile" accept="image/*" onchange="handleAdminPhotoFile(this,'newPhotoUrl','newPhotoPreview','gallery','newPhotoUploadStatus')">
          <span class="form-note">or paste a link —</span>
          <input id="newPhotoUrl" placeholder="https://…/photo.jpg" oninput="previewImageLink('newPhotoUrl','newPhotoPreview')" style="flex:1;">
        </div>
        <div class="img-preview" id="newPhotoPreview"></div>
        <div id="newPhotoUploadStatus" class="form-note"></div>
      </div>
      <div class="row-2">
        <div class="field"><label for="newPhotoCaption">Caption</label><input id="newPhotoCaption" placeholder="Sunrise over Sarangkot"></div>
        <div class="field"><label for="newPhotoRegion">Region (optional)</label><input id="newPhotoRegion" placeholder="Pokhara"></div>
      </div>
      <button class="btn btn-primary" style="width:100%;" id="addPhotoBtn" onclick="addPhotoAdmin()">Add to gallery</button>
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

async function assignRiderToBooking(bookingId, customerPhone, customerName, tourTitle, date){
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
  notifyCustomerWhatsApp(customerPhone, customerName, tourTitle, date, guide, guidePhone);
}

// WhatsApp has no free way to send a message with zero human interaction —
// that needs a paid Meta Business API number. What THIS can do for free:
// pre-fill the message and open WhatsApp with it ready to go, so
// confirming a booking is followed by one tap (Send) instead of writing
// the message yourself. That's what this does.
function notifyCustomerWhatsApp(customerPhone, customerName, tourTitle, date, guide, guidePhone){
  if(!customerPhone) return;
  const digits = customerPhone.replace(/[^0-9]/g, '');
  const withCountry = digits.startsWith('977') ? digits : `977${digits.replace(/^0+/, '')}`;
  const msg = `Hi ${customerName || 'there'}! Your Feel It booking for "${tourTitle}" on ${date} is confirmed. Your rider is ${guide} (${guidePhone}) — they'll be in touch before your ride. See you on the road!`;
  window.open(`https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`, '_blank');
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

// Reads whatever an admin typed into a link box and shows the actual image
// right there, so a bad Drive permission gets caught BEFORE it's published.
function previewImageLink(inputId, previewId){
  const raw = (document.getElementById(inputId)?.value || '').trim();
  const box = document.getElementById(previewId);
  if(!box) return;
  if(!raw){ box.innerHTML = '<span class="img-preview-note">Paste a link first.</span>'; return; }
  box.innerHTML = `<div class="img-preview-frame" data-img-holder>${imgTag(raw, 'Preview', '')}
    <span class="img-preview-fail">This link didn't load. On Google Drive, open the file → Share → change "Restricted" to "Anyone with the link".</span></div>`;
}

/* =========================================================================
   REAL FILE UPLOAD (Supabase Storage)
   Requires a public bucket called "site-images" in your Supabase project —
   Storage → New bucket → name it exactly "site-images" → toggle Public on.
   That's a one-time, ~20-second setup; nothing else needs to change once
   it exists. Until then this fails with a clear error and the URL-paste
   field next to it keeps working as a fallback.
   ========================================================================= */
async function handleAdminPhotoFile(inputEl, targetFieldId, previewId, folder = 'tours', statusId = ''){
  const file = inputEl.files[0];
  if(!file) return;
  const statusEl = statusId ? document.getElementById(statusId) : null;
  if(statusEl){ statusEl.textContent = 'Uploading…'; statusEl.className = 'form-note'; }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${folder}/${Date.now()}_${safeName}`;

  try {
    const { error: upErr } = await supabaseClient.storage.from('site-images').upload(path, file, { upsert: true });
    if(upErr) throw upErr;
    const { data } = supabaseClient.storage.from('site-images').getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if(!publicUrl) throw new Error('Upload succeeded but no public URL was returned.');

    const targetField = document.getElementById(targetFieldId);
    if(targetField) targetField.value = publicUrl;
    previewImageLink(targetFieldId, previewId);
    if(statusEl){ statusEl.textContent = 'Uploaded ✓'; statusEl.className = 'form-note'; }
  } catch(e){
    console.error('Photo upload failed', e);
    if(statusEl){
      statusEl.textContent = `Upload failed (${e.message || 'unknown error'}) — check that a public "site-images" bucket exists in Supabase Storage, or just paste a link instead.`;
      statusEl.className = 'form-note admin-load-error';
    }
  }
  inputEl.value = '';
}

/* =========================================================================
   ADD-TOUR AUTO LOCATE + AUTO PRICE
   Typing a region/title geocodes it (same Nominatim lookup the route
   builder uses) to fill Map latitude/longitude, then the price suggestion
   reuses the exact same distance + ROUTE_PRICING formula as the "Build
   your own route" estimator and the financial calculator, so all three
   numbers agree.
   ========================================================================= */
let newTourAutofillTimer = null;
let newTourPriceToken = 0;

function scheduleNewTourAutofill(){
  clearTimeout(newTourAutofillTimer);
  newTourAutofillTimer = setTimeout(autofillNewTourLocation, 600);
}

async function autofillNewTourLocation(){
  const query = (val('newRegion') || val('newTitle')).trim();
  const statusEl = document.getElementById('newTourLocateStatus');
  if(query.length < 3){ if(statusEl) statusEl.textContent = ''; return; }
  if(statusEl) statusEl.textContent = `Locating "${query}"…`;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=np&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    if(data && data[0]){
      document.getElementById('newLat').value = parseFloat(data[0].lat).toFixed(5);
      document.getElementById('newLng').value = parseFloat(data[0].lon).toFixed(5);
      if(statusEl) statusEl.textContent = `Located: ${data[0].display_name.split(',').slice(0,2).join(',')} — coordinates filled in, edit them above if this isn't quite right.`;
    } else if(statusEl){
      statusEl.textContent = `Couldn't find "${query}" in Nepal — enter the coordinates manually, or try a more specific region name.`;
    }
  } catch(e){
    if(statusEl) statusEl.textContent = 'Location lookup is unavailable right now — enter coordinates manually.';
  }
  scheduleNewTourPriceCalc();
}

function scheduleNewTourPriceCalc(){
  recalcNewTourPrice();
}

async function recalcNewTourPrice(){
  const hintEl = document.getElementById('newTourPriceHint');
  if(!hintEl) return;

  const lat = parseFloat(val('newLat')), lng = parseFloat(val('newLng'));
  if(Number.isNaN(lat) || Number.isNaN(lng)){
    hintEl.textContent = 'Add a region above (or coordinates below) for a suggested price.';
    return;
  }

  const terrain = document.getElementById('newTerrain')?.value || 'highway';
  const durationText = val('newDuration');
  const days = Math.max(1, parseInt((durationText.match(/\d+/) || ['1'])[0], 10));

  const myToken = ++newTourPriceToken;
  hintEl.textContent = 'Calculating suggested price…';
  const { km, source } = await getRoadDistanceKm([ROUTE_START, { lat, lng }], terrain);
  if(myToken !== newTourPriceToken) return;

  const rates = ROUTE_PRICING[terrain];
  const suggested = Math.round((rates.perKm * km + rates.perDayPerPerson * days) / 100) * 100;

  hintEl.innerHTML = `Suggested: <strong>${fmtNPR(suggested)}</strong> per person (${km.toFixed(0)}km from Basundhara, ${days} day${days>1?'s':''}, ${terrain==='highway'?'highway':'off-road'}${source==='estimate' ? ' — straight-line estimate' : ''}). ` +
    `<button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('newPrice').value=${suggested}">Use this price</button>`;
}

const val = id => (document.getElementById(id)?.value || '').trim();

async function saveTourEdits(id){
  const price = parseFloat(val(`adm-price-${id}`));
  const title = val(`adm-title-${id}`);
  const region = val(`adm-region-${id}`);
  const duration = val(`adm-duration-${id}`);
  const guide = val(`adm-guide-${id}`);
  const guidePhone = val(`adm-guidephone-${id}`);
  const desc = val(`adm-desc-${id}`);
  const image = val(`adm-image-${id}`);
  const lat = parseFloat(val(`adm-lat-${id}`));
  const lng = parseFloat(val(`adm-lng-${id}`));

  if(!title || !region){ showToast('Title and region can\'t be empty.', 'error'); return; }

  const hiddenGem = !!document.getElementById(`adm-gem-${id}`)?.checked;
  const image_position = val(`adm-imgpos-${id}`) || 'center';
  const image_zoom = Math.min(200, Math.max(100, parseInt(val(`adm-imgzoom-${id}`), 10) || 100));
  // Crop meta stored locally so missing Supabase columns never break Save
  try {
    const cropMap = JSON.parse(localStorage.getItem('feelit_tour_crop') || '{}');
    cropMap[id] = { image_position, image_zoom };
    localStorage.setItem('feelit_tour_crop', JSON.stringify(cropMap));
  } catch(e){}
  const patch = { title, region, duration, price, guide, guide_phone: guidePhone, desc, hidden_gem: hiddenGem };
  patch.image_url = imgSrc(image);
  if(!Number.isNaN(lat)) patch.lat = lat;
  if(!Number.isNaN(lng)) patch.lng = lng;

  const restoreBtn = setBusy(document.getElementById(`adm-save-${id}`), 'Saving…');
  const ok = await sbWrite(
    supabaseClient.from('tours').update(patch).eq('id', id),
    'Could not update tour — check that your Supabase RLS policy allows UPDATE on tours'
  );
  restoreBtn();
  if(!ok) return;
  showToast('Route updated.', 'success');
  await loadTours();
  renderAdminPanel('tours');
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
  const title = val('newTitle');
  const region = val('newRegion');
  const duration = val('newDuration') || '1 day';
  const price = parseFloat(val('newPrice'));
  const guide = val('newGuide');
  const guidePhone = val('newGuidePhone');
  const desc = val('newDesc');
  const image = val('newImage');
  const includesRaw = val('newIncludes');
  const lat = parseFloat(val('newLat'));
  const lng = parseFloat(val('newLng'));

  if(!title || !region || !price || !guide){ showToast('Title, region, price and rider name are required.', 'error'); return; }

  const newRoute = {
    id: 't' + Date.now(),
    title, region, duration, price, guide,
    guide_phone: guidePhone || '+977-9800000000',
    desc: desc || 'Guided motorcycle journey.',
    includes: includesRaw ? includesRaw.split(',').map(s => s.trim()).filter(Boolean) : ['Bike', 'Helmet', 'Fuel', 'Guide'],
    image_url: imgSrc(image),
    hidden_gem: !!document.getElementById('newHiddenGem')?.checked,
    lat: Number.isNaN(lat) ? 28.2096 : lat,
    lng: Number.isNaN(lng) ? 83.9856 : lng
  };

  const restoreBtn = setBusy(document.getElementById('publishTourBtn'), 'Publishing…');
  const ok = await sbWrite(
    supabaseClient.from('tours').insert([newRoute]),
    'Could not publish tour — check that your Supabase RLS policy allows INSERT on tours'
  );
  restoreBtn();
  if(!ok) return;
  showToast('Route published.', 'success');
  await loadTours();
  renderAdminPanel('tours');
}

/* ---------------- Admin: Reviews tab ---------------- */
async function buildAdminReviewsBody(){
  let list = [];
  let loadError = null;
  try {
    const { data, error } = await supabaseClient.from('reviews').select('*').order('created_at', { ascending: false });
    if(error){ loadError = error; }
    list = data || [];
  } catch(e){ loadError = e; }

  if(loadError){
    return `<div class="empty-state admin-load-error">Reviews aren't set up yet. Run the <strong>reviews</strong> section of supabase-setup.sql in Supabase → SQL Editor, then reopen this tab. (${esc(loadError.message || 'table not found')})</div>`;
  }
  if(!list.length) return '<div class="empty-state">No reviews yet. They appear here as soon as a logged-in customer posts one.</div>';

  const tourName = id => tours.find(t => t.id === id)?.title || id;
  return `<div class="admin-section-intro">Every review posted on the site. Deleting one removes it from the tour page immediately.</div>
  <div style="display:flex;flex-direction:column;gap:12px;">
    ${list.map(r => `
      <div class="admin-review-row">
        <div class="review-head">
          <strong>${esc(r.name || 'Traveler')}</strong>${starsHtml(r.rating)}
        </div>
        <div class="admin-review-meta">${esc(tourName(r.tour_id))} · ${esc(r.email || '')}</div>
        <p>${esc(r.body || '')}</p>
        <button class="btn btn-danger btn-sm" onclick="deleteReviewAdmin('${esc(r.id)}')">Delete review</button>
      </div>
    `).join('')}
  </div>`;
}

async function deleteReviewAdmin(id){
  if(!confirm('Delete this review?')) return;
  const ok = await sbWrite(
    supabaseClient.from('reviews').delete().eq('id', id),
    'Could not delete review — check that your Supabase RLS policy allows DELETE on reviews'
  );
  if(!ok) return;
  showToast('Review deleted.', 'success');
  await loadReviewStats();
  renderTours();
  renderAdminPanel('reviews');
}

/* ---------------- Public Gallery Page (gallery.html) ----------------
   Guarded by an element check, so including script.js on index.html
   never tries to load into a grid that doesn't exist there.
------------------------------------------------------------------------ */
async function loadPhotoGallery(){
  const grid = document.getElementById('photoGalleryGrid');
  if(!grid) return;

  grid.innerHTML = inlineLoader('Loading photos');
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

  galleryPhotos = list;
  renderGalleryRegionFilter(list);
  renderGalleryGrid('All');
}

function renderGalleryRegionFilter(list){
  const holder = document.getElementById('galleryFilter');
  if(!holder) return;
  const regions = ['All', ...new Set(list.map(p => p.region).filter(Boolean))];
  if(regions.length < 3){ holder.innerHTML = ''; return; } // not worth a filter for one region
  holder.innerHTML = regions.map((r, i) =>
    `<button class="chip${i === 0 ? ' active' : ''}" onclick="renderGalleryGrid('${jsArg(r)}', this)">${esc(r)}</button>`
  ).join('');
}

function renderGalleryGrid(region, btnEl){
  const grid = document.getElementById('photoGalleryGrid');
  if(!grid) return;
  if(btnEl){
    document.querySelectorAll('#galleryFilter .chip').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  const list = region === 'All' ? galleryPhotos : galleryPhotos.filter(p => p.region === region);
  const countEl = document.getElementById('galleryCount');
  if(countEl) countEl.textContent = `${list.length} photo${list.length === 1 ? '' : 's'}`;

  grid.innerHTML = list.map((p, i) => {
    const idx = galleryPhotos.indexOf(p);
    return `
      <figure class="gallery-card" data-img-holder>
        <button class="gallery-open" onclick="openLightbox(${idx})" aria-label="Open photo${p.caption ? ': ' + esc(p.caption) : ''}">
          ${imgTag(p.image_url, p.caption || 'Feel It Nepal photo', '')}
          <span class="gallery-fail">Photo unavailable</span>
        </button>
        ${p.caption || p.region ? `<figcaption class="gallery-caption">${esc(p.caption || '')}${p.region ? `<span class="gallery-region">${esc(p.region)}</span>` : ''}</figcaption>` : ''}
      </figure>
    `;
  }).join('');
}

/* ---------------- Gallery lightbox ---------------- */
function openLightbox(index){
  const p = galleryPhotos[index];
  if(!p) return;
  let box = document.getElementById('lightbox');
  if(!box){
    box = document.createElement('div');
    box.id = 'lightbox';
    box.className = 'lightbox';
    document.body.appendChild(box);
    box.addEventListener('click', e => { if(e.target === box) closeLightbox(); });
    document.addEventListener('keydown', lightboxKeys);
  }
  box.dataset.index = index;
  box.innerHTML = `
    <button class="lightbox-close" onclick="closeLightbox()" aria-label="Close">&times;</button>
    <button class="lightbox-nav lightbox-prev" onclick="stepLightbox(-1)" aria-label="Previous photo">&#8249;</button>
    <figure class="lightbox-figure">
      ${imgTag(p.image_url, p.caption || 'Feel It Nepal photo', '')}
      ${p.caption || p.region ? `<figcaption>${esc(p.caption || '')}${p.region ? `<span>${esc(p.region)}</span>` : ''}</figcaption>` : ''}
    </figure>
    <button class="lightbox-nav lightbox-next" onclick="stepLightbox(1)" aria-label="Next photo">&#8250;</button>
  `;
  box.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function stepLightbox(dir){
  const box = document.getElementById('lightbox');
  if(!box) return;
  const next = (Number(box.dataset.index) + dir + galleryPhotos.length) % galleryPhotos.length;
  openLightbox(next);
}

function closeLightbox(){
  const box = document.getElementById('lightbox');
  if(!box) return;
  box.classList.remove('open');
  box.innerHTML = '';
  document.body.style.overflow = '';
}

function lightboxKeys(e){
  const box = document.getElementById('lightbox');
  if(!box || !box.classList.contains('open')) return;
  if(e.key === 'Escape') closeLightbox();
  if(e.key === 'ArrowRight') stepLightbox(1);
  if(e.key === 'ArrowLeft') stepLightbox(-1);
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
        ${imgTag(ad.image_url, 'Announcement', '')}
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

/* ---------------- Page loader (speeding bike) ----------------
   Safety first: this thing sits on top of the whole site, so it has THREE
   independent ways to disappear —
     1. this function, once the first data load finishes,
     2. window 'load',
     3. a pure-CSS keyframe that hides it at 6s even if JS dies completely.
   A loader that can get stuck is worse than no loader at all.
------------------------------------------------------------------------ */
function hidePageLoader(){
  const el = document.getElementById('pageLoader');
  if(!el || el.classList.contains('loader-done')) return;
  el.classList.add('loader-done');
  setTimeout(() => el.remove(), 600);
}

// Small inline version used while a section is fetching from Supabase.
function inlineLoader(label = 'Loading'){
  return `<div class="inline-loader" role="status">
    <svg viewBox="0 0 120 44" class="inline-bike" aria-hidden="true">
      <circle cx="22" cy="30" r="10" fill="none" stroke="currentColor" stroke-width="3"/>
      <circle cx="82" cy="30" r="10" fill="none" stroke="currentColor" stroke-width="3"/>
      <path d="M22 30 L42 12 L58 12 L70 26 L82 30 M42 12 L50 30 M58 12 L54 26 L70 26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M30 12 L42 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <span>${esc(label)}…</span>
  </div>`;
}

/* ---------------- Admin costs (fuel / hotel / driver) + session security ----------------
   Costs persist in localStorage so Financial Control and the route estimator
   can read them without a server. When site_settings exists in Supabase, we
   also try to sync — failure is non-fatal.
------------------------------------------------------------------------ */
const DEFAULT_COSTS = {
  fuelPerLiter: 200,
  kmPerLiter: 25,
  riderHighway: 2500,
  riderOffroad: 3500,
  hotelPerDay: 1200,
  foodPerDay: 800,
  splitFounder: 40,
  splitPartnerB: 20,
  splitPartnerC: 20,
  splitReserve: 20
};

function loadCosts(){
  try {
    const raw = localStorage.getItem('feelit_costs');
    if(raw) return { ...DEFAULT_COSTS, ...JSON.parse(raw) };
  } catch(e){}
  return { ...DEFAULT_COSTS };
}

function saveCostsToStorage(c){
  try { localStorage.setItem('feelit_costs', JSON.stringify(c)); } catch(e){}
  // Push into live ROUTE_PRICING so custom-route quotes update immediately
  if(typeof ROUTE_PRICING !== 'undefined'){
    ROUTE_PRICING.highway.hotelPerDay = c.hotelPerDay;
    ROUTE_PRICING.highway.foodPerDay = c.foodPerDay;
    ROUTE_PRICING.offroad.hotelPerDay = Math.round(c.hotelPerDay * 1.25);
    ROUTE_PRICING.offroad.foodPerDay = Math.round(c.foodPerDay * 1.25);
  }
  window.dispatchEvent(new CustomEvent('feelit-costs-updated', { detail: c }));
}



/* ---- Featured (Popular) tours control ---- */
function loadFeaturedIds(){
  try {
    const raw = localStorage.getItem('feelit_featured_ids');
    if(raw){
      const arr = JSON.parse(raw);
      if(Array.isArray(arr) && arr.length) return arr.map(String);
    }
  } catch(e){}
  // default: first 8 tours
  return (typeof tours !== 'undefined' ? tours : []).slice(0, 8).map(t => String(t.id));
}
function saveFeaturedIds(ids){
  localStorage.setItem('feelit_featured_ids', JSON.stringify(ids.map(String)));
}
function buildAdminFeaturedBody(){
  const selected = new Set(loadFeaturedIds());
  const rows = (tours || []).map(t => {
    const on = selected.has(String(t.id));
    return `<label class="feat-pick-row" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;background:var(--bg);cursor:pointer;">
      <input type="checkbox" class="feat-pick" value="${esc(t.id)}" ${on?'checked':''} style="width:18px;height:18px;">
      <span style="flex:1;min-width:0;">
        <strong style="display:block;">${esc(t.title)}</strong>
        <small style="color:var(--ink-soft);">${esc(t.region)} · ${fmtNPR(t.price)}</small>
      </span>
      ${t.hidden_gem ? '<span class="gem-badge" style="position:static;">Hidden Gem</span>' : ''}
    </label>`;
  }).join('') || '<p class="empty-state">No tours yet. Add tours first.</p>';
  return `
    <div class="form-card" style="max-width:100%;">
      <h3>Featured / Popular tours</h3>
      <p class="form-note">Checked tours appear in the homepage <strong>Featured Bike Tours</strong> strip (in the order shown). Uncheck to remove. Order = current list order — use Tours tab to edit details.</p>
      <div id="featPickList" style="max-height:420px;overflow:auto;margin:12px 0;">${rows}</div>
      <button type="button" class="btn btn-primary" onclick="saveFeaturedFromAdmin()">Save featured list</button>
      <button type="button" class="btn btn-outline" style="margin-left:8px;" onclick="selectAllFeatured(true)">Select all</button>
      <button type="button" class="btn btn-outline" style="margin-left:8px;" onclick="selectAllFeatured(false)">Clear</button>
    </div>`;
}
function selectAllFeatured(on){
  document.querySelectorAll('.feat-pick').forEach(cb => { cb.checked = !!on; });
}
function saveFeaturedFromAdmin(){
  const ids = [...document.querySelectorAll('.feat-pick:checked')].map(cb => cb.value);
  if(!ids.length){ showToast('Pick at least one tour for Featured.', 'error'); return; }
  saveFeaturedIds(ids);
  if(typeof renderTours === 'function') renderTours();
  showToast('Featured tours updated on the homepage.', 'success');
}

/* ---- Site-wide settings (contact, socials, hero text) ---- */
function loadSiteSettings(){
  const defaults = {
    wa: (typeof CONTACT_INFO !== 'undefined' && CONTACT_INFO.whatsapp) ? CONTACT_INFO.whatsapp : '9779825344810',
    ig: 'https://www.instagram.com/feelitoffical/',
    email: (typeof CONTACT_INFO !== 'undefined' && CONTACT_INFO.email) ? CONTACT_INFO.email : '',
    phone: '',
    address: (typeof CONTACT_INFO !== 'undefined' && CONTACT_INFO.address) ? CONTACT_INFO.address : '',
    heroTag: 'Guided bike tours in Nepal',
    heroTitle1: 'More Than a Ride,',
    heroTitle2: "It's a Story",
    heroBlurb: 'Explore breathtaking landscapes, hidden villages and ancient cultures with expert local riders. Your Himalayan adventure starts here.'
  };
  try {
    const raw = localStorage.getItem('feelit_site_settings');
    if(raw) return { ...defaults, ...JSON.parse(raw) };
  } catch(e){}
  return defaults;
}
function saveSiteSettingsObj(obj){
  localStorage.setItem('feelit_site_settings', JSON.stringify(obj));
}
function buildAdminSettingsBody(){
  const s = loadSiteSettings();
  return `
    <div class="form-card" style="max-width:100%;">
      <h3>Site settings</h3>
      <p class="form-note">These update what visitors see (this browser / device). For permanent global change keep assets on GitHub; settings here override contact + hero text live.</p>
      <div class="row-2">
        <div class="field"><label>WhatsApp number (wa.me format)</label><input id="setWa" value="${esc(s.wa)}" placeholder="9779825344810"></div>
        <div class="field"><label>Instagram URL</label><input id="setIg" value="${esc(s.ig)}" placeholder="https://www.instagram.com/…"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Public email</label><input id="setEmail" value="${esc(s.email)}" type="email"></div>
        <div class="field"><label>Phone display</label><input id="setPhone" value="${esc(s.phone)}" placeholder="+977 …"></div>
      </div>
      <div class="field"><label>Address</label><input id="setAddress" value="${esc(s.address)}"></div>
      <hr style="border:0;border-top:1px solid var(--line);margin:16px 0;">
      <div class="field"><label>Hero tag (small line)</label><input id="setHeroTag" value="${esc(s.heroTag)}"></div>
      <div class="row-2">
        <div class="field"><label>Hero title line 1</label><input id="setHeroT1" value="${esc(s.heroTitle1)}"></div>
        <div class="field"><label>Hero title accent</label><input id="setHeroT2" value="${esc(s.heroTitle2)}"></div>
      </div>
      <div class="field"><label>Hero blurb</label><textarea id="setHeroBlurb" rows="3">${esc(s.heroBlurb)}</textarea></div>
      <button type="button" class="btn btn-primary" onclick="saveSiteSettingsFromAdmin()">Save &amp; apply to site</button>
    </div>`;
}
function saveSiteSettingsFromAdmin(){
  const s = {
    wa: (document.getElementById('setWa')?.value || '').trim(),
    ig: (document.getElementById('setIg')?.value || '').trim(),
    email: (document.getElementById('setEmail')?.value || '').trim(),
    phone: (document.getElementById('setPhone')?.value || '').trim(),
    address: (document.getElementById('setAddress')?.value || '').trim(),
    heroTag: (document.getElementById('setHeroTag')?.value || '').trim(),
    heroTitle1: (document.getElementById('setHeroT1')?.value || '').trim(),
    heroTitle2: (document.getElementById('setHeroT2')?.value || '').trim(),
    heroBlurb: (document.getElementById('setHeroBlurb')?.value || '').trim()
  };
  saveSiteSettingsObj(s);
  applySiteSettings(s);
  showToast('Site settings applied.', 'success');
}
function applySiteSettings(s){
  s = s || loadSiteSettings();
  try {
    if(typeof CONTACT_INFO !== 'undefined'){
      if(s.wa) CONTACT_INFO.whatsapp = s.wa.replace(/[^\d]/g,'');
      if(s.email) CONTACT_INFO.email = s.email;
      if(s.address) CONTACT_INFO.address = s.address;
    }
  } catch(e){}
  // Float socials
  document.querySelectorAll('.float-wa, a[href*="wa.me"]').forEach(a => {
    if(a.classList.contains('float-wa') || a.id === 'footerWaLink' || a.id === 'contactWaLink'){
      if(s.wa) a.href = 'https://wa.me/' + s.wa.replace(/[^\d]/g,'');
    }
  });
  document.querySelectorAll('.float-ig, a[href*="instagram.com"]').forEach(a => {
    if(a.classList.contains('float-ig') || a.id === 'footerIgLink' || a.id === 'contactIgLink'){
      if(s.ig) a.href = s.ig;
    }
  });
  // Hero text
  const tag = document.querySelector('.hero-tag');
  if(tag && s.heroTag) tag.textContent = s.heroTag;
  const h1 = document.querySelector('.hero-inner h1');
  if(h1 && (s.heroTitle1 || s.heroTitle2)){
    h1.innerHTML = `${esc(s.heroTitle1)}<br><span class="hero-accent">${esc(s.heroTitle2)}</span>`;
  }
  const blurb = document.querySelector('.hero-inner p');
  if(blurb && s.heroBlurb) blurb.textContent = s.heroBlurb;
  if(typeof initContactDisplay === 'function') initContactDisplay();
}


function buildAdminWeatherBody(){
  const cur = window.__fiWeatherKind || 'none';
  return `
    <div class="form-card" style="max-width:100%;">
      <h3>Weather &amp; light-bulb FX</h3>
      <p class="form-note" style="margin-top:-4px;">Preview what visitors see. Effects use live location weather by default. The floating light bulb only appears in dark conditions (rain, thunder, fog, or night).</p>
      <p class="form-note">Current kind: <strong id="admWxCur">${esc(cur)}</strong></p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin:14px 0;">
        <button type="button" class="btn btn-outline" onclick="adminPreviewFx('clear')">☀️ Clear</button>
        <button type="button" class="btn btn-outline" onclick="adminPreviewFx('rain')">🌧️ Rain</button>
        <button type="button" class="btn btn-outline" onclick="adminPreviewFx('snow')">❄️ Snow</button>
        <button type="button" class="btn btn-outline" onclick="adminPreviewFx('fog')">🌫️ Fog</button>
        <button type="button" class="btn btn-outline" onclick="adminPreviewFx('thunder')">⛈️ Thunder</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <button type="button" class="btn btn-primary" onclick="adminForceLamp(true)">💡 Force light bulb ON</button>
        <button type="button" class="btn btn-outline" onclick="adminForceLamp(false)">Light bulb OFF</button>
        <button type="button" class="btn btn-outline" onclick="adminPreviewFx(null)">Reset to live weather</button>
        <button type="button" class="btn btn-danger" onclick="typeof feelitFx!=='undefined'&&feelitFx.off()">Disable all FX</button>
        <button type="button" class="btn btn-outline" onclick="typeof feelitFx!=='undefined'&&feelitFx.on()">Enable FX</button>
      </div>
      <p class="form-note">Tip: open the site with <code>?fx=rain</code> (or snow / fog / thunder / clear) to force a preview without admin.</p>
      <div class="field" style="margin-top:16px;">
        <label>Hero background image URL (Google Drive or direct)</label>
        <input id="admHeroBg" placeholder="assets/1.png or https://drive.google.com/…" value="">
        <button type="button" class="btn btn-primary" style="margin-top:8px;" onclick="adminSaveHeroBg()">Apply hero background</button>
        <p class="form-note">Saves to this browser and updates the hero image immediately. For permanent change, keep the file as <code>assets/1.png</code> in GitHub.</p>
      </div>
    </div>
  `;
}
function adminPreviewFx(kind){
  if(typeof feelitFx === 'undefined'){ showToast('Weather FX script not loaded on this page.', 'error'); return; }
  if(kind == null){
    feelitFx.on();
    // clear forced URL param behavior by reloading live
    if(window.location.search.includes('fx=')){
      history.replaceState(null,'', location.pathname);
    }
    location.reload();
    return;
  }
  feelitFx.preview(kind);
  // dark kinds should show lamp
  adminForceLamp(['rain','thunder','fog'].includes(kind));
  const el = document.getElementById('admWxCur');
  if(el) el.textContent = kind;
  showToast('Preview: ' + kind, 'success');
}
function adminForceLamp(on){
  const lamp = document.getElementById('fiWindLamp');
  if(!lamp){ showToast('Light bulb layer not on this page.', 'error'); return; }
  lamp.classList.toggle('fi-lamp-on', !!on);
  showToast(on ? 'Light bulb ON' : 'Light bulb OFF', 'success');
}
function adminSaveHeroBg(){
  const url = (document.getElementById('admHeroBg')?.value || '').trim();
  if(!url){ showToast('Paste an image URL first.', 'error'); return; }
  const src = (typeof imgSrc === 'function') ? imgSrc(url) : url;
  try { localStorage.setItem('feelit_hero_bg', src); } catch(e){}
  const img = document.querySelector('.hero-media img');
  if(img){ img.src = src; img.style.display = ''; }
  else {
    const media = document.querySelector('.hero-media');
    if(media) media.innerHTML = `<img src="${src.replace(/"/g,'')}" alt="Hero">`;
  }
  showToast('Hero background updated for this browser.', 'success');
}


function buildAdminCostsBody(){
  const c = loadCosts();
  return `
    <div class="form-card" style="max-width:100%;">
      <h3>Operating costs</h3>
      <p class="form-note" style="margin-top:-4px;">These numbers feed the Financial Control calculator and optional hotel/food add-ons on bookings. Shareholder split must total 100%.</p>
      <div class="row-2">
        <div class="field"><label>Petrol price (NPR / liter)</label><input type="number" id="costFuel" min="0" value="${c.fuelPerLiter}"></div>
        <div class="field"><label>Bike efficiency (km / liter)</label><input type="number" id="costKmL" min="1" value="${c.kmPerLiter}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Rider wage — highway (NPR / day)</label><input type="number" id="costRiderHwy" min="0" value="${c.riderHighway}"></div>
        <div class="field"><label>Rider wage — off-road (NPR / day)</label><input type="number" id="costRiderOff" min="0" value="${c.riderOffroad}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Hotel cost (NPR / day / person)</label><input type="number" id="costHotel" min="0" value="${c.hotelPerDay}"></div>
        <div class="field"><label>Food cost (NPR / day / person)</label><input type="number" id="costFood" min="0" value="${c.foodPerDay}"></div>
      </div>
      <h3 style="margin-top:20px;">Shareholder split (%)</h3>
      <div class="row-2">
        <div class="field"><label>Lead Founder</label><input type="number" id="costSplitA" min="0" max="100" value="${c.splitFounder}" oninput="syncSplitHint()"></div>
        <div class="field"><label>Partner B</label><input type="number" id="costSplitB" min="0" max="100" value="${c.splitPartnerB}" oninput="syncSplitHint()"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Partner C</label><input type="number" id="costSplitC" min="0" max="100" value="${c.splitPartnerC}" oninput="syncSplitHint()"></div>
        <div class="field"><label>Company Reserve</label><input type="number" id="costSplitR" min="0" max="100" value="${c.splitReserve}" oninput="syncSplitHint()"></div>
      </div>
      <p class="form-note" id="costSplitHint">Total: ${c.splitFounder+c.splitPartnerB+c.splitPartnerC+c.splitReserve}%</p>
      <button class="btn btn-primary" style="width:100%;margin-top:12px;" id="saveCostsBtn" onclick="saveAdminCosts()">Save costs</button>
    </div>
  `;
}

function syncSplitHint(){
  const a = +document.getElementById('costSplitA')?.value || 0;
  const b = +document.getElementById('costSplitB')?.value || 0;
  const c = +document.getElementById('costSplitC')?.value || 0;
  const r = +document.getElementById('costSplitR')?.value || 0;
  const el = document.getElementById('costSplitHint');
  if(el) el.textContent = `Total: ${a+b+c+r}%` + (a+b+c+r !== 100 ? ' — should equal 100%' : ' ✓');
}

function saveAdminCosts(){
  const c = {
    fuelPerLiter: +document.getElementById('costFuel').value || 0,
    kmPerLiter: +document.getElementById('costKmL').value || 25,
    riderHighway: +document.getElementById('costRiderHwy').value || 0,
    riderOffroad: +document.getElementById('costRiderOff').value || 0,
    hotelPerDay: +document.getElementById('costHotel').value || 0,
    foodPerDay: +document.getElementById('costFood').value || 0,
    splitFounder: +document.getElementById('costSplitA').value || 0,
    splitPartnerB: +document.getElementById('costSplitB').value || 0,
    splitPartnerC: +document.getElementById('costSplitC').value || 0,
    splitReserve: +document.getElementById('costSplitR').value || 0
  };
  const total = c.splitFounder + c.splitPartnerB + c.splitPartnerC + c.splitReserve;
  if(total !== 100){ showToast('Shareholder split must total exactly 100%.', 'error'); return; }
  saveCostsToStorage(c);
  showToast('Costs saved. Financial Control and booking add-ons will use these numbers.', 'success');
}

function isValidAdminSession(){
  try {
    const raw = sessionStorage.getItem('feelit_admin_session');
    if(!raw) return false;
    // Legacy: plain timestamp string
    if(/^\d+$/.test(raw)){
      const age = Date.now() - Number(raw);
      return age >= 0 && age < 4 * 60 * 60 * 1000;
    }
    const obj = JSON.parse(raw);
    if(!obj || !obj.t) return false;
    const age = Date.now() - Number(obj.t);
    return age >= 0 && age < 4 * 60 * 60 * 1000;
  } catch(e){ return false; }
}

function adminLogout(){
  sessionStorage.removeItem('feelit_admin_session');
  closeOverlay();
  showToast('Admin logged out.', 'success');
  // If on admin.html, bounce home
  if(/admin\\.html$/i.test(location.pathname)) window.location.href = 'index.html';
}

// Apply stored costs on load so hotel/food rates match admin settings
saveCostsToStorage(loadCosts());

/* ---------------- Initialization ---------------- */
window.addEventListener('DOMContentLoaded', async () => {
  loadTheme();
  // Apply admin-saved hero background if any
  try {
    const hb = localStorage.getItem('feelit_hero_bg');
    if(hb){
      const img = document.querySelector('.hero-media img');
      if(img) img.src = hb;
    }
  } catch(e){}
  try { applySiteSettings(loadSiteSettings()); } catch(e){}
  initContactDisplay();
  initFloatingWhatsApp();
  initEmailJS();
  checkUserSession();
  loadPopupAd();
  initRouteBuilder();

  // These two are the actual content fetches — hide the loader once
  // whichever one this page needs has finished.
  await Promise.all([loadTours(), loadPhotoGallery()]);
  hidePageLoader();

  // Coming back from admin.html's "Operations Panel" button — jump
  // straight to the bookings/tours panel instead of landing on the
  // homepage. Only happens if this tab actually has the admin session
  // flag (i.e. it isn't just someone guessing the URL).
  if(new URLSearchParams(location.search).get('admin') === '1' && isValidAdminSession()){
    history.replaceState(null, '', location.pathname); // drop ?admin=1 so a refresh doesn't force-reopen it
    renderAdminPanel('bookings');
  }

  // Handle Supabase Google Auth redirect hash tokens
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if(event === 'SIGNED_IN' && session) {
      checkUserSession();
      showToast('Successfully logged in!', 'success');
    }
  });
});

// Backstop #2: whatever happens above, the loader goes when the page loads.
window.addEventListener('load', () => setTimeout(hidePageLoader, 300));


