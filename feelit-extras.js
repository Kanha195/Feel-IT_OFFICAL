(async function(){
  try {
    if (typeof window.CONTACT_INFO === 'undefined') {
      window.CONTACT_INFO = {email:'feelitofficial@gmail.com',phone:'+977-9808747221',whatsapp:'9779825344810',address:'Basundhara, Kathmandu, Nepal',instagram:'feelitoffical'};
    }
    var code = '';
    for (var f of ['extras-p0.js?v=20','extras-p1.js?v=20']) {
      var r = await fetch(f);
      if (!r.ok) throw new Error(f);
      code += await r.text();
    }
    var s = document.createElement('script');
    s.text = code;
    document.body.appendChild(s);
  } catch (e) { console.warn('extras', e); }
})();
