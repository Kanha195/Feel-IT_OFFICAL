/* ============================================================================
   ADMIN PANEL ENHANCEMENTS
   Professional UI improvements, new controls, pricing management
   ============================================================================ */

// Inject admin styles
const adminStyles = document.createElement('style');
adminStyles.textContent = `
.admin-dashboard {
  background: var(--bg);
  color: var(--ink);
}

.admin-header {
  background: linear-gradient(135deg, var(--primary-tint) 0%, color-mix(in srgb, var(--primary-tint) 80%, var(--paper)) 100%);
  border-bottom: 2px solid var(--primary);
  padding: 24px 0;
  margin-bottom: 30px;
}

.admin-header h1 {
  margin: 0;
  color: var(--primary);
  font-size: 28px;
  letter-spacing: 1px;
}

.admin-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 30px;
  overflow-x: auto;
  padding-bottom: 0;
}

.admin-tab {
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--ink-soft);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.admin-tab:hover {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.admin-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  background: var(--primary-tint);
}

.admin-section {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 24px;
}

.admin-section h3 {
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
  font-size: 18px;
}

.admin-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-form .row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.admin-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.admin-actions .btn {
  flex: 1;
  min-width: 120px;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-left: 3px solid var(--primary);
  padding: 20px;
  border-radius: var(--radius);
  text-align: center;
}

.stat-card .stat-number {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 32px;
  color: var(--primary);
  font-weight: 700;
  margin: 0;
}

.stat-card .stat-label {
  font-size: 12px;
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 8px;
}

.tour-edit-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.preference-group {
  background: var(--paper);
  padding: 20px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
}

.preference-group label {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  font-weight: 500;
}

.preference-group label input[type="checkbox"],
.preference-group label input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
}

.weather-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.weather-preview-btn {
  padding: 12px 16px;
  background: var(--primary-tint);
  border: 1px solid var(--primary);
  color: var(--primary);
  border-radius: var(--radius);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.weather-preview-btn:hover {
  background: var(--primary);
  color: #000;
  box-shadow: 0 4px 12px var(--primary-glow);
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: var(--bg);
  border-radius: var(--radius);
}

.color-picker input[type="color"] {
  width: 50px;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  cursor: pointer;
}

.color-picker span {
  font-size: 12px;
  color: var(--ink-soft);
  font-family: monospace;
}

.admin-warning {
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid var(--warning);
  padding: 16px;
  border-radius: var(--radius);
  color: var(--warning);
  font-size: 13px;
  margin: 16px 0;
}

.admin-success {
  background: rgba(16, 185, 129, 0.1);
  border-left: 3px solid var(--success);
  padding: 16px;
  border-radius: var(--radius);
  color: var(--success);
  font-size: 13px;
  margin: 16px 0;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.admin-table th {
  background: var(--bg);
  color: var(--ink-soft);
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid var(--line);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.admin-table td {
  padding: 12px;
  border-bottom: 1px solid var(--line);
}

.admin-table tr:hover {
  background: var(--primary-tint);
}

.admin-table .action-btn {
  padding: 6px 12px;
  font-size: 11px;
  background: var(--primary-tint);
  border: 1px solid var(--primary);
  color: var(--primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 6px;
}

.admin-table .action-btn:hover {
  background: var(--primary);
  color: #000;
}

.admin-table .status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
  border: 1px solid var(--success);
}

.status-badge.pending {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning);
  border: 1px solid var(--warning);
}

.status-badge.inactive {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border: 1px solid var(--danger);
}

@media (max-width: 768px) {
  .admin-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .admin-form .row-2 {
    grid-template-columns: 1fr;
  }
  
  .tour-edit-form {
    grid-template-columns: 1fr;
  }
  
  .admin-tabs {
    margin-bottom: 20px;
  }
  
  .admin-section {
    padding: 16px;
  }
}
`;

document.head.appendChild(adminStyles);

