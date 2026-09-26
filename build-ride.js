/* ============================================================================
   BUILD YOUR RIDE - PLACE SEARCH & ROUTE BUILDER
   Custom route creation with place selection, permits, pricing calculations
   ============================================================================ */

// FAKE PLACE DATABASE - Replace with real API/Supabase data
const NEPAL_PLACES = [
  { name: 'Kathmandu', lat: 27.7172, lng: 85.3240, region: 'Kathmandu Valley', type: 'city' },
  { name: 'Pokhara', lat: 28.2096, lng: 83.9856, region: 'Pokhara', type: 'city' },
  { name: 'Namche Bazaar', lat: 27.8022, lng: 86.7093, region: 'Everest', type: 'town' },
  { name: 'Jomsom', lat: 28.7796, lng: 83.7379, region: 'Mustang', type: 'town' },
  { name: 'Manang', lat: 28.6534, lng: 84.0417, region: 'Annapurna', type: 'town' },
  { name: 'Muktinath', lat: 28.8169, lng: 83.8797, region: 'Annapurna', type: 'temple' },
  { name: 'Lo Manthang', lat: 29.1944, lng: 83.8853, region: 'Upper Mustang', type: 'city' },
  { name: 'Nuwakot', lat: 27.9667, lng: 85.3833, region: 'Kathmandu Valley', type: 'town' },
  { name: 'Bhaktapur', lat: 27.6719, lng: 85.4289, region: 'Kathmandu Valley', type: 'city' },
  { name: 'Panauti', lat: 27.6322, lng: 85.5144, region: 'Kathmandu Valley', type: 'temple' },
  { name: 'Gorkha', lat: 28.0167, lng: 84.6167, region: 'Central Nepal', type: 'town' },
  { name: 'Bandipur', lat: 27.8456, lng: 84.3286, region: 'Central Nepal', type: 'town' },
  { name: 'Janakpur', lat: 26.7089, lng: 85.9256, region: 'Eastern Nepal', type: 'city' },
  { name: 'Ilam', lat: 26.9124, lng: 87.9290, region: 'Eastern Nepal', type: 'town' },
  { name: 'Dharan', lat: 26.8147, lng: 87.2847, region: 'Eastern Nepal', type: 'city' },
  { name: 'Kanyam', lat: 27.9433, lng: 86.5964, region: 'Everest', type: 'town' },
  { name: 'Tengboche', lat: 27.8622, lng: 86.7736, region: 'Everest', type: 'monastery' },
  { name: 'Pheriche', lat: 27.8903, lng: 86.8364, region: 'Everest', type: 'town' },
];

// HIDDEN GEMS - Short, exclusive rides
const HIDDEN_GEMS = [
  {
    id: 'gem-1',
    title: 'Nuwakot & Tadi Bazaar Loop',
    region: 'Kathmandu Valley',
    duration: '1 Day',
    distance: '85 km',
    price: 3500,
    description: 'A quick escape from Kathmandu to ancient Nuwakot fortress and charming Tadi village.',
    imageUrl: 'assets/gem-nuwakot.jpg',
    highlights: ['Historic fortress', 'Mountain views', 'Tea stops']
  },
  {
    id: 'gem-2',
    title: 'Panauti Heritage Ride',
    region: 'Kathmandu Valley',
    duration: '1 Day',
    distance: '120 km',
    price: 4200,
    description: 'Scenic ride to Nepal\'s oldest pagoda and riverside temple complex.',
    imageUrl: 'assets/gem-panauti.jpg',
    highlights: ['Ancient temples', 'Riverside views', 'Local villages']
  },
  {
    id: 'gem-3',
    title: 'Bandipur to Gorkha Dash',
    region: 'Central Nepal',
    duration: '2 Days',
    distance: '180 km',
    price: 8500,
    description: 'Little-known routes through preserved mountain towns and terraced fields.',
    imageUrl: 'assets/gem-bandipur.jpg',
    highlights: ['Historic towns', 'Mountain scenery', 'Local culture']
  },
  {
    id: 'gem-4',
    title: 'Ilam Tea Estate Trail',
    region: 'Eastern Nepal',
    duration: '2 Days',
    distance: '240 km',
    price: 9800,
    description: 'Nepal\'s tea country: lush hills, tea gardens, and peaceful valleys.',
    imageUrl: 'assets/gem-ilam.jpg',
    highlights: ['Tea plantations', 'Hilltop views', 'Local food']
  }
];

