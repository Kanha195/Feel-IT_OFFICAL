/* Load full feelit-extras from last good commit + CONTACT_INFO already in feelit-config.js */
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
  s.src = 'https://cdn.jsdelivr.net/gh/Kanha195/Feel-IT_OFFICAL@644854bc7432eb1bcf7da6155bf530ff6b17e765/feelit-extras.js';
  s.onerror = function(){ console.warn('feelit-extras CDN load failed'); };
  document.head.appendChild(s);
})();
