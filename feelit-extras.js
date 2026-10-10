/* feelit-extras loader — script tag (CSP-safe) */
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
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/Kanha195/Feel-IT_OFFICAL@763d7cd2/feelit-extras.js';
  s.onerror = function(){ console.warn('feelit-extras failed'); };
  document.head.appendChild(s);
})();