// ============================================================================
// PLACE SEARCH FUNCTIONALITY
// ============================================================================

function initPlaceSearch() {
  const input = document.getElementById('placeSearchInput');
  const results = document.getElementById('placeSearchResults');
  
  if (!input) return;
  
  input.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length < 2) {
      results.classList.remove('active');
      results.innerHTML = '';
      return;
    }
    
    const matches = NEPAL_PLACES.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.region.toLowerCase().includes(query)
    );
    
    if (matches.length === 0) {
      results.classList.add('active');
      results.innerHTML = '<div class="search-result-item" style="color: var(--ink-soft);">No places found</div>';
      return;
    }
    
    results.classList.add('active');
    results.innerHTML = matches.map(p => `
      <div class="search-result-item" onclick="addPlaceToRoute('${esc(p.name)}', ${p.lat}, ${p.lng})">
        <strong>${esc(p.name)}</strong>
        <small style="color: var(--ink-soft);">${esc(p.region)} • ${esc(p.type)}</small>
      </div>
    `).join('');
  });
  
  // Close results on click outside
  document.addEventListener('click', (e) => {
    if (e.target !== input && !e.target.closest('.search-results')) {
      results.classList.remove('active');
    }
  });
}

// ============================================================================
// ROUTE MANAGEMENT
// ============================================================================

let selectedPlaces = [];

function addPlaceToRoute(name, lat, lng) {
  // Check for duplicates
  if (selectedPlaces.some(p => p.name === name)) {
    showToast('This place is already in your route', 'warning');
    return;
  }
  
  selectedPlaces.push({ name, lat, lng, order: selectedPlaces.length + 1 });
  updateRouteDisplay();
  
  document.getElementById('placeSearchInput').value = '';
  document.getElementById('placeSearchResults').classList.remove('active');
}

function removePlaceFromRoute(name) {
  selectedPlaces = selectedPlaces.filter(p => p.name !== name);
  selectedPlaces.forEach((p, i) => p.order = i + 1); // Reorder
  updateRouteDisplay();
}

function updateRouteDisplay() {
  const container = document.getElementById('selectedPlacesContainer');
  
  if (selectedPlaces.length === 0) {
    container.innerHTML = '<div class="empty-state">No places selected yet</div>';
    document.getElementById('routeSummaryBody').innerHTML = '<div class="empty-state">Add places to your route to see details</div>';
    document.getElementById('routeDistance').textContent = '-';
    document.getElementById('routePrice').textContent = '-';
    return;
  }
  
  container.innerHTML = selectedPlaces.map(p => `
    <div class="place-item">
      <div>
        <strong>${p.order}. ${esc(p.name)}</strong>
      </div>
      <div class="place-item-remove" onclick="removePlaceFromRoute('${esc(p.name)}')">×</div>
    </div>
  `).join('');
  
  calculateRouteEstimate();
}

// ============================================================================
// ROUTE ESTIMATION & CALCULATIONS
// ============================================================================

