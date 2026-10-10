(async function(){
  try {
    const parts=['extras-p0.js','extras-p1.js','extras-p2.js'];
    let code='';
    for (const f of parts){
      const r=await fetch(f+'?v=2');
      if(!r.ok) throw new Error(f+' '+r.status);
      code+=await r.text();
    }
    const s=document.createElement('script');
    s.text=code;
    document.body.appendChild(s);
  } catch(e){ console.error('feelit-extras load', e); }
})();