// ============================================================================
// ENHANCED ADMIN FUNCTIONS
// ============================================================================

/**
 * Initialize professional admin dashboard
 */
function initProfessionalAdmin() {
  const adminNavBtn = document.getElementById('authNavBtn');
  if (!adminNavBtn) return;
  
  // Add admin-specific styles to modal when opened
  const originalOpenAuthModal = window.openAuthModal;
  window.openAuthModal = function() {
    originalOpenAuthModal();
    setTimeout(() => {
      const modal = document.getElementById('modalContent');
      if (modal && modal.querySelector('.admin-email')) {
        modal.classList.add('admin-modal');
      }
    }, 100);
  };
}

/**
 * Render professional admin dashboard statistics
 */
function renderAdminStats() {
  // Count bookings, tours, etc.
  const totalTours = window.tours ? tours.length : 0;
  const totalBookings = window.bookings ? bookings.length : 0;
  const confirmedBookings = window.bookings ? bookings.filter(b => b.status === 'Confirmed').length : 0;
  
  const statsHTML = `
    <div class="admin-stats">
      <div class="stat-card">
        <div class="stat-number">${totalTours}</div>
        <div class="stat-label">Active Tours</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${totalBookings}</div>
        <div class="stat-label">Total Bookings</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${confirmedBookings}</div>
        <div class="stat-label">Confirmed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">₹45L</div>
        <div class="stat-label">Revenue (30d)</div>
      </div>
    </div>
  `;
  
  const adminPanel = document.getElementById('adminPanel');
  if (adminPanel && !adminPanel.querySelector('.admin-stats')) {
    adminPanel.insertAdjacentHTML('afterbegin', statsHTML);
  }
}

/**
 * Render professional settings panel
 */
function renderAdminSettings() {
  const settingsHTML = `
    <div class="admin-section">
      <h3>🎨 Brand Customization</h3>
      <div class="settings-grid">
        <div class="preference-group">
          <label for="adminBrandColor">
            <div class="color-picker">
              <input type="color" id="adminBrandColor" value="#22d3ee" onchange="updateBrandColor(this.value)">
              <span id="colorLabel">#22d3ee</span>
            </div>
            Primary Brand Color
          </label>
        </div>
        <div class="preference-group">
          <label for="adminBrandName">
            Brand Name
            <input type="text" id="adminBrandName" class="input-text" value="FEEL IT" placeholder="Your brand name">
          </label>
        </div>
      </div>
    </div>
    
    <div class="admin-section">
      <h3>📱 Contact Information</h3>
      <div class="admin-form">
        <div class="field">
          <label>Email Address</label>
          <input type="email" id="adminEmail" class="input-text" value="feelitofficial@gmail.com">
        </div>
        <div class="field">
          <label>WhatsApp Number</label>
          <input type="tel" id="adminWhatsapp" class="input-text" value="9779825344810" placeholder="+977...">
        </div>
        <div class="field">
          <label>Instagram Handle</label>
          <input type="text" id="adminInstagram" class="input-text" value="feelitoffical" placeholder="@username">
        </div>
        <button class="btn btn-primary" onclick="saveContactInfo()">Save Contact Info</button>
      </div>
    </div>
    
    <div class="admin-section">
      <h3>🔐 Security Settings</h3>
      <div class="preference-group">
        <label>
          <input type="checkbox" checked>
          Require email verification for new bookings
        </label>
        <label>
          <input type="checkbox" checked>
          Enable two-factor authentication
        </label>
        <label>
          <input type="checkbox">
          Send daily admin alerts
        </label>
      </div>
    </div>
  `;
  
  const adminPanel = document.getElementById('adminPanel');
  if (adminPanel && !adminPanel.querySelector('#adminBrandColor')) {
    adminPanel.insertAdjacentHTML('beforeend', settingsHTML);
  }
}

/**
 * Update brand color across site
 */
