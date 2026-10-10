/* Feel It — bootstrap: last good core + live fixes */
(function(){
  // Define CONTACT_INFO immediately so feelit-extras.js never crashes
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
          a.onclick = null;
        }
      });

      // Login button: show form for guests; only staff with active Supabase session go to ops
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
          // Stale admin cookie without live login → clear so Login form appears
          try {
            var raw = sessionStorage.getItem('feelit_admin_session');
            if (raw && !sessionUser) sessionStorage.removeItem('feelit_admin_session');
          } catch (e) {}
          if (typeof showAuthTabs === 'function') showAuthTabs('login');
          else if (typeof showOverlay === 'function') {
            var mc = document.getElementById('modalContent');
            if (mc) {
              mc.innerHTML = '<button class="modal-close" onclick="closeOverlay()">&times;</button><h2>Login</h2><p class="sub">Enter your email and password</p>';
              showOverlay();
            }
          }
        } catch (err) {
          console.error(err);
          if (typeof showAuthTabs === 'function') showAuthTabs('login');
        }
      };
      window.openStaffOrDashboard = window.openAuthModal;
    } catch (e) { console.warn('Feel It patches', e); }
  }

  fetch('https://cdn.jsdelivr.net/gh/Kanha195/Feel-IT_OFFICAL@763d7cd2/script.js')
    .then(function(r){ return r.text(); })
    .then(function(code){
      var s = document.createElement('script');
      s.textContent = code;
      document.head.appendChild(s);
      applyPatches();
      setTimeout(applyPatches, 800);
      setTimeout(applyPatches, 2500);
    })
    .catch(function(err){
      console.error('Core script load failed', err);
    });
})();
