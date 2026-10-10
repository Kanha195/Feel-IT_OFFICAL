(function(){
  if (typeof window.CONTACT_INFO === "undefined") {
    window.CONTACT_INFO = {email:"feelitofficial@gmail.com",phone:"+977-9808747221",whatsapp:"9779825344810",address:"Basundhara, Kathmandu, Nepal",instagram:"feelitoffical"};
  }
  function applyPatches(){
    try {
      if (typeof PAYMENT_METHODS !== "undefined") {
        if (PAYMENT_METHODS.bank) { PAYMENT_METHODS.bank.qrImage="assets/qr-bank.png"; PAYMENT_METHODS.bank.accountNumber="Use QR or ask on WhatsApp"; }
        if (PAYMENT_METHODS.esewa) PAYMENT_METHODS.esewa.qrImage="assets/qr-esewa.png";
      }
      window.openAuthModal = async function(){
        try {
          var sessionUser = (typeof checkActiveAuthUser==="function") ? await checkActiveAuthUser() : null;
          if (sessionUser && typeof isStaffEmail==="function" && isStaffEmail(sessionUser.email)) {
            if (typeof writeStaffSession==="function") writeStaffSession(sessionUser.email);
            window.location.href="ops.html"; return;
          }
          if (sessionUser && typeof renderUserDashboard==="function") { renderUserDashboard(sessionUser); return; }
          try { var raw=sessionStorage.getItem("feelit_admin_session"); if(raw&&!sessionUser) sessionStorage.removeItem("feelit_admin_session"); } catch(e){}
          if (typeof showAuthTabs==="function") showAuthTabs("login");
        } catch(err) { if (typeof showAuthTabs==="function") showAuthTabs("login"); }
      };
      window.openStaffOrDashboard = window.openAuthModal;
      if (Array.isArray(window.tours)&&window.tours.length){
        if (typeof renderTours==="function") renderTours();
        if (typeof renderHiddenGems==="function") renderHiddenGems();
      }
    } catch(e){}
  }
  var s=document.createElement("script");
  s.src="https://cdn.jsdelivr.net/gh/Kanha195/Feel-IT_OFFICAL@763d7cd2/script.js";
  s.onload=function(){ applyPatches(); setTimeout(applyPatches,800); setTimeout(applyPatches,2500); };
  s.onerror=function(){ console.error("Core script failed to load"); };
  document.head.appendChild(s);
  try {
    var l=document.createElement("link"); l.rel="stylesheet"; l.href="feelit-float-fix.css"; document.head.appendChild(l);
  } catch(e){}
})();