function updateBrandColor(color) {
  document.documentElement.style.setProperty('--primary', color);
  document.getElementById('colorLabel').textContent = color;
  localStorage.setItem('brandColor', color);
  showToast('Brand color updated', 'success');
}

/**
 * Save contact information
 */
function saveContactInfo() {
  const info = {
    email: document.getElementById('adminEmail').value,
    whatsapp: document.getElementById('adminWhatsapp').value,
    instagram: document.getElementById('adminInstagram').value,
  };
  
  localStorage.setItem('contactInfo', JSON.stringify(info));
  showToast('Contact information saved', 'success');
}

/**
 * Create professional tour editing interface
 */
function createTourEditForm(tour) {
  return `
    <div class="admin-section">
      <h3>Edit Tour: ${esc(tour.title)}</h3>
      <div class="tour-edit-form">
        <div class="field">
          <label>Tour Title</label>
          <input type="text" class="input-text" value="${esc(tour.title)}" id="edit-title-${tour.id}">
        </div>
        <div class="field">
          <label>Region</label>
          <input type="text" class="input-text" value="${esc(tour.region)}" id="edit-region-${tour.id}">
        </div>
        <div class="field">
          <label>Price (NPR)</label>
          <input type="number" class="input-text" value="${tour.price}" id="edit-price-${tour.id}">
        </div>
        <div class="field">
          <label>Duration</label>
          <input type="text" class="input-text" value="${esc(tour.duration)}" id="edit-duration-${tour.id}">
        </div>
        <div class="field">
          <label>Fuel Cost per Liter</label>
          <input type="number" class="input-text" value="120" id="edit-fuel-${tour.id}">
        </div>
        <div class="field">
          <label>Hotel Cost per Room</label>
          <input type="number" class="input-text" value="1200" id="edit-hotel-${tour.id}">
        </div>
        <div class="field">
          <label>Driver Daily Rate</label>
          <input type="number" class="input-text" value="1500" id="edit-driver-${tour.id}">
        </div>
        <div class="field">
          <label>Max Riders per Date</label>
          <input type="number" class="input-text" value="${tour.max_slots || 4}" id="edit-slots-${tour.id}">
        </div>
      </div>
      <div class="admin-actions">
        <button class="btn btn-primary" onclick="saveTourEdit('${tour.id}')">Save Changes</button>
        <button class="btn btn-outline" onclick="closeOverlay()">Cancel</button>
      </div>
    </div>
  `;
}

/**
 * Save tour edits
 */
window.saveTourEdit = async function(tourId) {
  const updates = {
    title: document.getElementById(`edit-title-${tourId}`)?.value,
    region: document.getElementById(`edit-region-${tourId}`)?.value,
    price: parseFloat(document.getElementById(`edit-price-${tourId}`)?.value),
    duration: document.getElementById(`edit-duration-${tourId}`)?.value,
    max_slots: parseInt(document.getElementById(`edit-slots-${tourId}`)?.value),
  };
  
  const { error } = await supabaseClient.from('tours').update(updates).eq('id', tourId);
  
  if (error) {
    showToast('Error saving tour: ' + error.message, 'error');
    return;
  }
  
  showToast('Tour updated successfully', 'success');
  await loadTours();
  closeOverlay();
};

/**
 * Load and display admin stats on page load
 */
window.addEventListener('load', () => {
  initProfessionalAdmin();
  
  // Load saved brand color
  const savedColor = localStorage.getItem('brandColor');
  if (savedColor) {
    document.documentElement.style.setProperty('--primary', savedColor);
  }
  
  // Load saved contact info
  const savedContact = localStorage.getItem('contactInfo');
  if (savedContact) {
    const info = JSON.parse(savedContact);
    if (document.getElementById('adminEmail')) {
      document.getElementById('adminEmail').value = info.email || '';
      document.getElementById('adminWhatsapp').value = info.whatsapp || '';
      document.getElementById('adminInstagram').value = info.instagram || '';
    }
  }
});