async function calculateRouteEstimate() {
  if (selectedPlaces.length < 2) {
    document.getElementById('routeSummaryBody').innerHTML = '<div class="empty-state">Select at least 2 places to calculate route</div>';
    return;
  }
  
  // Rough distance calculation (Haversine formula)
  let totalDistance = 0;
  for (let i = 0; i < selectedPlaces.length - 1; i++) {
    totalDistance += haversineDistance(
      selectedPlaces[i].lat, selectedPlaces[i].lng,
      selectedPlaces[i + 1].lat, selectedPlaces[i + 1].lng
    );
  }
  
  // Display distance
  document.getElementById('routeDistance').textContent = Math.round(totalDistance) + ' km';
  
  // Calculate price estimate
  const basePrice = Math.ceil(totalDistance * 30); // NPR 30 per km base
  updateCustomPrice(basePrice);
  
  // Generate route summary
  generateRouteSummary();
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function updateCustomPrice(basePrice = null) {
  const days = parseInt(document.getElementById('routeDays').value) || 1;
  const hotel = document.getElementById('customHotel').checked ? 2000 : 0;
  const food = document.getElementById('customFood').checked ? 1500 : 0;
  
  let price = basePrice || Math.ceil(selectedPlaces.length * 5000);
  price = price * days + hotel * days + food * days;
  
  document.getElementById('routePrice').textContent = 'NPR ' + price.toLocaleString();
  document.getElementById('hotelPrice').textContent = '+NPR ' + (2000 * days).toLocaleString();
  document.getElementById('foodPrice').textContent = '+NPR ' + (1500 * days).toLocaleString();
}

function generateRouteSummary() {
  const days = parseInt(document.getElementById('routeDays').value) || 1;
  const startDate = document.getElementById('routeStart').value;
  
  let html = `<div class="fi-route">
    <h4>📍 Your Route</h4>
    <ol style="padding-left: 20px; margin: 0; font-size: 13px;">`;
  
  selectedPlaces.forEach(p => {
    html += `<li>${esc(p.name)}</li>`;
  });
  
  html += `</ol>
    <h4>📅 Dates</h4>
    <p>${startDate ? 'Departs ' + new Date(startDate).toLocaleDateString() + ' for ' + days + ' day(s)' : 'Pick a start date'}</p>
    <h4>🎒 What to Bring</h4>
    <ul style="padding-left: 20px; margin: 0; font-size: 13px; color: var(--ink-soft);">
      <li>Passport & travel documents</li>
      <li>Appropriate riding gear</li>
      <li>Medications & first aid</li>
      <li>Cash (limited ATMs)</li>
    </ul>
    <h4>📋 Permits</h4>
    <p style="font-size: 13px; color: var(--ink-soft);">Our team handles all permit arrangements. We'll confirm requirements after booking.</p>
  </div>`;
  
  document.getElementById('routeSummaryBody').innerHTML = html;
}

function submitCustomRoute() {
  if (selectedPlaces.length < 2) {
    showToast('Please select at least 2 places', 'error');
    return;
  }
  
  const startDate = document.getElementById('routeStart').value;
  if (!startDate) {
    showToast('Please select a start date', 'error');
    return;
  }
  
  const route = {
    places: selectedPlaces.map(p => p.name).join(' → '),
    startDate,
    days: document.getElementById('routeDays').value,
    travelers: document.getElementById('routeTravelers').value,
    hotel: document.getElementById('customHotel').checked,
    food: document.getElementById('customFood').checked,
  };
  
  // Store for later processing
  sessionStorage.setItem('customRoute', JSON.stringify(route));
  
  showToast('Route request saved! Our team will contact you soon.', 'success');
  
  // Reset form
  setTimeout(() => {
    selectedPlaces = [];
    document.getElementById('placeSearchInput').value = '';
    updateRouteDisplay();
  }, 1500);
}

// ============================================================================
// HIDDEN GEMS DISPLAY
// ============================================================================

function renderHiddenGems() {
  const grid = document.getElementById('hiddenGemsGrid');
  if (!grid) return;
  
  grid.innerHTML = HIDDEN_GEMS.map(gem => `
    <div class="card" onclick="openTour('${esc(gem.id)}')">
      <div class="card-image" data-img-holder>
        ${gem.imageUrl ? imgTag(gem.imageUrl, gem.title, '') : '<div style="height: 100%; display: flex; align-items: center; justify-content: center; background: var(--line); color: var(--ink-soft);">📷</div>'}
      </div>
      <div class="card-body">
        <div class="card-badge">Hidden Gem</div>
        <div class="card-region">${esc(gem.region)}</div>
        <h3 class="card-title">${esc(gem.title)}</h3>
        <div class="card-meta">
          <span>⏱️ ${esc(gem.duration)}</span>
          <span>🏍️ ${esc(gem.distance)}</span>
        </div>
        <p class="card-description">${esc(gem.description)}</p>
        <div class="card-price">NPR ${gem.price.toLocaleString()}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================================
// ADMIN PANEL ENHANCEMENTS
// ============================================================================

function renderAdminPricingPanel() {
  const adminPanel = document.getElementById('adminPanel');
  if (!adminPanel) return;
  
  const html = `
    <div class="admin-section">
      <h3>💰 Pricing Configuration</h3>
      <div class="admin-form">
        <div class="field">
          <label>Fuel Price per Liter (NPR)</label>
          <input type="number" id="adminFuelPrice" class="input-text" value="120" min="0">
        </div>
        <div class="field">
          <label>Hotel Cost per Room (NPR)</label>
          <input type="number" id="adminHotelCost" class="input-text" value="1200" min="0">
        </div>
        <div class="field">
          <label>Driver/Rider Cost per Day (NPR)</label>
          <input type="number" id="adminDriverCost" class="input-text" value="1500" min="0">
        </div>
        <div class="field">
          <label>Shareholder Cut (%)</label>
          <input type="number" id="adminShareholderPct" class="input-text" value="15" min="0" max="100">
        </div>
        <button class="btn btn-primary" onclick="savePricingConfig()">Save Pricing Config</button>
      </div>
    </div>
    
    <div class="admin-section">
      <h3>🌦️ Weather Effects Control</h3>
      <div class="admin-form">
        <label class="checkbox-label">
          <input type="checkbox" id="adminWeatherEnabled" checked>
          <span>Enable Weather Animations</span>
        </label>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm" onclick="previewWeather('rain')">Preview Rain</button>
          <button class="btn btn-outline btn-sm" onclick="previewWeather('snow')">Preview Snow</button>
          <button class="btn btn-outline btn-sm" onclick="previewWeather('fog')">Preview Fog</button>
          <button class="btn btn-outline btn-sm" onclick="previewWeather('clear')">Preview Clear</button>
        </div>
      </div>
    </div>
    
    <div class="admin-section">
      <h3>🎨 Theme & Background</h3>
      <div class="admin-form">
        <div class="field">
          <label>Hero Background Image URL</label>
          <input type="text" id="adminHeroBg" class="input-text" placeholder="Google Drive or image URL">
        </div>
        <button class="btn btn-primary" onclick="updateHeroBackground()">Update Background</button>
      </div>
    </div>
  `;
  
  adminPanel.insertAdjacentHTML('beforeend', html);
}

function savePricingConfig() {
  const config = {
    fuel: parseFloat(document.getElementById('adminFuelPrice').value),
    hotel: parseFloat(document.getElementById('adminHotelCost').value),
    driver: parseFloat(document.getElementById('adminDriverCost').value),
    shareholder: parseFloat(document.getElementById('adminShareholderPct').value),
  };
  
  localStorage.setItem('pricingConfig', JSON.stringify(config));
  showToast('Pricing configuration saved', 'success');
}

function previewWeather(type) {
  if (window.weatherPhysics) {
    WeatherPhysics.preview(type);
  }
}

function updateHeroBackground() {
  const url = document.getElementById('adminHeroBg').value;
  if (!url) return;
  
  const img = document.getElementById('heroMedia').querySelector('img');
  if (img) {
    img.src = imgSrc(url, 1600);
  } else {
    const newImg = document.createElement('img');
    newImg.src = imgSrc(url, 1600);
    newImg.alt = 'Hero background';
    document.getElementById('heroMedia').appendChild(newImg);
  }
  
  localStorage.setItem('heroBgUrl', url);
  showToast('Hero background updated', 'success');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initPlaceSearch();
  renderHiddenGems();
  
  // Load saved hero background
  const savedBg = localStorage.getItem('heroBgUrl');
  if (savedBg) {
    const img = document.getElementById('heroMedia').querySelector('img');
    if (img) img.src = imgSrc(savedBg, 1600);
  }
  
  // Add event listeners for route changes
  const routeInputs = ['routeStart', 'routeDays', 'routeTravelers', 'customHotel', 'customFood'];
  routeInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateCustomPrice);
  });
  
  // Update tour count display
  if (window.tours && typeof tours !== 'undefined') {
    document.getElementById('touCountDisplay').textContent = tours.length;
  }
});
