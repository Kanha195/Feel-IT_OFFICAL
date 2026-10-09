/* Feel It — bootstrap while full script is restored */
(function(){
  function applyPatches(){
    try {
      if (typeof PAYMENT_METHODS !== 'undefined') {
        if (PAYMENT_METHODS.bank) PAYMENT_METHODS.bank.qrImage = 'assets/qr-bank.png';
        if (PAYMENT_METHODS.esewa) PAYMENT_METHODS.esewa.qrImage = 'assets/qr-esewa.png';
      }
      if (typeof normalizeTour === 'function') {
        var _n = normalizeTour;
        window.normalizeTour = function(t){
          var x = _n(t);
          var g = String(x.guide||'').toLowerCase();
          if (!g.trim() || /rider will|will be assigned|assign after|payment received|to be assigned|tbd|pending/.test(g)) {
            x.guide = 'Assigned after payment';
          }
          return x;
        };
      }
      if (typeof openTermsModal !== 'function') {
        window.openTermsModal = function(){
          var mc = document.getElementById('modalContent');
          if (!mc) { location.href = 'terms.html'; return; }
          mc.innerHTML = '<button class="modal-close" onclick="closeOverlay()">&times;</button><h2>Terms & Conditions</h2><p>Bookings stay Pending until payment is verified. Wear supplied gear and follow your captain. See privacy.html for data policy.</p><button class="btn btn-primary" style="width:100%;" onclick="closeOverlay()">I understand</button>';
          if (typeof showOverlay === 'function') showOverlay();
        };
      }
      if (Array.isArray(window.tours) && window.tours.length && typeof normalizeTour === 'function') {
        window.tours = window.tours.map(normalizeTour);
        if (typeof renderTours === 'function') renderTours();
        if (typeof renderHiddenGems === 'function') renderHiddenGems();
      }
    } catch (e) { console.warn('Feel It patch', e); }
  }
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/Kanha195/Feel-IT_OFFICAL@763d7cd2/script.js';
  s.onload = function(){ applyPatches(); };
  s.onerror = function(){ console.error('Could not load Feel It core script'); };
  document.head.appendChild(s);
})();
