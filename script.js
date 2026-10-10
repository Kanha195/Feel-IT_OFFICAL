/* Feel It bootstrap — same-origin core load (CSP-safe) */
(function(){
  if (typeof window.CONTACT_INFO === 'undefined') {
    window.CONTACT_INFO = {
      email: 'feelitofficial@gmail.com',
      phone: '+977-9808747221',
      whatsapp: '9779825344810',
      address: 'Basundhara, Kathmandu, Nepal',
      instagram: 'feelitoffical'
    };
  }
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
        mc.innerHTML = '<button class="modal-close" onclick="closeOverlay()">&times;</button><h2>Terms & Conditions</h2><p class="sub">Feel It Nepal</p><div style="max-height:55vh;overflow:auto;line-height:1.55;font-size:14px;"><p>Bookings stay Pending until payment is verified. Captain and ride briefing appear in My Account after confirmation.</p><p>See <a href="privacy.html">Privacy policy</a>.</p></div><button class="btn btn-primary" style="width:100%;margin-top:14px;" onclick="closeOverlay()">I understand</button>';
        if (typeof showOverlay === 'function') showOverlay();
      };
      if (Array.isArray(window.tours) && window.tours.length) {
        window.tours = window.tours.map(window.normalizeTour || function(t){ return t; });
        if (typeof renderTours === 'function') renderTours();
        if (typeof renderHiddenGems === 'function') renderHiddenGems();
      }
      window.openAuthModal = async function(){
        try {
          var sessionUser = (typeof checkActiveAuthUser === 'function') ? await checkActiveAuthUser() : null;
          if (sessionUser && typeof isStaffEmail === 'function' && isStaffEmail(sessionUser.email)) {
            if (typeof writeStaffSession === 'function') writeStaffSession(sessionUser.email);
            window.location.href = 'ops.html';
            return;
          }
          if (sessionUser && typeof renderUserDashboard === 'function') {
            renderUserDashboard(sessionUser);
            return;
          }
          try {
            var raw = sessionStorage.getItem('feelit_admin_session');
            if (raw && !sessionUser) sessionStorage.removeItem('feelit_admin_session');
          } catch (e) {}
          if (typeof showAuthTabs === 'function') showAuthTabs('login');
        } catch (err) {
          console.error(err);
          if (typeof showAuthTabs === 'function') showAuthTabs('login');
        }
      };
      window.openStaffOrDashboard = window.openAuthModal;
    } catch (e) { console.warn('patches', e); }
  }

  async function loadCore(){
    try {
      var parts = ['script-core-p0.js?v=20', 'script-core-p1.js?v=20'];
      var code = '';
      for (var i = 0; i < parts.length; i++) {
        var r = await fetch(parts[i]);
        if (!r.ok) throw new Error(parts[i] + ' ' + r.status);
        code += await r.text();
      }
      var s = document.createElement('script');
      s.text = code;
      document.head.appendChild(s);
      applyPatches();
      setTimeout(applyPatches, 700);
      setTimeout(applyPatches, 2200);
    } catch (e) {
      console.error('Core script load failed', e);
    }
  }
  loadCore();
})();
