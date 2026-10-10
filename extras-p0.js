/* Feel It extras — safe defaults if core script not ready yet */
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
})();

/* rest loaded from p1+p2 via feelit-extras.js loader — p0 continues original file */
