/* Feel It — bootstrap: last good core + live fixes */
(function(){
  try {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'feelit-float-fix.css';
    document.head.appendChild(l);
  } catch (e) {}
  function applyPatches(){
    try {
      if (typeof PAYMENT_METHODS !== 'undefined') {
        if (PAYMENT_METHODS.bank) {
          PAYMENT_METHODS.bank.qrImage = 'assets/qr-bank.png';
          PAYMENT_METHODS.bank.accountNumber = 'Use QR or ask on WhatsApp';
        }
        if (PAYMENT_METHODS.esewa) PAYMENT_METHODS.esewa.qrImage = 'assets/qr-esewa.png';
      }
      if (typeof normalizeTour === 'function') {
        var _n = normalizeTour;
        window.normalizeTour = function(t){
          var x = _n(t);
          var g = String(x.guide || '').toLowerCase();
          if (!g.trim() || /rider will|will be assigned|assign after|payment received|to be assigned|tbd|pending/.test(g)) {
            x.guide = 'Assigned after payment';
          }
          return x;
        };
      }
      window.openTermsModal = function(){
        var mc = document.getElementById('modalContent');
        if (!mc) { location.href = 'terms.html'; return; }
        mc.innerHTML = '<button class="modal-close" onclick="closeOverlay()">&times;</button><h2>Terms & Conditions</h2><p class="sub">Feel It Nepal</p><div style="max-height:55vh;overflow:auto;line-height:1.55;font-size:14px;"><p>Bookings stay Pending until we verify your bank or eSewa payment. After verification we assign a local captain and publish your ride briefing in My Account.</p><p>Wear the supplied helmet and gear. Follow your captain on the road.</p><p>If we cannot verify payment or provide a captain, we will refund or reschedule. See <a href="privacy.html">Privacy policy</a>.</p></div><button class="btn btn-primary" style="width:100%;margin-top:14px;" onclick="closeOverlay()">I understand</button>';
        if (typeof showOverlay === 'function') showOverlay();
      };
      if (Array.isArray(window.tours) && window.tours.length) {
        window.tours = window.tours.map(window.normalizeTour || function(t){ return t; });
        if (typeof renderTours === 'function') renderTours();
        if (typeof renderHiddenGems === 'function') renderHiddenGems();
      }
      document.querySelectorAll('a').forEach(function(a){
        if (/terms/i.test(a.textContent || '') && (a.getAttribute('href') === '#' || !a.getAttribute('href'))) {
          a.setAttribute('href', 'terms.html');
          a.onclick = function(e){ e.preventDefault(); openTermsModal(); };
        }
      });
    } catch (e) { console.warn('Feel It patch', e); }
  }
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/Kanha195/Feel-IT_OFFICAL@763d7cd2/script.js';
  s.onload = function(){ applyPatches(); setTimeout(applyPatches, 1500); };
  s.onerror = function(){ console.error('Could not load Feel It core script'); };
  document.head.appendChild(s);
})();
