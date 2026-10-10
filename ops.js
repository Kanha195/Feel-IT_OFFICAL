(async function(){
  try {
    const r = await fetch('ops-core.js?v=12');
    if (!r.ok) throw new Error('ops-core.js missing ' + r.status);
    let code = await r.text();
    code = code.split('err:String(e.message||e);}').join('err:String(e.message||e)}');
    const s = document.createElement('script');
    s.text = code;
    document.body.appendChild(s);
  } catch (e) {
    document.body.innerHTML = '<div style="padding:40px;background:#0B0F19;color:#fff;font-family:system-ui"><h1>Ops load error</h1><p>' + String(e.message||e) + '</p><a href="index.html" style="color:#00F5D4">Guest site</a></div>';
  }
})();
