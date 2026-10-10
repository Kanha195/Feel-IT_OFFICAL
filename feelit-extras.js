/* feelit-extras.js — load full extras (map/search/customize) from stable commit */
(async function () {
  try {
    if (typeof window.CONTACT_INFO === 'undefined') {
      window.CONTACT_INFO = {
        email: 'feelitofficial@gmail.com',
        phone: '+977-9808747221',
        whatsapp: '9779825344810',
        address: 'Basundhara, Kathmandu, Nepal',
        instagram: 'feelitoffical'
      };
    }
    var urls = [
      'https://cdn.jsdelivr.net/gh/Kanha195/Feel-IT_OFFICAL@763d7cd2/feelit-extras.js'
    ];
    for (var i = 0; i < urls.length; i++) {
      try {
        var r = await fetch(urls[i], { cache: 'no-store' });
        if (!r.ok) continue;
        var code = await r.text();
        if (code && code.length > 5000) {
          var s = document.createElement('script');
          s.text = code;
          document.body.appendChild(s);
          return;
        }
      } catch (e) {}
    }
    console.warn('extras full load skipped');
  } catch (e) {
    console.warn('extras', e);
  }
})();
